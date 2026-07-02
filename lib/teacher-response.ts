import type { LessonStageNumber } from "@/lib/lesson-progress";
import { parseLessonStage, stripStageLabel } from "@/lib/lesson-progress";

export type ParsedTeacherResponse = {
  reply: string;
  lessonStage?: LessonStageNumber;
  correction?: string;
  suggestedPractice?: string;
};

function extractPayload(raw: string): string {
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return raw.trim();
}

function parseLessonStageNumber(value: unknown): LessonStageNumber | undefined {
  const stageNumber = Number(value);

  if (Number.isInteger(stageNumber) && stageNumber >= 1 && stageNumber <= 5) {
    return stageNumber as LessonStageNumber;
  }

  return undefined;
}

function buildPlainTextResponse(payload: string): ParsedTeacherResponse {
  return {
    reply: stripStageLabel(payload),
    lessonStage: parseLessonStage(payload)?.number
  };
}

export function parseTeacherResponse(raw: string): ParsedTeacherResponse {
  const payload = extractPayload(raw);

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;

    if (typeof parsed.reply === "string") {
      return {
        reply: stripStageLabel(parsed.reply),
        lessonStage: parseLessonStageNumber(parsed.lessonStage),
        correction: typeof parsed.correction === "string" ? parsed.correction : undefined,
        suggestedPractice:
          typeof parsed.suggestedPractice === "string" ? parsed.suggestedPractice : undefined
      };
    }
  } catch {
    return buildPlainTextResponse(payload);
  }

  return buildPlainTextResponse(payload);
}
