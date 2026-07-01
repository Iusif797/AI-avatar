"use client";

import { useEffect, useState } from "react";
import type { TargetLanguage } from "@/types/teacher";

type LiveAvatarAvailability =
  | {
      mode: "checking";
      label: string;
    }
  | {
      mode: "liveavatar";
      label: string;
      sessionId: string;
    }
  | {
      mode: "fallback";
      label: string;
    };

export function useLiveAvatarSession(language: TargetLanguage) {
  const [availability, setAvailability] = useState<LiveAvatarAvailability>({
    mode: "checking",
    label: "проверяю LiveAvatar"
  });

  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      setAvailability({
        mode: "checking",
        label: "проверяю LiveAvatar"
      });

      try {
        const response = await fetch("/api/avatar/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ language })
        });

        const data = (await response.json()) as
          | { mode: "liveavatar"; sessionId: string }
          | { mode: "fallback"; message: string };

        if (!isMounted) {
          return;
        }

        if (data.mode === "liveavatar") {
          setAvailability({
            mode: "liveavatar",
            label: "LiveAvatar готов",
            sessionId: data.sessionId
          });
        } else {
          setAvailability({
            mode: "fallback",
            label: "локальный аватар"
          });
        }
      } catch {
        if (isMounted) {
          setAvailability({
            mode: "fallback",
            label: "локальный аватар"
          });
        }
      }
    }

    void checkToken();

    return () => {
      isMounted = false;
    };
  }, [language]);

  return availability;
}
