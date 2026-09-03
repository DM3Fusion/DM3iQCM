begin;
create or replace function pg_temp.assert_true(condition boolean,message text) returns void language plpgsql as $$ begin if not coalesce(condition,false) then raise exception 'ASSERTION FAILED: %',message; end if; end $$;

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000001','authenticated','authenticated','sa1@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000002','authenticated','authenticated','sa2@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000003','authenticated','authenticated','admin1@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000004','authenticated','authenticated','admin2@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000005','authenticated','authenticated','admin3@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000006','authenticated','authenticated','owner1@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000007','authenticated','authenticated','owner2@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000008','authenticated','authenticated','owner3@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000009','authenticated','authenticated','managera@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000010','authenticated','authenticated','staffa@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000011','authenticated','authenticated','managerb@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000012','authenticated','authenticated','staffb@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000013','authenticated','authenticated','portal1@test.local','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000014','authenticated','authenticated','portal2@test.local','{}','{}',now(),now());
select pg_temp.assert_true((select count(*) from public.profiles)=14,'auth trigger bootstraps profiles');

insert into public.platform_user_roles(user_id,role) values('00000000-0000-0000-0000-000000000001','SUPER_ADMIN');
do $$ begin begin insert into public.platform_user_roles(user_id,role) values('00000000-0000-0000-0000-000000000002','SUPER_ADMIN'); raise exception 'ASSERTION FAILED: second SUPER_ADMIN succeeded'; exception when unique_violation then null; end; end $$;

insert into public.organizations(id,name,slug) values
('10000000-0000-0000-0000-000000000001','Organization A','organization-a'),
('10000000-0000-0000-0000-000000000002','Organization B','organization-b');
insert into public.organization_members(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','BUSINESS_ADMIN'),
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','BUSINESS_ADMIN');
do $$ begin begin insert into public.organization_members(organization_id,user_id,role) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','BUSINESS_ADMIN'); raise exception 'ASSERTION FAILED: third BUSINESS_ADMIN succeeded'; exception when check_violation then null; end; end $$;
update public.organization_members set is_active=false where user_id='00000000-0000-0000-0000-000000000003';
insert into public.organization_members(organization_id,user_id,role) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','BUSINESS_ADMIN');
select pg_temp.assert_true((select count(*)=2 from public.organization_members where organization_id='10000000-0000-0000-0000-000000000001' and role='BUSINESS_ADMIN' and is_active),'admin deactivation frees slot');

insert into public.organization_members(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','BUSINESS_OWNER'),
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000007','BUSINESS_OWNER');
do $$ begin begin insert into public.organization_members(organization_id,user_id,role) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000008','BUSINESS_OWNER'); raise exception 'ASSERTION FAILED: third BUSINESS_OWNER succeeded'; exception when check_violation then null; end; end $$;
update public.organization_members set is_active=false where user_id='00000000-0000-0000-0000-000000000006';
insert into public.organization_members(organization_id,user_id,role) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000008','BUSINESS_OWNER');
select pg_temp.assert_true((select count(*)=2 from public.organization_members where organization_id='10000000-0000-0000-0000-000000000001' and role='BUSINESS_OWNER' and is_active),'owner deactivation frees slot');

insert into public.organization_members(organization_id,user_id,role) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000009','STAFF_MANAGER'),
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','STAFF_USER'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000011','STAFF_MANAGER'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000012','STAFF_USER');
insert into public.customers(id,organization_id,customer_number,type,name,created_by_user_id) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','CUST-001','INDIVIDUAL','Customer A','00000000-0000-0000-0000-000000000009'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','CUST-001','INDIVIDUAL','Customer B','00000000-0000-0000-0000-000000000011');
insert into public.customer_portal_users(organization_id,customer_id,user_id) values
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000013'),
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000014');

insert into public.cases(id,organization_id,customer_id,title,description,case_type,status,due_at,created_by_user_id) values
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Case A','','General','IN_PROGRESS',now()-interval '1 day','00000000-0000-0000-0000-000000000009'),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Case B','','General','IN_PROGRESS',now()+interval '1 day','00000000-0000-0000-0000-000000000011'),
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Completed overdue date','','General','COMPLETED',now()-interval '2 days','00000000-0000-0000-0000-000000000009'),
('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','No tasks','','General','NEW',null,'00000000-0000-0000-0000-000000000009'),
('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Closed overdue date','','General','CLOSED',now()-interval '2 days','00000000-0000-0000-0000-000000000009'),
('30000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Cancelled overdue date','','General','CANCELLED',now()-interval '2 days','00000000-0000-0000-0000-000000000009');
select pg_temp.assert_true(not exists(select 1 from public.cases group by organization_id,case_number having count(*)>1),'generated case numbers are unique within each organization');
select pg_temp.assert_true((select bool_and(case_number ~ '^CASE-[0-9]{6}$') from public.cases),'generated case numbers use the permanent display pattern');
select pg_temp.assert_true((select is_overdue from public.case_operational_status where id='30000000-0000-0000-0000-000000000001'),'active past-due case is overdue');
select pg_temp.assert_true(not (select is_overdue from public.case_operational_status where id='30000000-0000-0000-0000-000000000003'),'completed case is not overdue');
select pg_temp.assert_true(not (select is_overdue from public.case_operational_status where id='30000000-0000-0000-0000-000000000005'),'closed case is not overdue');
select pg_temp.assert_true(not (select is_overdue from public.case_operational_status where id='30000000-0000-0000-0000-000000000006'),'cancelled case is not overdue');

do $$ begin begin insert into public.cases(organization_id,customer_id,title,case_type,created_by_user_id) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Cross customer','General','00000000-0000-0000-0000-000000000009'); raise exception 'ASSERTION FAILED: cross-tenant case customer succeeded'; exception when foreign_key_violation then null; end; end $$;
insert into public.case_assignments(organization_id,case_id,user_id,assigned_by_user_id) values('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000009');
do $$ begin begin insert into public.case_assignments(organization_id,case_id,user_id,assigned_by_user_id) values('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000009'); raise exception 'ASSERTION FAILED: cross-tenant assignment succeeded'; exception when foreign_key_violation then null; end; end $$;

insert into public.case_tasks(organization_id,case_id,title,assigned_user_id,status,required,completed_at,completed_by_user_id,sequence,created_by_user_id) values
('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Required done','00000000-0000-0000-0000-000000000010','COMPLETED',true,now(),'00000000-0000-0000-0000-000000000010',1,'00000000-0000-0000-0000-000000000009'),
('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Required open','00000000-0000-0000-0000-000000000010','IN_PROGRESS',true,null,null,2,'00000000-0000-0000-0000-000000000009'),
('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Required N/A','00000000-0000-0000-0000-000000000010','NOT_APPLICABLE',true,null,null,3,'00000000-0000-0000-0000-000000000009'),
('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Optional','00000000-0000-0000-0000-000000000010','NOT_STARTED',false,null,null,4,'00000000-0000-0000-0000-000000000009');
select pg_temp.assert_true((select percentage=50 and completed_required_tasks=1 and total_required_tasks=2 and remaining_required_tasks=1 from public.get_case_progress('30000000-0000-0000-0000-000000000001')),'required progress excludes optional and N/A');
select pg_temp.assert_true((select percentage=0 and total_required_tasks=0 from public.get_case_progress('30000000-0000-0000-0000-000000000004')),'zero applicable tasks returns zero');
do $$ begin begin insert into public.case_tasks(organization_id,case_id,title,assigned_user_id,created_by_user_id) values('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Cross assignment','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000009'); raise exception 'ASSERTION FAILED: cross-tenant task assignment succeeded'; exception when foreign_key_violation then null; end; end $$;
insert into public.service_requests(organization_id,request_number,customer_id,requester_user_id,subject) values('10000000-0000-0000-0000-000000000001','REQ-001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000013','Portal request');

set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000009',true);
select pg_temp.assert_true((select count(*)=5 from public.cases),'Organization A manager sees only Organization A cases');
do $$ declare affected integer; begin update public.cases set title='blocked' where id='30000000-0000-0000-0000-000000000002'; get diagnostics affected=row_count; perform pg_temp.assert_true(affected=0,'Organization A cannot modify Organization B case'); end $$;
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
select pg_temp.assert_true((select count(*)=1 from public.cases),'Organization B manager cannot read Organization A cases');
reset role;
set local role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',true);
select pg_temp.assert_true((select count(*)=1 from public.customers),'portal user sees only linked customer');
select pg_temp.assert_true((select count(*)=0 from public.organization_members),'portal user sees no internal memberships');
select pg_temp.assert_true((select count(*)=0 from public.cases),'portal user sees no internal cases');
select pg_temp.assert_true((select count(*)=1 from public.service_requests),'portal user sees own customer request only');
reset role;

select 'DM3iQCM database regression tests passed' as result;
rollback;
