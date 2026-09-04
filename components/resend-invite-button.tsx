"use client";
import { useState } from "react";
import { resendUserInviteAction } from "@/lib/data/user-invitation-actions";
export function ResendInviteButton({ userId, organizationId }: { userId: string; organizationId?: string }) {
 const [state,setState]=useState<"idle"|"busy"|"sent">("idle"); const [error,setError]=useState<string|null>(null);
 return <div>{error?<p className="form-alert" role="alert">{error}</p>:null}<form action={async form=>{setState("busy");setError(null);const result=await resendUserInviteAction(form);if(!result.ok){setError(result.error??"Unable to resend invitation.");setState("idle");}else setState("sent");}}><input type="hidden" name="userId" value={userId}/>{organizationId?<input type="hidden" name="organizationId" value={organizationId}/>:null}<button type="submit" className="secondary-button" disabled={state==="busy"||state==="sent"}>{state==="busy"?"Resending…":state==="sent"?"Invitation Resent":"Resend Invite"}</button></form></div>;
}
