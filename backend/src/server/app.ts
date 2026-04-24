import { adminController } from "./controllers/adminController";
import { authController } from "./controllers/authController";
import { bookingController } from "./controllers/bookingController";
import { serviceController } from "./controllers/serviceController";
import { slotController } from "./controllers/slotController";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "./errors";
import { ensureDatabaseReady } from "./db/bootstrap";
import { failure, ok, parseJsonBody, toAppError } from "./lib/http";
import { verifyAuthToken } from "./lib/jwt";
import type { AppRequest, AppResponse, RequestContext } from "./types";

type Controller = (context: RequestContext) => Promise<AppResponse>;

interface RouteDefinition {
  method: string;
  pattern: RegExp;
  controller: Controller;
  auth?: boolean;
  admin?: boolean;
}

const routes: RouteDefinition[] = [
  {
    method: "GET",
    pattern: /^\/health$/,
    controller: async () =>
      ok({
        status: "ok",
        service: "growspace-api",
        timestamp: new Date().toISOString(),
      }),
  },
  { method: "POST", pattern: /^\/auth\/register$/, controller: authController.register },
  { method: "POST", pattern: /^\/auth\/login$/, controller: authController.login },
  { method: "GET", pattern: /^\/auth\/me$/, controller: authController.me, auth: true },
  { method: "GET", pattern: /^\/services$/, controller: serviceController.list },
  {
    method: "GET",
    pattern: /^\/admin\/services$/,
    controller: serviceController.adminList,
    auth: true,
    admin: true,
  },
  {
    method: "POST",
    pattern: /^\/admin\/services$/,
    controller: serviceController.create,
    auth: true,
    admin: true,
  },
  {
    method: "PATCH",
    pattern: /^\/admin\/services\/(?<id>[^/]+)$/,
    controller: serviceController.update,
    auth: true,
    admin: true,
  },
  {
    method: "GET",
    pattern: /^\/admin\/overview$/,
    controller: adminController.overview,
    auth: true,
    admin: true,
  },
  { method: "POST", pattern: /^\/admin\/slots$/, controller: slotController.create, auth: true, admin: true },
  { method: "GET", pattern: /^\/slots$/, controller: slotController.list },
  { method: "GET", pattern: /^\/slots\/available$/, controller: slotController.listAvailable },
  { method: "POST", pattern: /^\/bookings$/, controller: bookingController.create, auth: true },
  { method: "GET", pattern: /^\/bookings\/my$/, controller: bookingController.myBookings, auth: true },
  {
    method: "GET",
    pattern: /^\/admin\/users$/,
    controller: adminController.users,
    auth: true,
    admin: true,
  },
  {
    method: "PATCH",
    pattern: /^\/admin\/users\/(?<id>[^/]+)\/role$/,
    controller: adminController.updateUserRole,
    auth: true,
    admin: true,
  },
  {
    method: "GET",
    pattern: /^\/admin\/bookings$/,
    controller: bookingController.adminBookings,
    auth: true,
    admin: true,
  },
  {
    method: "PATCH",
    pattern: /^\/admin\/bookings\/(?<id>[^/]+)\/cancel$/,
    controller: bookingController.cancel,
    auth: true,
    admin: true,
  },
];

function normalizePath(request: AppRequest) {
  const sourcePath = request.path || request.rawUrl || "/";
  return sourcePath
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "")
    .replace(/\/+$/, "") || "/";
}

function getAuthUser(request: AppRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = authorization.slice("Bearer ".length).trim();
  return verifyAuthToken(token);
}

function buildContext(request: AppRequest, route: RouteDefinition, match: RegExpMatchArray): RequestContext {
  const path = normalizePath(request);
  const url = new URL(request.rawUrl || `https://placeholder.dev${request.path}`);

  const context: RequestContext = {
    request,
    method: request.method.toUpperCase(),
    path,
    params: match.groups ?? {},
    query: url.searchParams,
    body: parseJsonBody(request.body),
  };

  if (route.auth) {
    context.user = getAuthUser(request);
  }

  if (route.admin && context.user?.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  return context;
}

async function routeRequest(request: AppRequest) {
  const method = request.method.toUpperCase();
  const path = normalizePath(request);
  const route = routes.find((candidate) => candidate.method === method && candidate.pattern.test(path));

  if (!route) {
    throw new NotFoundError("Endpoint not found.");
  }

  const match = path.match(route.pattern);
  if (!match) {
    throw new NotFoundError("Endpoint not found.");
  }

  if (path !== "/health") {
    await ensureDatabaseReady();
  }

  const context = buildContext(request, route, match);
  return route.controller(context);
}

export function createApiHandler() {
  return async (request: AppRequest): Promise<AppResponse> => {
    try {
      return await routeRequest(request);
    } catch (error) {
      console.error("API error", error);
      return failure(toAppError(error));
    }
  };
}
