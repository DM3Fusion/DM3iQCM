export const AVATAR_BUCKET = "user-avatars";
export const AVATAR_SOURCE_BUCKET = "user-avatar-sources";

export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_WEBP_QUALITY = 0.82;

export const MAX_AVATAR_SOURCE_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 1 * 1024 * 1024;

export function avatarInitials(
  displayName?: string | null,
  email?: string | null,
) {
  const name = displayName?.trim();

  if (name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return email?.trim().charAt(0).toUpperCase() || "U";
}

export function isOwnedAvatarPath(path: string, userId: string) {
  return new RegExp(
    `^${userId}/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$`,
  ).test(path);
}

export function isOwnedAvatarSourcePath(path: string, userId: string) {
  return new RegExp(
    `^${userId}/source-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|jpeg|png|webp)$`,
  ).test(path);
}
