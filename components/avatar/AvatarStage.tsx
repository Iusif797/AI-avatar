import { Activity, Loader2 } from "lucide-react";
import Image from "next/image";
import type { RefObject } from "react";
import type { LiveAvatarConnectionMode } from "@/components/avatar/useLiveAvatarSession";
import type { TeacherStatus } from "@/types/teacher";

type AvatarStageProps = {
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
  idle: "готова к уроку",
  listening: "слушает ученика",
  thinking: "думает над ответом",
  speaking: "говорит",
  error: "нужна проверка"
};

export function AvatarStage({
  status,
  connectionMode,
  connectionLabel,
  connectionHint,
  isStreamReady,
  videoRef,
  onReconnect,
  onUnmuteVideo
}: AvatarStageProps) {
  const isBusy = status === "thinking" || status === "speaking";
  const isSpeaking = status === "speaking";
  const showLiveVideo = connectionMode === "live" && isStreamReady;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-ink shadow-soft min-h-[240px] sm:min-h-[280px] md:min-h-[420px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(214,95,77,0.32),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(107,183,168,0.28),transparent_26%),linear-gradient(135deg,#211f1d,#121212)]" />
      <div className="relative z-10 flex w-full h-full flex-col items-center justify-between p-4 sm:p-5 text-white">
        <div className="flex w-full items-center justify-between gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 backdrop-blur sm:text-xs">
            {connectionLabel}
          </span>
          <div
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs sm:px-4 sm:text-sm font-bold backdrop-blur"
            role="status"
          >
            {isBusy ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Activity aria-hidden="true" className="h-4 w-4" />
            )}
            {statusLabels[status]}
          </div>
        </div>

        {connectionHint ? (
          <div className="mt-2 w-full rounded-lg border border-coral/30 bg-coral/15 px-3 py-2 text-xs font-semibold text-white/90">
            <p>{connectionHint}</p>
            <button
              className="mt-2 inline-flex min-h-[36px] items-center rounded-md border border-white/20 bg-white/10 px-3 text-[11px] font-bold uppercase tracking-wide transition hover:bg-white/20"
              type="button"
              onClick={onReconnect}
            >
              Переподключить
            </button>
          </div>
        ) : null}

        <div className="grid place-items-center my-auto py-4 w-full">
          <div className="avatar-presence relative grid h-52 w-52 place-items-center sm:h-64 sm:w-64 md:h-[22rem] md:w-[22rem]">
            <div
              aria-hidden="true"
              className={`avatar-ring absolute inset-3 rounded-full border border-mint/40 ${
                isSpeaking ? "is-speaking" : ""
              }`}
            />
            <div
              aria-hidden="true"
              className={`avatar-ring avatar-ring-delayed absolute inset-0 rounded-full border border-coral/30 ${
                isSpeaking ? "is-speaking" : ""
              }`}
            />
            <div
              className={`avatar-frame relative h-44 w-44 overflow-hidden rounded-full border border-white/25 bg-white/10 shadow-2xl sm:h-56 sm:w-56 md:h-80 md:w-80 ${
                isSpeaking ? "is-speaking" : ""
              }`}
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
                className={`absolute inset-0 z-20 h-full w-full object-cover transition-opacity duration-500 ${
                  showLiveVideo ? "opacity-100" : "opacity-0"
                }`}
                muted
                playsInline
              />
              <Image
                alt="AI-девушка преподаватель"
                className={`object-cover transition duration-700 ${
                  showLiveVideo ? "pointer-events-none opacity-0" : "opacity-100"
                } ${isSpeaking ? "scale-[1.035]" : "scale-100"}`}
                fill
                priority
                sizes="(min-width: 768px) 320px, 224px"
                src="/avatar/judy-teacher.webp"
              />
              {!showLiveVideo ? (
                <>
                  <div aria-hidden="true" className="avatar-blink avatar-blink-left" />
                  <div aria-hidden="true" className="avatar-blink avatar-blink-right" />
                </>
              ) : null}
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/70 to-transparent" />
              <div aria-hidden="true" className="absolute bottom-10 md:bottom-12 left-1/2 flex -translate-x-1/2 items-end gap-1">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <span
                    className={`avatar-wave-bar block w-1 rounded-full bg-white/80 ${
                      isSpeaking ? "is-speaking" : ""
                    }`}
                    key={bar}
                    style={{ animationDelay: `${bar * 90}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
