import { withTransaction } from "../db/pool";
import { ConflictError, NotFoundError } from "../errors";
import { isPastDate } from "../lib/time";
import { bookingRepository } from "../repositories/bookingRepository";
import { slotRepository } from "../repositories/slotRepository";
import { toBookingItem } from "./mappers";

export const bookingService = {
  async createBooking(input: {
    userId: string;
    slotId: string;
    attendeeCount: number;
    phoneNumber: string;
    paymentMethod: "CARD" | "UPI" | "CASH";
    paymentReference?: string;
  }) {
    try {
      return withTransaction(async (client) => {
        const slot = await slotRepository.findForUpdate(client, input.slotId);
        if (!slot) {
          throw new NotFoundError("The selected slot does not exist.");
        }

        if (isPastDate(slot.slot_date)) {
          throw new ConflictError("Past slots cannot be booked.");
        }

        const existingBooking = await bookingRepository.findByUserAndSlotForUpdate(
          client,
          input.userId,
          input.slotId,
        );
        if (existingBooking) {
          throw new ConflictError("You have already booked this slot.");
        }

        if (slot.booked_count + input.attendeeCount > slot.max_capacity) {
          throw new ConflictError("This slot is already full.");
        }

        const paymentAmountCents = slot.service_price_cents * input.attendeeCount;

        const insertedBooking = await bookingRepository.create(client, {
          userId: input.userId,
          serviceId: slot.service_id,
          slotId: slot.id,
          attendeeCount: input.attendeeCount,
          phoneNumber: input.phoneNumber,
          paymentMethod: input.paymentMethod,
          paymentStatus: "PAID",
          paymentAmountCents,
          paymentReference: input.paymentReference,
        });

        await slotRepository.incrementBookedCount(client, slot.id, input.attendeeCount);
        const hydratedBooking = await bookingRepository.findForUpdate(client, insertedBooking.id);

        if (!hydratedBooking) {
          throw new NotFoundError("The created booking could not be loaded.");
        }

        return toBookingItem(hydratedBooking);
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictError("You have already booked this slot.");
      }

      throw error;
    }
  },

  async listMyBookings(userId: string) {
    const bookings = await bookingRepository.listMyBookings(userId);
    return bookings.map(toBookingItem);
  },

  async listAdminBookings(filters: { serviceId?: string; date?: string }) {
    const bookings = await bookingRepository.listAdminBookings(filters);
    return bookings.map(toBookingItem);
  },

  async cancelBooking(bookingId: string) {
    return withTransaction(async (client) => {
      const booking = await bookingRepository.findForUpdate(client, bookingId);
      if (!booking) {
        throw new NotFoundError("Booking not found.");
      }

      const slot = await slotRepository.findForUpdate(client, booking.slot_id);
      if (!slot) {
        throw new NotFoundError("The related slot no longer exists.");
      }

      if (booking.status === "CANCELLED") {
        throw new ConflictError("This booking has already been cancelled.");
      }

      await bookingRepository.updateStatus(client, bookingId, "CANCELLED", "REFUNDED");
      await slotRepository.decrementBookedCount(client, slot.id, booking.attendee_count);

      const updatedBooking = await bookingRepository.findForUpdate(client, bookingId);
      if (!updatedBooking) {
        throw new NotFoundError("The cancelled booking could not be loaded.");
      }

      return toBookingItem(updatedBooking);
    });
  },
};
