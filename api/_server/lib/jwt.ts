import jwt from "jsonwebtoken";
import { serverConfig } from "../config";
import { UnauthorizedError } from "../errors";
import { AuthenticatedUser } from "../types";

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: AuthenticatedUser["role"];
}

export function signAuthToken(user: AuthenticatedUser) {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      role: user.role,
    },
    serverConfig.jwtSecret(),
    {
      subject: user.id,
      expiresIn: serverConfig.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    },
  );
}

export function verifyAuthToken(token: string): AuthenticatedUser {
  try {
    const payload = jwt.verify(token, serverConfig.jwtSecret()) as TokenPayload & { sub: string };
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    throw new UnauthorizedError("Your session is invalid or has expired.");
  }
}
