type SslConfig = {
  rejectUnauthorized: boolean;
};

export function resolveSslConfig(databaseUrl: string, databaseSslEnv?: string) {
  if (databaseSslEnv === "true") {
    return { rejectUnauthorized: false } satisfies SslConfig;
  }
  if (databaseSslEnv === "false") {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);
    const sslmode = url.searchParams.get("sslmode");
    const sslaccept = url.searchParams.get("sslaccept");
    const ssl = url.searchParams.get("ssl");
    if (sslaccept === "accept_invalid_certs") {
      return { rejectUnauthorized: false } satisfies SslConfig;
    }
    if (sslmode === "require" || ssl === "1" || ssl === "true") {
      return { rejectUnauthorized: false } satisfies SslConfig;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
