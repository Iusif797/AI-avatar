import { NextResponse } from "next/server";
import { validateUploadedAudio } from "@/lib/security/audio-validation";
import { enforceRateLimit, rateLimitResponse } from "@/lib/security/request";

type TranscriptionResponse = {
  text?: string;
};

const STT_RATE_LIMIT = { limit: 15, windowMs: 60_000 };

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, "stt", STT_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const openAIKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Аудиофайл не найден" }, { status: 400 });
  }

  const validation = validateUploadedAudio(audio);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  if (groqKey) {
    try {
      const groqFormData = new FormData();
      groqFormData.append("file", audio, "speech.webm");
      groqFormData.append("model", "whisper-large-v3-turbo");

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`
        },
        body: groqFormData
      });

      if (response.ok) {
        const data = (await response.json()) as TranscriptionResponse;
        return NextResponse.json({
          text: data.text ?? "",
          source: "groq"
        });
      }
    } catch {
      return NextResponse.json({ error: "STT-сервис временно недоступен" }, { status: 503 });
    }
  }

  if (openAIKey) {
    try {
      const openAIFormData = new FormData();
      openAIFormData.append("file", audio, "speech.webm");
      openAIFormData.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIKey}`
        },
        body: openAIFormData
      });

      if (response.ok) {
        const data = (await response.json()) as TranscriptionResponse;
        return NextResponse.json({
          text: data.text ?? "",
          source: "openai"
        });
      }
    } catch {
      return NextResponse.json({ error: "STT-сервис временно недоступен" }, { status: 503 });
    }
  }

  return NextResponse.json(
    { error: "STT не настроен. Добавь GROQ_API_KEY или OPENAI_API_KEY." },
    { status: 503 }
  );
}
