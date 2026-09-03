-- DM3iQCM-03: atomic live case workflow and assignment-aware staff access.

-- Platform administrators are legitimate actors without organization membership.
alter table public.cases drop constraint cases_organization_id_created_by_user_id_fkey;
alter table public.customers drop constraint customers_organization_id_created_by_user_id_fkey;
alter table public.case_assignments drop constraint case_assignments_organization_id_assigned_by_user_id_fkey;
alter table public.case_tasks drop constraint case_tasks_organization_id_completed_by_user_id_fkey;
alter table public.case_tasks drop constraint case_tasks_organization_id_created_by_user_id_fkey;
alter table public.case_activity drop constraint case_activity_organization_id_actor_user_id_fkey;
alter table public.cases add constraint cases_created_by_user_id_fkey foreign key(created_by_user_id) references public.profiles(id);
alter table public.customers add constraint customers_created_by_user_id_fkey foreign key(created_by_user_id) references public.profiles(id);
alter table public.case_assignments add constraint case_assignments_assigned_by_user_id_fkey foreign key(assigned_by_user_id) references public.profiles(id);
alter table public.case_tasks add constraint case_tasks_completed_by_user_id_fkey foreign key(completed_by_user_id) references public.profiles(id);
alter table public.case_tasks add constraint case_tasks_created_by_user_id_fkey foreign key(created_by_user_id) references public.profiles(id);
alter table public.case_activity add constraint case_activity_actor_user_id_fkey foreign key(actor_user_id) references public.profiles(id);

create or replace function public.is_valid_organization_actor(target_organization_id uuid,target_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select public.is_super_admin(target_user_id) or public.is_internal_member(target_organization_id,target_user_id)
$$;
create or replace function public.validate_organization_actor() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=nullif(to_jsonb(new)->>tg_argv[0],'')::uuid;
 if tg_table_name='case_tasks' and actor is null then actor:=nullif(to_jsonb(new)->>'created_by_user_id','')::uuid; end if;
 if actor is not null and not public.is_valid_organization_actor(new.organization_id,actor) then raise exception 'actor is not authorized for organization' using errcode='23514'; end if;
 return new;
end $$;
create trigger cases_actor_integrity before insert or update of organization_id,created_by_user_id on public.cases for each row execute function public.validate_organization_actor('created_by_user_id');
create trigger customers_actor_integrity before insert or update of organization_id,created_by_user_id on public.customers for each row execute function public.validate_organization_actor('created_by_user_id');
create trigger assignments_actor_integrity before insert or update of organization_id,assigned_by_user_id on public.case_assignments for each row execute function public.validate_organization_actor('assigned_by_user_id');
create trigger tasks_actor_integrity before insert or update of organization_id,created_by_user_id,completed_by_user_id on public.case_tasks for each row execute function public.validate_organization_actor('completed_by_user_id');
create trigger activity_actor_integrity before insert or update of organization_id,actor_user_id on public.case_activity for each row execute function public.validate_organization_actor('actor_user_id');

alter table public.case_activity drop constraint case_activity_event_type_check;
alter table public.case_activity add constraint case_activity_event_type_check check(event_type in ('CASE_CREATED','CASE_ASSIGNED','CASE_UNASSIGNED','STATUS_CHANGED','PRIORITY_CHANGED','DUE_DATE_CHANGED','TASK_CREATED','TASK_UPDATED','TASK_DELETED','TASK_ASSIGNED','TASK_STARTED','TASK_COMPLETED','CUSTOMER_RESPONSE_RECEIVED','CASE_MOVED_TO_REVIEW','CASE_COMPLETED','CASE_REOPENED'));

create or replace function public.can_access_case(check_case_id uuid,check_organization_id uuid,check_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_super_admin(check_user_id)
 or public.has_organization_role(check_organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER']::public.application_role[],check_user_id)
 or exists(select 1 from public.case_assignments a where a.case_id=check_case_id and a.organization_id=check_organization_id and a.user_id=check_user_id and a.is_active)
 or exists(select 1 from public.case_tasks t where t.case_id=check_case_id and t.organization_id=check_organization_id and t.assigned_user_id=check_user_id)
$$;

create or replace function public.can_manage_case(target_organization_id uuid,target_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_super_admin(target_user_id) or public.has_organization_role(target_organization_id,array['BUSINESS_ADMIN','BUSINESS_OWNER','STAFF_MANAGER']::public.application_role[],target_user_id)
$$;

create table public.organization_customer_number_counters(organization_id uuid primary key references public.organizations(id) on delete cascade,next_number bigint not null default 1 check(next_number>0));
alter table public.organization_customer_number_counters enable row level security;
revoke all on public.organization_customer_number_counters from authenticated,anon;
create or replace function public.next_customer_number(target_organization_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare allocated bigint; begin insert into public.organization_customer_number_counters(organization_id,next_number) values(target_organization_id,2) on conflict(organization_id) do update set next_number=public.organization_customer_number_counters.next_number+1 returning next_number-1 into allocated;return 'CUST-'||lpad(allocated::text,6,'0');end $$;
create or replace function public.create_customer_record(target_organization_id uuid,target_type public.customer_type,target_name text,target_email text default null,target_phone text default null,target_notes text default null) returns public.customers language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();created public.customers;begin if actor is null or not public.is_internal_member(target_organization_id,actor) and not public.is_super_admin(actor) then raise exception 'not authorized' using errcode='42501';end if;insert into public.customers(organization_id,customer_number,type,name,email,phone,notes,created_by_user_id) values(target_organization_id,public.next_customer_number(target_organization_id),target_type,trim(target_name),nullif(trim(target_email),''),nullif(trim(target_phone),''),nullif(trim(target_notes),''),actor) returning * into created;return created;end $$;

create or replace function public.write_case_event(target_organization_id uuid,target_case_id uuid,target_actor_id uuid,target_event_type text,target_event_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare event_id uuid;
begin
 if target_actor_id<>auth.uid() or not public.can_access_case(target_case_id,target_organization_id,target_actor_id) then raise exception 'not authorized' using errcode='42501'; end if;
 insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(target_organization_id,target_case_id,target_actor_id,target_event_type,coalesce(target_event_data,'{}')) returning id into event_id;
 return event_id;
end $$;

create or replace function public.guard_case_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='COMPLETED' and old.status<>'COMPLETED' and exists(select 1 from public.case_tasks t where t.case_id=new.id and t.required and t.status not in ('COMPLETED','NOT_APPLICABLE')) then
   raise exception 'All required applicable tasks must be completed before completing the case.' using errcode='23514';
 end if;
 if new.status='COMPLETED' and old.status<>'COMPLETED' then new.completed_at=coalesce(new.completed_at,now()); end if;
 if old.status='COMPLETED' and new.status in ('NEW','UNASSIGNED','ASSIGNED','IN_PROGRESS','WAITING','REVIEW') then new.completed_at=null; end if;
 if new.status='CLOSED' and old.status<>'CLOSED' then new.closed_at=coalesce(new.closed_at,now()); end if;
 if old.status='CLOSED' and new.status<>'CLOSED' then new.closed_at=null; end if;
 return new;
end $$;
create trigger cases_completion_guard before update of status on public.cases for each row execute function public.guard_case_completion();

create or replace function public.create_case_workflow(
 target_organization_id uuid,target_customer_id uuid,target_title text,target_description text,target_case_type text,target_priority public.priority_level,target_due_at timestamptz default null,target_manager_user_id uuid default null,target_staff_user_ids uuid[] default '{}'::uuid[],target_initial_tasks jsonb default '[]'::jsonb)
returns public.cases language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); created_case public.cases; staff_id uuid; task jsonb; task_id uuid;
begin
 if actor is null or not public.can_manage_case(target_organization_id,actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if not exists(select 1 from public.customers c where c.id=target_customer_id and c.organization_id=target_organization_id) then raise exception 'invalid customer' using errcode='23503'; end if;
 if target_manager_user_id is not null and not public.is_internal_member(target_organization_id,target_manager_user_id) then raise exception 'invalid manager' using errcode='23514'; end if;
 insert into public.cases(organization_id,customer_id,title,description,case_type,priority,status,due_at,manager_user_id,created_by_user_id)
 values(target_organization_id,target_customer_id,trim(target_title),coalesce(target_description,''),trim(target_case_type),target_priority,case when target_manager_user_id is null and cardinality(target_staff_user_ids)=0 then 'UNASSIGNED'::public.case_status else 'ASSIGNED'::public.case_status end,target_due_at,target_manager_user_id,actor) returning * into created_case;
 insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(target_organization_id,created_case.id,actor,'CASE_CREATED',jsonb_build_object('case_number',created_case.case_number,'status',created_case.status));
 if target_manager_user_id is not null then
  insert into public.case_assignments(organization_id,case_id,user_id,assignment_role,assigned_by_user_id) values(target_organization_id,created_case.id,target_manager_user_id,'MANAGER',actor);
  insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(target_organization_id,created_case.id,actor,'CASE_ASSIGNED',jsonb_build_object('user_id',target_manager_user_id,'assignment_role','MANAGER'));
 end if;
 foreach staff_id in array coalesce(target_staff_user_ids,'{}'::uuid[]) loop
  if not public.is_internal_member(target_organization_id,staff_id) then raise exception 'invalid staff assignment' using errcode='23514'; end if;
  insert into public.case_assignments(organization_id,case_id,user_id,assignment_role,assigned_by_user_id) values(target_organization_id,created_case.id,staff_id,'STAFF',actor) on conflict do nothing;
  insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(target_organization_id,created_case.id,actor,'CASE_ASSIGNED',jsonb_build_object('user_id',staff_id,'assignment_role','STAFF'));
 end loop;
 if jsonb_typeof(target_initial_tasks)<>'array' then raise exception 'initial tasks must be an array' using errcode='22023'; end if;
 for task in select value from jsonb_array_elements(target_initial_tasks) loop
  insert into public.case_tasks(organization_id,case_id,title,description,assigned_user_id,status,required,due_at,sequence,created_by_user_id)
  values(target_organization_id,created_case.id,trim(task->>'title'),coalesce(task->>'description',''),nullif(task->>'assigned_user_id','')::uuid,'NOT_STARTED',coalesce((task->>'required')::boolean,true),nullif(task->>'due_at','')::timestamptz,coalesce((task->>'sequence')::integer,0),actor) returning id into task_id;
  insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(target_organization_id,created_case.id,actor,'TASK_CREATED',jsonb_build_object('task_id',task_id,'title',task->>'title'));
 end loop;
 return created_case;
end $$;

create or replace function public.transition_case_status(target_case_id uuid,target_status public.case_status) returns public.cases language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.cases; previous public.case_status; event_name text;
begin select * into item from public.cases where id=target_case_id for update; if not found then raise exception 'case not found' using errcode='P0002'; end if;
 if not public.can_manage_case(item.organization_id,actor) then
  if not (public.can_access_case(item.id,item.organization_id,actor) and target_status in ('IN_PROGRESS','WAITING','REVIEW')) then raise exception 'not authorized' using errcode='42501'; end if;
 end if;
 previous:=item.status; if previous=target_status then return item; end if;
 update public.cases set status=target_status where id=item.id returning * into item;
 insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(item.organization_id,item.id,actor,'STATUS_CHANGED',jsonb_build_object('before',previous,'after',target_status));
 if target_status='COMPLETED' then event_name:='CASE_COMPLETED'; elsif target_status='REVIEW' then event_name:='CASE_MOVED_TO_REVIEW'; elsif previous in ('COMPLETED','CLOSED') and target_status not in ('COMPLETED','CLOSED','CANCELLED') then event_name:='CASE_REOPENED'; end if;
 if event_name is not null then insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(item.organization_id,item.id,actor,event_name,jsonb_build_object('before',previous,'after',target_status)); end if; return item;
end $$;

create or replace function public.set_case_assignment(target_case_id uuid,target_user_id uuid,target_assignment_role public.assignment_role,target_active boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.cases; existing_id uuid; previous_manager uuid;
begin select * into item from public.cases where id=target_case_id for update; if not found then raise exception 'case not found' using errcode='P0002'; end if;
 if not public.can_manage_case(item.organization_id,actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if not public.is_internal_member(item.organization_id,target_user_id) then raise exception 'invalid staff assignment' using errcode='23514'; end if;
 if target_assignment_role='MANAGER' and target_active then
  select user_id into previous_manager from public.case_assignments where case_id=item.id and assignment_role='MANAGER' and is_active and user_id<>target_user_id limit 1;
  update public.case_assignments set is_active=false,unassigned_at=now() where case_id=item.id and assignment_role='MANAGER' and is_active and user_id<>target_user_id;
  update public.cases set manager_user_id=target_user_id where id=item.id;
 elsif target_assignment_role='MANAGER' and not target_active then update public.cases set manager_user_id=null where id=item.id and manager_user_id=target_user_id; end if;
 select id into existing_id from public.case_assignments where case_id=item.id and user_id=target_user_id and assignment_role=target_assignment_role order by created_at desc limit 1;
 if target_active then
  if existing_id is null then insert into public.case_assignments(organization_id,case_id,user_id,assignment_role,assigned_by_user_id) values(item.organization_id,item.id,target_user_id,target_assignment_role,actor);
  else update public.case_assignments set is_active=true,assigned_at=now(),assigned_by_user_id=actor,unassigned_at=null where id=existing_id; end if;
 else update public.case_assignments set is_active=false,unassigned_at=now() where id=existing_id and is_active; end if;
 if previous_manager is not null then insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(item.organization_id,item.id,actor,'CASE_UNASSIGNED',jsonb_build_object('user_id',previous_manager,'assignment_role','MANAGER')); end if;
 insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(item.organization_id,item.id,actor,case when target_active then 'CASE_ASSIGNED' else 'CASE_UNASSIGNED' end,jsonb_build_object('user_id',target_user_id,'assignment_role',target_assignment_role));
end $$;

create or replace function public.create_case_task(target_case_id uuid,target_title text,target_description text default '',target_assigned_user_id uuid default null,target_required boolean default true,target_due_at timestamptz default null) returns public.case_tasks language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item public.cases; created public.case_tasks; next_sequence integer;
begin select * into item from public.cases where id=target_case_id; if not found then raise exception 'case not found' using errcode='P0002'; end if; if not public.can_manage_case(item.organization_id,actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if target_assigned_user_id is not null and not public.is_internal_member(item.organization_id,target_assigned_user_id) then raise exception 'invalid task assignee' using errcode='23514'; end if;
 select coalesce(max(sequence),0)+1 into next_sequence from public.case_tasks where case_id=item.id;
 insert into public.case_tasks(organization_id,case_id,title,description,assigned_user_id,required,due_at,sequence,created_by_user_id) values(item.organization_id,item.id,trim(target_title),coalesce(target_description,''),target_assigned_user_id,target_required,target_due_at,next_sequence,actor) returning * into created;
 insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(item.organization_id,item.id,actor,'TASK_CREATED',jsonb_build_object('task_id',created.id,'title',created.title)); return created;
end $$;

create or replace function public.update_case_task(target_task_id uuid,target_title text,target_description text,target_assigned_user_id uuid,target_status public.case_task_status,target_required boolean,target_due_at timestamptz) returns public.case_tasks language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.case_tasks; changed public.case_tasks; event_name text:='TASK_UPDATED';
begin select * into existing from public.case_tasks where id=target_task_id for update; if not found then raise exception 'task not found' using errcode='P0002'; end if;
 if not public.can_manage_case(existing.organization_id,actor) and existing.assigned_user_id<>actor then raise exception 'not authorized' using errcode='42501'; end if;
 if not public.can_manage_case(existing.organization_id,actor) and (target_title<>existing.title or target_description<>existing.description or target_assigned_user_id is distinct from existing.assigned_user_id or target_required<>existing.required or target_due_at is distinct from existing.due_at) then raise exception 'staff users may update only assigned task status' using errcode='42501'; end if;
 if target_assigned_user_id is not null and not public.is_internal_member(existing.organization_id,target_assigned_user_id) then raise exception 'invalid task assignee' using errcode='23514'; end if;
 update public.case_tasks set title=trim(target_title),description=coalesce(target_description,''),assigned_user_id=target_assigned_user_id,status=target_status,required=target_required,due_at=target_due_at,
 completed_at=case when target_status='COMPLETED' then coalesce(completed_at,now()) else null end,completed_by_user_id=case when target_status='COMPLETED' then actor else null end where id=existing.id returning * into changed;
 if target_status='COMPLETED' and existing.status<>'COMPLETED' then event_name:='TASK_COMPLETED'; elsif target_status='IN_PROGRESS' and existing.status<>'IN_PROGRESS' then event_name:='TASK_STARTED'; elsif target_assigned_user_id is distinct from existing.assigned_user_id then event_name:='TASK_ASSIGNED'; end if;
 insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(changed.organization_id,changed.case_id,actor,event_name,jsonb_build_object('task_id',changed.id,'before_status',existing.status,'after_status',changed.status,'before_assigned_user_id',existing.assigned_user_id,'after_assigned_user_id',changed.assigned_user_id)); return changed;
end $$;

create or replace function public.delete_case_task(target_task_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); existing public.case_tasks;
begin select * into existing from public.case_tasks where id=target_task_id for update; if not found then raise exception 'task not found' using errcode='P0002'; end if; if not public.can_manage_case(existing.organization_id,actor) then raise exception 'not authorized' using errcode='42501'; end if;
 delete from public.case_tasks where id=existing.id; insert into public.case_activity(organization_id,case_id,actor_user_id,event_type,event_data) values(existing.organization_id,existing.case_id,actor,'TASK_DELETED',jsonb_build_object('task_id',existing.id,'title',existing.title));
end $$;

create or replace function public.move_case_task(target_task_id uuid,target_direction text) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_task public.case_tasks; adjacent public.case_tasks; temporary_sequence integer;
begin select * into current_task from public.case_tasks where id=target_task_id for update; if not found then raise exception 'task not found' using errcode='P0002'; end if; if not public.can_manage_case(current_task.organization_id,actor) then raise exception 'not authorized' using errcode='42501'; end if;
 if target_direction='UP' then select * into adjacent from public.case_tasks where case_id=current_task.case_id and sequence<current_task.sequence order by sequence desc limit 1 for update;
 elsif target_direction='DOWN' then select * into adjacent from public.case_tasks where case_id=current_task.case_id and sequence>current_task.sequence order by sequence limit 1 for update; else raise exception 'invalid direction' using errcode='22023'; end if;
 if found then temporary_sequence:=current_task.sequence; update public.case_tasks set sequence=adjacent.sequence where id=current_task.id; update public.case_tasks set sequence=temporary_sequence where id=adjacent.id; end if;
end $$;

revoke update,delete on public.cases,public.case_assignments,public.case_tasks from authenticated;
revoke insert on public.cases,public.case_assignments,public.case_tasks,public.case_activity from authenticated;
revoke execute on function public.is_valid_organization_actor(uuid,uuid),public.validate_organization_actor(),public.can_manage_case(uuid,uuid),public.write_case_event(uuid,uuid,uuid,text,jsonb),public.guard_case_completion(),public.next_customer_number(uuid) from public,anon,authenticated;
revoke execute on function public.create_customer_record(uuid,public.customer_type,text,text,text,text),public.create_case_workflow(uuid,uuid,text,text,text,public.priority_level,timestamptz,uuid,uuid[],jsonb),public.transition_case_status(uuid,public.case_status),public.set_case_assignment(uuid,uuid,public.assignment_role,boolean),public.create_case_task(uuid,text,text,uuid,boolean,timestamptz),public.update_case_task(uuid,text,text,uuid,public.case_task_status,boolean,timestamptz),public.delete_case_task(uuid),public.move_case_task(uuid,text) from public,anon;
grant execute on function public.create_customer_record(uuid,public.customer_type,text,text,text,text),public.create_case_workflow(uuid,uuid,text,text,text,public.priority_level,timestamptz,uuid,uuid[],jsonb),public.transition_case_status(uuid,public.case_status),public.set_case_assignment(uuid,uuid,public.assignment_role,boolean),public.create_case_task(uuid,text,text,uuid,boolean,timestamptz),public.update_case_task(uuid,text,text,uuid,public.case_task_status,boolean,timestamptz),public.delete_case_task(uuid),public.move_case_task(uuid,text) to authenticated;

comment on function public.guard_case_completion() is 'Temporary pre-rules-engine guard: every required applicable task must be completed; zero required applicable tasks permits completion.';
comment on function public.create_case_workflow(uuid,uuid,text,text,text,public.priority_level,timestamptz,uuid,uuid[],jsonb) is 'Atomically creates a case, assignments, initial tasks, and activity. Tenant and actor derive from trusted context.';
