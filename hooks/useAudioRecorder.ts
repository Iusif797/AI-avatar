"use client";

import { useCallback, useRef, useState } from "react";

type AudioRecorderState = "idle" | "recording" | "transcribing" | "error";

type UseAudioRecorderOptions = {
  onAudioReady: (audio: Blob) => Promise<void>;
};

const MAX_RECORDING_MS = 60_000;

export function useAudioRecorder({ onAudioReady }: UseAudioRecorderOptions) {
  const [state, setState] = useState<AudioRecorderState>("idle");
  const [error, setError] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const clearAutoStopTimer = useCallback(() => {
    if (autoStopTimerRef.current !== null) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      setError("Браузер не поддерживает запись аудио.");
      return;
    }

    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState("error");
      setError("Нет доступа к микрофону. Разреши запись в настройках браузера.");
      return;
    }

    const recorder = new MediaRecorder(stream);

    chunksRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      clearAutoStopTimer();
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      stream.getTracks().forEach((track) => track.stop());

      setState("transcribing");
      void onAudioReady(audio)
        .then(() => setState("idle"))
        .catch((cause: unknown) => {
          setState("error");
          setError(
            cause instanceof Error && cause.message
              ? cause.message
              : "Не получилось распознать голос."
          );
        });
    };

    recorder.start();
    setState("recording");

    autoStopTimerRef.current = window.setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, MAX_RECORDING_MS);
  }, [clearAutoStopTimer, onAudioReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    state,
    error,
    isRecording: state === "recording",
    isTranscribing: state === "transcribing",
    startRecording,
    stopRecording
  };
}
