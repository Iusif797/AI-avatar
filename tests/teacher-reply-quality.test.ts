import { describe, expect, it } from "vitest";
import { isTeacherReplyValid } from "@/lib/teacher-reply-quality";

describe("isTeacherReplyValid", () => {
  it("accepts a normal Russian teacher reply", () => {
    expect(
      isTeacherReplyValid("Привет! Рада тебя видеть. Давай начнём с простого приветствия на иврите?")
    ).toBe(true);
  });

  it("rejects multilingual garbage", () => {
    expect(
      isTeacherReplyValid("При bénéniciале, берите свое предложение, я остую под compulsią вас помndaть.")
    ).toBe(false);
  });

  it("rejects reasoning leaks", () => {
    expect(isTeacherReplyValid('Хорошо, пользователь написал "привет". Нужно ответить как учитель.')).toBe(
      false
    );
  });
});
