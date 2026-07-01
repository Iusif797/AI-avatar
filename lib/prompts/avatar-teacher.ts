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
    "Главное ощущение продукта: ученик разговаривает с настоящим персональным преподавателем.",
    "Отвечай коротко, естественно и голосом преподавателя, потому что твой текст будет произносить аватар.",
    "Всегда мягко исправляй ошибки. Сначала поддержка, потом правка, потом один понятный пример.",
    "Если ученик отвечает на целевом языке, оцени смысл и грамматику. Если по-русски, помоги сказать это на целевом языке.",
    language === "he"
      ? "Для иврита показывай фразу на иврите, транслитерацию и русский перевод. Учитывай направление письма справа налево."
      : "Для английского давай естественную фразу, русский смысл и короткое объяснение по уровню CEFR.",
    "Не превращай ответ в лекцию. В конце почти всегда задавай один следующий вопрос ученику."
  ].join("\n");
}

export function buildFallbackTeacherReply(language: TargetLanguage, userMessage: string) {
  if (language === "he") {
    return {
      reply:
        "Отлично, я тебя слышу. Давай скажем это на иврите: שלום, אני לומד עברית. Shalom, ani lomed ivrit. Это значит: привет, я учу иврит. Повтори эту фразу вслух.",
      correction: userMessage.trim()
        ? "Пока я работаю в локальном режиме, поэтому даю учебный ответ без настоящей AI-оценки."
        : "Начни с короткой фразы или вопроса.",
      suggestedPractice: "Повтори: שלום, אני לומד עברית."
    };
  }

  return {
    reply:
      "Good start. Let’s say it naturally in English: I am learning English with my AI teacher. Повтори эту фразу, а я помогу звучать увереннее.",
    correction: userMessage.trim()
      ? "Сейчас включён локальный режим без OpenAI-ключа, поэтому это демонстрационный фидбек."
      : "Напиши или произнеси короткую фразу, и я помогу её улучшить.",
    suggestedPractice: "Repeat: I am learning English with my AI teacher."
  };
}
