import type { ChatMessage, LearnerLevel, TargetLanguage } from "@/types/teacher";

const DATABASE_NAME = "ai-language-tutor";
const DATABASE_VERSION = 1;
const STORE_NAME = "chatSessions";

export type ChatSessionRecord = {
  sessionKey: string;
  messages: ChatMessage[];
  lastFeedback: string;
  updatedAt: number;
};

export function buildChatSessionKey(language: TargetLanguage, level: LearnerLevel): string {
  return `${language}:${level}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  const lessonStage = message.lessonStage;

  if (
    lessonStage !== undefined &&
    (typeof lessonStage !== "number" || !Number.isInteger(lessonStage) || lessonStage < 1 || lessonStage > 5)
  ) {
    return false;
  }

  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "teacher") &&
    typeof message.text === "string"
  );
}

function parseChatSessionRecord(value: unknown): ChatSessionRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const messages = record.messages;

  if (typeof record.sessionKey !== "string" || !Array.isArray(messages)) {
    return null;
  }

  if (!messages.every(isChatMessage)) {
    return null;
  }

  return {
    sessionKey: record.sessionKey,
    messages,
    lastFeedback: typeof record.lastFeedback === "string" ? record.lastFeedback : "",
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now()
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "sessionKey" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      })
  );
}

export async function loadChatSession(
  language: TargetLanguage,
  level: LearnerLevel
): Promise<ChatSessionRecord | null> {
  const sessionKey = buildChatSessionKey(language, level);

  try {
    const record = await runTransaction("readonly", (store) => store.get(sessionKey));
    return parseChatSessionRecord(record);
  } catch {
    return null;
  }
}

export async function saveChatSession(record: ChatSessionRecord): Promise<void> {
  try {
    await runTransaction("readwrite", (store) => store.put(record));
  } catch {
    return;
  }
}
