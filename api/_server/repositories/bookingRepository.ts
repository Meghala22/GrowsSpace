import type { PoolClient } from "pg";
import { query, queryWithClient } from "../db/pool";
import type {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../../shared/contracts";

export interface BookingRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  service_id: string;
  service_name: string;
  slot_id: string;
  slot_type: "WORKSHOP" | "STATION";
  slot_date: string;
  start_time: string;
  end_time: string;
  attendee_count: number;
  phone_number: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_amount_cents: number;
  payment_reference: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

interface BookingOverviewRecord {
  total_bookings: string;
  confirmed_bookings: string;
  cancelled_bookings: string;
  today_bookings: string;
  upcoming_bookings: string;
  total_attendees: string;
  total_revenue_cents: string;
}

export const bookingRepository = {
  async findByUserAndSlotForUpdate(client: PoolClient, userId: string, slotId: string) {
    const result = await queryWithClient<BookingRecord>(
      client,
      `
        select
          bookings.*,
          users.name as user_name,
          users.email as user_email,
          services.name as service_name,
          slots.slot_type,
          slots.slot_date,
          slots.start_time,
          slots.end_time
        from bookings
        inner join users on users.id = bookings.user_id
        inner join services on services.id = bookings.service_id
        inner join slots on slots.id = bookings.slot_id
        where bookings.user_id = $1 and bookings.slot_id = $2
        for update
      `,
      [userId, slotId],
    );

    return result.rows[0];
  },

  async create(
    client: PoolClient,
    input: {
      userId: string;
      serviceId: string;
      slotId: string;
      attendeeCount: number;
      phoneNumber: string;
      paymentMethod: PaymentMethod;
      paymentStatus: PaymentStatus;
      paymentAmountCents: number;
      paymentReference?: string;
      status?: BookingStatus;
    },
  ) {
    const result = await queryWithClient<BookingRecord>(
      client,
      `
        insert into bookings (
          user_id,
          service_id,
          slot_id,
          attendee_count,
          phone_number,
          payment_method,
          payment_status,
          payment_amount_cents,
          payment_reference,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning
          bookings.*,
          ''::text as user_name,
          ''::text as user_email,
          ''::text as service_name,
          'WORKSHOP'::slot_type as slot_type,
          current_date as slot_date,
          '00:00'::time as start_time,
          '00:00'::time as end_time
      `,
      [
        input.userId,
        input.serviceId,
        input.slotId,
        input.attendeeCount,
        input.phoneNumber,
        input.paymentMethod,
        input.paymentStatus,
        input.paymentAmountCents,
        input.paymentReference ?? null,
        input.status ?? "CONFIRMED",
      ],
    );

    return result.rows[0];
  },

  async findForUpdate(client: PoolClient, bookingId: string) {
    const result = await queryWithClient<BookingRecord>(
      client,
      `
        select
          bookings.*,
          users.name as user_name,
          users.email as user_email,
          services.name as service_name,
          slots.slot_type,
          slots.slot_date,
          slots.start_time,
          slots.end_time
        from bookings
        inner join users on users.id = bookings.user_id
        inner join services on services.id = bookings.service_id
        inner join slots on slots.id = bookings.slot_id
        where bookings.id = $1
        for update
      `,
      [bookingId],
    );

    return result.rows[0];
  },

  async updateStatus(
    client: PoolClient,
    bookingId: string,
    status: BookingStatus,
    paymentStatus?: PaymentStatus,
  ) {
    await queryWithClient(
      client,
      `
        update bookings
        set status = $2,
            payment_status = coalesce($3, payment_status),
            updated_at = now()
        where id = $1
      `,
      [bookingId, status, paymentStatus ?? null],
    );
  },

  async listMyBookings(userId: string) {
    const result = await query<BookingRecord>(
      `
        select
          bookings.*,
          users.name as user_name,
          users.email as user_email,
          services.name as service_name,
          slots.slot_type,
          slots.slot_date,
          slots.start_time,
          slots.end_time
        from bookings
        inner join users on users.id = bookings.user_id
        inner join services on services.id = bookings.service_id
        inner join slots on slots.id = bookings.slot_id
        where bookings.user_id = $1
        order by slots.slot_date desc, slots.start_time desc
      `,
      [userId],
    );

    return result.rows;
  },

  async listAdminBookings(filters: { serviceId?: string; date?: string }) {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters.serviceId) {
      values.push(filters.serviceId);
      conditions.push(`bookings.service_id = $${values.length}`);
    }

    if (filters.date) {
      values.push(filters.date);
      conditions.push(`slots.slot_date = $${values.length}::date`);
    }

    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const result = await query<BookingRecord>(
      `
        select
          bookings.*,
          users.name as user_name,
          users.email as user_email,
          services.name as service_name,
          slots.slot_type,
          slots.slot_date,
          slots.start_time,
          slots.end_time
        from bookings
        inner join users on users.id = bookings.user_id
        inner join services on services.id = bookings.service_id
        inner join slots on slots.id = bookings.slot_id
        ${whereClause}
        order by slots.slot_date desc, slots.start_time desc, bookings.created_at desc
      `,
      values,
    );

    return result.rows;
  },

  async getOverview() {
    const result = await query<BookingOverviewRecord>(
      `
        select
          count(*)::text as total_bookings,
          count(*) filter (where bookings.status = 'CONFIRMED')::text as confirmed_bookings,
          count(*) filter (where bookings.status = 'CANCELLED')::text as cancelled_bookings,
          count(*) filter (
            where bookings.status = 'CONFIRMED'
              and slots.slot_date = current_date
          )::text as today_bookings,
          count(*) filter (
            where bookings.status = 'CONFIRMED'
              and slots.slot_date >= current_date
          )::text as upcoming_bookings,
          coalesce(sum(bookings.attendee_count) filter (where bookings.status = 'CONFIRMED'), 0)::text as total_attendees,
          coalesce(sum(bookings.payment_amount_cents) filter (where bookings.status = 'CONFIRMED'), 0)::text as total_revenue_cents
        from bookings
        inner join slots on slots.id = bookings.slot_id
      `,
    );

    return result.rows[0];
  },
};
