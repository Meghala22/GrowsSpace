import type {
  BookingItem,
  ServiceItem,
  SlotItem,
  UserProfile,
} from "../../../../shared/contracts";
import type { BookingRecord } from "../repositories/bookingRepository";
import type { ServiceRecord } from "../repositories/serviceRepository";
import type { SlotRecord } from "../repositories/slotRepository";
import type { UserRecord } from "../repositories/userRepository";

export function toUserProfile(record: UserRecord): UserProfile {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    createdAt: record.created_at,
  };
}

export function toServiceItem(record: ServiceRecord): ServiceItem {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    category: record.category,
    priceCents: record.price_cents,
    active: record.active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function toSlotItem(record: SlotRecord): SlotItem {
  return {
    id: record.id,
    serviceId: record.service_id,
    serviceName: record.service_name,
    slotType: record.slot_type,
    slotDate: record.slot_date,
    startTime: record.start_time.slice(0, 5),
    endTime: record.end_time.slice(0, 5),
    durationMinutes: record.duration_minutes,
    maxCapacity: record.max_capacity,
    bookedCount: record.booked_count,
    availableCapacity: Math.max(record.max_capacity - record.booked_count, 0),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function toBookingItem(record: BookingRecord): BookingItem {
  return {
    id: record.id,
    userId: record.user_id,
    userName: record.user_name,
    userEmail: record.user_email,
    serviceId: record.service_id,
    serviceName: record.service_name,
    slotId: record.slot_id,
    slotType: record.slot_type,
    slotDate: record.slot_date,
    startTime: record.start_time.slice(0, 5),
    endTime: record.end_time.slice(0, 5),
    attendeeCount: record.attendee_count,
    phoneNumber: record.phone_number,
    paymentMethod: record.payment_method,
    paymentStatus: record.payment_status,
    paymentAmountCents: record.payment_amount_cents,
    paymentReference: record.payment_reference,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
