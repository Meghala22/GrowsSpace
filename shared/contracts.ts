export type Role = "ADMIN" | "USER";
export type BookingStatus = "CONFIRMED" | "CANCELLED";
export type SlotType = "WORKSHOP" | "STATION";
export type PaymentMethod = "CARD" | "UPI" | "CASH";
export type PaymentStatus = "PAID" | "REFUNDED";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthPayload {
  token: string;
  user: UserProfile;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: SlotType;
  priceCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SlotItem {
  id: string;
  serviceId: string;
  serviceName: string;
  slotType: SlotType;
  slotDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  maxCapacity: number;
  bookedCount: number;
  availableCapacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingItem {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  serviceId: string;
  serviceName: string;
  slotId: string;
  slotType: SlotType;
  slotDate: string;
  startTime: string;
  endTime: string;
  attendeeCount: number;
  phoneNumber: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentAmountCents: number;
  paymentReference?: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  totalAdmins: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  todayBookings: number;
  upcomingBookings: number;
  totalAttendees: number;
  totalRevenueCents: number;
  totalSlots: number;
  todaySlots: number;
  upcomingSlots: number;
  totalCapacity: number;
  bookedCapacity: number;
  openCapacity: number;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorShape;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
