type DbParts = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
};

type Result = { ok: true; value: string } | { ok: false; error: string };

export function buildDatabaseUrl(input: DbParts): Result {
  const host = input.host.trim();
  const port = input.port.trim();
  const user = input.user.trim();
  const password = input.password.trim();
  const database = input.database.trim();
  if (!host || !port || !user || !password || !database) {
    return { ok: false, error: "Missing database fields" };
  }
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const baseUrl = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  const sslSuffix = input.ssl ? "?sslmode=require&sslaccept=accept_invalid_certs" : "";
  return {
    ok: true,
    value: `${baseUrl}${sslSuffix}`,
  };
}
