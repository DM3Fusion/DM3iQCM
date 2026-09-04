import { PageHeader } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";
export const metadata={title:"New Customer"};
export default function Page(){return <><PageHeader eyebrow="Customers" title="Create Customer" description="Add a customer record for case and service workflows."/><section className="panel form-panel"><CustomerForm/></section></>}
