import type { PoolClient } from "pg";
import { query, queryWithClient } from "../db/pool";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "ADMIN" | "USER";
  created_at: string;
  updated_at: string;
}

interface UserCountsRecord {
  total_users: string;
  total_admins: string;
}

function normalize(record: UserRecord | undefined) {
  return record;
}

export const userRepository = {
  async findByEmail(email: string, client?: PoolClient) {
    const executor = client
      ? queryWithClient<UserRecord>(client, "select * from users where email = $1 limit 1", [email])
      : query<UserRecord>("select * from users where email = $1 limit 1", [email]);

    const result = await executor;
    return normalize(result.rows[0]);
  },

  async findById(id: string, client?: PoolClient) {
    const executor = client
      ? queryWithClient<UserRecord>(client, "select * from users where id = $1 limit 1", [id])
      : query<UserRecord>("select * from users where id = $1 limit 1", [id]);

    const result = await executor;
    return normalize(result.rows[0]);
  },

  async create(
    client: PoolClient,
    input: { name: string; email: string; passwordHash: string; role?: "ADMIN" | "USER" },
  ) {
    const result = await queryWithClient<UserRecord>(
      client,
      `
        insert into users (name, email, password_hash, role)
        values ($1, $2, $3, $4)
        returning *
      `,
      [input.name, input.email, input.passwordHash, input.role ?? "USER"],
    );

    return result.rows[0];
  },

  async getCounts() {
    const result = await query<UserCountsRecord>(
      `
        select
          count(*)::text as total_users,
          count(*) filter (where role = 'ADMIN')::text as total_admins
        from users
      `,
    );

    return result.rows[0];
  },

  async listAll() {
    const result = await query<UserRecord>(
      `
        select *
        from users
        order by
          case role when 'ADMIN' then 0 else 1 end,
          created_at asc
      `,
    );

    return result.rows;
  },

  async updateRole(id: string, role: "ADMIN" | "USER") {
    const result = await query<UserRecord>(
      `
        update users
        set role = $2,
            updated_at = now()
        where id = $1
        returning *
      `,
      [id, role],
    );

    return result.rows[0];
  },
};
