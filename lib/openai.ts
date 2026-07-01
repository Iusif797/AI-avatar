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

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
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
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages
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
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Language Tutor"
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
          messages: messages
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

  if (openAIKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
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

