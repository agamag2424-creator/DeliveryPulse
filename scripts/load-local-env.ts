import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

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

const root = resolve(__dirname, "..");
applyEnvFile(resolve(root, ".env"), false);
applyEnvFile(resolve(root, ".env.local"), true);
