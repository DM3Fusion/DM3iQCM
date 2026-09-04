export const LICENSE_WARNING_DAYS = [60, 30, 14, 7, 3, 1] as const;
export const LICENSE_NOTIFICATION_THRESHOLDS = LICENSE_WARNING_DAYS;
export type LicenseStatus = "TRIAL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "SUSPENDED" | "CANCELLED";
export type CommercialState = "TRIAL" | "PAID" | "UNPAID" | "COMP" | "INTERNAL";
export type LicenseSnapshot = { status: LicenseStatus; commercialState: CommercialState; startsAt: string | null; expiresAt: string | null; graceEndsAt: string | null; noticeDays?: number; notificationThresholds?: readonly number[]; };
export function daysRemaining(expiresAt: string | null, now = new Date()) { if (!expiresAt) return null; return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86400000); }
export function effectiveLicense(snapshot: LicenseSnapshot | null, now = new Date()) {
  if (!snapshot) return { status: "EXPIRED" as LicenseStatus, daysRemaining: null, isInGrace: false, workspaceAllowed: false };
  const days = daysRemaining(snapshot.expiresAt, now);
  if (["SUSPENDED", "CANCELLED"].includes(snapshot.status)) return { status: snapshot.status, daysRemaining: days, isInGrace: false, workspaceAllowed: false };
  if (days !== null && days < 0) {
    const grace = snapshot.graceEndsAt ? new Date(snapshot.graceEndsAt).getTime() >= now.getTime() : false;
    return { status: "EXPIRED" as LicenseStatus, daysRemaining: days, isInGrace: grace, workspaceAllowed: grace };
  }
  const warning = snapshot.noticeDays ?? 30;
  return { status: days !== null && days <= warning ? "EXPIRING" as LicenseStatus : snapshot.status, daysRemaining: days, isInGrace: false, workspaceAllowed: true };
}
export function organizationLicenseAccessAllowed(organizationStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED", license: ReturnType<typeof effectiveLicense> | null, isSuperAdmin = false) {
  return isSuperAdmin || (organizationStatus === "ACTIVE" && (!license || license.workspaceAllowed));
}
