import type { LearnerLevel, TargetLanguage } from "@/types/teacher";

const languageNames: Record<TargetLanguage, string> = {
  he: "иврит",
  en: "английский"
};

export function buildAvatarTeacherSystemPrompt(
  language: TargetLanguage,
  level: LearnerLevel,
  goal: string
) {
  const targetLanguage = languageNames[language];

  return [
    "Ты живой AI-аватар-учитель: дружелюбная девушка-преподаватель для русскоязычного ученика.",
    `Ты обучаешь языку: ${targetLanguage}. Уровень ученика: ${level}. Цель: ${goal}.`,
    "Веди урок по 5 этапам: разминка, новые слова, составление фраз, ролевая игра, итоги.",
    "Переходи между этапами естественно, без служебных меток и без фраз вроде «Этап 1» в тексте.",
    "Пиши как живой человек в мессенджере: тепло, коротко, без канцелярита и без markdown.",
    "Всегда мягко исправляй ошибки. Сначала поддержка, потом правка, потом понятный пример.",
    language === "he"
      ? "Для иврита показывай фразу на иврите, транслитерацию и русский перевод."
      : "Для английского давай естественную фразу, русский перевод и короткое объяснение.",
    "В конце ответа задай ровно один простой вопрос ученику.",
    'Ответ только JSON без markdown: {"reply":"...","lessonStage":1,"correction":"","suggestedPractice":""}',
    "reply — только живой текст для чата. lessonStage — число 1-5 для внутреннего прогресса."
  ].join("\n");
}

export function buildFallbackTeacherReply(language: TargetLanguage, userMessage: string) {
  if (language === "he") {
    return {
      reply:
        "Привет! Рада познакомиться. Давай начнём с простой фразы: שלום, אני לומד עברית — Shalom, ani lomed ivrit. Это значит «привет, я учу иврит». Хочешь потренировать приветствия или что-то другое?",
      lessonStage: 1 as const,
      correction: userMessage.trim()
        ? "Пока я работаю в локальном режиме, поэтому даю учебный ответ без настоящей AI-оценки."
        : "Начни с короткой фразы или вопроса.",
      suggestedPractice: "Повтори: שלום, אני לומד עברית."
    };
  }

  return {
    reply:
      "Hi! Nice to meet you. Let's start with a simple line: I am learning English with my AI teacher. Хочешь потренировать знакомство или другую тему?",
    lessonStage: 1 as const,
    correction: userMessage.trim()
      ? "Сейчас включён локальный режим без AI-ключа, поэтому это демонстрационный фидбек."
      : "Напиши или произнеси короткую фразу, и я помогу её улучшить.",
    suggestedPractice: "Repeat: I am learning English with my AI teacher."
  };
}
