export function validateSecrets(nextAuth: string, keys: string) {
  const ok = nextAuth.trim().length >= 16 && keys.trim().length >= 16;
  return ok ? { ok: true } : { ok: false, error: "Secrets must be 16+ chars" };
}

export function validateDatabaseUrl(value: string) {
  if (!/^postgres(ql)?:\/\//i.test(value)) {
    return { ok: false, error: "Only PostgreSQL URLs are supported" };
  }
  return { ok: true };
}
