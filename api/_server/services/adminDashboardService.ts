import type { AdminOverview } from "../../../shared/contracts";
import { bookingRepository } from "../repositories/bookingRepository";
import { slotRepository } from "../repositories/slotRepository";
import { userRepository } from "../repositories/userRepository";

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export const adminDashboardService = {
  async getOverview(): Promise<AdminOverview> {
    const [userCounts, bookingOverview, slotOverview] = await Promise.all([
      userRepository.getCounts(),
      bookingRepository.getOverview(),
      slotRepository.getOverview(),
    ]);

    return {
      totalUsers: toNumber(userCounts?.total_users),
      totalAdmins: toNumber(userCounts?.total_admins),
      totalBookings: toNumber(bookingOverview?.total_bookings),
      confirmedBookings: toNumber(bookingOverview?.confirmed_bookings),
      cancelledBookings: toNumber(bookingOverview?.cancelled_bookings),
      todayBookings: toNumber(bookingOverview?.today_bookings),
      upcomingBookings: toNumber(bookingOverview?.upcoming_bookings),
      totalAttendees: toNumber(bookingOverview?.total_attendees),
      totalRevenueCents: toNumber(bookingOverview?.total_revenue_cents),
      totalSlots: toNumber(slotOverview?.total_slots),
      todaySlots: toNumber(slotOverview?.today_slots),
      upcomingSlots: toNumber(slotOverview?.upcoming_slots),
      totalCapacity: toNumber(slotOverview?.total_capacity),
      bookedCapacity: toNumber(slotOverview?.booked_capacity),
      openCapacity: toNumber(slotOverview?.open_capacity),
    };
  },
};
