"use client";

import { useCallback } from "react";
import type { ChatMessage, LearnerLevel, TargetLanguage } from "@/types/teacher";

const languageLabels: Record<TargetLanguage, string> = {
  he: "Иврит",
  en: "English"
};

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
  const requestLanguage = useCallback(
    (nextLanguage: TargetLanguage) => {
      if (nextLanguage === language) {
        return;
      }

      if (
        hasUserMessages(messages) &&
        !window.confirm(
          `Смена языка откроет сохранённую сессию для «${languageLabels[nextLanguage]}». Текущий диалог останется в истории. Продолжить?`
        )
      ) {
        return;
      }

      setLanguage(nextLanguage);
    },
    [language, messages, setLanguage]
  );

  const requestLevel = useCallback(
    (nextLevel: LearnerLevel) => {
      if (nextLevel === level) {
        return;
      }

      if (
        hasUserMessages(messages) &&
        !window.confirm(
          `Смена уровня откроет сохранённую сессию для «${nextLevel}». Текущий диалог останется в истории. Продолжить?`
        )
      ) {
        return;
      }

      setLevel(nextLevel);
    },
    [level, messages, setLevel]
  );

  return {
    requestLanguage,
    requestLevel
  };
}
