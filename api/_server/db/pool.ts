import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { serverConfig } from "../config";

const globalPool = globalThis as typeof globalThis & { __growspacePool?: Pool };

function createPool() {
  return new Pool({
    connectionString: serverConfig.databaseUrl(),
    ssl: serverConfig.useDatabaseSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}

function getPool() {
  if (!globalPool.__growspacePool) {
    globalPool.__growspacePool = createPool();
  }

  return globalPool.__growspacePool;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();

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
  const result = await getPool().query<T>(text, values);
  return result;
}

export async function queryWithClient<T extends QueryResultRow>(
  client: PoolClient,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return client.query<T>(text, values);
}
