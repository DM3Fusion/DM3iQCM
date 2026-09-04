export function formatPhone(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "—";
  if (/^\d{10}$/.test(raw)) return `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`;
  if (/^1\d{10}$/.test(raw)) return `+1 (${raw.slice(1, 4)}) ${raw.slice(4, 7)}-${raw.slice(7)}`;
  return raw;
}
