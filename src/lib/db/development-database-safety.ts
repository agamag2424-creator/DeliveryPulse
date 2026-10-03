const SYSTEM_DATABASES = new Set(["postgres", "template0", "template1"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export interface DevelopmentDatabaseEnvironment {
  DATABASE_URL?: string;
  DIRECT_URL?: string;
  PRODUCTION_DATABASE_HOSTS?: string;
  ALLOW_NONLOCAL_DEVELOPMENT_DATABASE?: string;
}

function parseDatabaseUrl(name: "DATABASE_URL" | "DIRECT_URL", value: string | undefined): URL {
  if (!value?.trim()) {
    throw new Error(`${name} must be set to a dedicated development database`);
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL`);
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${name} must use postgres:// or postgresql://`);
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, "")).trim().toLowerCase();
  if (!database) {
    throw new Error(`${name} must name a dedicated development database`);
  }
  if (SYSTEM_DATABASES.has(database)) {
    throw new Error(`${name} refuses PostgreSQL system database '${database}'`);
  }

  return parsed;
}

function productionHosts(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

function databaseName(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, "")).trim().toLowerCase();
}

export function validateDevelopmentDatabaseUrls(env: DevelopmentDatabaseEnvironment): void {
  const databaseUrl = parseDatabaseUrl("DATABASE_URL", env.DATABASE_URL);
  const directUrl = parseDatabaseUrl("DIRECT_URL", env.DIRECT_URL);
  const blockedHosts = productionHosts(env.PRODUCTION_DATABASE_HOSTS);

  for (const [name, url] of [
    ["DATABASE_URL", databaseUrl],
    ["DIRECT_URL", directUrl],
  ] as const) {
    const host = url.hostname.toLowerCase();
    if (blockedHosts.has(host)) {
      throw new Error(`${name} refuses a host listed in PRODUCTION_DATABASE_HOSTS`);
    }
    if (/(^|[.-])prod(uction)?([.-]|$)/i.test(host)) {
      throw new Error(`${name} refuses a production-labelled database host`);
    }
    if (!LOCAL_HOSTS.has(host) && env.ALLOW_NONLOCAL_DEVELOPMENT_DATABASE !== "true") {
      throw new Error(
        `${name} refuses non-local host '${host}'; set ALLOW_NONLOCAL_DEVELOPMENT_DATABASE=true only for an approved non-production development host`,
      );
    }
  }

  if (
    databaseUrl.hostname.toLowerCase() !== directUrl.hostname.toLowerCase() ||
    databaseUrl.port !== directUrl.port ||
    databaseName(databaseUrl) !== databaseName(directUrl)
  ) {
    throw new Error("DATABASE_URL and DIRECT_URL must target the same dedicated development database");
  }
}

export function assertSafeDevelopmentDatabaseEnvironment(): void {
  validateDevelopmentDatabaseUrls({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    PRODUCTION_DATABASE_HOSTS: process.env.PRODUCTION_DATABASE_HOSTS,
    ALLOW_NONLOCAL_DEVELOPMENT_DATABASE: process.env.ALLOW_NONLOCAL_DEVELOPMENT_DATABASE,
  });
}
