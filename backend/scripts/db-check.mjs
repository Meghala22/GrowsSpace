import { Client } from "pg";
import { getSslConfig, requireEnv } from "./env.mjs";

const client = new Client({
  connectionString: requireEnv("DATABASE_URL"),
  ssl: getSslConfig(),
});

try {
  await client.connect();
  const result = await client.query("select current_database() as database_name, now() as connected_at");
  const row = result.rows[0];
  console.log(`Connected to database "${row.database_name}" at ${row.connected_at}.`);
} finally {
  await client.end().catch(() => undefined);
}
