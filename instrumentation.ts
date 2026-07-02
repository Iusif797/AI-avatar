const LLM_ENV_KEYS = ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"];
const STT_ENV_KEYS = ["GROQ_API_KEY", "OPENAI_API_KEY"];

export function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (!LLM_ENV_KEYS.some((key) => process.env[key])) {
    console.warn(
      "[env] Не задан ни один AI-ключ (GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY / OPENAI_API_KEY) — учитель работает в демо-режиме."
    );
  }

  if (!STT_ENV_KEYS.some((key) => process.env[key])) {
    console.warn(
      "[env] Нет ключа для распознавания речи (GROQ_API_KEY или OPENAI_API_KEY) — голосовой ввод недоступен."
    );
  }

  if (!process.env.HEYGEN_API_KEY) {
    console.warn("[env] HEYGEN_API_KEY не задан — live-аватар работает в локальном режиме.");
  }
}
