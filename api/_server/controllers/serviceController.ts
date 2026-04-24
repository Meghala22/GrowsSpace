import type { RequestContext } from "../types";
import { ok } from "../lib/http";
import { adminServiceSchema } from "../validation/schemas";
import { serviceCatalogService } from "../services/serviceCatalogService";

export const serviceController = {
  async list(_context: RequestContext) {
    const result = await serviceCatalogService.listServices();
    return ok(result);
  },

  async adminList(_context: RequestContext) {
    const result = await serviceCatalogService.listServices({ includeInactive: true });
    return ok(result);
  },

  async create(context: RequestContext) {
    const payload = adminServiceSchema.parse(context.body);
    const result = await serviceCatalogService.createService(payload);
    return ok(result, 201);
  },

  async update(context: RequestContext) {
    const payload = adminServiceSchema.parse(context.body);
    const result = await serviceCatalogService.updateService(context.params.id, payload);
    return ok(result);
  },
};
