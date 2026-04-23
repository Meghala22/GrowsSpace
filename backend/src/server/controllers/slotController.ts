import type { RequestContext } from "../types";
import { ok } from "../lib/http";
import { slotService } from "../services/slotService";
import { createSlotSchema, slotQuerySchema } from "../validation/schemas";

export const slotController = {
  async create(context: RequestContext) {
    const payload = createSlotSchema.parse(context.body);
    const result = await slotService.createSlot(payload);
    return ok(result, 201);
  },

  async list(context: RequestContext) {
    const filters = slotQuerySchema.parse({
      serviceId: context.query.get("serviceId") || undefined,
      date: context.query.get("date") || undefined,
    });

    const result = await slotService.listSlots(filters);
    return ok(result);
  },

  async listAvailable(context: RequestContext) {
    const filters = slotQuerySchema.parse({
      serviceId: context.query.get("serviceId") || undefined,
      date: context.query.get("date") || undefined,
    });

    const result = await slotService.listSlots({
      ...filters,
      availableOnly: true,
    });
    return ok(result);
  },
};
