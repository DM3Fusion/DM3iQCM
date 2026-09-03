import { avatarInitials } from "@/lib/profile/avatar";

const pixels = { sm: 25, md: 34, lg: 88 } as const;

export function UserAvatar({
  displayName,
  email,
  src,
  size = "md",
}: {
  displayName?: string | null;
  email?: string | null;
  src?: string | null;
  size?: keyof typeof pixels;
}) {
  const label = displayName || email || "User";
  return (
    <span
      className={`user-avatar user-avatar-${size}`}
      title={label}
      aria-label={label}
    >
      {src ? (
        // Signed private Storage URLs are short lived and cannot usefully be optimized.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={pixels[size]} height={pixels[size]} />
      ) : (
        <span aria-hidden>{avatarInitials(displayName, email)}</span>
      )}
    </span>
  );
}
