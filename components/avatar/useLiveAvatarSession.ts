"use client";

import {
  LiveAvatarSession,
  SessionEvent,
  SessionState
} from "@heygen/liveavatar-web-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { speakWithLiveAvatar } from "@/lib/liveavatar-speak";
import type { TargetLanguage } from "@/types/teacher";

export type LiveAvatarConnectionMode = "idle" | "checking" | "live" | "fallback";

const KEEP_ALIVE_INTERVAL_MS = 45000;

type AvatarTokenResponse =
  | { mode: "liveavatar"; sessionId: string; sessionToken: string }
  | { mode: "fallback"; message: string };

function attachStreamToVideo(session: LiveAvatarSession, videoElement: HTMLVideoElement) {
  session.attach(videoElement);
  videoElement.muted = true;
  void videoElement.play().catch(() => undefined);
}

export function useLiveAvatarSession(language: TargetLanguage, isCallModeActive: boolean) {
  const [connectionMode, setConnectionMode] = useState<LiveAvatarConnectionMode>("idle");
  const [connectionLabel, setConnectionLabel] = useState("режим чата");
  const [connectionHint, setConnectionHint] = useState<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [connectNonce, setConnectNonce] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const connectGenerationRef = useRef(0);

  useEffect(() => {
    if (!isCallModeActive) {
      setConnectionMode("idle");
      setConnectionLabel("режим чата");
      setConnectionHint(null);
      setIsStreamReady(false);
      sessionRef.current = null;
      return;
    }

    const generation = connectGenerationRef.current + 1;
    connectGenerationRef.current = generation;
    let session: LiveAvatarSession | null = null;
    let keepAliveTimer: number | null = null;

    function isCurrentConnection() {
      return connectGenerationRef.current === generation;
    }

    function setFallbackState(message: string) {
      if (!isCurrentConnection()) {
        return;
      }

      setConnectionMode("fallback");
      setConnectionLabel("локальный аватар");
      setConnectionHint(message);
      setIsStreamReady(false);
    }

    async function connectLiveAvatar() {
      setConnectionMode("checking");
      setConnectionLabel("проверяю LiveAvatar");
      setConnectionHint(null);
      setIsStreamReady(false);

      try {
        const response = await fetch("/api/avatar/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language })
        });

        const data = (await response.json()) as AvatarTokenResponse & { error?: string };

        if (!isCurrentConnection()) {
          return;
        }

        if (!response.ok) {
          setFallbackState(data.error ?? `Ошибка подключения (${response.status}).`);
          return;
        }

        if (data.mode !== "liveavatar" || !data.sessionToken) {
          const fallbackMessage =
            data.mode === "fallback" ? data.message : "LiveAvatar недоступен.";
          setFallbackState(fallbackMessage ?? "LiveAvatar недоступен.");
          return;
        }

        session = new LiveAvatarSession(data.sessionToken);
        sessionRef.current = session;

        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          if (!isCurrentConnection()) {
            return;
          }

          setIsStreamReady(true);
          setConnectionHint(null);

          if (videoRef.current) {
            attachStreamToVideo(session!, videoRef.current);
          }
        });

        session.on(SessionEvent.SESSION_DISCONNECTED, () => {
          setFallbackState("Сессия LiveAvatar завершена.");
        });

        await session.start();

        if (!isCurrentConnection()) {
          await session.stop();
          return;
        }

        setConnectionMode("live");
        setConnectionLabel("HeyGen live");
        setConnectionHint(null);

        keepAliveTimer = window.setInterval(() => {
          if (session?.state === SessionState.CONNECTED) {
            void session.keepAlive().catch(() => undefined);
          }
        }, KEEP_ALIVE_INTERVAL_MS);
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : "Не удалось подключить LiveAvatar.";
        setFallbackState(errorMessage);
      }
    }

    void connectLiveAvatar();

    return () => {
      if (keepAliveTimer !== null) {
        window.clearInterval(keepAliveTimer);
      }

      if (connectGenerationRef.current === generation) {
        void session?.stop();
        sessionRef.current = null;
      }
    };
  }, [language, connectNonce, isCallModeActive]);

  useEffect(() => {
    if (!isStreamReady || !videoRef.current || !sessionRef.current) {
      return;
    }

    attachStreamToVideo(sessionRef.current, videoRef.current);
  }, [isStreamReady]);

  const reconnect = useCallback(() => {
    setConnectNonce((value) => value + 1);
  }, []);

  const unmuteVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
  }, []);

  const speakText = useCallback(async (text: string) => {
    const session = sessionRef.current;

    if (!session || connectionMode !== "live") {
      return false;
    }

    return speakWithLiveAvatar(session, text, "message");
  }, [connectionMode]);

  const repeatText = useCallback(async (text: string) => {
    const session = sessionRef.current;

    if (!session || connectionMode !== "live") {
      return false;
    }

    return speakWithLiveAvatar(session, text, "repeat");
  }, [connectionMode]);

  return {
    connectionMode,
    connectionLabel,
    connectionHint,
    isStreamReady,
    videoRef,
    isLiveAvatarActive: isCallModeActive && connectionMode === "live" && isStreamReady,
    reconnect,
    unmuteVideo,
    speakText,
    repeatText
  };
}
