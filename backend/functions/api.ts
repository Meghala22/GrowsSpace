import type { Handler } from "@netlify/functions";
import { createApiHandler } from "../src/server/app";
import type { AppRequest } from "../src/server/types";

const handleRequest = createApiHandler();

function toAppRequest(event: Parameters<Handler>[0]): AppRequest {
  const headers = Object.fromEntries(
    Object.entries(event.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value ?? undefined]),
  );

  return {
    method: event.httpMethod,
    path: event.path || "/",
    rawUrl: event.rawUrl || `https://placeholder.dev${event.path || "/"}`,
    headers,
    body: event.body ?? null,
  };
}

export const handler: Handler = async (event) => handleRequest(toAppRequest(event));
