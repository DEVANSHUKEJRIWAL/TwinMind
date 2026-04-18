import { type ReactElement, useEffect, useRef, useState } from "react";
import { buildExportPayload, downloadSessionJson } from "./lib/exportSession";
import { useChat } from "./hooks/useChat";
import { useSuggestions } from "./hooks/useSuggestions";
import { ChatPanel } from "./components/ChatPanel";
import { PanelErrorBoundary } from "./components/PanelErrorBoundary";
import { SettingsModal } from "./components/SettingsModal";
import { SuggestionsPanel } from "./components/SuggestionsPanel";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { useSessionStore } from "./store/sessionStore";
import { useSettingsStore } from "./store/settingsStore";
import type { SuggestionItem } from "./store/sessionStore";

export default function App(): ReactElement {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(
    () => useSettingsStore.persist.hasHydrated()
  );
  const didInitialSuggestionRefresh = useRef(false);

  const groqApiKey = useSettingsStore((s) => s.groqApiKey);
  const fullTranscript = useSessionStore((s) => s.fullTranscript);
  const suggestionBatches = useSessionStore((s) => s.suggestionBatches);
  const chatHistory = useSessionStore((s) => s.chatHistory);

  const { isLoading: suggestionsLoading, error: suggestionsError, refresh } =
    useSuggestions();
  const {
    isStreaming,
    error: chatError,
    sendUserMessage,
    submitFromSuggestion,
  } = useChat();

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && groqApiKey.trim().length === 0) {
      setSettingsOpen(true);
    }
  }, [groqApiKey, hydrated]);

  useEffect(() => {
    if (groqApiKey.trim().length === 0) {
      didInitialSuggestionRefresh.current = false;
    }
  }, [groqApiKey]);

  useEffect(() => {
    if (!hydrated || groqApiKey.trim().length === 0) {
      return;
    }
    if (didInitialSuggestionRefresh.current) {
      return;
    }
    didInitialSuggestionRefresh.current = true;
    void refresh();
  }, [groqApiKey, hydrated, refresh]);

  const handleExport = (): void => {
    const payload = buildExportPayload(
      fullTranscript,
      suggestionBatches,
      chatHistory
    );
    downloadSessionJson(payload);
  };

  const handleSuggestionSelect = (
    item: SuggestionItem,
    batchId: string,
    suggestionIndex: number
  ): void => {
    void submitFromSuggestion(item, batchId, suggestionIndex);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            TwinMind Live Suggestions
          </span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            Groq · gpt-oss-120b + whisper
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800"
          >
            Export session
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-slate-700 bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
            aria-label="Open settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.379-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.077-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-3">
        <PanelErrorBoundary title="Transcript panel">
          <TranscriptPanel />
        </PanelErrorBoundary>
        <PanelErrorBoundary title="Suggestions panel">
          <SuggestionsPanel
            isLoading={suggestionsLoading}
            error={suggestionsError}
            onRefresh={() => {
              void refresh();
            }}
            isChatStreaming={isStreaming}
            onSuggestionSelect={handleSuggestionSelect}
          />
        </PanelErrorBoundary>
        <PanelErrorBoundary title="Chat panel">
          <ChatPanel
            chatHistory={chatHistory}
            isStreaming={isStreaming}
            error={chatError}
            onSend={(text) => {
              void sendUserMessage(text);
            }}
          />
        </PanelErrorBoundary>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
