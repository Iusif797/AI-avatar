"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, LearnerLevel, TargetLanguage } from "@/types/teacher";

export type PendingProfileSwitch =
  | { kind: "language"; value: TargetLanguage }
  | { kind: "level"; value: LearnerLevel };

function hasUserMessages(messages: ChatMessage[]): boolean {
  return messages.some((message) => message.role === "user");
}

type UseGuardedProfileSwitchOptions = {
  messages: ChatMessage[];
  language: TargetLanguage;
  level: LearnerLevel;
  setLanguage: (language: TargetLanguage) => void;
  setLevel: (level: LearnerLevel) => void;
};

export function useGuardedProfileSwitch({
  messages,
  language,
  level,
  setLanguage,
  setLevel
}: UseGuardedProfileSwitchOptions) {
  const [pendingSwitch, setPendingSwitch] = useState<PendingProfileSwitch | null>(null);

  const requestLanguage = useCallback(
    (nextLanguage: TargetLanguage) => {
      if (nextLanguage === language) {
        return;
      }

      if (!hasUserMessages(messages)) {
        setLanguage(nextLanguage);
        return;
      }

      setPendingSwitch({ kind: "language", value: nextLanguage });
    },
    [language, messages, setLanguage]
  );

  const requestLevel = useCallback(
    (nextLevel: LearnerLevel) => {
      if (nextLevel === level) {
        return;
      }

      if (!hasUserMessages(messages)) {
        setLevel(nextLevel);
        return;
      }

      setPendingSwitch({ kind: "level", value: nextLevel });
    },
    [level, messages, setLevel]
  );

  const confirmPendingSwitch = useCallback(() => {
    if (!pendingSwitch) {
      return;
    }

    if (pendingSwitch.kind === "language") {
      setLanguage(pendingSwitch.value);
    } else {
      setLevel(pendingSwitch.value);
    }

    setPendingSwitch(null);
  }, [pendingSwitch, setLanguage, setLevel]);

  const cancelPendingSwitch = useCallback(() => {
    setPendingSwitch(null);
  }, []);

  return {
    pendingSwitch,
    requestLanguage,
    requestLevel,
    confirmPendingSwitch,
    cancelPendingSwitch
  };
}
