import type { ChatMessage, SuggestionBatch } from "../store/sessionStore";

export interface ExportedSession {
  exportedAt: string;
  transcript: string;
  suggestionBatches: Array<{
    generatedAt: string;
    transcriptContextUsed: string;
    suggestions: Array<{
      type: string;
      headline: string;
      subtext: string;
      detailedAnswer: string;
    }>;
  }>;
  chatHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
}

export function buildExportPayload(
  transcript: string,
  suggestionBatches: SuggestionBatch[],
  chatHistory: ChatMessage[]
): ExportedSession {
  return {
    exportedAt: new Date().toISOString(),
    transcript,
    suggestionBatches: suggestionBatches.map((batch) => ({
      generatedAt: batch.generatedAt,
      transcriptContextUsed: batch.transcriptContextUsed,
      suggestions: batch.suggestions.map((s) => ({
        type: s.type,
        headline: s.headline,
        subtext: s.subtext,
        detailedAnswer: s.detailedAnswer,
      })),
    })),
    chatHistory: chatHistory.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })),
  };
}

export function downloadSessionJson(payload: ExportedSession): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `twinmind-session-${payload.exportedAt}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
