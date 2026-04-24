import type { Role } from "../../shared/contracts";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AppRequest {
  method: string;
  path: string;
  rawUrl: string;
  headers: Record<string, string | undefined>;
  body: string | null;
}

export interface AppResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface RequestContext {
  request: AppRequest;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  user?: AuthenticatedUser;
}
