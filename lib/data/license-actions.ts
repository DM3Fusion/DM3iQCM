"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const localDate = (raw: string) => { if (!raw) return null; const parsed = new Date(raw); if (Number.isNaN(parsed.getTime())) throw new Error("invalid date"); return parsed.toISOString(); };
export async function saveLicenseAction(form:FormData){
  await requireSuperAdmin(); const id=value(form,"organizationId");
  if (!id || !value(form,"status") || !value(form,"commercialState")) return { ok:false, error:"License status and commercial state are required." };
  let startsAt:string|null, expiresAt:string|null, graceEndsAt:string|null;
  try { startsAt=localDate(value(form,"startsAt")); expiresAt=localDate(value(form,"expiresAt")); graceEndsAt=localDate(value(form,"graceEndsAt")); } catch { return { ok:false, error:"Enter valid license dates." }; }
  if (startsAt && expiresAt && expiresAt < startsAt) return { ok:false, error:"Expiration cannot precede the start date." };
  if (graceEndsAt && (!expiresAt || graceEndsAt < expiresAt)) return { ok:false, error:"Grace end cannot precede expiration." };
  const supabase=await createClient(); const result=await (supabase as any).rpc("admin_set_organization_license",{target_organization_id:id,target_status:value(form,"status"),target_commercial_state:value(form,"commercialState"),target_plan_code:value(form,"planCode")||"STANDARD",target_starts_at:startsAt,target_expires_at:expiresAt,target_grace_ends_at:graceEndsAt,target_notes:value(form,"notes")||null,target_event_type:value(form,"eventType")||"ACTIVATED"});
  if(result.error){ console.error("License update failed",{code:result.error.code,message:result.error.message}); return {ok:false,error:result.error.message.includes("precedes")?"License dates are invalid.":"License could not be saved."}; }
  revalidatePath(`/admin/organizations/${id}`); revalidatePath("/admin/organizations"); return {ok:true};
}
