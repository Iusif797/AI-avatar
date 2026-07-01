export type SpeechSegment = {
  text: string;
  lang: string;
};

type Script = "hebrew" | "cyrillic" | "latin";

const HEBREW = /[֐-׿]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[A-Za-z]/;

const scriptLang: Record<Script, string> = {
  hebrew: "he-IL",
  cyrillic: "ru-RU",
  latin: "en-US"
};

function classify(char: string): Script | null {
  if (HEBREW.test(char)) {
    return "hebrew";
  }

  if (CYRILLIC.test(char)) {
    return "cyrillic";
  }

  if (LATIN.test(char)) {
    return "latin";
  }

  return null;
}

export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[*_`#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toSpeechSegments(text: string): SpeechSegment[] {
  const clean = sanitizeForSpeech(text);

  if (!clean) {
    return [];
  }

  const segments: SpeechSegment[] = [];
  let buffer = "";
  let script: Script | null = null;

  const flush = () => {
    const trimmed = buffer.trim();

    if (trimmed && script) {
      segments.push({ text: trimmed, lang: scriptLang[script] });
    }

    buffer = "";
  };

  for (const char of clean) {
    const charScript = classify(char);

    if (charScript === null || charScript === script) {
      buffer += char;
      continue;
    }

    if (script === null) {
      script = charScript;
      buffer += char;
      continue;
    }

    flush();
    script = charScript;
    buffer += char;
  }

  flush();

  return segments;
}
