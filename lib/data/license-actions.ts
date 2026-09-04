"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();
export async function saveLicenseAction(form:FormData){await requireSuperAdmin();const id=value(form,"organizationId");const path=`/admin/organizations/${id}`;const supabase=await createClient();const result=await (supabase as any).rpc("admin_set_organization_license",{target_organization_id:id,target_status:value(form,"status"),target_commercial_state:value(form,"commercialState"),target_plan_code:value(form,"planCode"),target_starts_at:value(form,"startsAt")||null,target_expires_at:value(form,"expiresAt")||null,target_grace_ends_at:value(form,"graceEndsAt")||null,target_notes:value(form,"notes")||null,target_event_type:value(form,"eventType")||"ACTIVATED"});if(result.error){console.error("License update failed",result.error.message);redirect(`${path}?error=${encodeURIComponent(result.error.message.includes("precedes")?"License dates are invalid.":"License update failed.")}`)}revalidatePath(path);revalidatePath("/admin/organizations");redirect(`${path}?message=License updated.`)}
