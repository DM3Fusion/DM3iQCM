export const ORGANIZATION_USER_ROLES = [
  "BUSINESS_OWNER",
  "BUSINESS_ADMIN",
  "STAFF_MANAGER",
  "STAFF_USER",
] as const;

export function isOrganizationUserRole(value: string) {
  return ORGANIZATION_USER_ROLES.some((role) => role === value);
}

export function classifyAccess(input: {
  platformAdmin: boolean;
  activeOrganizationMembership: boolean;
  activePortalAccess: boolean;
}) {
  if (input.platformAdmin) return "Platform Admin" as const;
  if (input.activeOrganizationMembership) return "Organization User" as const;
  if (input.activePortalAccess) return "Customer Portal User" as const;
  return "Pending Access" as const;
}
