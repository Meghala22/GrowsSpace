import { withTransaction } from "../db/pool";
import { BadRequestError, ConflictError, NotFoundError } from "../errors";
import { addMinutesToTime, isPastDate } from "../lib/time";
import { slotRepository } from "../repositories/slotRepository";
import { toSlotItem } from "./mappers";

export const slotService = {
  async createSlot(input: {
    serviceId: string;
    slotType: "WORKSHOP" | "STATION";
    slotDate: string;
    startTime: string;
    durationMinutes: number;
    maxCapacity: number;
  }) {
    if (isPastDate(input.slotDate)) {
      throw new BadRequestError("Slots cannot be created for past dates.");
    }

    const endTime = addMinutesToTime(input.startTime, input.durationMinutes);

    try {
      const slot = await withTransaction(async (client) => {
        const created = await slotRepository.create(client, {
          ...input,
          endTime,
        });

        if (!created) {
          throw new NotFoundError("The selected service does not exist or is inactive.");
        }

        return created;
      });

      return toSlotItem(slot);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictError("A matching slot already exists for this service and start time.");
      }

      throw error;
    }
  },

  async listSlots(filters: { serviceId?: string; date?: string; availableOnly?: boolean }) {
    const slots = await slotRepository.listByFilters(filters);
    return slots.map(toSlotItem);
  },
};
