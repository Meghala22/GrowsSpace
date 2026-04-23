import type { RequestContext } from "../types";
import { ok } from "../lib/http";
import { adminBookingQuerySchema, createBookingSchema } from "../validation/schemas";
import { bookingService } from "../services/bookingService";

export const bookingController = {
  async create(context: RequestContext) {
    const payload = createBookingSchema.parse(context.body);
    const result = await bookingService.createBooking({
      userId: context.user!.id,
      slotId: payload.slotId,
      attendeeCount: payload.attendeeCount,
      phoneNumber: payload.phoneNumber,
      paymentMethod: payload.paymentMethod,
      paymentReference: payload.paymentReference,
    });
    return ok(result, 201);
  },

  async myBookings(context: RequestContext) {
    const result = await bookingService.listMyBookings(context.user!.id);
    return ok(result);
  },

  async adminBookings(context: RequestContext) {
    const filters = adminBookingQuerySchema.parse({
      serviceId: context.query.get("serviceId") || undefined,
      date: context.query.get("date") || undefined,
    });

    const result = await bookingService.listAdminBookings(filters);
    return ok(result);
  },

  async cancel(context: RequestContext) {
    const result = await bookingService.cancelBooking(context.params.id);
    return ok(result);
  },
};
