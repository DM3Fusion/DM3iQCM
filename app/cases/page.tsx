import { CasesRegister } from "@/components/cases/cases-register";
import { PageHeader } from "@/components/ui";
export const metadata={title:"Cases"};
export default function Page(){return <><PageHeader eyebrow="Operations" title="Cases" description="Search, filter, and track every case in the organization." action={<button className="primary-button">＋ New Case</button>}/><CasesRegister/></>}
