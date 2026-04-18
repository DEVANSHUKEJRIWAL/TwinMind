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
  /** Words of transcript injected into the chat system prompt. */
  chatContextWordCount: number;
  /** Words of transcript injected into the on-click detailed-answer prompt. */
  detailedAnswerContextWordCount: number;
  refreshIntervalSeconds: number;
  setGroqApiKey: (value: string) => void;
  setSuggestionPrompt: (value: string) => void;
  setDetailedAnswerPrompt: (value: string) => void;
  setChatSystemPrompt: (value: string) => void;
  setSuggestionContextWordCount: (value: number) => void;
  setChatContextWordCount: (value: number) => void;
  setDetailedAnswerContextWordCount: (value: number) => void;
  setRefreshIntervalSeconds: (value: number) => void;
}

const DEFAULT_DETAILED_ANSWER_CONTEXT_WORDS = 4000;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      groqApiKey: "",
      suggestionPrompt: SUGGESTION_PROMPT,
      detailedAnswerPrompt: DETAILED_ANSWER_PROMPT,
      chatSystemPrompt: CHAT_SYSTEM_PROMPT,
      suggestionContextWordCount: 800,
      chatContextWordCount: 2000,
      detailedAnswerContextWordCount: DEFAULT_DETAILED_ANSWER_CONTEXT_WORDS,
      refreshIntervalSeconds: 30,
      setGroqApiKey: (value) => set({ groqApiKey: value }),
      setSuggestionPrompt: (value) => set({ suggestionPrompt: value }),
      setDetailedAnswerPrompt: (value) => set({ detailedAnswerPrompt: value }),
      setChatSystemPrompt: (value) => set({ chatSystemPrompt: value }),
      setSuggestionContextWordCount: (value) =>
        set({ suggestionContextWordCount: value }),
      setChatContextWordCount: (value) => set({ chatContextWordCount: value }),
      setDetailedAnswerContextWordCount: (value) =>
        set({ detailedAnswerContextWordCount: value }),
      setRefreshIntervalSeconds: (value) =>
        set({ refreshIntervalSeconds: value }),
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
        detailedAnswerContextWordCount: state.detailedAnswerContextWordCount,
        refreshIntervalSeconds: state.refreshIntervalSeconds,
      }),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return currentState;
        }
        const raw = persistedState as Record<string, unknown>;
        const merged: SettingsState = { ...currentState };
        if (typeof raw.groqApiKey === "string") {
          merged.groqApiKey = raw.groqApiKey;
        }
        if (typeof raw.suggestionPrompt === "string") {
          merged.suggestionPrompt = raw.suggestionPrompt;
        }
        if (typeof raw.detailedAnswerPrompt === "string") {
          merged.detailedAnswerPrompt = raw.detailedAnswerPrompt;
        }
        if (typeof raw.chatSystemPrompt === "string") {
          merged.chatSystemPrompt = raw.chatSystemPrompt;
        }
        if (
          typeof raw.suggestionContextWordCount === "number" &&
          Number.isFinite(raw.suggestionContextWordCount)
        ) {
          merged.suggestionContextWordCount = raw.suggestionContextWordCount;
        }
        if (
          typeof raw.chatContextWordCount === "number" &&
          Number.isFinite(raw.chatContextWordCount)
        ) {
          merged.chatContextWordCount = raw.chatContextWordCount;
        }
        if (
          typeof raw.detailedAnswerContextWordCount === "number" &&
          Number.isFinite(raw.detailedAnswerContextWordCount) &&
          raw.detailedAnswerContextWordCount > 0
        ) {
          merged.detailedAnswerContextWordCount =
            raw.detailedAnswerContextWordCount;
        } else {
          merged.detailedAnswerContextWordCount =
            DEFAULT_DETAILED_ANSWER_CONTEXT_WORDS;
        }
        if (
          typeof raw.refreshIntervalSeconds === "number" &&
          Number.isFinite(raw.refreshIntervalSeconds)
        ) {
          merged.refreshIntervalSeconds = raw.refreshIntervalSeconds;
        }
        return merged;
      },
    }
  )
);
