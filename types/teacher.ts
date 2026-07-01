export type TargetLanguage = "he" | "en";
export type LearnerLevel = "A1" | "A2" | "B1" | "B2";
export type TeacherStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "teacher";
  text: string;
  translation?: string;
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

export type TeacherChatResponse = {
  reply: string;
  correction?: string;
  suggestedPractice?: string;
  source: "openai" | "fallback";
};
