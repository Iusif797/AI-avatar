import { Loader2 } from "lucide-react";
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
  const isBusy = status === "thinking" || status === "speaking";
  const isSpeaking = status === "speaking";

  return (
    <div className="relative w-full overflow-hidden rounded-[1.75rem] shadow-[0_20px_50px_-24px_rgba(18,18,18,0.45)]">
      <div className="relative aspect-[4/5] w-full">
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#121212]/55 via-transparent to-transparent" />
        {!isSpeaking ? (
          <>
            <div aria-hidden="true" className="avatar-blink avatar-blink-left" />
            <div aria-hidden="true" className="avatar-blink avatar-blink-right" />
          </>
        ) : null}
        <div
          aria-live="polite"
          className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4 text-white"
          role="status"
        >
          <span className="text-sm font-bold tracking-tight">{statusLabels[status]}</span>
          {isBusy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin opacity-90" /> : null}
        </div>
      </div>
    </div>
  );
}
