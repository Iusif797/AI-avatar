import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { buildAvatarTeacherSystemPrompt, buildFallbackTeacherReply } from "@/lib/prompts/avatar-teacher";
import { parseTeacherResponse } from "@/lib/teacher-response";
import type { TeacherChatRequest, TeacherChatResponse, TeacherSource } from "@/types/teacher";

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

type ChatCompletionsBody = {
  choices?: Array<{ message?: { content?: string } }>;
};

type GeminiBody = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const LLM_TIMEOUT_MS = 18_000;
const OPENROUTER_TIMEOUT_MS = 12_000;
const HISTORY_CONTEXT_LENGTH = 8;
const GEMINI_MODEL = "gemini-2.5-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENROUTER_DEFAULT_MODEL = "liquid/lfm-2.5-1.2b-instruct:free";
const OPENROUTER_FALLBACK_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free"
];

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

function buildTeacherResult(
  rawReply: string,
  source: Exclude<TeacherSource, "fallback">
): TeacherChatResponse {
  const parsed = parseTeacherResponse(rawReply);

  return {
    reply: parsed.reply,
    lessonStage: parsed.lessonStage,
    correction: parsed.correction,
    suggestedPractice: parsed.suggestedPractice,
    source
  };
}

async function requestReply(
  source: Exclude<TeacherSource, "fallback">,
  url: string,
  init: RequestInit,
  extractReply: (body: unknown) => string | undefined,
  debugLabel?: string,
  timeoutMs = LLM_TIMEOUT_MS
): Promise<TeacherChatResponse | null> {
  try {
    const response = await fetchWithTimeout(url, init, timeoutMs);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[teacher] ${source}${debugLabel ? ` (${debugLabel})` : ""} returned ${response.status}: ${errorBody.slice(0, 240)}`
      );
      return null;
    }

    const reply = extractReply(await response.json())?.trim();

    if (!reply) {
      console.error(`[teacher] ${source}${debugLabel ? ` (${debugLabel})` : ""} returned an empty reply`);
      return null;
    }

    return buildTeacherResult(reply, source);
  } catch (cause) {
    console.error(`[teacher] ${source}${debugLabel ? ` (${debugLabel})` : ""} request failed`, cause);
    return null;
  }
}

function buildOpenRouterModels(): string[] {
  const configuredModel = process.env.OPENROUTER_MODEL?.trim();
  const models = [configuredModel, OPENROUTER_DEFAULT_MODEL, ...OPENROUTER_FALLBACK_MODELS].filter(
    (model): model is string => Boolean(model)
  );

  return [...new Set(models)];
}

async function askOpenRouter(chatMessages: OpenAIMessage[]): Promise<TeacherChatResponse | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    return null;
  }

  const siteUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  for (const model of buildOpenRouterModels()) {
    const result = await requestReply(
      "openrouter",
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteUrl,
          "X-Title": "AI Language Tutor"
        },
        body: JSON.stringify({
          model,
          messages: chatMessages
        })
      },
      (body) => (body as ChatCompletionsBody).choices?.[0]?.message?.content,
      model,
      OPENROUTER_TIMEOUT_MS
    );

    if (result) {
      return result;
    }
  }

  return null;
}

export async function askAvatarTeacher(request: TeacherChatRequest): Promise<TeacherChatResponse> {
  const systemPrompt = buildAvatarTeacherSystemPrompt(
    request.profile.language,
    request.profile.level,
    request.profile.goal
  );
  const historyTail = request.history.slice(-HISTORY_CONTEXT_LENGTH);

  const chatMessages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyTail.map<OpenAIMessage>((message) => ({
      role: message.role === "teacher" ? "assistant" : "user",
      content: message.text
    })),
    { role: "user", content: request.userMessage }
  ];

  const openRouterResult = await askOpenRouter(chatMessages);

  if (openRouterResult) {
    return openRouterResult;
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    const firstUserIndex = historyTail.findIndex((message) => message.role === "user");
    const geminiHistory = firstUserIndex === -1 ? [] : historyTail.slice(firstUserIndex);

    const result = await requestReply(
      "gemini",
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...geminiHistory.map((message) => ({
              role: message.role === "teacher" ? "model" : "user",
              parts: [{ text: message.text }]
            })),
            { role: "user", parts: [{ text: request.userMessage }] }
          ],
          generationConfig: { responseMimeType: "application/json" }
        })
      },
      (body) => (body as GeminiBody).candidates?.[0]?.content?.parts?.[0]?.text
    );

    if (result) {
      return result;
    }
  }

  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    const result = await requestReply(
      "groq",
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: chatMessages,
          response_format: { type: "json_object" }
        })
      },
      (body) => (body as ChatCompletionsBody).choices?.[0]?.message?.content
    );

    if (result) {
      return result;
    }
  }

  const openAIKey = process.env.OPENAI_API_KEY;

  if (openAIKey) {
    const result = await requestReply(
      "openai",
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          input: chatMessages
        })
      },
      (body) => collectOutputText(body as OpenAIResponseBody)
    );

    if (result) {
      return result;
    }
  }

  return {
    ...buildFallbackTeacherReply(request.profile.language, request.userMessage),
    source: "fallback"
  };
}
