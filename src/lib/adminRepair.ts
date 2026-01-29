import { Client } from "pg";

type RepairInput = {
  databaseUrl: string;
  databaseSsl?: boolean;
};

export type AdminProvisionInput = {
  admin: {
    host: string;
    port: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  app: {
    database: string;
    user: string;
    password: string;
  };
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

function buildConnectionString(input: {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}) {
  const encodedUser = encodeURIComponent(input.user);
  const encodedPassword = encodeURIComponent(input.password);
  return `postgresql://${encodedUser}:${encodedPassword}@${input.host}:${input.port}/${input.database}`;
}

async function runProvisionQueries(
  client: Client,
  appDatabase: string,
  appUser: string,
  appPassword: string
) {
  const roleResult = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [
    appUser,
  ]);
  if (roleResult.rows.length === 0) {
    await client.query(`CREATE ROLE ${escapeIdentifier(appUser)} LOGIN PASSWORD $1`, [
      appPassword,
    ]);
  } else {
    await client.query(`ALTER ROLE ${escapeIdentifier(appUser)} WITH LOGIN PASSWORD $1`, [
      appPassword,
    ]);
  }

  const dbResult = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    appDatabase,
  ]);
  if (dbResult.rows.length === 0) {
    await client.query(
      `CREATE DATABASE ${escapeIdentifier(appDatabase)} OWNER ${escapeIdentifier(appUser)}`
    );
  }
  await client.query(
    `ALTER DATABASE ${escapeIdentifier(appDatabase)} OWNER TO ${escapeIdentifier(appUser)}`
  );
  await client.query(
    `GRANT ALL PRIVILEGES ON DATABASE ${escapeIdentifier(appDatabase)} TO ${escapeIdentifier(
      appUser
    )}`
  );
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
    await runProvisionQueries(adminClient, database, user, password);
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

export async function provisionDatabaseWithAdmin(input: AdminProvisionInput) {
  const adminDatabase = buildConnectionString({
    host: input.admin.host.trim(),
    port: input.admin.port.trim(),
    user: input.admin.user.trim(),
    password: input.admin.password.trim(),
    database: "postgres",
  });
  const ssl = input.admin.ssl ? { rejectUnauthorized: false } : undefined;

  const adminClient = new Client({
    connectionString: adminDatabase,
    ssl,
  });

  await adminClient.connect();
  try {
    await runProvisionQueries(
      adminClient,
      input.app.database.trim(),
      input.app.user.trim(),
      input.app.password.trim()
    );
  } finally {
    await adminClient.end();
  }

  const appAdminUrl = buildConnectionString({
    host: input.admin.host.trim(),
    port: input.admin.port.trim(),
    user: input.admin.user.trim(),
    password: input.admin.password.trim(),
    database: input.app.database.trim(),
  });
  const dbClient = new Client({
    connectionString: appAdminUrl,
    ssl,
  });
  await dbClient.connect();
  try {
    await dbClient.query(
      `GRANT ALL PRIVILEGES ON SCHEMA public TO ${escapeIdentifier(input.app.user.trim())}`
    );
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${escapeIdentifier(
        input.app.user.trim()
      )}`
    );
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${escapeIdentifier(
        input.app.user.trim()
      )}`
    );
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${escapeIdentifier(
        input.app.user.trim()
      )}`
    );
  } finally {
    await dbClient.end();
  }
}
