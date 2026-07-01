# AI Language Tutor

AI-учитель в виде живого аватара для русскоязычных учеников, которые изучают
иврит или английский.

## Первый вертикальный срез

- Главный экран вокруг AI-аватара, а не вокруг dashboard.
- Личность преподавателя и методика обучения вынесены в промпт.
- Диалог работает с локальным fallback-ответом без ключей.
- API-контуры готовы для OpenAI и HeyGen.

## Локальный запуск

```bash
npm install
npm run dev
```

Затем открой `http://localhost:3000`.

## Переменные окружения

Скопируй `.env.example` в `.env.local` и добавь ключи:

- `OPENAI_API_KEY` — для настоящего AI-ответа преподавателя.
- `OPENAI_MODEL` — модель для ответов, по умолчанию `gpt-4o-mini`.
- `OPENAI_TRANSCRIPTION_MODEL` — модель STT, по умолчанию `whisper-1`.
- `HEYGEN_API_KEY` — серверный ключ HeyGen.
- `HEYGEN_AVATAR_ID` — ID live/photo avatar.
- `HEYGEN_VOICE_ID` — ID голоса.
- `LIVEAVATAR_CONTEXT_ID` — опциональный context/persona ID.
- `LIVEAVATAR_LLM_CONFIGURATION_ID` — опциональная LLM-конфигурация LiveAvatar.
- `LIVEAVATAR_SANDBOX` — `true` для тестов без боевого режима, если доступно в аккаунте.

Без ключей приложение остаётся запускаемым: UI и сценарий можно проверять на
fallback-учителе.
