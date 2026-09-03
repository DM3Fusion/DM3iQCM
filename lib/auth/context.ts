import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
export interface AccessContext { user: User; profileId?: string; isSuperAdmin: boolean; organizationIds: string[]; customerPortalIds: string[]; provisioned: boolean }
export async function getAccessContext():Promise<AccessContext|null>{if(!isSupabaseConfigured())return null;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;const [profile,platform,memberships,portal]=await Promise.all([
 supabase.from("profiles").select("id").eq("id",user.id).maybeSingle(),
 supabase.from("platform_user_roles").select("id").eq("user_id",user.id).eq("role","SUPER_ADMIN").eq("is_active",true).limit(1),
 supabase.from("organization_members").select("organization_id").eq("user_id",user.id).eq("is_active",true),
 supabase.from("customer_portal_users").select("customer_id").eq("user_id",user.id).eq("is_active",true)
]);const organizationIds=(memberships.data??[]).map(row=>row.organization_id as string);const customerPortalIds=(portal.data??[]).map(row=>row.customer_id as string);const isSuperAdmin=Boolean(platform.data?.length);return {user,profileId:profile.data?.id as string|undefined,isSuperAdmin,organizationIds,customerPortalIds,provisioned:isSuperAdmin||organizationIds.length>0||customerPortalIds.length>0};}
