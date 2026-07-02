import { AvatarLiveStage } from "@/components/avatar/AvatarLiveStage";
import { AvatarPortraitStage } from "@/components/avatar/AvatarPortraitStage";
import type { LiveAvatarConnectionMode } from "@/components/avatar/useLiveAvatarSession";
import type { TeacherStatus } from "@/types/teacher";
import type { RefObject } from "react";

export type AvatarStageVariant = "chat" | "call";

type AvatarStageProps = {
  variant: AvatarStageVariant;
  status: TeacherStatus;
  connectionMode: LiveAvatarConnectionMode;
  connectionLabel: string;
  connectionHint: string | null;
  isStreamReady: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  onReconnect: () => void;
  onUnmuteVideo: () => void;
};

export function AvatarStage({ variant, status, connectionMode, ...liveProps }: AvatarStageProps) {
  if (variant === "chat" || connectionMode === "fallback") {
    return <AvatarPortraitStage status={status} />;
  }

  return <AvatarLiveStage status={status} connectionMode={connectionMode} {...liveProps} />;
}
