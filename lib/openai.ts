import { buildAvatarTeacherSystemPrompt, buildFallbackTeacherReply } from "@/lib/prompts/avatar-teacher";
import type { TeacherChatRequest, TeacherChatResponse } from "@/types/teacher";

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIResponseOutputText = {
  type: "output_text";
  text: string;
};

type OpenAIResponseContent = OpenAIResponseOutputText | { type: string };

type OpenAIResponseItem = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponseBody = {
  output?: OpenAIResponseItem[];
};

const LLM_TIMEOUT_MS = 25_000;
const GEMINI_MODEL = "gemini-2.5-flash";

function collectOutputText(body: OpenAIResponseBody) {
  return (
    body.output
      ?.flatMap((item) => item.content ?? [])
      .filter((content): content is OpenAIResponseOutputText => content.type === "output_text")
      .map((content) => content.text)
      .join("\n")
      .trim() ?? ""
  );
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function askAvatarTeacher(request: TeacherChatRequest): Promise<TeacherChatResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  const systemPrompt = buildAvatarTeacherSystemPrompt(
    request.profile.language,
    request.profile.level,
    request.profile.goal
  );

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...request.history.slice(-8).map<OpenAIMessage>((message) => ({
      role: message.role === "teacher" ? "assistant" : "user",
      content: message.text
    })),
    { role: "user", content: request.userMessage }
  ];

  if (geminiKey) {
    try {
      const geminiMessages = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        ...request.history.slice(-8).map((message) => ({
          role: message.role === "teacher" ? "model" : "user",
          parts: [{ text: message.text }]
        })),
        {
          role: "user",
          parts: [{ text: request.userMessage }]
        }
      ];

      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey
          },
          body: JSON.stringify({
            contents: geminiMessages
          })
        }
      );

      if (response.ok) {
        const body = await response.json();
        const reply = body.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return {
            reply,
            source: "openai"
          };
        }
      }
    } catch {}
  }

  if (groqKey) {
    try {
      const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages
        })
      });

      if (response.ok) {
        const body = await response.json();
        const reply = body.choices?.[0]?.message?.content;
        if (reply) {
          return {
            reply,
            source: "openai"
          };
        }
      }
    } catch {}
  }

  if (openRouterKey) {
    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const models = [
      process.env.OPENROUTER_MODEL,
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
      "nvidia/nemotron-3-super-120b-a12b:free"
    ].filter(Boolean) as string[];

    for (const model of models) {
      try {
        const response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": siteUrl,
            "X-Title": "AI Language Tutor"
          },
          body: JSON.stringify({ model, messages })
        });

        if (response.ok) {
          const body = await response.json();
          const reply = body.choices?.[0]?.message?.content;
          if (reply) {
            return { reply, source: "openai" as const };
          }
        }
      } catch {
        continue;
      }
    }
  }

  if (openAIKey) {
    try {
      const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          input: messages
        })
      });

      if (response.ok) {
        const body = (await response.json()) as OpenAIResponseBody;
        const reply = collectOutputText(body);
        if (reply) {
          return {
            reply,
            source: "openai"
          };
        }
      }
    } catch {}
  }

  return {
    ...buildFallbackTeacherReply(request.profile.language, request.userMessage),
    source: "fallback"
  };
}
