import { Client } from "pg";

type RepairInput = {
  databaseUrl: string;
  databaseSsl?: boolean;
};

function escapeIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const database = url.pathname.replace("/", "").trim();
  const user = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");
  if (!database) {
    throw new Error("Database name is required");
  }
  if (!user) {
    throw new Error("Database user is required");
  }
  return { url, database, user, password };
}

function buildAdminUrl(url: URL) {
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = "/postgres";
  return adminUrl.toString();
}

export async function repairDatabaseAccess(input: RepairInput) {
  const { url, database, user, password } = parseDatabaseUrl(input.databaseUrl);
  const adminUrl = buildAdminUrl(url);
  const ssl = input.databaseSsl ? { rejectUnauthorized: false } : undefined;

  const adminClient = new Client({
    connectionString: adminUrl,
    ssl,
  });

  await adminClient.connect();
  try {
    const roleResult = await adminClient.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      [user]
    );
    if (roleResult.rows.length === 0) {
      await adminClient.query(
        `CREATE ROLE ${escapeIdentifier(user)} LOGIN PASSWORD $1`,
        [password]
      );
    } else {
      await adminClient.query(
        `ALTER ROLE ${escapeIdentifier(user)} WITH LOGIN PASSWORD $1`,
        [password]
      );
    }

    const dbResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database]
    );
    if (dbResult.rows.length === 0) {
      await adminClient.query(
        `CREATE DATABASE ${escapeIdentifier(database)} OWNER ${escapeIdentifier(user)}`
      );
    }
    await adminClient.query(
      `ALTER DATABASE ${escapeIdentifier(database)} OWNER TO ${escapeIdentifier(user)}`
    );
    await adminClient.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${escapeIdentifier(database)} TO ${escapeIdentifier(user)}`
    );
  } finally {
    await adminClient.end();
  }

  const dbClient = new Client({
    connectionString: input.databaseUrl,
    ssl,
  });
  await dbClient.connect();
  try {
    await dbClient.query(
      `GRANT ALL PRIVILEGES ON SCHEMA public TO ${escapeIdentifier(user)}`
    );
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${escapeIdentifier(user)}`
    );
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${escapeIdentifier(user)}`
    );
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${escapeIdentifier(user)}`
    );
  } finally {
    await dbClient.end();
  }
}
