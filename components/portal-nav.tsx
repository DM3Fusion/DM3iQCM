"use client";

import Link from "next/link";
import { useState } from "react";
import { signOutAction } from "@/lib/auth/actions";

export default function PortalNav({ hasMultipleAccounts, enabled = true }: { hasMultipleAccounts: boolean; enabled?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {enabled && <button
        className="portal-menu-button"
        type="button"
        aria-expanded={open}
        aria-controls="portal-navigation"
        aria-label={open ? "Close portal navigation" : "Open portal navigation"}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">☰</span>
        <span className="sr-only">Menu</span>
      </button>}
      <nav id="portal-navigation" className={`portal-nav${open ? " is-open" : ""}${enabled ? "" : " is-disabled"}`} aria-label="Customer portal">
        {enabled && <><Link href="/portal" onClick={() => setOpen(false)}>Home</Link><Link href="/portal/service-requests" onClick={() => setOpen(false)}>Service Requests</Link>{hasMultipleAccounts && <Link href="/portal/select-account" onClick={() => setOpen(false)}>Switch account</Link>}</>}
        <form action={signOutAction}>
          <button type="submit">Sign Out</button>
        </form>
      </nav>
    </>
  );
}
