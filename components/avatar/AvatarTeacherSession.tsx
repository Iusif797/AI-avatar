"use client";

import { Bot, Languages, Mic, Send, Sparkles, Volume2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { AvatarStage } from "@/components/avatar/AvatarStage";
import { useAvatarTeacher } from "@/components/avatar/useAvatarTeacher";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useLiveAvatarSession } from "@/components/avatar/useLiveAvatarSession";
import { usePersistentLearnerProfile } from "@/hooks/usePersistentLearnerProfile";
import type { LearnerLevel, TargetLanguage } from "@/types/teacher";

const goals: Record<TargetLanguage, string> = {
  he: "заговорить на базовом иврите для жизни в Израиле",
  en: "уверенно говорить на английском в работе и поездках"
};

export function AvatarTeacherSession() {
  const { language, level, setLanguage, setLevel } = usePersistentLearnerProfile();
  const [text, setText] = useState("");

  const profile = useMemo(
    () => ({
      language,
      level,
      goal: goals[language]
    }),
    [language, level]
  );

  const { messages, status, lastFeedback, sendMessage, repeatLastTeacherMessage } =
    useAvatarTeacher(profile);
  const liveAvatar = useLiveAvatarSession(language);

  const recorder = useAudioRecorder({
    onAudioReady: async (audio) => {
      const formData = new FormData();
      formData.append("audio", audio, "speech.webm");

      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("STT failed");
      }

      const data = (await response.json()) as { text?: string };
      const transcript = data.text?.trim();

      if (transcript) {
        await sendMessage(transcript);
      }
    }
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();

    if (!message) {
      return;
    }

    setText("");
    await sendMessage(message);
  }

  return (
    <main className="min-h-screen bg-[#f7f3eb] text-[#121212] flex flex-col">
      <header className="border-b border-[#121212]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-coral animate-pulse" />
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">
              AI Avatar Teacher
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-full border border-[#121212]/10 bg-white p-0.5 shadow-sm">
              <button
                className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition ${
                  language === "he" ? "bg-[#121212] text-white" : "text-[#121212]/70 hover:text-[#121212]"
                }`}
                type="button"
                onClick={() => setLanguage("he")}
              >
                Иврит
              </button>
              <button
                className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition ${
                  language === "en" ? "bg-[#121212] text-white" : "text-[#121212]/70 hover:text-[#121212]"
                }`}
                type="button"
                onClick={() => setLanguage("en")}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl flex-1 gap-6 p-4 md:h-[calc(100vh-4.5rem)] md:grid-cols-[380px_1fr] md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:h-full md:overflow-y-auto pr-1">
          <AvatarStage avatarLabel={liveAvatar.label} language={language} status={status} />

          <div className="grid gap-3 rounded-lg border border-[#121212]/10 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between text-sm font-bold text-[#121212]/70">
              <span className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-violet" />
                Уровень обучения
              </span>
              <select
                className="rounded-md border border-[#121212]/15 bg-[#f7f3eb] px-2 py-1 text-xs font-bold text-[#121212] focus:outline-none"
                value={level}
                onChange={(event) => setLevel(event.target.value as LearnerLevel)}
              >
                <option>A1</option>
                <option>A2</option>
                <option>B1</option>
                <option>B2</option>
              </select>
            </div>
            <p className="text-xs leading-relaxed text-[#121212]/60 bg-[#f7f3eb]/50 rounded-md p-2.5 border border-[#121212]/5">
              <span className="font-bold block text-[#121212]/80 mb-0.5">Ваша цель:</span>
              {profile.goal}
            </p>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-[#121212]/10 bg-white shadow-soft md:h-full">
          <div className="flex items-center justify-between border-b border-[#121212]/10 px-4 py-3 bg-white">
            <div className="flex items-center gap-2 font-black">
              <Bot className="h-5 w-5 text-coral" />
              Чат с преподавателем
            </div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#121212]/10 text-[#121212]/70 transition hover:border-coral hover:text-coral hover:bg-[#121212]/5"
              type="button"
              aria-label="Повторить последнюю фразу"
              onClick={repeatLastTeacherMessage}
            >
              <Volume2 className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbfaf6] p-4 min-h-[350px]">
            {messages.map((message) => (
              <article
                className={`max-w-[85%] rounded-lg px-4 py-2.5 shadow-sm ${
                  message.role === "teacher"
                    ? "border border-[#121212]/10 bg-white mr-auto"
                    : "ml-auto bg-[#121212] text-white"
                }`}
                key={message.id}
              >
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                  {message.role === "teacher" ? "AI-учитель" : "Ученик"}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.text}</p>
              </article>
            ))}
          </div>

          {lastFeedback ? (
            <div className="border-t border-[#121212]/10 bg-mint/10 px-4 py-3 text-xs sm:text-sm font-semibold text-[#121212]/75">
              <span className="text-mint font-bold">Фидбек:</span> {lastFeedback}
            </div>
          ) : null}

          <form className="grid gap-3 border-t border-[#121212]/10 p-4 bg-white" onSubmit={handleSubmit}>
            <textarea
              className="min-h-16 max-h-32 resize-none rounded-lg border border-[#121212]/15 bg-[#f7f3eb] px-4 py-2.5 text-sm sm:text-base leading-relaxed text-[#121212] placeholder:text-[#121212]/45 focus:outline-none"
              placeholder={
                language === "he"
                  ? "Например: как сказать «я хочу кофе» на иврите?"
                  : "Например: help me introduce myself in English"
              }
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#121212] px-4 py-2.5 text-sm font-black text-white transition hover:bg-coral disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={status === "thinking" || status === "speaking"}
              >
                <Send className="h-4 w-4" />
                Отправить
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#121212]/15 px-4 py-2.5 text-sm font-bold text-[#121212] transition hover:border-violet hover:text-violet bg-white"
                type="button"
                onClick={() =>
                  setText(language === "he" ? "Научи меня поздороваться" : "Teach me a useful phrase")
                }
              >
                <Sparkles className="h-4 w-4" />
                Пример
              </button>
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition ${
                  recorder.isRecording
                    ? "border-coral bg-coral text-white"
                    : "border-[#121212]/15 text-[#121212] hover:border-violet hover:text-violet bg-white"
                }`}
                type="button"
                disabled={recorder.isTranscribing || status === "thinking" || status === "speaking"}
                onClick={() => {
                  if (recorder.isRecording) {
                    recorder.stopRecording();
                  } else {
                    void recorder.startRecording();
                  }
                }}
              >
                <Mic className="h-4 w-4" />
                {recorder.isRecording
                  ? "Остановить"
                  : recorder.isTranscribing
                    ? "Распознаю..."
                    : "Голос"}
              </button>
            </div>
            {recorder.error ? (
              <p className="text-xs font-semibold text-coral mt-1">{recorder.error}</p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
