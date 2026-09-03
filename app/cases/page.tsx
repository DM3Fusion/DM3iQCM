import { CasesRegister } from "@/components/cases/cases-register";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
import { getLiveOrganizationData } from "@/lib/data/case-repository";
export const metadata={title:"Cases"};
type Params={query?:string;status?:string;priority?:string;assignment?:string};
export default async function Page({searchParams}:{searchParams:Promise<Params>}){const [data,filters]=await Promise.all([getLiveOrganizationData(),searchParams]);const query=(filters.query??"").toLowerCase();const items=data.cases.filter(item=>`${item.case_number} ${item.title} ${item.customer?.name??""}`.toLowerCase().includes(query)&&(filters.status&&filters.status!=="ALL"?item.status===filters.status:true)&&(filters.priority&&filters.priority!=="ALL"?item.priority===filters.priority:true)&&(filters.assignment==="ASSIGNED"?Boolean(item.manager_user_id||item.assignedStaff.length):filters.assignment==="UNASSIGNED"?!item.manager_user_id&&!item.assignedStaff.length:true));return <><PageHeader eyebrow="Operations" title="Cases" description="Search, filter, and track live cases in the active organization." action={<Link className="primary-button" href="/cases/new">＋ New Case</Link>}/><CasesRegister items={items} filters={filters}/></>}
