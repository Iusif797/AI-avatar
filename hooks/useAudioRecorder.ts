"use client";

import { useCallback, useRef, useState } from "react";

type AudioRecorderState = "idle" | "recording" | "transcribing" | "error";

type UseAudioRecorderOptions = {
  onAudioReady: (audio: Blob) => Promise<void>;
};

export function useAudioRecorder({ onAudioReady }: UseAudioRecorderOptions) {
  const [state, setState] = useState<AudioRecorderState>("idle");
  const [error, setError] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = useCallback(async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Браузер не дал доступ к записи аудио.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    chunksRef.current = [];
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      stream.getTracks().forEach((track) => track.stop());

      setState("transcribing");
      void onAudioReady(audio)
        .then(() => setState("idle"))
        .catch(() => {
          setState("error");
          setError("Не получилось распознать голос.");
        });
    };

    recorder.start();
    setState("recording");
  }, [onAudioReady]);

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
