"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
export function OrganizationSummaryRow({ label, count, target, selected }: { label: string; count: number; target: "cases" | "customers"; selected: boolean }) {
  const router = useRouter(); const pathname = usePathname(); const search = useSearchParams();
  const activate = () => { const params = new URLSearchParams(search.toString()); params.set("drilldown", target); router.push(`${pathname}?${params.toString()}`); };
  return <button type="button" className={`summary-drilldown-row ${selected ? "selected" : ""}`} onClick={activate} aria-expanded={selected} aria-controls="organization-drilldown"><span>{label}</span><strong>{count}</strong></button>;
}
