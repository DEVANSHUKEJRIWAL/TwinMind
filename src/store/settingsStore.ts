import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  CHAT_SYSTEM_PROMPT,
  DETAILED_ANSWER_PROMPT,
  SUGGESTION_PROMPT,
} from "../lib/prompts";

export interface SettingsState {
  groqApiKey: string;
  suggestionPrompt: string;
  detailedAnswerPrompt: string;
  chatSystemPrompt: string;
  suggestionContextWordCount: number;
  chatContextWordCount: number;
  refreshIntervalSeconds: number;
  model: string;
  setGroqApiKey: (value: string) => void;
  setSuggestionPrompt: (value: string) => void;
  setDetailedAnswerPrompt: (value: string) => void;
  setChatSystemPrompt: (value: string) => void;
  setSuggestionContextWordCount: (value: number) => void;
  setChatContextWordCount: (value: number) => void;
  setRefreshIntervalSeconds: (value: number) => void;
  setModel: (value: string) => void;
}

/** Groq removed Maverick from the API; see https://console.groq.com/docs/deprecations */
const DEPRECATED_MODEL_IDS = new Set<string>([
  "meta-llama/llama-4-maverick-17b-128e-instruct",
]);

const DEFAULT_MODEL = "openai/gpt-oss-120b";

function migrateModelIfNeeded(model: string): string {
  const trimmed = model.trim();
  if (DEPRECATED_MODEL_IDS.has(trimmed)) {
    return DEFAULT_MODEL;
  }
  return model;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      groqApiKey: "",
      suggestionPrompt: SUGGESTION_PROMPT,
      detailedAnswerPrompt: DETAILED_ANSWER_PROMPT,
      chatSystemPrompt: CHAT_SYSTEM_PROMPT,
      suggestionContextWordCount: 800,
      chatContextWordCount: 2000,
      refreshIntervalSeconds: 30,
      model: DEFAULT_MODEL,
      setGroqApiKey: (value) => set({ groqApiKey: value }),
      setSuggestionPrompt: (value) => set({ suggestionPrompt: value }),
      setDetailedAnswerPrompt: (value) => set({ detailedAnswerPrompt: value }),
      setChatSystemPrompt: (value) => set({ chatSystemPrompt: value }),
      setSuggestionContextWordCount: (value) =>
        set({ suggestionContextWordCount: value }),
      setChatContextWordCount: (value) => set({ chatContextWordCount: value }),
      setRefreshIntervalSeconds: (value) =>
        set({ refreshIntervalSeconds: value }),
      setModel: (value) => set({ model: value }),
    }),
    {
      name: "twinmind-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        groqApiKey: state.groqApiKey,
        suggestionPrompt: state.suggestionPrompt,
        detailedAnswerPrompt: state.detailedAnswerPrompt,
        chatSystemPrompt: state.chatSystemPrompt,
        suggestionContextWordCount: state.suggestionContextWordCount,
        chatContextWordCount: state.chatContextWordCount,
        refreshIntervalSeconds: state.refreshIntervalSeconds,
        model: state.model,
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return currentState;
        }
        const merged = {
          ...currentState,
          ...(persistedState as Record<string, unknown>),
        } as SettingsState;
        merged.model = migrateModelIfNeeded(merged.model);
        return merged;
      },
    }
  )
);
