import type { Role, UserProfile } from "../../../shared/contracts";
import { ConflictError, NotFoundError } from "../errors";
import { userRepository } from "../repositories/userRepository";
import { toUserProfile } from "./mappers";

export const adminUserService = {
  async listUsers(): Promise<UserProfile[]> {
    const users = await userRepository.listAll();
    return users.map(toUserProfile);
  },

  async updateRole(input: { actorUserId: string; targetUserId: string; role: Role }) {
    if (input.actorUserId === input.targetUserId) {
      throw new ConflictError("Admins cannot change their own role from the dashboard.");
    }

    const updatedUser = await userRepository.updateRole(input.targetUserId, input.role);
    if (!updatedUser) {
      throw new NotFoundError("User not found.");
    }

    return toUserProfile(updatedUser);
  },
};
