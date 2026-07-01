const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "video/webm"
]);

export type AudioValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateUploadedAudio(file: File): AudioValidationResult {
  if (file.size <= 0) {
    return { valid: false, reason: "Аудиофайл пустой." };
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return { valid: false, reason: "Аудиофайл слишком большой." };
  }

  const mimeType = file.type.toLowerCase();

  if (mimeType && !ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: "Неподдерживаемый формат аудио." };
  }

  return { valid: true };
}
