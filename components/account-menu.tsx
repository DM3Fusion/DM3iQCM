"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { UserAvatar } from "@/components/user-avatar";

export function AccountMenu({
  displayName,
  email,
  avatarUrl,
}: {
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  return (
    <details className="account-menu">
      <summary aria-label="Open account menu">
        <UserAvatar displayName={displayName} email={email} src={avatarUrl} />
      </summary>
      <div className="account-menu-popover">
        <div>
          <strong>{displayName}</strong>
          <small>{email}</small>
        </div>
        <Link href="/account/profile">My Profile</Link>
        <form action={signOutAction}>
          <button type="submit">
            <LogOut aria-hidden />
            Sign Out
          </button>
        </form>
      </div>
    </details>
  );
}
