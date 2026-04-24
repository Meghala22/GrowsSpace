import type { IncomingMessage, IncomingHttpHeaders, ServerResponse } from "node:http";
import { createApiHandler } from "../backend/src/server/app";
import type { AppRequest } from "../backend/src/server/types";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
  url?: string;
  method?: string;
  headers: IncomingHttpHeaders;
}

const handleRequest = createApiHandler();

function normalizeHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(", ") : value;
}

function serializeKnownBody(body: unknown) {
  if (body == null) {
    return null;
  }

  if (typeof body === "string") {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  return JSON.stringify(body);
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function toAppRequest(request: VercelRequest): Promise<AppRequest> {
  const body = request.body !== undefined ? serializeKnownBody(request.body) : await readRequestBody(request);
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), normalizeHeaderValue(value)]),
  );
  const rawUrl = new URL(request.url || "/api", "https://placeholder.dev");

  return {
    method: request.method || "GET",
    path: rawUrl.pathname,
    rawUrl: rawUrl.toString(),
    headers,
    body,
  };
}

export default async function handler(request: VercelRequest, response: ServerResponse) {
  const result = await handleRequest(await toAppRequest(request));

  response.statusCode = result.statusCode;

  for (const [key, value] of Object.entries(result.headers)) {
    response.setHeader(key, value);
  }

  response.end(result.body);
}
