import { NextResponse } from "next/server";
import { z } from "zod";
import { createLiveAvatarToken } from "@/lib/liveavatar";

const avatarTokenSchema = z.object({
  language: z.enum(["he", "en"]).default("en")
});

export async function POST(request: Request) {
  const parsed = avatarTokenSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос LiveAvatar" }, { status: 400 });
  }

  const token = await createLiveAvatarToken(parsed.data.language);
  return NextResponse.json(token);
}
