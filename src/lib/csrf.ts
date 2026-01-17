export type CsrfCheckResult = { ok: true } | { ok: false; error: string };

export function createCsrfToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function validateCsrf(
  cookieValue: string | null,
  headerValue: string | null
): CsrfCheckResult {
  if (!cookieValue || !headerValue) {
    return { ok: false, error: "CSRF token missing." };
  }
  if (cookieValue !== headerValue) {
    return { ok: false, error: "Invalid CSRF token." };
  }
  return { ok: true };
}
