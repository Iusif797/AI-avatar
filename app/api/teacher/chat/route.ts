import { NextResponse } from "next/server";
import { z } from "zod";
import { askAvatarTeacher } from "@/lib/openai";
import { enforceRateLimit, rateLimitResponse, readJsonBody } from "@/lib/security/request";

const MAX_JSON_BYTES = 32_768;
const CHAT_RATE_LIMIT = { limit: 20, windowMs: 60_000 };

const chatMessageSchema = z.object({
  id: z.string().max(128),
  role: z.enum(["user", "teacher"]),
  text: z.string().max(4000),
  translation: z.string().max(4000).optional(),
  lessonStage: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .optional()
});

const teacherChatSchema = z.object({
  profile: z.object({
    language: z.enum(["he", "en"]),
    level: z.enum(["A1", "A2", "B1", "B2"]),
    goal: z.string().min(1).max(500)
  }),
  history: z.array(chatMessageSchema).max(40),
  userMessage: z.string().min(1).max(2000)
});

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, "teacher-chat", CHAT_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const body = await readJsonBody(request, MAX_JSON_BYTES);

  if (body === null) {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const parsed = teacherChatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос к AI-учителю" }, { status: 400 });
  }

  const reply = await askAvatarTeacher(parsed.data);
  return NextResponse.json(reply);
}
