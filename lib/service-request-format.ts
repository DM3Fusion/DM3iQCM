import { humanize } from "@/lib/format";
export const serviceRequestStatuses = ["NEW","OPEN","PENDING_CUSTOMER","ON_HOLD","RESOLVED","CLOSED"] as const;
export const serviceRequestPriorities = ["LOW","NORMAL","HIGH","URGENT"] as const;
export const serviceRequestLabel = (value: string) => humanize(value);
