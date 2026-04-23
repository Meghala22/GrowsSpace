import { withTransaction } from "../db/pool";
import { ConflictError, UnauthorizedError } from "../errors";
import { signAuthToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/passwords";
import { userRepository } from "../repositories/userRepository";
import { toUserProfile } from "./mappers";

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await withTransaction(async (client) => {
      return userRepository.create(client, {
        name: input.name,
        email: input.email,
        passwordHash,
      });
    });

    const profile = toUserProfile(user);
    return {
      token: signAuthToken(profile),
      user: profile,
    };
  },

  async login(input: { email: string; password: string }) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError("Email or password is incorrect.");
    }

    const validPassword = await verifyPassword(input.password, user.password_hash);
    if (!validPassword) {
      throw new UnauthorizedError("Email or password is incorrect.");
    }

    const profile = toUserProfile(user);
    return {
      token: signAuthToken(profile),
      user: profile,
    };
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError("Your account could not be found.");
    }

    return toUserProfile(user);
  },
};
