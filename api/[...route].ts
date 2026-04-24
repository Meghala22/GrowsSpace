import { createApiHandler } from "../backend/src/server/app";
import type { AppRequest } from "../backend/src/server/types";
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const handleRequest = createApiHandler();

async function toAppRequest(request: Request): Promise<AppRequest> {
  const rawUrl = new URL(request.url);

  return {
    method: request.method || "GET",
    path: rawUrl.pathname,
    rawUrl: rawUrl.toString(),
    headers: Object.fromEntries(request.headers.entries()),
    body: BODYLESS_METHODS.has(request.method.toUpperCase()) ? null : await request.text(),
  };
}

export default {
  async fetch(request: Request) {
    try {
      const result = await handleRequest(await toAppRequest(request));

      return new Response(result.body, {
        status: result.statusCode,
        headers: result.headers,
      });
    } catch (error) {
      console.error("Vercel API bootstrap error", error);

      return Response.json(
        {
          success: false,
          error: {
            code: "FUNCTION_BOOTSTRAP_ERROR",
            message: error instanceof Error ? error.message : "The API function could not start.",
          },
        },
        { status: 500 },
      );
    }
  }
};
