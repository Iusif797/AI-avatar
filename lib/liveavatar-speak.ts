import { AgentEventsEnum, type LiveAvatarSession } from "@heygen/liveavatar-web-sdk";
import { sanitizeForSpeech } from "@/lib/speech";

const SPEAK_TIMEOUT_MS = 120000;
const SPEAK_START_TIMEOUT_MS = 15000;

function waitForAvatarSpeechEnd(session: LiveAvatarSession): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, handleEnded);
      session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, handleStarted);
      resolve(result);
    };

    const handleEnded = () => finish(true);
    const handleStarted = () => {
      window.clearTimeout(startTimeoutId);
    };

    const timeoutId = window.setTimeout(() => finish(false), SPEAK_TIMEOUT_MS);
    const startTimeoutId = window.setTimeout(() => finish(false), SPEAK_START_TIMEOUT_MS);

    session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, handleEnded);
    session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, handleStarted);
  });
}

export async function speakWithLiveAvatar(
  session: LiveAvatarSession,
  text: string,
  mode: "message" | "repeat"
): Promise<boolean> {
  const spokenText = sanitizeForSpeech(text);

  if (!spokenText) {
    return false;
  }

  const speechPromise = waitForAvatarSpeechEnd(session);

  try {
    if (mode === "repeat") {
      session.repeat(spokenText);
    } else {
      session.message(spokenText);
    }
  } catch {
    return false;
  }

  return speechPromise;
}
