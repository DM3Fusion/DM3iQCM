"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ORGANIZATION_COOKIE,getAccessContext } from "./context";
import { safeInternalPath } from "./redirects";
export async function selectActiveOrganizationAction(formData:FormData){const context=await getAccessContext();const requested=String(formData.get("organizationId")??"");if(!context?.organizations.some(org=>org.id===requested))redirect("/account/unprovisioned");(await cookies()).set(ACTIVE_ORGANIZATION_COOKIE,requested,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/"});redirect(safeInternalPath(String(formData.get("next")??"/")));}
