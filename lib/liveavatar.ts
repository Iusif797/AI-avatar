import type { TargetLanguage } from "@/types/teacher";

type LiveAvatarTokenData = {
  session_id?: string;
  session_token?: string;
};

type LiveAvatarTokenResponse = {
  code?: number;
  data?: LiveAvatarTokenData;
  message?: string;
};

export type AvatarTokenResult =
  | {
      mode: "liveavatar";
      sessionId: string;
      sessionToken: string;
    }
  | {
      mode: "fallback";
      message: string;
    };

const LIVEAVATAR_TOKEN_URL = "https://api.liveavatar.com/v1/sessions/token";
const PRODUCTION_SESSION_DURATION_SECONDS = 120;
const SANDBOX_SESSION_DURATION_SECONDS = 60;
const SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";
const DEFAULT_FEMALE_AVATAR_ID = "c72a9099-84b9-4d5d-98f4-a19ba131e654";

function resolveMaxSessionDuration(isSandbox: boolean): number {
  const configuredDuration = Number(process.env.LIVEAVATAR_MAX_SESSION_DURATION);

  if (Number.isFinite(configuredDuration) && configuredDuration > 0) {
    return configuredDuration;
  }

  return isSandbox ? SANDBOX_SESSION_DURATION_SECONDS : PRODUCTION_SESSION_DURATION_SECONDS;
}

export async function createLiveAvatarToken(_language: TargetLanguage): Promise<AvatarTokenResult> {
  const apiKey = process.env.HEYGEN_API_KEY;
  const isSandbox = process.env.LIVEAVATAR_SANDBOX !== "false";
  const avatarId =
    process.env.HEYGEN_AVATAR_ID || (isSandbox ? SANDBOX_AVATAR_ID : DEFAULT_FEMALE_AVATAR_ID);

  if (!apiKey || !avatarId) {
    return {
      mode: "fallback",
      message: "HEYGEN_API_KEY или HEYGEN_AVATAR_ID не заданы."
    };
  }

  if (isSandbox && avatarId !== SANDBOX_AVATAR_ID) {
    return {
      mode: "fallback",
      message:
        "В sandbox поддерживается только тестовый аватар. Укажите HEYGEN_AVATAR_ID=dd73ea75-1218-4ef3-92ce-606d5f7fbc0a или LIVEAVATAR_SANDBOX=false."
    };
  }

  const body = {
    mode: "LITE",
    avatar_id: avatarId,
    is_sandbox: isSandbox,
    video_settings: {
      quality: "high",
      encoding: "H264"
    },
    max_session_duration: resolveMaxSessionDuration(isSandbox)
  };

  const response = await fetch(LIVEAVATAR_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return {
      mode: "fallback",
      message: `LiveAvatar token endpoint вернул ${response.status}.`
    };
  }

  const data = (await response.json()) as LiveAvatarTokenResponse;
  const sessionId = data.data?.session_id;
  const sessionToken = data.data?.session_token;

  if (!sessionId || !sessionToken) {
    return {
      mode: "fallback",
      message: data.message ?? "LiveAvatar не вернул session token."
    };
  }

  return {
    mode: "liveavatar",
    sessionId,
    sessionToken
  };
}
