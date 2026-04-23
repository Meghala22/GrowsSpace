import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");

const candidateFiles = [
  path.join(rootDir, ".env.local"),
  path.join(rootDir, ".env"),
];

for (const filePath of candidateFiles) {
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath, override: false });
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSslConfig() {
  return process.env.DATABASE_SSL !== "false" ? { rejectUnauthorized: false } : undefined;
}
