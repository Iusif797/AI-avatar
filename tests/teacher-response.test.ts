import { describe, expect, it } from "vitest";
import { parseTeacherResponse } from "@/lib/teacher-response";

describe("parseTeacherResponse", () => {
  it("parses a strict json reply", () => {
    const raw = JSON.stringify({
      reply: "Привет!",
      lessonStage: 2,
      correction: "Лучше сказать иначе",
      suggestedPractice: "Повтори фразу"
    });

    expect(parseTeacherResponse(raw)).toEqual({
      reply: "Привет!",
      lessonStage: 2,
      correction: "Лучше сказать иначе",
      suggestedPractice: "Повтори фразу"
    });
  });

  it("unwraps json fenced in markdown", () => {
    const parsed = parseTeacherResponse('```json\n{"reply":"Hi","lessonStage":3}\n```');

    expect(parsed.reply).toBe("Hi");
    expect(parsed.lessonStage).toBe(3);
  });

  it("ignores stage numbers outside 1-5", () => {
    expect(parseTeacherResponse('{"reply":"Hi","lessonStage":9}').lessonStage).toBeUndefined();
  });

  it("ignores non-integer stage numbers", () => {
    expect(parseTeacherResponse('{"reply":"Hi","lessonStage":2.5}').lessonStage).toBeUndefined();
  });

  it("falls back to plain text and extracts the legacy stage tag", () => {
    const parsed = parseTeacherResponse("[Этап 4: Ролевая игра] Давай сыграем сцену в кафе");

    expect(parsed.reply).toBe("Давай сыграем сцену в кафе");
    expect(parsed.lessonStage).toBe(4);
  });
});
