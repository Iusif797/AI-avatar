import Image from "next/image";
import type { TeacherStatus } from "@/types/teacher";

type AvatarPortraitStageProps = {
  status: TeacherStatus;
};

const statusLabels: Record<TeacherStatus, string> = {
  idle: "готова к уроку",
  listening: "слушает",
  thinking: "думает",
  speaking: "говорит",
  error: "ошибка"
};

export function AvatarPortraitStage({ status }: AvatarPortraitStageProps) {
  const isSpeaking = status === "speaking";

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_24px_70px_rgba(18,18,18,0.16)] ring-1 ring-[#121212]/8">
      <div className="relative aspect-[4/5] w-full bg-[#efe9de]">
        <Image
          alt="AI-учитель"
          className={`object-cover object-top transition duration-700 ${
            isSpeaking ? "scale-[1.03]" : "scale-100"
          }`}
          fill
          priority
          sizes="(min-width: 768px) 380px, 100vw"
          src="/avatar/teacher-avatar.png"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,18,18,0.08)_0%,rgba(18,18,18,0)_34%,rgba(18,18,18,0.7)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4 text-white">
          <span className="inline-flex items-center rounded-full bg-white/82 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#121212] shadow-sm backdrop-blur">
            AI Teacher
          </span>
        </div>
        {!isSpeaking ? (
          <>
            <div aria-hidden="true" className="avatar-blink avatar-blink-left" />
            <div aria-hidden="true" className="avatar-blink avatar-blink-right" />
          </>
        ) : null}
        <div
          aria-live="polite"
          className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white"
          role="status"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-white/72">Live avatar</p>
            <p className="mt-0.5 text-lg font-black tracking-tight">{statusLabels[status]}</p>
          </div>
          <span className="hidden rounded-full border border-white/20 bg-white/12 px-3 py-1 text-xs font-bold backdrop-blur sm:inline-flex">
            {statusLabels[status]}
          </span>
        </div>
      </div>
    </div>
  );
}
