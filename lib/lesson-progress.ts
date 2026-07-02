import type { ChatMessage } from "@/types/teacher";

export type LessonStageNumber = 1 | 2 | 3 | 4 | 5;

export type LessonStageDefinition = {
  number: LessonStageNumber;
  title: string;
};

export const LESSON_STAGES: LessonStageDefinition[] = [
  { number: 1, title: "Разминка" },
  { number: 2, title: "Новые слова" },
  { number: 3, title: "Составление фраз" },
  { number: 4, title: "Ролевая игра" },
  { number: 5, title: "Итоги" }
];

const STAGE_PATTERN = /\[Этап\s+(\d)\s*:\s*([^\]]+)\]/i;

export function stripStageLabel(text: string): string {
  return text.replace(STAGE_PATTERN, "").replace(/^\s*[-–—:]\s*/, "").trim();
}

export function parseLessonStage(text: string): LessonStageDefinition | null {
  const match = STAGE_PATTERN.exec(text);

  if (!match) {
    return null;
  }

  const stageNumber = Number(match[1]);

  if (stageNumber < 1 || stageNumber > 5) {
    return null;
  }

  const knownStage = LESSON_STAGES.find((stage) => stage.number === stageNumber);

  return {
    number: stageNumber as LessonStageNumber,
    title: match[2]?.trim() || knownStage?.title || `Этап ${stageNumber}`
  };
}

export function resolveCurrentLessonStage(messages: ChatMessage[]): LessonStageDefinition {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "teacher") {
      continue;
    }

    if (message.lessonStage) {
      const knownStage = LESSON_STAGES.find((stage) => stage.number === message.lessonStage);

      if (knownStage) {
        return knownStage;
      }
    }

    const parsedStage = parseLessonStage(message.text);

    if (parsedStage) {
      return parsedStage;
    }
  }

  const teacherMessageCount = messages.filter((message) => message.role === "teacher").length;
  const stageIndex = Math.min(LESSON_STAGES.length - 1, Math.max(0, teacherMessageCount - 1));

  return LESSON_STAGES[stageIndex];
}

export function getLessonProgressPercent(stageNumber: LessonStageNumber): number {
  return Math.round((stageNumber / LESSON_STAGES.length) * 100);
}
