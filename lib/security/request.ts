import { NextResponse } from "next/server";
import { checkRateLimit, type RateLimitConfig, type RateLimitResult } from "@/lib/security/rate-limit";

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function enforceRateLimit(
  request: Request,
  routeKey: string,
  config: RateLimitConfig
): RateLimitResult {
  const clientIp = getClientIp(request);
  return checkRateLimit(`${routeKey}:${clientIp}`, config);
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Слишком много запросов. Попробуйте позже." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds)
      }
    }
  );
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown | null> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > maxBytes) {
    return null;
  }

  const rawBody = await request.text();

  if (rawBody.length > maxBytes) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
}
