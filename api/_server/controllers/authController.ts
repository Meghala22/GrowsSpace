import type { RequestContext } from "../types";
import { ok } from "../lib/http";
import { loginSchema, registerSchema } from "../validation/schemas";
import { authService } from "../services/authService";

export const authController = {
  async register(context: RequestContext) {
    const payload = registerSchema.parse(context.body);
    const result = await authService.register(payload);
    return ok(result, 201);
  },

  async login(context: RequestContext) {
    const payload = loginSchema.parse(context.body);
    const result = await authService.login(payload);
    return ok(result);
  },

  async me(context: RequestContext) {
    const result = await authService.me(context.user!.id);
    return ok(result);
  },
};
