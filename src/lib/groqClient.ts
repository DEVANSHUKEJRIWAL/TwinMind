import { useSettingsStore } from "../store/settingsStore";

const GROQ_BASE = "https://api.groq.com/openai/v1";

export class GroqClientError extends Error {
  readonly status: number | undefined;
  readonly responseBody: string | undefined;

  constructor(
    message: string,
    status?: number,
    responseBody?: string
  ) {
    super(message);
    this.name = "GroqClientError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function getAuthHeaders(): HeadersInit {
  const apiKey = useSettingsStore.getState().groqApiKey.trim();
  if (!apiKey) {
    throw new GroqClientError("Groq API key is not set");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

function getModel(): string {
  const model = useSettingsStore.getState().model.trim();
  if (!model) {
    throw new GroqClientError("Model is not set");
  }
  return model;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 2000);
  } catch {
    return "";
  }
}

interface ChatMessagePayload {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

export async function transcribeAudioBlob(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "chunk.webm");
  formData.append("model", "whisper-large-v3");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new GroqClientError(
      `Transcription failed (${res.status})`,
      res.status,
      body
    );
  }

  const data = (await res.json()) as { text?: string };
  if (typeof data.text !== "string") {
    throw new GroqClientError("Transcription response missing text");
  }
  return data.text.trim();
}

export async function completeChatJson(
  messages: ChatMessagePayload[]
): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new GroqClientError(
      `Chat completion failed (${res.status})`,
      res.status,
      body
    );
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new GroqClientError("Chat completion response missing content");
  }
  return content;
}

export async function streamChatCompletion(
  messages: ChatMessagePayload[],
  onToken: (token: string) => void
): Promise<void> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      messages,
      stream: true,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new GroqClientError(
      `Chat stream failed (${res.status})`,
      res.status,
      body
    );
  }

  if (!res.body) {
    throw new GroqClientError("Chat stream response has no body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  interface StreamDelta {
    choices?: Array<{
      delta?: { content?: string | null };
    }>;
  }

  const processLine = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return;
    }
    const payload = trimmed.slice(5).trim();
    if (payload === "[DONE]") {
      return;
    }
    try {
      const parsed = JSON.parse(payload) as StreamDelta;
      const piece = parsed.choices?.[0]?.delta?.content;
      if (typeof piece === "string" && piece.length > 0) {
        onToken(piece);
      }
    } catch {
      throw new GroqClientError("Failed to parse streaming chunk");
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        processLine(part);
      }
    }
    if (buffer.trim().length > 0) {
      processLine(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
