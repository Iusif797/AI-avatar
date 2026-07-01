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

function languageCode(language: TargetLanguage) {
  return language === "he" ? "he" : "en";
}

export async function createLiveAvatarToken(language: TargetLanguage): Promise<AvatarTokenResult> {
  const apiKey = process.env.HEYGEN_API_KEY;
  const avatarId = process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.HEYGEN_VOICE_ID;

  if (!apiKey || !avatarId || !voiceId) {
    return {
      mode: "fallback",
      message: "HEYGEN_API_KEY, HEYGEN_AVATAR_ID или HEYGEN_VOICE_ID не заданы."
    };
  }

  const body = {
    avatar_id: avatarId,
    avatar_persona: {
      voice_id: voiceId,
      ...(process.env.LIVEAVATAR_CONTEXT_ID
        ? { context_id: process.env.LIVEAVATAR_CONTEXT_ID }
        : {}),
      language: languageCode(language),
      voice_settings: {
        provider: "elevenLabs",
        speed: 1,
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
        model: "eleven_flash_v2_5"
      },
      stt_config: {
        provider: "deepgram"
      }
    },
    mode: "FULL",
    is_sandbox: process.env.LIVEAVATAR_SANDBOX !== "false",
    video_settings: {
      quality: "high",
      encoding: "H264"
    },
    max_session_duration: 600,
    interactivity_type: "PUSH_TO_TALK",
    ...(process.env.LIVEAVATAR_LLM_CONFIGURATION_ID
      ? { llm_configuration_id: process.env.LIVEAVATAR_LLM_CONFIGURATION_ID }
      : {})
  };

  const response = await fetch("https://api.liveavatar.com/v1/sessions/token", {
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
