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

const DETAIL_STREAM_SYSTEM_PROMPT =
  "You are a helpful assistant. The user message contains a full task with transcript and instructions. Follow it exactly and write the response the task asks for.";

interface SendUserMessageOptions {
  /** If set, sent to the model as the user turn instead of `content` (chat bubble still shows `content`). */
  modelUserContent?: string;
  /** If set, replaces the default chat system prompt (transcript in system). */
  systemPromptOverride?: string;
}

interface UseChatResult {
  isStreaming: boolean;
  error: string | null;
  sendUserMessage: (
    content: string,
    options?: SendUserMessageOptions
  ) => Promise<void>;
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
  const detailedAnswerContextWordCount = useSettingsStore(
    (s) => s.detailedAnswerContextWordCount
  );

  const buildSystemPrompt = useCallback((): string => {
    const snippet = takeLastWords(fullTranscript, chatContextWordCount);
    return interpolateTranscriptContext(
      chatSystemPrompt,
      snippet.length > 0 ? snippet : "(no transcript yet)"
    );
  }, [chatContextWordCount, chatSystemPrompt, fullTranscript]);

  const runAssistantStream = useCallback(
    async (
      historyForModel: { role: "user" | "assistant"; content: string }[],
      systemPromptOverride?: string
    ) => {
      setIsStreaming(true);
      setError(null);
      const systemPrompt = systemPromptOverride ?? buildSystemPrompt();
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
    async (content: string, options?: SendUserMessageOptions) => {
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
      const withoutTrailingEmptyAssistant = history.filter((m, idx) => {
        if (
          m.role === "assistant" &&
          m.content === "" &&
          idx === history.length - 1
        ) {
          return false;
        }
        return true;
      });
      const modelUserPayload =
        options?.modelUserContent !== undefined &&
        options.modelUserContent.trim().length > 0
          ? options.modelUserContent.trim()
          : trimmed;
      const lastIdx = withoutTrailingEmptyAssistant.length - 1;
      const nextHistory = withoutTrailingEmptyAssistant.map((m, idx) => {
        if (
          idx === lastIdx &&
          m.role === "user" &&
          options?.modelUserContent !== undefined
        ) {
          return { role: "user" as const, content: modelUserPayload };
        }
        return { role: m.role, content: m.content };
      });
      await runAssistantStream(nextHistory, options?.systemPromptOverride);
    },
    [appendChatMessage, isStreaming, runAssistantStream]
  );

  const submitFromSuggestion = useCallback(
    async (item: SuggestionItem, batchId: string, suggestionIndex: number) => {
      if (isStreaming) {
        return;
      }
      const userFacing = [
        `[Suggestion — expand] ${item.headline}`,
        item.subtext.length > 0 ? `Preview: ${item.subtext}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const transcriptForDetail = takeLastWords(
        fullTranscript,
        detailedAnswerContextWordCount
      );
      const detailPrompt = interpolateDetailedAnswerPrompt(
        detailedAnswerPrompt,
        transcriptForDetail.length > 0 ? transcriptForDetail : "(no transcript yet)",
        item.type,
        item.headline,
        item.subtext
      );

      void (async () => {
        try {
          const detailed = await completeChatJson([
            { role: "user", content: detailPrompt },
          ]);
          const text = detailed.trim();
          setSuggestionDetailedAnswer(batchId, suggestionIndex, text);
        } catch {
          setSuggestionDetailedAnswer(
            batchId,
            suggestionIndex,
            "(detailed answer unavailable)"
          );
        }
      })();

      await sendUserMessage(userFacing, {
        modelUserContent: detailPrompt,
        systemPromptOverride: DETAIL_STREAM_SYSTEM_PROMPT,
      });
    },
    [
      detailedAnswerContextWordCount,
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
