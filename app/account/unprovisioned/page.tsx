import { AuthCard } from "@/components/auth-card";
import { signOutAction } from "@/lib/auth/actions";
export const metadata={title:"Access pending"};
export default function Page(){return <AuthCard title="Access pending" description="Your account has not yet been assigned to an organization or customer portal."><div className="auth-message">Contact your DM3iQ administrator to request access. Authentication alone does not grant access to organization data.</div><form action={signOutAction} className="auth-form"><button type="submit">Sign Out</button></form></AuthCard>}
