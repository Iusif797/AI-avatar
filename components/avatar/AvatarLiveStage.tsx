import { Activity, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import type { LiveAvatarConnectionMode } from "@/components/avatar/useLiveAvatarSession";
import type { TeacherStatus } from "@/types/teacher";

type AvatarLiveStageProps = {
  status: TeacherStatus;
  connectionMode: LiveAvatarConnectionMode;
  connectionLabel: string;
  connectionHint: string | null;
  isStreamReady: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  onReconnect: () => void;
  onUnmuteVideo: () => void;
};

const statusLabels: Record<TeacherStatus, string> = {
  idle: "на связи",
  listening: "слушает",
  thinking: "думает",
  speaking: "говорит",
  error: "ошибка"
};

export function AvatarLiveStage({
  status,
  connectionMode,
  connectionLabel,
  connectionHint,
  isStreamReady,
  videoRef,
  onReconnect,
  onUnmuteVideo
}: AvatarLiveStageProps) {
  const isBusy = status === "thinking" || status === "speaking";
  const showLiveVideo = connectionMode === "live" && isStreamReady;
  const isConnecting = connectionMode === "checking";

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-white/70 bg-[#121212] shadow-[0_24px_70px_rgba(18,18,18,0.18)] ring-1 ring-[#121212]/8">
      <div
        className="relative aspect-[4/5] w-full bg-[#1c1c1c]"
        role={showLiveVideo ? "button" : undefined}
        tabIndex={showLiveVideo ? 0 : undefined}
        onClick={showLiveVideo ? onUnmuteVideo : undefined}
        onKeyDown={
          showLiveVideo
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onUnmuteVideo();
                }
              }
            : undefined
        }
      >
        <video
          ref={videoRef}
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            showLiveVideo ? "opacity-100" : "opacity-0"
          }`}
          muted
          playsInline
        />
        {!showLiveVideo ? (
          <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(180deg,#263844_0%,#111820_100%)] px-6 text-center text-white/80">
            {isConnecting ? (
              <div className="grid gap-4 text-center">
                <Loader2 aria-hidden="true" className="mx-auto h-10 w-10 animate-spin text-white/70" />
                <p className="text-sm font-bold text-white/62">Подключение...</p>
              </div>
            ) : (
              <p className="text-sm font-semibold leading-relaxed">{connectionHint ?? "Подключение к HeyGen…"}</p>
            )}
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
          <span className="rounded-full bg-white/82 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#121212] shadow-sm backdrop-blur">
            {connectionLabel}
          </span>
          <span
            aria-live="polite"
            className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm"
            role="status"
          >
            {isBusy ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {statusLabels[status]}
          </span>
        </div>
        {connectionHint && !showLiveVideo ? (
          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-white/15 bg-coral/92 p-3 text-center text-xs font-bold text-white shadow-lg backdrop-blur">
            <p>{connectionHint}</p>
            <button
              className="mt-2 inline-flex min-h-[36px] items-center rounded-md bg-white/16 px-4 text-[11px] uppercase tracking-wide transition hover:bg-white/24"
              type="button"
              onClick={onReconnect}
            >
              Переподключить
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
