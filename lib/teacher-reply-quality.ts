const REASONING_LEAK_PATTERN =
  /^(хорошо,|okay,|the user|нужно ответить|let me think|сначала приветств)/i;

const USER_ECHO_PATTERN =
  /пользователь написал|user said|user wrote|написал "привет"/i;

export function isTeacherReplyValid(reply: string): boolean {
  const trimmedReply = reply.trim();

  if (trimmedReply.length < 12 || trimmedReply.length > 2500) {
    return false;
  }


  if (/[\u0100-\u024F]/.test(trimmedReply)) {
    return false;
  }

  if (/[а-яё][a-z]|[a-z][а-яё]/i.test(trimmedReply)) {
    return false;
  }

  if (REASONING_LEAK_PATTERN.test(trimmedReply) || USER_ECHO_PATTERN.test(trimmedReply)) {
    return false;
  }

  if (/^\{/.test(trimmedReply) && trimmedReply.includes("lessonStage")) {
    return false;
  }

  const cyrillicMatches = trimmedReply.match(/[а-яё]/gi) ?? [];
  const cyrillicRatio = cyrillicMatches.length / trimmedReply.length;

  if (cyrillicRatio < 0.3 && !/[\u0590-\u05FF]/.test(trimmedReply)) {
    return false;
  }

  const latinWordMatches = trimmedReply.match(/\b[a-z]{3,}\b/gi) ?? [];
  const allowedLatinWords = new Set([
    "shalom",
    "boker",
    "tov",
    "ani",
    "lomed",
    "ivrit",
    "hello",
    "english",
    "teacher",
    "repeat",
    "lesson"
  ]);
  const suspiciousLatinWords = latinWordMatches.filter(
    (word) => !allowedLatinWords.has(word.toLowerCase())
  );

  if (suspiciousLatinWords.length >= 4 && cyrillicRatio < 0.45) {
    return false;
  }

  return true;
}
