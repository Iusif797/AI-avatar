import { NextResponse } from "next/server";
import { z } from "zod";
import { askAvatarTeacher } from "@/lib/openai";

const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "teacher"]),
  text: z.string(),
  translation: z.string().optional()
});

const teacherChatSchema = z.object({
  profile: z.object({
    language: z.enum(["he", "en"]),
    level: z.enum(["A1", "A2", "B1", "B2"]),
    goal: z.string().min(1)
  }),
  history: z.array(chatMessageSchema).max(20),
  userMessage: z.string().min(1).max(2000)
});

export async function POST(request: Request) {
  const parsed = teacherChatSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректный запрос к AI-учителю", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const reply = await askAvatarTeacher(parsed.data);
  return NextResponse.json(reply);
}
