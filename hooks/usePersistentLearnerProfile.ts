"use client";

import { useEffect, useState } from "react";
import type { LearnerLevel, TargetLanguage } from "@/types/teacher";

const storageKey = "ai-language-tutor.profile";

type StoredProfile = {
  language: TargetLanguage;
  level: LearnerLevel;
};

function isTargetLanguage(value: string): value is TargetLanguage {
  return value === "he" || value === "en";
}

function isLearnerLevel(value: string): value is LearnerLevel {
  return value === "A1" || value === "A2" || value === "B1" || value === "B2";
}

function readStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as Partial<Record<keyof StoredProfile, string>>;

    if (data.language && data.level && isTargetLanguage(data.language) && isLearnerLevel(data.level)) {
      return {
        language: data.language,
        level: data.level
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function usePersistentLearnerProfile() {
  const [language, setLanguage] = useState<TargetLanguage>("he");
  const [level, setLevel] = useState<LearnerLevel>("A1");

  useEffect(() => {
    const stored = readStoredProfile();

    if (stored) {
      setLanguage(stored.language);
      setLevel(stored.level);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ language, level }));
  }, [language, level]);

  return {
    language,
    setLanguage,
    level,
    setLevel
  };
}
