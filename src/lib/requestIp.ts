type HeaderInput = Headers | HeadersInit | Record<string, string> | null | undefined;

function toHeaders(input: HeaderInput): Headers {
  if (input instanceof Headers) {
    return input;
  }
  return new Headers(input ?? {});
}

export function getRequestIp(headers: HeaderInput): string {
  const resolved = toHeaders(headers);
  const forwarded = resolved.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = resolved.get("x-real-ip");
  return realIp?.trim() || "unknown";
}
