export const ROW_INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, summary, details, label, [role='button'], [data-row-navigation-ignore]";

export function isRowNavigationKey(key: string) {
  return key === "Enter" || key === " ";
}
