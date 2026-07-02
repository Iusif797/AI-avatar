"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePersistentChatHistory } from "@/hooks/usePersistentChatHistory";
import { resolveCurrentLessonStage, stripStageLabel } from "@/lib/lesson-progress";
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

type UseAvatarTeacherOptions = {
  autoSpeakOnReply?: boolean;
  historyEnabled?: boolean;
};

type FailedTeacherRequest = {
  userMessage: string;
  historyTail: ChatMessage[];
};

const HISTORY_TAIL_LENGTH = 12;

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
  lessonStage: 1,
  text:
    "Привет! Я твоя AI-учительница. Расскажи, что хочешь потренировать сегодня — начнём с простого и пойдём в твоём темпе."
};

export function useAvatarTeacher(
  profile: TeacherProfile,
  avatarSpeech?: AvatarSpeechAdapter,
  options?: UseAvatarTeacherOptions
) {
  const autoSpeakOnReply = options?.autoSpeakOnReply ?? false;
  const historyEnabled = options?.historyEnabled ?? true;
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
    initialMessages: [initialTeacherMessage],
    enabled: historyEnabled
  });
  const [status, setStatus] = useState<TeacherStatus>("idle");
  const [errorNotice, setErrorNotice] = useState("");
  const speechIdRef = useRef(0);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const failedRequestRef = useRef<FailedTeacherRequest | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  const appendMessage = useCallback(
    (entry: ChatMessage) => {
      setMessages((previous) => {
        const next = [...previous, entry];
        messagesRef.current = next;
        return next;
      });
    },
    [setMessages]
  );

  const currentLessonStage = useMemo(() => resolveCurrentLessonStage(messages), [messages]);

  const lastTeacherText = useMemo(() => {
    const rawText =
      [...messages]
        .reverse()
        .find((message) => message.role === "teacher")
        ?.text.trim() ?? "";

    return stripStageLabel(rawText);
  }, [messages]);

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
        window.speechSynthesis?.cancel();

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

  const requestTeacherReply = useCallback(
    async (userMessage: string, historyTail: ChatMessage[]) => {
      try {
        const response = await fetch("/api/teacher/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            profile,
            history: historyTail,
            userMessage
          })
        });

        if (response.status === 429) {
          failedRequestRef.current = { userMessage, historyTail };
          setErrorNotice("Слишком много запросов. Подожди немного и нажми «Повторить».");
          setStatus("error");
          return;
        }

        if (!response.ok) {
          throw new Error(`Teacher API returned ${response.status}`);
        }

        const data = (await response.json()) as TeacherChatResponse;
        const teacherEntry: ChatMessage = {
          id: createId(),
          role: "teacher",
          text: data.reply,
          lessonStage: data.lessonStage
        };

        failedRequestRef.current = null;
        appendMessage(teacherEntry);

        const feedbackParts = [
          data.correction ?? "",
          data.suggestedPractice ? `Практика: ${data.suggestedPractice}` : ""
        ].filter(Boolean);

        setLastFeedback(
          feedbackParts.join(" — ") ||
            (data.source === "fallback" ? "Демо-режим: AI-ключ не подключён, ответ учебный." : "")
        );

        if (autoSpeakOnReply) {
          await speak(data.reply);
          return;
        }

        setStatus("idle");
      } catch {
        failedRequestRef.current = { userMessage, historyTail };
        setErrorNotice("Не удалось получить ответ от сервера. Проверь соединение и нажми «Повторить».");
        setStatus("error");
      }
    },
    [appendMessage, autoSpeakOnReply, profile, setLastFeedback, speak]
  );

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const historyTail = messagesRef.current.slice(-HISTORY_TAIL_LENGTH);

      appendMessage({
        id: createId(),
        role: "user",
        text: userMessage
      });
      setLastFeedback("");
      setErrorNotice("");
      setStatus("thinking");

      await requestTeacherReply(userMessage, historyTail);
    },
    [appendMessage, requestTeacherReply, setLastFeedback]
  );

  const retryLastMessage = useCallback(async () => {
    const failedRequest = failedRequestRef.current;

    if (!failedRequest || status === "thinking" || status === "speaking") {
      return;
    }

    setErrorNotice("");
    setStatus("thinking");
    await requestTeacherReply(failedRequest.userMessage, failedRequest.historyTail);
  }, [requestTeacherReply, status]);

  const resetLesson = useCallback(() => {
    speechIdRef.current += 1;
    window.speechSynthesis?.cancel();
    failedRequestRef.current = null;
    messagesRef.current = [initialTeacherMessage];
    setMessages([initialTeacherMessage]);
    setLastFeedback("");
    setErrorNotice("");
    setStatus("idle");
  }, [setLastFeedback, setMessages]);

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
    errorNotice,
    currentLessonStage,
    isHistoryReady,
    sessionKey,
    lastTeacherText,
    sendMessage,
    retryLastMessage,
    resetLesson,
    repeatLastTeacherMessage
  };
}
