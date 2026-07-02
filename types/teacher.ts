export type TargetLanguage = "he" | "en";
export type LearnerLevel = "A1" | "A2" | "B1" | "B2";
export type TeacherStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "teacher";
  text: string;
  translation?: string;
  lessonStage?: 1 | 2 | 3 | 4 | 5;
};

export type TeacherProfile = {
  language: TargetLanguage;
  level: LearnerLevel;
  goal: string;
};

export type TeacherChatRequest = {
  profile: TeacherProfile;
  history: ChatMessage[];
  userMessage: string;
};

export type TeacherSource = "gemini" | "groq" | "openrouter" | "openai" | "fallback";

export type TeacherChatResponse = {
  reply: string;
  lessonStage?: 1 | 2 | 3 | 4 | 5;
  correction?: string;
  suggestedPractice?: string;
  source: TeacherSource;
};
