import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { validateUploadedAudio } from "@/lib/security/audio-validation";
import { enforceRateLimit, rateLimitResponse } from "@/lib/security/request";

type TranscriptionResponse = {
  text?: string;
};

type TranscriptionProvider = {
  name: "groq" | "openai";
  url: string;
  apiKey: string;
  model: string;
};

const STT_RATE_LIMIT = { limit: 15, windowMs: 60_000 };
const STT_TIMEOUT_MS = 30_000;

function resolveProviders(): TranscriptionProvider[] {
  const providers: TranscriptionProvider[] = [];
  const groqKey = process.env.GROQ_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (groqKey) {
    providers.push({
      name: "groq",
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      apiKey: groqKey,
      model: "whisper-large-v3-turbo"
    });
  }

  if (openAIKey) {
    providers.push({
      name: "openai",
      url: "https://api.openai.com/v1/audio/transcriptions",
      apiKey: openAIKey,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1"
    });
  }

  return providers;
}

async function transcribeWithProvider(
  provider: TranscriptionProvider,
  audio: File
): Promise<string | null> {
  const providerFormData = new FormData();
  providerFormData.append("file", audio, audio.name || "speech.webm");
  providerFormData.append("model", provider.model);

  try {
    const response = await fetchWithTimeout(
      provider.url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`
        },
        body: providerFormData
      },
      STT_TIMEOUT_MS
    );

    if (!response.ok) {
      console.error(`[stt] ${provider.name} returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as TranscriptionResponse;
    return data.text ?? "";
  } catch (cause) {
    console.error(`[stt] ${provider.name} request failed`, cause);
    return null;
  }
}

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, "stt", STT_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Аудиофайл не найден" }, { status: 400 });
  }

  const validation = validateUploadedAudio(audio);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const providers = resolveProviders();

  if (providers.length === 0) {
    return NextResponse.json(
      { error: "STT не настроен. Добавь GROQ_API_KEY или OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  for (const provider of providers) {
    const text = await transcribeWithProvider(provider, audio);

    if (text !== null) {
      return NextResponse.json({ text, source: provider.name });
    }
  }

  return NextResponse.json({ error: "STT-сервис временно недоступен" }, { status: 503 });
}
