import { describe, expect, it } from "vitest";
import {
  LESSON_STAGES,
  getLessonProgressPercent,
  parseLessonStage,
  resolveCurrentLessonStage,
  stripStageLabel
} from "@/lib/lesson-progress";
import type { ChatMessage } from "@/types/teacher";

function teacherMessage(text: string, lessonStage?: 1 | 2 | 3 | 4 | 5): ChatMessage {
  return { id: text, role: "teacher", text, lessonStage };
}

describe("parseLessonStage", () => {
  it("parses a stage tag with its title", () => {
    expect(parseLessonStage("[Этап 3: Составление фраз] Начнём")).toEqual({
      number: 3,
      title: "Составление фраз"
    });
  });

  it("returns null when there is no tag", () => {
    expect(parseLessonStage("Привет")).toBeNull();
  });

  it("rejects stage numbers outside 1-5", () => {
    expect(parseLessonStage("[Этап 9: Лишний]")).toBeNull();
  });
});

describe("stripStageLabel", () => {
  it("removes the tag and leading separators", () => {
    expect(stripStageLabel("[Этап 2: Новые слова] — Привет")).toBe("Привет");
  });

  it("keeps plain text unchanged", () => {
    expect(stripStageLabel("Привет")).toBe("Привет");
  });
});

describe("resolveCurrentLessonStage", () => {
  it("prefers the explicit lessonStage of the latest teacher message", () => {
    const messages: ChatMessage[] = [
      teacherMessage("a", 1),
      { id: "u", role: "user", text: "ответ" },
      teacherMessage("b", 4)
    ];

    expect(resolveCurrentLessonStage(messages).number).toBe(4);
  });

  it("falls back to the text tag for legacy messages", () => {
    expect(resolveCurrentLessonStage([teacherMessage("[Этап 2: Новые слова] Привет")]).number).toBe(2);
  });

  it("returns the first stage when nothing is known", () => {
    expect(resolveCurrentLessonStage([])).toEqual(LESSON_STAGES[0]);
  });
});

describe("getLessonProgressPercent", () => {
  it("maps stage numbers to percentages", () => {
    expect(getLessonProgressPercent(1)).toBe(20);
    expect(getLessonProgressPercent(5)).toBe(100);
  });
});
