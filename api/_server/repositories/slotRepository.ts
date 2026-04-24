import type { PoolClient } from "pg";
import { query, queryWithClient } from "../db/pool";

export interface SlotRecord {
  id: string;
  service_id: string;
  service_name: string;
  service_price_cents: number;
  slot_type: "WORKSHOP" | "STATION";
  slot_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_capacity: number;
  booked_count: number;
  created_at: string;
  updated_at: string;
}

interface SlotOverviewRecord {
  total_slots: string;
  today_slots: string;
  upcoming_slots: string;
  total_capacity: string;
  booked_capacity: string;
  open_capacity: string;
}

export const slotRepository = {
  async create(
    client: PoolClient,
    input: {
      serviceId: string;
      slotType: "WORKSHOP" | "STATION";
      slotDate: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      maxCapacity: number;
    },
  ) {
    const result = await queryWithClient<SlotRecord>(
      client,
      `
        insert into slots (
          service_id,
          slot_type,
          slot_date,
          start_time,
          end_time,
          duration_minutes,
          max_capacity
        )
        select
          $1,
          $2,
          $3::date,
          $4::time,
          $5::time,
          $6,
          $7
        from services
        where id = $1 and active = true
        returning
          slots.*,
          (select name from services where services.id = slots.service_id) as service_name,
          (select price_cents from services where services.id = slots.service_id) as service_price_cents
      `,
      [
        input.serviceId,
        input.slotType,
        input.slotDate,
        input.startTime,
        input.endTime,
        input.durationMinutes,
        input.maxCapacity,
      ],
    );

    return result.rows[0];
  },

  async listByFilters(filters: {
    serviceId?: string;
    date?: string;
    availableOnly?: boolean;
  }) {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.serviceId) {
      values.push(filters.serviceId);
      conditions.push(`slots.service_id = $${values.length}`);
    }

    if (filters.date) {
      values.push(filters.date);
      conditions.push(`slots.slot_date = $${values.length}::date`);
    }

    if (filters.availableOnly) {
      conditions.push("slots.booked_count < slots.max_capacity");
      conditions.push("slots.slot_date >= current_date");
    }

    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await query<SlotRecord>(
      `
        select
          slots.*,
          services.name as service_name,
          services.price_cents as service_price_cents
        from slots
        inner join services on services.id = slots.service_id
        ${whereClause}
        order by slots.slot_date asc, slots.start_time asc
      `,
      values,
    );

    return result.rows;
  },

  async findForUpdate(client: PoolClient, slotId: string) {
    const result = await queryWithClient<SlotRecord>(
      client,
      `
        select
          slots.*,
          services.name as service_name,
          services.price_cents as service_price_cents
        from slots
        inner join services on services.id = slots.service_id
        where slots.id = $1
        for update
      `,
      [slotId],
    );

    return result.rows[0];
  },

  async incrementBookedCount(client: PoolClient, slotId: string, attendeeCount: number) {
    await queryWithClient(
      client,
      `
        update slots
        set booked_count = booked_count + $2,
            updated_at = now()
        where id = $1
      `,
      [slotId, attendeeCount],
    );
  },

  async decrementBookedCount(client: PoolClient, slotId: string, attendeeCount: number) {
    await queryWithClient(
      client,
      `
        update slots
        set booked_count = greatest(booked_count - $2, 0),
            updated_at = now()
        where id = $1
      `,
      [slotId, attendeeCount],
    );
  },

  async getOverview() {
    const result = await query<SlotOverviewRecord>(
      `
        select
          count(*)::text as total_slots,
          count(*) filter (where slot_date = current_date)::text as today_slots,
          count(*) filter (where slot_date >= current_date)::text as upcoming_slots,
          coalesce(sum(max_capacity), 0)::text as total_capacity,
          coalesce(sum(booked_count), 0)::text as booked_capacity,
          coalesce(sum(max_capacity - booked_count), 0)::text as open_capacity
        from slots
      `,
    );

    return result.rows[0];
  },
};
