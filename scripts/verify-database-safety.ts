import { validateDevelopmentDatabaseUrls } from "../src/lib/db/development-database-safety";

function expectAccepted(url: string): void {
  validateDevelopmentDatabaseUrls({ DATABASE_URL: url, DIRECT_URL: url });
}

function expectRejected(label: string, url: string, extra = {}): void {
  try {
    validateDevelopmentDatabaseUrls({ DATABASE_URL: url, DIRECT_URL: url, ...extra });
  } catch {
    console.log(`✓ rejected ${label}`);
    return;
  }
  throw new Error(`Expected database guard to reject ${label}`);
}

const safeUrl = "postgresql://delivery_pulse@127.0.0.1:5432/delivery_pulse_development";
expectAccepted(safeUrl);
console.log("✓ accepted dedicated local development database");

for (const database of ["template0", "template1", "postgres"]) {
  expectRejected(
    `system database ${database}`,
    `postgresql://delivery_pulse@127.0.0.1:5432/${database}`,
  );
}

expectRejected(
  "production-labelled host",
  "postgresql://delivery_pulse@example-prod.postgres.database.azure.com/delivery_pulse_development",
  { ALLOW_NONLOCAL_DEVELOPMENT_DATABASE: "true" },
);
expectRejected(
  "known production host",
  "postgresql://delivery_pulse@database.example.com/delivery_pulse_development",
  {
    ALLOW_NONLOCAL_DEVELOPMENT_DATABASE: "true",
    PRODUCTION_DATABASE_HOSTS: "database.example.com",
  },
);
expectRejected(
  "unapproved non-local host",
  "postgresql://delivery_pulse@development.example.com/delivery_pulse_development",
);

try {
  validateDevelopmentDatabaseUrls({
    DATABASE_URL: safeUrl,
    DIRECT_URL: "postgresql://delivery_pulse@127.0.0.1:5432/another_database",
  });
  throw new Error("Expected database guard to reject mismatched URLs");
} catch (error) {
  if (error instanceof Error && error.message.startsWith("Expected")) throw error;
  console.log("✓ rejected mismatched DATABASE_URL and DIRECT_URL");
}

console.log("\n✓ database safety guard verification passed");
