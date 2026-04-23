import type { HandlerEvent } from "@netlify/functions";
import type { Role } from "../../../shared/contracts";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface RequestContext {
  event: HandlerEvent;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  user?: AuthenticatedUser;
}
