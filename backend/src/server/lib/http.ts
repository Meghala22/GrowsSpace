import { ZodError } from "zod";
import { ApiFailure, ApiSuccess } from "../../../../shared/contracts";
import { AppError, BadRequestError } from "../errors";
import type { AppResponse } from "../types";

function baseHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
}

export function ok<T>(data: T, statusCode = 200): AppResponse {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
  };

  return {
    statusCode,
    headers: baseHeaders(),
    body: JSON.stringify(payload),
  };
}

export function failure(error: AppError): AppResponse {
  const payload: ApiFailure = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };

  return {
    statusCode: error.statusCode,
    headers: baseHeaders(),
    body: JSON.stringify(payload),
  };
}

export function parseJsonBody(body: string | null): unknown {
  if (!body) {
    return undefined;
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new BadRequestError("Request validation failed.", error.flatten());
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return new AppError(409, "CONFLICT", "A conflicting record already exists.");
  }

  return new AppError(500, "INTERNAL_SERVER_ERROR", "Something went wrong on the server.");
}
