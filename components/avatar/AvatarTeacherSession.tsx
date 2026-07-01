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
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-5 px-4 py-4 md:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)] md:px-6 lg:px-8">
        <div className="flex min-h-[520px] flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-coral">AI Avatar Teacher</p>
              <h1 className="text-3xl font-black tracking-normal sm:text-4xl">
                Живой учитель языка
              </h1>
            </div>
            <div className="flex rounded-full border border-ink/10 bg-white p-1 shadow-sm">
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  language === "he" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
                }`}
                type="button"
                onClick={() => setLanguage("he")}
              >
                Иврит
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  language === "en" ? "bg-ink text-white" : "text-ink/70 hover:text-ink"
                }`}
                type="button"
                onClick={() => setLanguage("en")}
              >
                English
              </button>
            </div>
          </div>

          <AvatarStage avatarLabel={liveAvatar.label} language={language} status={status} />

          <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold text-ink/70">
              <Languages className="h-4 w-4 text-violet" />
              Профиль ученика
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-semibold text-ink/70">
                Уровень
                <select
                  className="rounded-md border border-ink/15 bg-paper px-3 py-2 font-bold text-ink"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as LearnerLevel)}
                >
                  <option>A1</option>
                  <option>A2</option>
                  <option>B1</option>
                  <option>B2</option>
                </select>
              </label>
              <div className="grid gap-1 text-sm font-semibold text-ink/70">
                Режим
                <div className="flex h-10 items-center rounded-md border border-mint/40 bg-mint/10 px-3 font-bold text-mint">
                  Live lesson
                </div>
              </div>
            </div>
            <p className="text-sm leading-6 text-ink/70">{profile.goal}</p>
          </div>
        </div>

        <div className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <div className="flex items-center gap-2 font-black">
              <Bot className="h-5 w-5 text-coral" />
              Диалог с преподавателем
            </div>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink/70 transition hover:border-coral hover:text-coral"
              type="button"
              aria-label="Повторить последнюю фразу"
              onClick={repeatLastTeacherMessage}
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbfaf6] p-4">
            {messages.map((message) => (
              <article
                className={`max-w-[85%] rounded-lg px-4 py-3 shadow-sm ${
                  message.role === "teacher"
                    ? "border border-ink/10 bg-white"
                    : "ml-auto bg-ink text-white"
                }`}
                key={message.id}
              >
                <p className="text-sm font-bold opacity-70">
                  {message.role === "teacher" ? "AI-учитель" : "Вы"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-base leading-7">{message.text}</p>
              </article>
            ))}
          </div>

          {lastFeedback ? (
            <div className="border-t border-ink/10 bg-mint/10 px-4 py-3 text-sm font-semibold text-ink/75">
              <span className="text-mint">Фидбек:</span> {lastFeedback}
            </div>
          ) : null}

          <form className="grid gap-3 border-t border-ink/10 p-4" onSubmit={handleSubmit}>
            <textarea
              className="min-h-24 resize-none rounded-lg border border-ink/15 bg-paper px-4 py-3 leading-6 text-ink placeholder:text-ink/45"
              placeholder={
                language === "he"
                  ? "Например: как сказать «я хочу кофе» на иврите?"
                  : "Например: help me introduce myself in English"
              }
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-black text-white transition hover:bg-coral disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={status === "thinking" || status === "speaking"}
              >
                <Send className="h-5 w-5" />
                Отправить учителю
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 px-4 py-3 font-black text-ink transition hover:border-violet hover:text-violet"
                type="button"
                onClick={() =>
                  setText(language === "he" ? "Научи меня поздороваться" : "Teach me a useful phrase")
                }
              >
                <Sparkles className="h-5 w-5" />
                Пример
              </button>
              <button
                className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-3 font-black transition ${
                  recorder.isRecording
                    ? "border-coral bg-coral text-white"
                    : "border-ink/15 text-ink hover:border-violet hover:text-violet"
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
                <Mic className="h-5 w-5" />
                {recorder.isRecording
                  ? "Остановить"
                  : recorder.isTranscribing
                    ? "Распознаю"
                    : "Голос"}
              </button>
            </div>
            {recorder.error ? (
              <p className="text-sm font-semibold text-coral">{recorder.error}</p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
