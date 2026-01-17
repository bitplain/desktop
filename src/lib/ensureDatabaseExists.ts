import { Client } from "pg";

type ParsedDatabase = {
  url: URL;
  name: string;
};

function getDatabaseName(databaseUrl: string): ParsedDatabase {
  const url = new URL(databaseUrl);
  const name = url.pathname.replace("/", "").trim();
  if (!name) {
    throw new Error("Database name is required");
  }
  return { url, name };
}

function buildAdminUrl(url: URL, adminDb = "postgres") {
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = `/${adminDb}`;
  return adminUrl.toString();
}

function escapeIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function ensureDatabaseExists(databaseUrl: string) {
  const { url, name } = getDatabaseName(databaseUrl);
  const client = new Client({ connectionString: buildAdminUrl(url) });
  await client.connect();
  try {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name]
    );
    if (result.rows.length === 0) {
      await client.query(`CREATE DATABASE ${escapeIdentifier(name)}`);
    }
  } finally {
    await client.end();
  }
}
