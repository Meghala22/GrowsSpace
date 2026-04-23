import { z } from "zod";

const emailSchema = z.email().transform((value) => value.trim().toLowerCase());
const dateSchema = z.iso.date();
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must use HH:MM in 24-hour format.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const createSlotSchema = z.object({
  serviceId: z.uuid(),
  slotType: z.enum(["WORKSHOP", "STATION"]),
  slotDate: dateSchema,
  startTime: timeSchema,
  durationMinutes: z.int().min(15).max(480),
  maxCapacity: z.int().min(1).max(100),
});

export const adminServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(1000),
  category: z.enum(["WORKSHOP", "STATION"]),
  priceCents: z.int().min(0).max(1000000),
  active: z.boolean(),
});

export const slotQuerySchema = z.object({
  serviceId: z.uuid().optional(),
  date: dateSchema.optional(),
});

export const createBookingSchema = z.object({
  slotId: z.uuid(),
  attendeeCount: z.int().min(1).max(25),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^[+0-9()\-\s]{7,20}$/, "Phone number must contain 7-20 valid characters."),
  paymentMethod: z.enum(["CARD", "UPI", "CASH"]),
  paymentReference: z.string().trim().max(120).optional(),
});

export const adminBookingQuerySchema = z.object({
  serviceId: z.uuid().optional(),
  date: dateSchema.optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["ADMIN", "USER"]),
});
