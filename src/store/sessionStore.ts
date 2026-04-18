import { create } from "zustand";

export type SuggestionTypeValue =
  | "question_to_ask"
  | "talking_point"
  | "fact_check"
  | "clarification"
  | "answer";

export interface SuggestionItem {
  type: SuggestionTypeValue;
  headline: string;
  subtext: string;
  detailedAnswer: string;
}

export interface SuggestionBatch {
  id: string;
  generatedAt: string;
  transcriptContextUsed: string;
  suggestions: SuggestionItem[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface SessionState {
  fullTranscript: string;
  suggestionBatches: SuggestionBatch[];
  chatHistory: ChatMessage[];
  micSessionActive: boolean;
  /** Incremented when the UI requests an early mic segment end (manual refresh). */
  transcriptionManualSync: number;
  appendTranscript: (text: string) => void;
  clearTranscript: () => void;
  requestTranscriptionManualSync: () => void;
  setMicSessionActive: (active: boolean) => void;
  prependSuggestionBatch: (batch: SuggestionBatch) => void;
  setSuggestionDetailedAnswer: (
    batchId: string,
    index: number,
    detailedAnswer: string
  ) => void;
  appendChatMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  fullTranscript: "",
  suggestionBatches: [],
  chatHistory: [],
  micSessionActive: false,
  transcriptionManualSync: 0,
  appendTranscript: (text) =>
    set((state) => ({
      fullTranscript:
        state.fullTranscript.length === 0
          ? text
          : `${state.fullTranscript}\n${text}`,
    })),
  clearTranscript: () => set({ fullTranscript: "" }),
  requestTranscriptionManualSync: () =>
    set((state) => ({
      transcriptionManualSync: state.transcriptionManualSync + 1,
    })),
  setMicSessionActive: (active) => set({ micSessionActive: active }),
  prependSuggestionBatch: (batch) =>
    set((state) => ({
      suggestionBatches: [batch, ...state.suggestionBatches],
    })),
  setSuggestionDetailedAnswer: (batchId, index, detailedAnswer) =>
    set((state) => ({
      suggestionBatches: state.suggestionBatches.map((batch) => {
        if (batch.id !== batchId) {
          return batch;
        }
        const suggestions = batch.suggestions.map((item, i) =>
          i === index ? { ...item, detailedAnswer } : item
        );
        return { ...batch, suggestions };
      }),
    })),
  appendChatMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    })),
  updateLastAssistantMessage: (content) =>
    set((state) => {
      const history = [...state.chatHistory];
      for (let i = history.length - 1; i >= 0; i -= 1) {
        const msg = history[i];
        if (msg && msg.role === "assistant") {
          history[i] = { ...msg, content };
          return { chatHistory: history };
        }
      }
      return state;
    }),
  resetSession: () =>
    set({
      fullTranscript: "",
      suggestionBatches: [],
      chatHistory: [],
      transcriptionManualSync: 0,
      micSessionActive: false,
    }),
}));
