import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { serverConfig } from "../config";

const globalPool = globalThis as typeof globalThis & { __growspacePool?: Pool };

export const pool =
  globalPool.__growspacePool ||
  new Pool({
    connectionString: serverConfig.databaseUrl(),
    ssl: serverConfig.useDatabaseSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

if (!globalPool.__growspacePool) {
  globalPool.__growspacePool = pool;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await pool.query<T>(text, values);
  return result;
}

export async function queryWithClient<T extends QueryResultRow>(
  client: PoolClient,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return client.query<T>(text, values);
}
