import { NextResponse } from "next/server";
import { z } from "zod";
import { createLiveAvatarToken } from "@/lib/liveavatar";
import { enforceRateLimit, rateLimitResponse, readJsonBody } from "@/lib/security/request";

const MAX_JSON_BYTES = 1024;
const AVATAR_RATE_LIMIT = {
  limit: process.env.NODE_ENV === "development" ? 30 : 5,
  windowMs: 60_000
};

const avatarTokenSchema = z.object({
  language: z.enum(["he", "en"]).default("en")
});

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, "avatar-token", AVATAR_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const body = await readJsonBody(request, MAX_JSON_BYTES);
  const parsed = avatarTokenSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос LiveAvatar" }, { status: 400 });
  }

  const token = await createLiveAvatarToken(parsed.data.language);
  return NextResponse.json(token);
}
