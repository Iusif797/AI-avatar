"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  TeacherChatResponse,
  TeacherProfile,
  TeacherStatus
} from "@/types/teacher";

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const initialTeacherMessage: ChatMessage = {
  id: "welcome",
  role: "teacher",
  text:
    "Привет! Я твой AI-учитель. Скажи, что хочешь потренировать сегодня, и я поведу урок голосом, короткими шагами и с мягкими исправлениями."
};

export function useAvatarTeacher(profile: TeacherProfile) {
  const [messages, setMessages] = useState<ChatMessage[]>([initialTeacherMessage]);
  const [status, setStatus] = useState<TeacherStatus>("idle");
  const [lastFeedback, setLastFeedback] = useState<string>("");
  const speechIdRef = useRef(0);

  const lastTeacherText = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "teacher")
        ?.text.trim() ?? "",
    [messages]
  );

  const speak = useCallback(
    async (text: string) => {
      const speechId = speechIdRef.current + 1;
      speechIdRef.current = speechId;
      setStatus("speaking");

      const fallbackDuration = Math.min(12000, 900 + text.length * 45);

      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        await new Promise((resolve) => setTimeout(resolve, fallbackDuration));

        if (speechIdRef.current === speechId) {
          setStatus("idle");
        }

        return;
      }

      await new Promise<void>((resolve) => {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        const hasCyrillic = /[а-яё]/i.test(text);
        const lang = hasCyrillic ? "ru-RU" : profile.language === "he" ? "he-IL" : "en-US";
        const voices = synth.getVoices();
        const preferredVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.toLowerCase()));
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

          if (speechIdRef.current === speechId) {
            setStatus("idle");
          }

          resolve();
        };

        const timeoutId = window.setTimeout(finish, fallbackDuration);

        utterance.onend = finish;
        utterance.onerror = finish;
        synth.cancel();
        synth.speak(utterance);
      });
    },
    [profile.language]
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
        setLastFeedback(data.correction ?? (data.source === "fallback" ? "Работает demo-режим." : ""));
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

    await speak(lastTeacherText);
  }, [lastTeacherText, speak, status]);

  return {
    messages,
    status,
    lastFeedback,
    sendMessage,
    repeatLastTeacherMessage
  };
}
