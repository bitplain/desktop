import { Client } from "pg";

export type AdminConnectionInput = {
  host: string;
  port: string;
  user: string;
  password: string;
  ssl: boolean;
};

function buildAdminConnectionString(input: AdminConnectionInput) {
  const host = input.host.trim();
  const port = input.port.trim();
  const user = input.user.trim();
  const password = input.password.trim();
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/postgres`;
}

export async function checkAdminConnection(input: AdminConnectionInput) {
  const connectionString = buildAdminConnectionString(input);
  const client = new Client({
    connectionString,
    ssl: input.ssl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  await client.end();
  return true;
}
