"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePersistentChatHistory } from "@/hooks/usePersistentChatHistory";
import { resolveCurrentLessonStage } from "@/lib/lesson-progress";
import { toSpeechSegments } from "@/lib/speech";
import type {
  ChatMessage,
  TeacherChatResponse,
  TeacherProfile,
  TeacherStatus
} from "@/types/teacher";

type AvatarSpeechAdapter = {
  isAvailable: boolean;
  speak: (text: string) => Promise<boolean>;
  repeat: (text: string) => Promise<boolean>;
};

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function speakSegment(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const langVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
    const preferredVoice = langVoices.find((voice) => {
      const name = voice.name.toLowerCase();
      return name.includes("siri") || name.includes("premium") || name.includes("enhanced") || name.includes("google");
    }) || langVoices[0];
    let didFinish = false;

    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    const finish = () => {
      if (didFinish) {
        return;
      }

      didFinish = true;
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(finish, Math.min(12000, 700 + text.length * 55));

    utterance.onend = finish;
    utterance.onerror = finish;
    synth.speak(utterance);
  });
}

const initialTeacherMessage: ChatMessage = {
  id: "welcome",
  role: "teacher",
  text:
    "[Этап 1: Разминка] Привет! Я твой AI-учитель. Скажи, что хочешь потренировать сегодня, и я поведу урок голосом, короткими шагами и с мягкими исправлениями."
};

export function useAvatarTeacher(profile: TeacherProfile, avatarSpeech?: AvatarSpeechAdapter) {
  const {
    messages,
    setMessages,
    lastFeedback,
    setLastFeedback,
    isHistoryReady,
    sessionKey
  } = usePersistentChatHistory({
    language: profile.language,
    level: profile.level,
    initialMessages: [initialTeacherMessage]
  });
  const [status, setStatus] = useState<TeacherStatus>("idle");
  const speechIdRef = useRef(0);

  const currentLessonStage = useMemo(() => resolveCurrentLessonStage(messages), [messages]);

  const lastTeacherText = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "teacher")
        ?.text.trim() ?? "",
    [messages]
  );

  const speakWithBrowser = useCallback(async (text: string) => {
    const speechId = speechIdRef.current + 1;
    speechIdRef.current = speechId;
    setStatus("speaking");

    const segments = toSpeechSegments(text);
    const isCurrent = () => speechIdRef.current === speechId;
    const supportsSpeech =
      "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    if (!supportsSpeech || segments.length === 0) {
      const spokenLength =
        segments.reduce((total, segment) => total + segment.text.length, 0) || text.length;

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(12000, 900 + spokenLength * 45))
      );

      if (isCurrent()) {
        setStatus("idle");
      }

      return;
    }

    window.speechSynthesis.cancel();

    for (const segment of segments) {
      if (!isCurrent()) {
        return;
      }

      await speakSegment(segment.text, segment.lang);
    }

    if (isCurrent()) {
      setStatus("idle");
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (avatarSpeech?.isAvailable) {
        const speechId = speechIdRef.current + 1;
        speechIdRef.current = speechId;
        setStatus("speaking");

        const didSpeak = await avatarSpeech.speak(text);

        if (speechIdRef.current !== speechId) {
          return;
        }

        setStatus(didSpeak ? "idle" : "error");
        return;
      }

      await speakWithBrowser(text);
    },
    [avatarSpeech, speakWithBrowser]
  );

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const userEntry: ChatMessage = {
        id: createId(),
        role: "user",
        text: userMessage
      };

      const nextHistory = [...messages, userEntry];
      setMessages(nextHistory);
      setLastFeedback("");
      setStatus("thinking");

      try {
        const response = await fetch("/api/teacher/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            profile,
            history: messages,
            userMessage
          })
        });

        if (response.status === 429) {
          setLastFeedback("Слишком много запросов. Подожди немного и попробуй снова.");
          setStatus("error");
          return;
        }

        if (!response.ok) {
          throw new Error("Teacher API failed");
        }

        const data = (await response.json()) as TeacherChatResponse;
        const teacherEntry: ChatMessage = {
          id: createId(),
          role: "teacher",
          text: data.reply
        };

        setMessages([...nextHistory, teacherEntry]);
        setLastFeedback(data.correction ?? (data.source === "fallback" ? "AI-ключ не подключён. Добавь ключ провайдера в .env.local." : ""));
        await speak(data.reply);
      } catch {
        const teacherEntry: ChatMessage = {
          id: createId(),
          role: "teacher",
          text:
            "Я не смогла получить ответ от сервера. Проверь локальный запуск, а потом продолжим урок."
        };

        setMessages([...nextHistory, teacherEntry]);
        setStatus("error");
      }
    },
    [messages, profile, speak]
  );

  const repeatLastTeacherMessage = useCallback(async () => {
    if (!lastTeacherText || status === "thinking" || status === "speaking") {
      return;
    }

    if (avatarSpeech?.isAvailable) {
      const speechId = speechIdRef.current + 1;
      speechIdRef.current = speechId;
      setStatus("speaking");

      const didSpeak = await avatarSpeech.repeat(lastTeacherText);

      if (speechIdRef.current !== speechId) {
        return;
      }

      setStatus(didSpeak ? "idle" : "error");
      return;
    }

    await speakWithBrowser(lastTeacherText);
  }, [avatarSpeech, lastTeacherText, speakWithBrowser, status]);

  return {
    messages,
    status,
    lastFeedback,
    currentLessonStage,
    isHistoryReady,
    sessionKey,
    sendMessage,
    repeatLastTeacherMessage
  };
}
