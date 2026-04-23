import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { getSslConfig, requireEnv } from "./env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
const sql = await fs.readFile(schemaPath, "utf8");

const client = new Client({
  connectionString: requireEnv("DATABASE_URL"),
  ssl: getSslConfig(),
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Database schema applied successfully.");
} finally {
  await client.end().catch(() => undefined);
}
