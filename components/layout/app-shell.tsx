"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  FileQuestion,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { selectActiveOrganizationAction } from "@/lib/auth/organization-actions";
import { returnToBackOfficeAction } from "@/lib/data/platform-actions";
import type { AccessContext } from "@/lib/auth/context";
import { AccountMenu } from "@/components/account-menu";
import { UserAvatar } from "@/components/user-avatar";
const organizationNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: BriefcaseBusiness },
  { href: "/service-desk", label: "Service Desk", icon: Headphones },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tasks", label: "Tasks", icon: ClipboardCheck },
  { href: "/questions", label: "Questions & Rules", icon: FileQuestion },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users },
  { href: "/administration", label: "Administration", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];
const platformNav = [
  { href: "/", label: "Back Office", icon: ShieldCheck },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/users", label: "Users / Access", icon: Users },
];
const isPublic = (path: string) =>
  path === "/login" ||
  path.startsWith("/auth/") ||
  path === "/account/unprovisioned";
export function AppShell({
  children,
  access,
}: {
  children: React.ReactNode;
  access: AccessContext | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (isPublic(pathname))
    return <main className="public-main">{children}</main>;
  const org = access?.activeOrganization;
  const platformContext = Boolean(
    access?.isSuperAdmin && (!org || pathname.startsWith("/admin")),
  );
  const nav = platformContext ? platformNav : organizationNav;
  return (
    <div className="app-frame">
      {open && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-row">
          <Link href="/" className="brand">
            <strong>DM3iQ™</strong>
            <span>Case Management Intelligence</span>
          </Link>
          <button
            className="close-menu"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        {access?.isSuperAdmin && org && !platformContext ? (
          <form action={returnToBackOfficeAction} className="back-office-link">
            <button>← Back Office</button>
          </form>
        ) : null}
        <nav aria-label="Primary navigation">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={active ? "active" : ""}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div
          className={`organization-card ${platformContext ? "platform-context" : ""}`}
        >
          <span>{platformContext ? "Platform" : "Organization"}</span>
          {!platformContext && org ? (
            <div>
              <Link
                href="/account/profile"
                aria-label="Open My Profile"
                className="avatar-profile-link"
              >
                <UserAvatar
                  displayName={access?.displayName}
                  email={access?.user.email}
                  src={access?.avatarUrl}
                />
              </Link>
              <div className="organization-details">
                {access && access.organizations.length > 1 ? (
                  <form action={selectActiveOrganizationAction}>
                    <input type="hidden" name="next" value={pathname} />
                    <select
                      aria-label="Active organization"
                      name="organizationId"
                      defaultValue={org.id}
                      onChange={(event) =>
                        event.currentTarget.form?.requestSubmit()
                      }
                    >
                      {access.organizations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </form>
                ) : (
                  <strong>{org.name}</strong>
                )}
                <small>{org.role.replaceAll("_", " ")}</small>
              </div>
            </div>
          ) : platformContext ? (
            <div>
              <Link
                href="/account/profile"
                aria-label="Open My Profile"
                className="avatar-profile-link"
              >
                <UserAvatar
                  displayName={access?.displayName}
                  email={access?.user.email}
                  src={access?.avatarUrl}
                />
              </Link>
              <div className="organization-details">
                <strong>DM3iQ Administration</strong>
                <small>SUPER ADMIN</small>
              </div>
            </div>
          ) : (
            <p>No active organization</p>
          )}
        </div>
        <form action={signOutAction} className="signout"><button type="submit"><LogOut aria-hidden />Sign Out</button></form>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="workspace">
            <strong>
              {platformContext
                ? "Platform Administration"
                : "Case Management Intelligence"}
            </strong>
            <small>
              {platformContext
                ? "Back Office"
                : (org?.name ?? "No active organization")}
            </small>
          </div>
          {access ? <AccountMenu displayName={access.displayName} email={access.user.email} avatarUrl={access.avatarUrl} /> : null}
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
