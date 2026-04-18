import { useCallback, useEffect, useRef, useState } from "react";
import { completeChatJson, GroqClientError } from "../lib/groqClient";
import { interpolateTranscriptContext } from "../lib/prompts";
import { takeLastWords, truncateToMaxWords } from "../lib/text";
import { useSessionStore } from "../store/sessionStore";
import type { SuggestionItem, SuggestionTypeValue } from "../store/sessionStore";
import { useSettingsStore } from "../store/settingsStore";

const VALID_TYPES: SuggestionTypeValue[] = [
  "question_to_ask",
  "talking_point",
  "fact_check",
  "clarification",
  "answer",
];

/** Normalized keys that are not already VALID_TYPES ids */
const TYPE_ALIASES: Record<string, SuggestionTypeValue> = {
  follow_up: "question_to_ask",
  followup: "question_to_ask",
  follow_up_question: "question_to_ask",
  talkingpoint: "talking_point",
  factcheck: "fact_check",
};

function parseSuggestionType(raw: unknown): SuggestionTypeValue | null {
  if (typeof raw !== "string") {
    return null;
  }
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID_TYPES.includes(key as SuggestionTypeValue)) {
    return key as SuggestionTypeValue;
  }
  return TYPE_ALIASES[key] ?? null;
}

function extractJsonArray(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON array found in model response");
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  }
}

function normalizeSuggestion(raw: unknown): SuggestionItem | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const type = parseSuggestionType(obj.type);
  const headlineRaw =
    typeof obj.headline === "string" ? obj.headline.trim() : "";
  const subtextRaw =
    typeof obj.subtext === "string" ? obj.subtext.trim() : "";
  const headline = truncateToMaxWords(headlineRaw, 12);
  const subtext = truncateToMaxWords(subtextRaw, 20);
  if (!type || headline.length === 0 || subtext.length === 0) {
    return null;
  }
  return {
    type,
    headline,
    subtext,
    detailedAnswer: "",
  };
}

function parseThreeSuggestions(content: string): SuggestionItem[] {
  const parsed = extractJsonArray(content);
  if (!Array.isArray(parsed) || parsed.length !== 3) {
    throw new Error("Model must return exactly 3 suggestions");
  }
  const items: SuggestionItem[] = [];
  for (const entry of parsed) {
    const item = normalizeSuggestion(entry);
    if (!item) {
      throw new Error(
        "Invalid suggestion: each item needs a known type, headline, and subtext"
      );
    }
    items.push(item);
  }
  const types = new Set(items.map((i) => i.type));
  if (types.size !== 3) {
    throw new Error("Each suggestion must use a different type");
  }
  return items;
}

interface UseSuggestionsResult {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSuggestions(): UseSuggestionsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prependSuggestionBatch = useSessionStore(
    (s) => s.prependSuggestionBatch
  );
  const suggestionPrompt = useSettingsStore((s) => s.suggestionPrompt);
  const suggestionContextWordCount = useSettingsStore(
    (s) => s.suggestionContextWordCount
  );
  const refreshIntervalSeconds = useSettingsStore(
    (s) => s.refreshIntervalSeconds
  );
  const intervalRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (useSessionStore.getState().micSessionActive) {
      const beforeSync = useSessionStore.getState().transcriptionManualSync;
      useSessionStore.getState().requestTranscriptionManualSync();
      const deadline = Date.now() + 8500;
      while (Date.now() < deadline) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 120);
        });
        if (
          useSessionStore.getState().transcriptionManualSync > beforeSync
        ) {
          break;
        }
      }
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 2500);
      });
    }
    const contextSnippet = takeLastWords(
      useSessionStore.getState().fullTranscript,
      suggestionContextWordCount
    );
    const userContent = interpolateTranscriptContext(
      suggestionPrompt,
      contextSnippet.length > 0 ? contextSnippet : "(no transcript yet)"
    );
    try {
      const raw = await completeChatJson([
        { role: "user", content: userContent },
      ]);
      const suggestions = parseThreeSuggestions(raw);
      prependSuggestionBatch({
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        transcriptContextUsed: contextSnippet,
        suggestions,
      });
    } catch (err) {
      const message =
        err instanceof GroqClientError
          ? err.message + (err.responseBody ? `: ${err.responseBody}` : "")
          : err instanceof Error
            ? err.message
            : "Suggestions request failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [prependSuggestionBatch, suggestionContextWordCount, suggestionPrompt]);

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }
    const ms = Math.max(5, refreshIntervalSeconds) * 1000;
    intervalRef.current = window.setInterval(() => {
      void refresh();
    }, ms);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh, refreshIntervalSeconds]);

  return { isLoading, error, refresh };
}
