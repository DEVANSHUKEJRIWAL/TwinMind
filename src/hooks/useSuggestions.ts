import { useCallback, useEffect, useRef, useState } from "react";
import { completeChatJson, GroqClientError } from "../lib/groqClient";
import { interpolateTranscriptContext } from "../lib/prompts";
import { takeLastWords } from "../lib/text";
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

function countWords(s: string): number {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length === 0) {
    return 0;
  }
  return t.split(" ").length;
}

function parseSuggestionType(raw: unknown): SuggestionTypeValue | null {
  if (typeof raw !== "string") {
    return null;
  }
  return VALID_TYPES.includes(raw as SuggestionTypeValue)
    ? (raw as SuggestionTypeValue)
    : null;
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
  const headline =
    typeof obj.headline === "string" ? obj.headline.trim() : "";
  const subtext = typeof obj.subtext === "string" ? obj.subtext.trim() : "";
  if (!type || headline.length === 0 || subtext.length === 0) {
    return null;
  }
  if (countWords(headline) > 12 || countWords(subtext) > 20) {
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
      throw new Error("Invalid suggestion object or word limits exceeded");
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
  const fullTranscript = useSessionStore((s) => s.fullTranscript);
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
    const contextSnippet = takeLastWords(
      fullTranscript,
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
  }, [
    fullTranscript,
    prependSuggestionBatch,
    suggestionContextWordCount,
    suggestionPrompt,
  ]);

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
