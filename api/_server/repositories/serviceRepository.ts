import { query } from "../db/pool";

export interface ServiceRecord {
  id: string;
  name: string;
  description: string;
  category: "WORKSHOP" | "STATION";
  price_cents: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const serviceRepository = {
  async listAll() {
    const result = await query<ServiceRecord>(
      `
        select *
        from services
        order by
          case category when 'WORKSHOP' then 0 else 1 end,
          active desc,
          name asc
      `,
    );

    return result.rows;
  },

  async listActive() {
    const result = await query<ServiceRecord>(
      `
        select *
        from services
        where active = true
        order by
          case category when 'WORKSHOP' then 0 else 1 end,
          name asc
      `,
    );

    return result.rows;
  },

  async create(input: {
    name: string;
    description: string;
    category: "WORKSHOP" | "STATION";
    priceCents: number;
    active: boolean;
  }) {
    const result = await query<ServiceRecord>(
      `
        insert into services (name, description, category, price_cents, active)
        values ($1, $2, $3, $4, $5)
        returning *
      `,
      [
        input.name,
        input.description,
        input.category,
        input.priceCents,
        input.active,
      ],
    );

    return result.rows[0];
  },

  async update(
    id: string,
    input: {
      name: string;
      description: string;
      category: "WORKSHOP" | "STATION";
      priceCents: number;
      active: boolean;
    },
  ) {
    const result = await query<ServiceRecord>(
      `
        update services
        set
          name = $2,
          description = $3,
          category = $4,
          price_cents = $5,
          active = $6,
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        id,
        input.name,
        input.description,
        input.category,
        input.priceCents,
        input.active,
      ],
    );

    return result.rows[0];
  },
};
