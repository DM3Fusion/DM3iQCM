import { Dashboard } from "@/components/dashboard/dashboard";
import { PageHeader } from "@/components/ui";
export default function Page(){return <><PageHeader eyebrow="Thursday, September 3" title="Good morning, Maya" description="Here’s what needs your team’s attention today." action={<button className="primary-button">＋ New Case</button>}/><Dashboard/></>}
