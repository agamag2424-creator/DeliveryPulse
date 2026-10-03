/**
 * Epic 1: backfill Organization / Membership, move Project off userId,
 * collapse per-project Jira tokens onto org integrations, then drop Connector.
 *
 * Run before `npx prisma generate` + `npx prisma db push` against a live DB
 * that still has Project.userId / Connector.
 *
 * Usage: npx tsx scripts/migrate-epic-1-org.ts
 */
import { randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { Pool, type PoolClient } from "pg";

function applyEnvFile(filePath: string, override: boolean): void {
  if (!existsSync(filePath)) {
    return;
  }
  for (const rawLine of readFileSync(filePath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!override && process.env[key]) {
      continue;
    }
    process.env[key] = value;
  }
}

function loadEnv(): void {
  const root = resolve(__dirname, "..");
  applyEnvFile(resolve(root, ".env"), false);
  applyEnvFile(resolve(root, ".env.local"), true);
}

function newId(): string {
  return `c${randomBytes(16).toString("hex")}`;
}

function defaultOrgName(name: string | null, email: string): string {
  const label = name?.trim() || email.split("@")[0] || "Workspace";
  return `${label}'s workspace`;
}

async function tableExists(client: PoolClient, name: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [name],
  );
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(client: PoolClient, table: string, column: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS exists`,
    [table, column],
  );
  return Boolean(result.rows[0]?.exists);
}

async function dropFkIfExists(client: PoolClient, table: string, column: string): Promise<void> {
  const result = await client.query<{ conname: string }>(
    `SELECT con.conname
     FROM pg_constraint con
     JOIN pg_class rel ON rel.oid = con.conrelid
     JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
     WHERE con.contype = 'f' AND rel.relname = $1 AND att.attname = $2`,
    [table, column],
  );
  for (const row of result.rows) {
    await client.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname}"`);
  }
}

async function addFkIfMissing(
  client: PoolClient,
  table: string,
  constraint: string,
  sql: string,
): Promise<void> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1) AS exists`,
    [constraint],
  );
  if (!result.rows[0]?.exists) {
    await client.query(sql);
  }
}

async function migrate(client: PoolClient): Promise<void> {
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Organization" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "Membership" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      role "OrgRole" NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Membership_organizationId_userId_key"
    ON "Membership" ("organizationId", "userId")
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "Membership_userId_idx" ON "Membership" ("userId")`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "OrganizationInvite" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      email TEXT NOT NULL,
      role "OrgRole" NOT NULL,
      token TEXT NOT NULL,
      "invitedById" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvite_token_key" ON "OrganizationInvite" (token)`,
  );
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvite_organizationId_email_key"
     ON "OrganizationInvite" ("organizationId", email)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS "OrganizationInvite_email_idx" ON "OrganizationInvite" (email)`,
  );

  await client.query(`
    CREATE TABLE IF NOT EXISTS "OrganizationIntegration" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      "credentialsEnc" TEXT NOT NULL,
      "connectedByUserId" TEXT,
      "lastSyncedAt" TIMESTAMP(3),
      "lastSyncStatus" TEXT,
      "lastSyncError" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationIntegration_organizationId_type_key"
    ON "OrganizationIntegration" ("organizationId", type)
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS "OrganizationIntegration_organizationId_idx"
     ON "OrganizationIntegration" ("organizationId")`,
  );

  await client.query(`
    CREATE TABLE IF NOT EXISTS "ProjectConnectorBinding" (
      id TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "integrationId" TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      config JSONB NOT NULL,
      "lastSyncedAt" TIMESTAMP(3),
      "lastSyncStatus" TEXT,
      "lastSyncError" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL
    )
  `);
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ProjectConnectorBinding_projectId_key"
     ON "ProjectConnectorBinding" ("projectId")`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS "ProjectConnectorBinding_integrationId_idx"
     ON "ProjectConnectorBinding" ("integrationId")`,
  );

  if (!(await columnExists(client, "User", "activeOrganizationId"))) {
    await client.query(`ALTER TABLE "User" ADD COLUMN "activeOrganizationId" TEXT`);
  }
  if (!(await columnExists(client, "Project", "organizationId"))) {
    await client.query(`ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT`);
  }
  if (!(await columnExists(client, "Project", "createdByUserId"))) {
    await client.query(`ALTER TABLE "Project" ADD COLUMN "createdByUserId" TEXT`);
  }

  const users = await client.query<{ id: string; email: string; name: string | null }>(
    `SELECT id, email, name FROM "User"`,
  );

  let orgsCreated = 0;
  for (const user of users.rows) {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM "Membership" WHERE "userId" = $1 LIMIT 1`,
      [user.id],
    );
    if (existing.rows[0]) {
      await client.query(`UPDATE "User" SET "activeOrganizationId" = COALESCE("activeOrganizationId", $1) WHERE id = $2`, [
        (
          await client.query<{ organizationId: string }>(
            `SELECT "organizationId" FROM "Membership" WHERE "userId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
            [user.id],
          )
        ).rows[0]?.organizationId,
        user.id,
      ]);
      continue;
    }

    const orgId = newId();
    const membershipId = newId();
    const now = new Date();
    await client.query(
      `INSERT INTO "Organization" (id, name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $3)`,
      [orgId, defaultOrgName(user.name, user.email), now],
    );
    await client.query(
      `INSERT INTO "Membership" (id, "organizationId", "userId", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'OWNER', $4, $4)`,
      [membershipId, orgId, user.id, now],
    );
    await client.query(`UPDATE "User" SET "activeOrganizationId" = $1 WHERE id = $2`, [orgId, user.id]);
    orgsCreated += 1;
  }
  console.log(`✓ workspaces: ${orgsCreated} created for ${users.rows.length} users`);

  if (await columnExists(client, "Project", "userId")) {
    const updated = await client.query(
      `UPDATE "Project" p
       SET "organizationId" = m."organizationId",
           "createdByUserId" = p."userId"
       FROM "Membership" m
       WHERE m."userId" = p."userId"
         AND (p."organizationId" IS NULL OR p."createdByUserId" IS NULL)`,
    );
    console.log(`✓ projects backfilled: ${updated.rowCount ?? 0}`);
  } else {
    console.log("✓ Project.userId already dropped");
  }

  const unscoped = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "Project" WHERE "organizationId" IS NULL`,
  );
  if (Number(unscoped.rows[0]?.count ?? 0) > 0) {
    throw new Error(`${unscoped.rows[0].count} projects have no organizationId — refusing to continue`);
  }

  if (await tableExists(client, "Connector")) {
    const connectors = await client.query<{
      id: string;
      projectId: string;
      type: string;
      status: string;
      credentialsEnc: string;
      config: unknown;
      lastSyncedAt: Date | null;
      lastSyncStatus: string | null;
      lastSyncError: string | null;
      createdAt: Date;
      updatedAt: Date;
      organizationId: string;
      createdByUserId: string | null;
    }>(
      `SELECT c.id, c."projectId", c.type, c.status, c."credentialsEnc", c.config,
              c."lastSyncedAt", c."lastSyncStatus", c."lastSyncError", c."createdAt", c."updatedAt",
              p."organizationId", p."createdByUserId"
       FROM "Connector" c
       JOIN "Project" p ON p.id = c."projectId"
       ORDER BY c."updatedAt" DESC`,
    );

    const integrationByOrgType = new Map<string, string>();
    let integrations = 0;
    let bindings = 0;

    for (const connector of connectors.rows) {
      const key = `${connector.organizationId}:${connector.type}`;
      let integrationId = integrationByOrgType.get(key);
      if (!integrationId) {
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM "OrganizationIntegration" WHERE "organizationId" = $1 AND type = $2`,
          [connector.organizationId, connector.type],
        );
        if (existing.rows[0]) {
          integrationId = existing.rows[0].id;
        } else {
          integrationId = newId();
          await client.query(
            `INSERT INTO "OrganizationIntegration"
              (id, "organizationId", type, status, "credentialsEnc", "connectedByUserId",
               "lastSyncedAt", "lastSyncStatus", "lastSyncError", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              integrationId,
              connector.organizationId,
              connector.type,
              connector.status === "DISCONNECTED" ? "DISCONNECTED" : "ACTIVE",
              connector.credentialsEnc,
              connector.createdByUserId,
              connector.lastSyncedAt,
              connector.lastSyncStatus,
              connector.lastSyncError,
              connector.createdAt,
              connector.updatedAt,
            ],
          );
          integrations += 1;
        }
        integrationByOrgType.set(key, integrationId);
      }

      const alreadyBound = await client.query<{ id: string }>(
        `SELECT id FROM "ProjectConnectorBinding" WHERE "projectId" = $1`,
        [connector.projectId],
      );
      if (alreadyBound.rows[0]) {
        continue;
      }

      await client.query(
        `INSERT INTO "ProjectConnectorBinding"
          (id, "projectId", "integrationId", type, status, config,
           "lastSyncedAt", "lastSyncStatus", "lastSyncError", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)`,
        [
          newId(),
          connector.projectId,
          integrationId,
          connector.type,
          connector.status,
          JSON.stringify(connector.config ?? {}),
          connector.lastSyncedAt,
          connector.lastSyncStatus,
          connector.lastSyncError,
          connector.createdAt,
          connector.updatedAt,
        ],
      );
      bindings += 1;
    }

    console.log(`✓ connectors collapsed: ${integrations} org integrations, ${bindings} project bindings`);
    await dropFkIfExists(client, "Connector", "projectId");
    await client.query(`DROP TABLE IF EXISTS "Connector"`);
    console.log("✓ Connector table dropped");
  } else {
    console.log("✓ Connector table already gone");
  }

  await client.query(`ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL`);

  if (await columnExists(client, "Project", "userId")) {
    await dropFkIfExists(client, "Project", "userId");
    await client.query(`ALTER TABLE "Project" DROP COLUMN "userId"`);
    console.log("✓ Project.userId dropped");
  }

  if (await columnExists(client, "Report", "userId")) {
    await dropFkIfExists(client, "Report", "userId");
    await client.query(`ALTER TABLE "Report" ALTER COLUMN "userId" DROP NOT NULL`);
  }

  await addFkIfMissing(
    client,
    "Membership",
    "Membership_organizationId_fkey",
    `ALTER TABLE "Membership"
     ADD CONSTRAINT "Membership_organizationId_fkey"
     FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "Membership",
    "Membership_userId_fkey",
    `ALTER TABLE "Membership"
     ADD CONSTRAINT "Membership_userId_fkey"
     FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "OrganizationInvite",
    "OrganizationInvite_organizationId_fkey",
    `ALTER TABLE "OrganizationInvite"
     ADD CONSTRAINT "OrganizationInvite_organizationId_fkey"
     FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "OrganizationInvite",
    "OrganizationInvite_invitedById_fkey",
    `ALTER TABLE "OrganizationInvite"
     ADD CONSTRAINT "OrganizationInvite_invitedById_fkey"
     FOREIGN KEY ("invitedById") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "OrganizationIntegration",
    "OrganizationIntegration_organizationId_fkey",
    `ALTER TABLE "OrganizationIntegration"
     ADD CONSTRAINT "OrganizationIntegration_organizationId_fkey"
     FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "OrganizationIntegration",
    "OrganizationIntegration_connectedByUserId_fkey",
    `ALTER TABLE "OrganizationIntegration"
     ADD CONSTRAINT "OrganizationIntegration_connectedByUserId_fkey"
     FOREIGN KEY ("connectedByUserId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "Project",
    "Project_organizationId_fkey",
    `ALTER TABLE "Project"
     ADD CONSTRAINT "Project_organizationId_fkey"
     FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "Project",
    "Project_createdByUserId_fkey",
    `ALTER TABLE "Project"
     ADD CONSTRAINT "Project_createdByUserId_fkey"
     FOREIGN KEY ("createdByUserId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "ProjectConnectorBinding",
    "ProjectConnectorBinding_projectId_fkey",
    `ALTER TABLE "ProjectConnectorBinding"
     ADD CONSTRAINT "ProjectConnectorBinding_projectId_fkey"
     FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "ProjectConnectorBinding",
    "ProjectConnectorBinding_integrationId_fkey",
    `ALTER TABLE "ProjectConnectorBinding"
     ADD CONSTRAINT "ProjectConnectorBinding_integrationId_fkey"
     FOREIGN KEY ("integrationId") REFERENCES "OrganizationIntegration"(id) ON DELETE CASCADE ON UPDATE CASCADE`,
  );
  await addFkIfMissing(
    client,
    "Report",
    "Report_userId_fkey",
    `ALTER TABLE "Report"
     ADD CONSTRAINT "Report_userId_fkey"
     FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE`,
  );
}

async function main(): Promise<void> {
  loadEnv();
  const connectionString = process.env.DATABASE_URL ?? "";
  if (!connectionString.startsWith("postgres")) {
    throw new Error("DATABASE_URL must be a direct postgres:// or postgresql:// URL");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await migrate(client);
    await client.query("COMMIT");
    console.log("\n✓ Epic 1 org backfill committed. Next: npx prisma generate && npx prisma db push");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("✗ migrate-epic-1-org failed:", error);
  process.exit(1);
});
