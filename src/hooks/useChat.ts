import { useCallback, useState } from "react";
import {
  completeChatJson,
  GroqClientError,
  streamChatCompletion,
} from "../lib/groqClient";
import {
  interpolateDetailedAnswerPrompt,
  interpolateTranscriptContext,
} from "../lib/prompts";
import { takeLastWords } from "../lib/text";
import { useSessionStore } from "../store/sessionStore";
import type { SuggestionItem } from "../store/sessionStore";
import { useSettingsStore } from "../store/settingsStore";

interface UseChatResult {
  isStreaming: boolean;
  error: string | null;
  sendUserMessage: (content: string) => Promise<void>;
  submitFromSuggestion: (
    item: SuggestionItem,
    batchId: string,
    suggestionIndex: number
  ) => Promise<void>;
}

export function useChat(): UseChatResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fullTranscript = useSessionStore((s) => s.fullTranscript);
  const appendChatMessage = useSessionStore((s) => s.appendChatMessage);
  const updateLastAssistantMessage = useSessionStore(
    (s) => s.updateLastAssistantMessage
  );
  const setSuggestionDetailedAnswer = useSessionStore(
    (s) => s.setSuggestionDetailedAnswer
  );

  const chatSystemPrompt = useSettingsStore((s) => s.chatSystemPrompt);
  const detailedAnswerPrompt = useSettingsStore(
    (s) => s.detailedAnswerPrompt
  );
  const chatContextWordCount = useSettingsStore(
    (s) => s.chatContextWordCount
  );

  const buildSystemPrompt = useCallback((): string => {
    const snippet = takeLastWords(fullTranscript, chatContextWordCount);
    return interpolateTranscriptContext(
      chatSystemPrompt,
      snippet.length > 0 ? snippet : "(no transcript yet)"
    );
  }, [chatContextWordCount, chatSystemPrompt, fullTranscript]);

  const runAssistantStream = useCallback(
    async (historyForModel: { role: "user" | "assistant"; content: string }[]) => {
      setIsStreaming(true);
      setError(null);
      const systemPrompt = buildSystemPrompt();
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...historyForModel.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];
      let accumulated = "";
      try {
        await streamChatCompletion(messages, (token) => {
          accumulated += token;
          updateLastAssistantMessage(accumulated);
        });
      } catch (err) {
        const message =
          err instanceof GroqClientError
            ? err.message + (err.responseBody ? `: ${err.responseBody}` : "")
            : "Chat stream failed";
        setError(message);
      } finally {
        setIsStreaming(false);
      }
    },
    [buildSystemPrompt, updateLastAssistantMessage]
  );

  const sendUserMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (trimmed.length === 0 || isStreaming) {
        return;
      }
      const userMsg = {
        role: "user" as const,
        content: trimmed,
        timestamp: new Date().toISOString(),
      };
      appendChatMessage(userMsg);
      const assistantPlaceholder = {
        role: "assistant" as const,
        content: "",
        timestamp: new Date().toISOString(),
      };
      appendChatMessage(assistantPlaceholder);
      const history = useSessionStore.getState().chatHistory;
      const nextHistory = history
        .filter((m, idx) => {
          if (
            m.role === "assistant" &&
            m.content === "" &&
            idx === history.length - 1
          ) {
            return false;
          }
          return true;
        })
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));
      await runAssistantStream(nextHistory);
    },
    [appendChatMessage, isStreaming, runAssistantStream]
  );

  const submitFromSuggestion = useCallback(
    async (item: SuggestionItem, batchId: string, suggestionIndex: number) => {
      if (isStreaming) {
        return;
      }
      const userText = [
        `[${item.type}]`,
        item.headline,
        item.subtext.length > 0 ? `— ${item.subtext}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const transcriptSnippet = takeLastWords(
        fullTranscript,
        chatContextWordCount
      );
      const detailPrompt = interpolateDetailedAnswerPrompt(
        detailedAnswerPrompt,
        transcriptSnippet.length > 0 ? transcriptSnippet : "(no transcript yet)",
        item.type,
        item.headline
      );

      void (async () => {
        try {
          const detailed = await completeChatJson([
            { role: "user", content: detailPrompt },
          ]);
          setSuggestionDetailedAnswer(
            batchId,
            suggestionIndex,
            detailed.trim()
          );
        } catch {
          setSuggestionDetailedAnswer(
            batchId,
            suggestionIndex,
            "(detailed answer unavailable)"
          );
        }
      })();

      await sendUserMessage(userText);
    },
    [
      chatContextWordCount,
      detailedAnswerPrompt,
      fullTranscript,
      isStreaming,
      sendUserMessage,
      setSuggestionDetailedAnswer,
    ]
  );

  return {
    isStreaming,
    error,
    sendUserMessage,
    submitFromSuggestion,
  };
}
