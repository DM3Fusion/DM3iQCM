import { Dashboard } from "@/components/dashboard/dashboard";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { getLiveOrganizationData } from "@/lib/data/case-repository";
export default async function Page(){const data=await getLiveOrganizationData();return <><PageHeader eyebrow="Operations" title="Dashboard" description="Live casework requiring your organization’s attention." action={<Link className="primary-button" href="/cases/new">＋ New Case</Link>}/><Dashboard data={data}/></>}
