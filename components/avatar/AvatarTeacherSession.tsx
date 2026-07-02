"use client";

import {
  Bot,
  Keyboard,
  Languages,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AvatarStage } from "@/components/avatar/AvatarStage";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LessonProgressBar } from "@/components/avatar/LessonProgressBar";
import { useAvatarTeacher } from "@/components/avatar/useAvatarTeacher";
import { useLiveAvatarSession } from "@/components/avatar/useLiveAvatarSession";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useGuardedProfileSwitch } from "@/hooks/useGuardedProfileSwitch";
import { stripStageLabel } from "@/lib/lesson-progress";
import { usePersistentLearnerProfile } from "@/hooks/usePersistentLearnerProfile";
import type { LearnerLevel, TargetLanguage } from "@/types/teacher";

const goals: Record<TargetLanguage, string> = {
  he: "заговорить на базовом иврите для жизни в Израиле",
  en: "уверенно говорить на английском в работе и поездках"
};

const languageLabels: Record<TargetLanguage, string> = {
  he: "Иврит",
  en: "English"
};

type InteractionMode = "text" | "voice";

export function AvatarTeacherSession() {
  const { language, level, setLanguage, setLevel, isProfileReady } = usePersistentLearnerProfile();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<InteractionMode>("text");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

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
    errorNotice,
    currentLessonStage,
    isHistoryReady,
    sessionKey,
    lastTeacherText,
    sendMessage,
    retryLastMessage,
    resetLesson,
    repeatLastTeacherMessage
  } = useAvatarTeacher(profile, avatarSpeech, {
    autoSpeakOnReply: isCallMode,
    historyEnabled: isProfileReady
  });

  const {
    pendingSwitch,
    requestLanguage,
    requestLevel,
    confirmPendingSwitch,
    cancelPendingSwitch
  } = useGuardedProfileSwitch({
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
      const extension = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();
      formData.append("audio", audio, `speech.${extension}`);

      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "STT failed");
      }

      const transcript = data.text?.trim();

      if (!transcript) {
        throw new Error("Не расслышала речь. Скажи чуть громче и попробуй ещё раз.");
      }

      await sendMessage(transcript);
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
  const panelStatusLabel =
    mode === "voice" ? voiceStatusLabel : `Этап ${currentLessonStage.number}: ${currentLessonStage.title}`;

  return (
    <main className="min-h-screen min-h-[100dvh] overflow-x-hidden bg-[linear-gradient(180deg,#fffaf1_0%,#f6efe4_46%,#ece3d5_100%)] text-[#121212] flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[#121212]/10 bg-[#fffaf1]/88 shadow-[0_10px_30px_rgba(18,18,18,0.06)] backdrop-blur-xl">
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
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold tracking-tight sm:text-2xl">
                AI Avatar Teacher
              </h1>
              <p className="mt-0.5 text-xs font-bold text-[#121212]/48 sm:text-sm">
                {language === "he" ? "Иврит" : "English"} · {level}
              </p>
            </div>
          </div>
          <div className="flex w-full overflow-hidden rounded-full border border-[#121212]/10 bg-white/75 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_22px_rgba(18,18,18,0.06)] sm:w-auto">
            <button
              className={`inline-flex min-h-[42px] min-w-0 flex-1 items-center justify-center rounded-full px-4 py-2 text-xs sm:flex-none sm:px-5 sm:text-sm font-bold transition active:scale-95 ${
                language === "he" ? "bg-[#121212] text-white shadow-md" : "text-[#121212]/62 hover:text-[#121212]"
              }`}
              type="button"
              onClick={() => requestLanguage("he")}
            >
              Иврит
            </button>
            <button
              className={`inline-flex min-h-[42px] min-w-0 flex-1 items-center justify-center rounded-full px-4 py-2 text-xs sm:flex-none sm:px-5 sm:text-sm font-bold transition active:scale-95 ${
                language === "en" ? "bg-[#121212] text-white shadow-md" : "text-[#121212]/62 hover:text-[#121212]"
              }`}
              type="button"
              onClick={() => requestLanguage("en")}
            >
              English
            </button>
          </div>
        </div>
      </header>

      <section className="lesson-shell mx-auto grid max-w-7xl flex-1 gap-5 py-4 md:h-[calc(100dvh-5.25rem)] md:grid-cols-[400px_minmax(0,1fr)] md:p-6 lg:gap-7 lg:p-8">
        <div className="flex min-w-0 flex-col gap-4 md:h-full md:overflow-y-auto md:pr-1">
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

          <div className="flex min-h-[64px] items-center justify-between rounded-lg border border-[#121212]/10 bg-white/82 px-4 py-3 text-sm font-bold text-[#121212]/70 shadow-[0_18px_45px_rgba(18,18,18,0.08)] backdrop-blur">
            <span className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-violet/10">
                <Languages aria-hidden="true" className="h-4 w-4 text-violet" />
              </span>
              Уровень
            </span>
            <select
              className="min-h-[44px] rounded-md border border-[#121212]/12 bg-[#fffaf1] px-3 py-2 text-sm font-bold text-[#121212] shadow-inner focus:outline-none"
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

        <div className="flex min-h-[min(72vh,640px)] min-w-0 flex-col overflow-hidden rounded-lg border border-[#121212]/10 bg-white/88 shadow-[0_28px_80px_rgba(18,18,18,0.12)] backdrop-blur md:min-h-0 md:h-full">
          {sessionNotice ? (
            <div className="border-b border-violet/20 bg-violet/10 px-4 py-2 text-xs font-semibold text-violet">
              {sessionNotice}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-b border-[#121212]/10 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf1_100%)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3 font-black">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-coral/10">
                <Bot aria-hidden="true" className="h-5 w-5 text-coral" />
              </span>
              <div className="min-w-0">
                <p className="truncate">{mode === "text" ? "Чат с преподавателем" : "Голосовой урок"}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-[#121212]/45">{panelStatusLabel}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="flex rounded-full border border-[#121212]/10 bg-[#f7f3eb] p-1 shadow-inner">
                <button
                  aria-label="Текстовый режим"
                  aria-pressed={mode === "text"}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 transition ${
                    mode === "text"
                      ? "bg-[#121212] text-white shadow-md"
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
                      ? "bg-coral text-white shadow-md"
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#121212]/10 text-[#121212]/70 transition active:scale-95 hover:border-coral hover:text-coral hover:bg-[#121212]/5 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                aria-label="Озвучить последнюю фразу учителя"
                disabled={!lastTeacherText || isBusy}
                onClick={repeatLastTeacherMessage}
              >
                <Volume2 aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#121212]/10 text-[#121212]/70 transition active:scale-95 hover:border-violet hover:text-violet hover:bg-[#121212]/5 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                aria-label="Начать новый урок"
                disabled={isBusy}
                onClick={() => setIsResetDialogOpen(true)}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode === "text" ? (
            <>
              <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#fffdf8_0%,#f7f0e5_100%)] p-4 min-h-[300px] sm:p-5">
                {!isHistoryReady ? (
                  <p className="text-sm font-semibold text-[#121212]/45">Загружаю историю чата...</p>
                ) : null}
                {messages.map((message) => (
                  <article
                    className={`max-w-[88%] rounded-lg px-4 py-3 shadow-[0_12px_30px_rgba(18,18,18,0.06)] lg:max-w-[38rem] ${
                      message.role === "teacher"
                        ? "border border-[#121212]/10 bg-white/92 mr-auto"
                        : "ml-auto bg-[#121212] text-white"
                    }`}
                    key={message.id}
                  >
                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                      {message.role === "teacher" ? "AI-учитель" : "Ученик"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.role === "teacher" ? stripStageLabel(message.text) : message.text}</p>
                  </article>
                ))}
              </div>

              {errorNotice ? (
                <div className="flex items-center justify-between gap-3 border-t border-coral/20 bg-coral/10 px-4 py-3 text-xs sm:text-sm font-semibold text-[#121212]/80">
                  <span>{errorNotice}</span>
                  <button
                    className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-md bg-coral px-3 text-xs font-black text-white transition active:scale-95 hover:bg-[#121212]"
                    type="button"
                    onClick={() => void retryLastMessage()}
                  >
                    Повторить
                  </button>
                </div>
              ) : null}

              {lastFeedback ? (
                <div className="border-t border-[#121212]/10 bg-mint/10 px-4 py-3 text-xs sm:text-sm font-semibold text-[#121212]/75">
                  <span className="text-mint font-bold">Фидбек:</span> {lastFeedback}
                </div>
              ) : null}

              <form className="grid gap-3 border-t border-[#121212]/10 bg-white/96 p-4" onSubmit={handleSubmit}>
                <textarea
                  className="min-h-16 max-h-32 resize-none rounded-lg border border-[#121212]/12 bg-[#fffaf1] px-4 py-3 text-base leading-relaxed text-[#121212] shadow-inner placeholder:text-[#121212]/42 focus:outline-none"
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
                    className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-md bg-[#121212] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_26px_rgba(18,18,18,0.18)] transition active:scale-[0.98] hover:bg-coral disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                    type="submit"
                    disabled={isBusy}
                  >
                    <Send aria-hidden="true" className="h-4 w-4" />
                    Отправить
                  </button>
                  <button
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md border border-[#121212]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#121212] shadow-sm transition active:scale-[0.98] hover:border-violet hover:text-violet"
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
            <div className="flex min-h-[420px] flex-1 flex-col items-center justify-between bg-[linear-gradient(180deg,#fffdf8_0%,#efe7da_100%)] p-6">
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

                {errorNotice ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-coral">{errorNotice}</p>
                    <button
                      className="inline-flex min-h-[32px] items-center justify-center rounded-md bg-coral px-3 text-xs font-black text-white transition active:scale-95 hover:bg-[#121212]"
                      type="button"
                      onClick={() => void retryLastMessage()}
                    >
                      Повторить
                    </button>
                  </div>
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
                    <p className="whitespace-pre-wrap leading-relaxed">{message.role === "teacher" ? stripStageLabel(message.text) : message.text}</p>
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

      {pendingSwitch ? (
        <ConfirmDialog
          confirmLabel="Продолжить"
          description={`Откроется сохранённая сессия для «${
            pendingSwitch.kind === "language" ? languageLabels[pendingSwitch.value] : pendingSwitch.value
          }». Текущий диалог останется в истории.`}
          title={pendingSwitch.kind === "language" ? "Сменить язык?" : "Сменить уровень?"}
          onCancel={cancelPendingSwitch}
          onConfirm={confirmPendingSwitch}
        />
      ) : null}

      {isResetDialogOpen ? (
        <ConfirmDialog
          confirmLabel="Начать заново"
          description="История текущего диалога для этого языка и уровня будет очищена."
          title="Начать новый урок?"
          onCancel={() => setIsResetDialogOpen(false)}
          onConfirm={() => {
            resetLesson();
            setIsResetDialogOpen(false);
          }}
        />
      ) : null}
    </main>
  );
}
