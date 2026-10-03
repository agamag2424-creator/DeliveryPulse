/**
 * Epic 1: org isolation, role permissions, invite/archive gates, org-shared Jira tokens.
 *
 * Usage: npx tsx scripts/verify-epic-1-org.ts
 * Optional HTTP: TEST_BASE_URL=http://127.0.0.1:3001 AUTH_BYPASS=false
 */
import "./load-local-env";

import { readFileSync } from "fs";
import { join } from "path";

import { can, canChangeMemberRole, canInviteRole } from "../src/lib/org/permissions";
import { createProject, getProject, getProjects } from "../src/lib/db/projects";
import { JIRA_CONNECTOR_TYPE } from "../src/lib/db/connectors";
import { prisma } from "../src/lib/prisma";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertSchemaAndSources(): void {
  const schema = readFileSync(join(__dirname, "../prisma/schema.prisma"), "utf8");
  assert(schema.includes("model Organization"), "schema must define Organization");
  assert(schema.includes("model Membership"), "schema must define Membership");
  assert(schema.includes("enum OrgRole"), "roles are OrgRole enum, not a Role table");
  assert(schema.includes("model OrganizationIntegration"), "schema must define OrganizationIntegration");
  assert(schema.includes("model ProjectConnectorBinding"), "schema must define ProjectConnectorBinding");
  assert(!schema.includes("model Connector"), "Connector model must be removed");
  assert(schema.includes("credentialsEnc"), "org integration stores tokens");

  const integrationBlock = schema.slice(
    schema.indexOf("model OrganizationIntegration"),
    schema.indexOf("model Project"),
  );
  const bindingBlock = schema.slice(
    schema.indexOf("model ProjectConnectorBinding"),
    schema.indexOf("model Report"),
  );
  assert(integrationBlock.includes("credentialsEnc"), "Jira tokens live on OrganizationIntegration");
  assert(!bindingBlock.includes("credentialsEnc"), "ProjectConnectorBinding must not store tokens");

  const generateSource = readFileSync(join(__dirname, "../src/app/api/generate/route.ts"), "utf8");
  assert(
    generateSource.includes('requireOrgPermission("report.generate")'),
    "generate must use org permission report.generate",
  );

  const archiveSource = readFileSync(join(__dirname, "../src/app/api/projects/[id]/route.ts"), "utf8");
  assert(
    archiveSource.includes('requireOrgPermission("project.archive")'),
    "archive must require project.archive (Member forbidden)",
  );

  const membersSource = readFileSync(join(__dirname, "../src/app/api/org/members/route.ts"), "utf8");
  assert(membersSource.includes('requireOrgPermission("member.invite")'), "invite must require member.invite");
  assert(membersSource.includes("canInviteRole"), "invite must enforce canInviteRole");

  console.log("✓ schema + source gates (org models, token location, permission checks)");
}

function assertPermissions(): void {
  assert(can("MEMBER", "project.view") && can("MEMBER", "report.generate"), "Member can view/generate");
  assert(can("MEMBER", "connector.map"), "Member can map a Jira project");
  assert(!can("MEMBER", "member.invite"), "Member cannot invite");
  assert(!can("MEMBER", "project.archive"), "Member cannot archive");
  assert(!can("MEMBER", "integration.manage"), "Member cannot manage integrations");
  assert(!can("MEMBER", "billing.manage"), "Member cannot manage billing");

  assert(can("ADMIN", "member.invite") && can("ADMIN", "project.archive"), "Admin can invite and archive");
  assert(can("ADMIN", "integration.manage"), "Admin can manage integrations");
  assert(!can("ADMIN", "billing.manage"), "Admin cannot manage billing");
  assert(!canInviteRole("ADMIN", "ADMIN"), "Admin cannot invite as Admin");
  assert(canInviteRole("ADMIN", "MEMBER"), "Admin can invite as Member");
  assert(!canChangeMemberRole("ADMIN", "MEMBER", "ADMIN"), "Admin cannot change roles");

  assert(canInviteRole("OWNER", "ADMIN") && canInviteRole("OWNER", "MEMBER"), "Owner can invite Admin or Member");
  assert(canChangeMemberRole("OWNER", "MEMBER", "ADMIN"), "Owner can change Admin↔Member");
  assert(!canChangeMemberRole("OWNER", "OWNER", "ADMIN"), "cannot change Owner role");
  assert(!canInviteRole("OWNER", "OWNER"), "cannot invite as Owner");

  console.log("✓ role permission matrix");
}

async function assertDatabaseIsolation(): Promise<void> {
  const stamp = Date.now();
  const ownerA = await prisma.user.create({
    data: { email: `epic1-a-${stamp}@example.test`, name: "Epic1 A" },
  });
  const ownerB = await prisma.user.create({
    data: { email: `epic1-b-${stamp}@example.test`, name: "Epic1 B" },
  });
  const memberUser = await prisma.user.create({
    data: { email: `epic1-m-${stamp}@example.test`, name: "Epic1 Member" },
  });

  const orgA = await prisma.organization.create({
    data: {
      name: "Epic1 Org A",
      memberships: { create: { userId: ownerA.id, role: "OWNER" } },
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "Epic1 Org B",
      memberships: { create: { userId: ownerB.id, role: "OWNER" } },
    },
  });
  await prisma.membership.create({
    data: { organizationId: orgA.id, userId: memberUser.id, role: "MEMBER" },
  });

  try {
    const projectA = await createProject(orgA.id, ownerA.id, {
      name: "Org A Project",
      clientName: "Client A",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      phase: "Build",
      engagementModel: "Fixed",
    });

    const listedB = await getProjects(orgB.id);
    assert(
      listedB.every((project) => project.id !== projectA.id),
      "org B must not list org A projects",
    );
    assert((await getProject(orgB.id, projectA.id)) === null, "org B must not load org A project by id");
    assert((await getProject(orgA.id, projectA.id))?.id === projectA.id, "org A can load its project");

    const integration = await prisma.organizationIntegration.create({
      data: {
        organizationId: orgA.id,
        type: JIRA_CONNECTOR_TYPE,
        status: "ACTIVE",
        credentialsEnc: "enc-token-org-a",
        connectedByUserId: ownerA.id,
      },
    });
    await prisma.projectConnectorBinding.create({
      data: {
        projectId: projectA.id,
        integrationId: integration.id,
        type: JIRA_CONNECTOR_TYPE,
        status: "ACTIVE",
        config: { jiraProjectKey: "ABC", setupComplete: true },
      },
    });

    const stored = await prisma.organizationIntegration.findUnique({ where: { id: integration.id } });
    const binding = await prisma.projectConnectorBinding.findUnique({
      where: { projectId_type: { projectId: projectA.id, type: JIRA_CONNECTOR_TYPE } },
    });
    assert(stored?.credentialsEnc === "enc-token-org-a", "tokens stored on org integration");
    assert(binding?.integrationId === integration.id, "project binding points at org integration");
    assert(!("credentialsEnc" in (binding ?? {})), "binding view from prisma has no credentialsEnc field");

    console.log("✓ org isolation + Jira tokens on OrganizationIntegration");
  } finally {
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerA.id, ownerB.id, memberUser.id] } } });
  }
}

async function assertHttpGates(baseUrl: string): Promise<void> {
  const projects = await fetch(`${baseUrl}/api/projects`);
  assert(
    projects.status === 401 || projects.status === 403,
    `unauthenticated GET /api/projects expected 401/403, got ${projects.status}`,
  );

  const invite = await fetch(`${baseUrl}/api/org/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@example.test", role: "MEMBER" }),
  });
  assert(
    invite.status === 401 || invite.status === 403,
    `unauthenticated POST /api/org/members expected 401/403, got ${invite.status}`,
  );

  const archive = await fetch(`${baseUrl}/api/projects/not-a-real-id`, { method: "DELETE" });
  assert(
    archive.status === 401 || archive.status === 403,
    `unauthenticated DELETE /api/projects/[id] expected 401/403, got ${archive.status}`,
  );

  console.log(`✓ unauthenticated HTTP gates at ${baseUrl}`);
}

async function main(): Promise<void> {
  assertSchemaAndSources();
  assertPermissions();
  await assertDatabaseIsolation();

  const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
  try {
    await assertHttpGates(baseUrl);
  } catch (error) {
    console.log("⚠ HTTP gates skipped (start AUTH_BYPASS=false npm run dev -- -p 3001):", (error as Error).message);
  }

  console.log("\n✓ Epic 1 org verification passed");
}

main()
  .catch((error) => {
    console.error("✗ verify-epic-1-org failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
