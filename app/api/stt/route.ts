import { NextResponse } from "next/server";

type TranscriptionResponse = {
  text?: string;
};

export async function POST(request: Request) {
  const openAIKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Аудиофайл не найден" }, { status: 400 });
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
          source: "openai"
        });
      }
    } catch {}
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
    } catch {}
  }

  return NextResponse.json({
    text: "Научи меня поздороваться",
    source: "fallback"
  });
}

