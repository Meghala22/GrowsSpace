import type { RequestContext } from "../types";
import { ok } from "../lib/http";
import { adminDashboardService } from "../services/adminDashboardService";
import { adminUserService } from "../services/adminUserService";
import { updateUserRoleSchema } from "../validation/schemas";

export const adminController = {
  async overview(_context: RequestContext) {
    const result = await adminDashboardService.getOverview();
    return ok(result);
  },

  async users(_context: RequestContext) {
    const result = await adminUserService.listUsers();
    return ok(result);
  },

  async updateUserRole(context: RequestContext) {
    const payload = updateUserRoleSchema.parse(context.body);
    const result = await adminUserService.updateRole({
      actorUserId: context.user!.id,
      targetUserId: context.params.id,
      role: payload.role,
    });

    return ok(result);
  },
};
