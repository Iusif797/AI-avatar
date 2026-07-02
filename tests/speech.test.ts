import { describe, expect, it } from "vitest";
import { sanitizeForSpeech, toSpeechSegments } from "@/lib/speech";

describe("sanitizeForSpeech", () => {
  it("removes bracketed labels and markdown symbols", () => {
    expect(sanitizeForSpeech("[Этап 1: Разминка] *Привет*")).toBe("Привет");
  });

  it("collapses whitespace", () => {
    expect(sanitizeForSpeech("  Привет   мир  ")).toBe("Привет мир");
  });
});

describe("toSpeechSegments", () => {
  it("returns an empty list for blank text", () => {
    expect(toSpeechSegments("   ")).toEqual([]);
  });

  it("splits hebrew and russian text into language segments", () => {
    expect(toSpeechSegments("שלום привет")).toEqual([
      { text: "שלום", lang: "he-IL" },
      { text: "привет", lang: "ru-RU" }
    ]);
  });

  it("splits english and russian text into language segments", () => {
    expect(toSpeechSegments("Hello привет")).toEqual([
      { text: "Hello", lang: "en-US" },
      { text: "привет", lang: "ru-RU" }
    ]);
  });
});
