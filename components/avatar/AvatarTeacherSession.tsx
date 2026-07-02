"use client";

import {
  Bot,
  Keyboard,
  Languages,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Sparkles,
  Volume2
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AvatarStage } from "@/components/avatar/AvatarStage";
import { LessonProgressBar } from "@/components/avatar/LessonProgressBar";
import { useAvatarTeacher } from "@/components/avatar/useAvatarTeacher";
import { useLiveAvatarSession } from "@/components/avatar/useLiveAvatarSession";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useGuardedProfileSwitch } from "@/hooks/useGuardedProfileSwitch";
import { usePersistentLearnerProfile } from "@/hooks/usePersistentLearnerProfile";
import type { LearnerLevel, TargetLanguage } from "@/types/teacher";

const goals: Record<TargetLanguage, string> = {
  he: "заговорить на базовом иврите для жизни в Израиле",
  en: "уверенно говорить на английском в работе и поездках"
};

type InteractionMode = "text" | "voice";

export function AvatarTeacherSession() {
  const { language, level, setLanguage, setLevel } = usePersistentLearnerProfile();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<InteractionMode>("text");

  const profile = useMemo(
    () => ({
      language,
      level,
      goal: goals[language]
    }),
    [language, level]
  );

  const isCallMode = mode === "voice";
  const liveAvatar = useLiveAvatarSession(language, isCallMode);

  const avatarSpeech = useMemo(
    () => ({
      isAvailable: isCallMode && liveAvatar.isLiveAvatarActive,
      speak: liveAvatar.speakText,
      repeat: liveAvatar.repeatText
    }),
    [isCallMode, liveAvatar.isLiveAvatarActive, liveAvatar.repeatText, liveAvatar.speakText]
  );

  const {
    messages,
    status,
    lastFeedback,
    currentLessonStage,
    isHistoryReady,
    sessionKey,
    sendMessage,
    repeatLastTeacherMessage
  } = useAvatarTeacher(profile, avatarSpeech);

  const { requestLanguage, requestLevel } = useGuardedProfileSwitch({
    messages,
    language,
    level,
    setLanguage,
    setLevel
  });

  const [sessionNotice, setSessionNotice] = useState("");
  const previousSessionKeyRef = useRef(sessionKey);

  useEffect(() => {
    if (!isHistoryReady || previousSessionKeyRef.current === sessionKey) {
      return;
    }

    previousSessionKeyRef.current = sessionKey;
    const [sessionLanguage, sessionLevel] = sessionKey.split(":");
    const languageLabel = sessionLanguage === "he" ? "Иврит" : "English";
    setSessionNotice(`Загружена сохранённая сессия: ${languageLabel} · ${sessionLevel}`);

    const timeoutId = window.setTimeout(() => setSessionNotice(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [isHistoryReady, sessionKey]);

  const recorder = useAudioRecorder({
    onAudioReady: async (audio) => {
      const formData = new FormData();
      formData.append("audio", audio, "speech.webm");

      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "STT failed");
      }

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

  const isBusy = status === "thinking" || status === "speaking";

  const voiceStatusLabel = recorder.isRecording
    ? "Слушаю вас..."
    : recorder.isTranscribing
      ? "Распознаю речь..."
      : status === "thinking"
        ? "Думаю над ответом..."
        : status === "speaking"
          ? "Говорит учитель..."
          : "Нажмите на микрофон";

  return (
    <main className="min-h-screen min-h-[100dvh] overflow-x-hidden bg-[#f7f3eb] text-[#121212] flex flex-col">
      <header className="border-b border-[#121212]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              alt="AI Avatar Teacher"
              className="h-12 w-12 shrink-0 rounded-2xl border border-white/80 object-cover shadow-[0_12px_30px_rgba(18,18,18,0.18)] ring-1 ring-[#121212]/10 sm:h-14 sm:w-14"
              height={56}
              priority
              src="/logo-ai.png"
              width={56}
            />
            <h1 className="font-display text-lg font-semibold tracking-tight sm:text-2xl">
              AI Avatar Teacher
            </h1>
          </div>
          <div className="flex w-full rounded-full border border-[#121212]/10 bg-white p-0.5 shadow-sm sm:w-auto">
            <button
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-xs sm:flex-none sm:text-sm font-bold transition active:scale-95 ${
                language === "he" ? "bg-[#121212] text-white" : "text-[#121212]/70 hover:text-[#121212]"
              }`}
              type="button"
              onClick={() => requestLanguage("he")}
            >
              Иврит
            </button>
            <button
              className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-xs sm:flex-none sm:text-sm font-bold transition active:scale-95 ${
                language === "en" ? "bg-[#121212] text-white" : "text-[#121212]/70 hover:text-[#121212]"
              }`}
              type="button"
              onClick={() => requestLanguage("en")}
            >
              English
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl flex-1 gap-6 p-4 md:h-[calc(100dvh-4.5rem)] md:grid-cols-[380px_1fr] md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:h-full md:overflow-y-auto pr-1">
          <AvatarStage
            variant={isCallMode ? "call" : "chat"}
            connectionHint={liveAvatar.connectionHint}
            connectionLabel={liveAvatar.connectionLabel}
            connectionMode={liveAvatar.connectionMode}
            isStreamReady={liveAvatar.isStreamReady}
            status={status}
            videoRef={liveAvatar.videoRef}
            onReconnect={liveAvatar.reconnect}
            onUnmuteVideo={liveAvatar.unmuteVideo}
          />

          <LessonProgressBar currentStage={currentLessonStage} />

          <div className="flex min-h-[44px] items-center justify-between rounded-lg border border-[#121212]/10 bg-white px-4 py-3 shadow-soft text-sm font-bold text-[#121212]/70">
            <span className="flex items-center gap-2">
              <Languages aria-hidden="true" className="h-4 w-4 text-violet" />
              Уровень
            </span>
            <select
              className="min-h-[44px] rounded-md border border-[#121212]/15 bg-[#f7f3eb] px-3 py-2 text-sm font-bold text-[#121212] focus:outline-none"
              value={level}
              onChange={(event) => requestLevel(event.target.value as LearnerLevel)}
            >
              <option>A1</option>
              <option>A2</option>
              <option>B1</option>
              <option>B2</option>
            </select>
          </div>
        </div>

        <div className="flex min-h-[min(72vh,640px)] flex-col overflow-hidden rounded-lg border border-[#121212]/10 bg-white shadow-soft md:min-h-0 md:h-full">
          {sessionNotice ? (
            <div className="border-b border-violet/20 bg-violet/10 px-4 py-2 text-xs font-semibold text-violet">
              {sessionNotice}
            </div>
          ) : null}

          <div className="flex items-center justify-between border-b border-[#121212]/10 px-4 py-3 bg-white">
            <div className="flex items-center gap-2 font-black">
              <Bot aria-hidden="true" className="h-5 w-5 text-coral" />
              {mode === "text" ? "Чат с преподавателем" : "Голосовой урок"}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-full border border-[#121212]/10 bg-[#f7f3eb] p-0.5">
                <button
                  aria-label="Текстовый режим"
                  aria-pressed={mode === "text"}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 transition ${
                    mode === "text"
                      ? "bg-[#121212] text-white shadow-sm"
                      : "text-[#121212]/50 hover:text-[#121212]"
                  }`}
                  type="button"
                  onClick={() => setMode("text")}
                >
                  <Keyboard aria-hidden="true" className="h-4 w-4" />
                  <span className="text-xs font-bold">Чат</span>
                </button>
                <button
                  aria-label="Режим звонка"
                  aria-pressed={mode === "voice"}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 transition ${
                    mode === "voice"
                      ? "bg-coral text-white shadow-sm"
                      : "text-[#121212]/50 hover:text-[#121212]"
                  }`}
                  type="button"
                  onClick={() => setMode("voice")}
                >
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  <span className="text-xs font-bold">Звонок</span>
                </button>
              </div>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#121212]/10 text-[#121212]/70 transition active:scale-95 hover:border-coral hover:text-coral hover:bg-[#121212]/5"
                type="button"
                aria-label="Повторить последнюю фразу"
                onClick={repeatLastTeacherMessage}
              >
                <Volume2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode === "text" ? (
            <>
              <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-[#fbfaf6] p-4 min-h-[300px]">
                {!isHistoryReady ? (
                  <p className="text-sm font-semibold text-[#121212]/45">Загружаю историю чата...</p>
                ) : null}
                {messages.map((message) => (
                  <article
                    className={`max-w-[85%] rounded-lg px-4 py-2.5 shadow-sm lg:max-w-[38rem] ${
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
                  className="min-h-16 max-h-32 resize-none rounded-lg border border-[#121212]/15 bg-[#f7f3eb] px-4 py-2.5 text-base leading-relaxed text-[#121212] placeholder:text-[#121212]/45 focus:outline-none"
                  placeholder={
                    language === "he"
                      ? "Например: как сказать «я хочу кофе» на иврите?"
                      : "Например: help me introduce myself in English"
                  }
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md bg-[#121212] px-4 py-2.5 text-sm font-black text-white transition active:scale-[0.98] hover:bg-coral disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                    type="submit"
                    disabled={isBusy}
                  >
                    <Send aria-hidden="true" className="h-4 w-4" />
                    Отправить
                  </button>
                  <button
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#121212]/15 px-4 py-2.5 text-sm font-bold text-[#121212] transition active:scale-[0.98] hover:border-violet hover:text-violet bg-white"
                    type="button"
                    onClick={() =>
                      setText(language === "he" ? "Научи меня поздороваться" : "Teach me a useful phrase")
                    }
                  >
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    Пример
                  </button>
                </div>
                {recorder.error ? (
                  <p className="text-xs font-semibold text-coral mt-1">{recorder.error}</p>
                ) : null}
              </form>
            </>
          ) : (
            <div className="flex min-h-[420px] flex-1 flex-col items-center justify-between bg-gradient-to-b from-[#fbfaf6] to-[#f0ece2] p-6">
              <div className="flex flex-1 flex-col items-center justify-center gap-6 w-full">
                <p
                  aria-live="polite"
                  className={`text-sm font-bold tracking-wide ${
                    recorder.isRecording ? "text-coral" : isBusy ? "text-violet" : "text-[#121212]/50"
                  }`}
                >
                  {voiceStatusLabel}
                </p>

                <div className="relative grid place-items-center">
                  {recorder.isRecording ? (
                    <>
                      <span className="voice-pulse absolute h-28 w-28 rounded-full border-2 border-coral/40" />
                      <span className="voice-pulse voice-pulse-delayed absolute h-36 w-36 rounded-full border border-coral/20" />
                    </>
                  ) : null}
                  <button
                    aria-label={recorder.isRecording ? "Остановить запись" : "Начать говорить"}
                    className={`relative z-10 grid h-20 w-20 place-items-center rounded-full shadow-lg transition-all active:scale-90 ${
                      recorder.isRecording
                        ? "bg-coral text-white scale-110"
                        : isBusy
                          ? "bg-[#121212]/20 text-[#121212]/40 cursor-not-allowed"
                          : "bg-[#121212] text-white hover:bg-coral hover:scale-105"
                    }`}
                    disabled={recorder.isTranscribing || isBusy}
                    type="button"
                    onClick={() => {
                      liveAvatar.unmuteVideo();
                      if (recorder.isRecording) {
                        recorder.stopRecording();
                      } else {
                        void recorder.startRecording();
                      }
                    }}
                  >
                    {recorder.isRecording ? (
                      <MicOff className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </button>
                </div>

                {recorder.error ? (
                  <p className="text-xs font-semibold text-coral">{recorder.error}</p>
                ) : null}
              </div>

              <div className="w-full max-w-md space-y-2 max-h-[200px] overflow-y-auto rounded-lg border border-[#121212]/10 bg-white/80 backdrop-blur p-3">
                {messages.slice(-4).map((message) => (
                  <div
                    className={`rounded-md px-3 py-2 text-xs sm:text-sm ${
                      message.role === "teacher"
                        ? "bg-white border border-[#121212]/5 text-[#121212]"
                        : "bg-[#121212] text-white ml-auto max-w-[80%]"
                    }`}
                    key={message.id}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  </div>
                ))}
              </div>

              <button
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-coral/30 bg-white px-6 py-2.5 text-sm font-bold text-coral transition active:scale-95 hover:bg-coral hover:text-white"
                type="button"
                onClick={() => setMode("text")}
              >
                <PhoneOff aria-hidden="true" className="h-4 w-4" />
                Завершить звонок
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
