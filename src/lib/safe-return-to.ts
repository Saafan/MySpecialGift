/**
 * Only allow same-site relative redirects — never an absolute or
 * protocol-relative URL from a query string (open-redirect guard).
 */
export function safeReturnTo(value: string | undefined, fallback: string): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}
