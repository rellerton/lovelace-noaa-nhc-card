export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function number(value: number | null, digits = 0): string {
  return value === null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

export function age(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "Unknown";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function officialUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol === "https:" || parsed.origin === window.location.origin) {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}
