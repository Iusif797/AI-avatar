"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildChatSessionKey,
  loadChatSession,
  saveChatSession,
  type ChatSessionRecord
} from "@/lib/chat-history-store";
import type { ChatMessage, LearnerLevel, TargetLanguage } from "@/types/teacher";

type UsePersistentChatHistoryOptions = {
  language: TargetLanguage;
  level: LearnerLevel;
  initialMessages: ChatMessage[];
  enabled?: boolean;
};

export function usePersistentChatHistory({
  language,
  level,
  initialMessages,
  enabled = true
}: UsePersistentChatHistoryOptions) {
  const sessionKey = buildChatSessionKey(language, level);
  const initialMessagesRef = useRef(initialMessages);
  initialMessagesRef.current = initialMessages;
  const loadedSessionKeyRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [lastFeedback, setLastFeedback] = useState("");
  const [isHistoryReady, setIsHistoryReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isCancelled = false;
    setIsHistoryReady(false);
    loadedSessionKeyRef.current = null;

    void loadChatSession(language, level).then((record) => {
      if (isCancelled) {
        return;
      }

      if (record?.messages.length) {
        setMessages(record.messages);
        setLastFeedback(record.lastFeedback);
      } else {
        setMessages(initialMessagesRef.current);
        setLastFeedback("");
      }

      loadedSessionKeyRef.current = sessionKey;
      setIsHistoryReady(true);
    });

    return () => {
      isCancelled = true;
    };
  }, [enabled, sessionKey, language, level]);

  useEffect(() => {
    if (!isHistoryReady || loadedSessionKeyRef.current !== sessionKey) {
      return;
    }

    const record: ChatSessionRecord = {
      sessionKey,
      messages,
      lastFeedback,
      updatedAt: Date.now()
    };

    void saveChatSession(record);
  }, [isHistoryReady, lastFeedback, messages, sessionKey]);

  return {
    messages,
    setMessages,
    lastFeedback,
    setLastFeedback,
    isHistoryReady,
    sessionKey
  };
}
