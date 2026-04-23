import type { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { adminController } from "./controllers/adminController";
import { authController } from "./controllers/authController";
import { bookingController } from "./controllers/bookingController";
import { serviceController } from "./controllers/serviceController";
import { slotController } from "./controllers/slotController";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "./errors";
import { failure, ok, parseJsonBody, toAppError } from "./lib/http";
import { verifyAuthToken } from "./lib/jwt";
import type { RequestContext } from "./types";

type Controller = (context: RequestContext) => Promise<HandlerResponse>;

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

function normalizePath(event: HandlerEvent) {
  const sourcePath = event.path || event.rawUrl || "/";
  return sourcePath
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "")
    .replace(/\/+$/, "") || "/";
}

function getAuthUser(event: HandlerEvent) {
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = authorization.slice("Bearer ".length).trim();
  return verifyAuthToken(token);
}

function buildContext(event: HandlerEvent, route: RouteDefinition, match: RegExpMatchArray): RequestContext {
  const path = normalizePath(event);
  const url = new URL(event.rawUrl || `https://placeholder.dev${event.path}`);

  const context: RequestContext = {
    event,
    method: event.httpMethod.toUpperCase(),
    path,
    params: match.groups ?? {},
    query: url.searchParams,
    body: parseJsonBody(event.body),
  };

  if (route.auth) {
    context.user = getAuthUser(event);
  }

  if (route.admin && context.user?.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  return context;
}

async function routeRequest(event: HandlerEvent) {
  const method = event.httpMethod.toUpperCase();
  const path = normalizePath(event);
  const route = routes.find((candidate) => candidate.method === method && candidate.pattern.test(path));

  if (!route) {
    throw new NotFoundError("Endpoint not found.");
  }

  const match = path.match(route.pattern);
  if (!match) {
    throw new NotFoundError("Endpoint not found.");
  }

  const context = buildContext(event, route, match);
  return route.controller(context);
}

export function createApiHandler(): Handler {
  return async (event) => {
    try {
      return await routeRequest(event);
    } catch (error) {
      console.error("API error", error);
      return failure(toAppError(error));
    }
  };
}
