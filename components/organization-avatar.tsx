import { organizationInitials } from "@/lib/profile/avatar";

export function OrganizationAvatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  return <span className={`organization-avatar organization-avatar-${size}`} title={name} aria-label={name}>
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" />
    ) : <span aria-hidden>{organizationInitials(name)}</span>}
  </span>;
}
