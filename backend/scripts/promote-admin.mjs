import { Client } from "pg";
import { getSslConfig, requireEnv } from "./env.mjs";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run promote:admin -- <email>");
  process.exit(1);
}

const client = new Client({
  connectionString: requireEnv("DATABASE_URL"),
  ssl: getSslConfig(),
});

try {
  await client.connect();
  const result = await client.query(
    `
      update users
      set role = 'ADMIN',
          updated_at = now()
      where email = $1
      returning id, email, role
    `,
    [email],
  );

  if (result.rowCount === 0) {
    console.error(`No user found for ${email}. Register the account first, then run the script again.`);
    process.exit(1);
  }

  console.log(`Promoted ${result.rows[0].email} to ${result.rows[0].role}.`);
} finally {
  await client.end();
}
