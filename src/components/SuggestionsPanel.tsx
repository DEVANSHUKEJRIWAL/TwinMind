import { type ReactElement } from "react";
import type { SuggestionItem } from "../store/sessionStore";
import { useSessionStore } from "../store/sessionStore";
import { SuggestionCard } from "./SuggestionCard";

interface SuggestionsPanelProps {
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  isChatStreaming: boolean;
  onSuggestionSelect: (
    item: SuggestionItem,
    batchId: string,
    suggestionIndex: number
  ) => void;
}

export function SuggestionsPanel({
  isLoading,
  error,
  onRefresh,
  isChatStreaming,
  onSuggestionSelect,
}: SuggestionsPanelProps): ReactElement {
  const suggestionBatches = useSessionStore((s) => s.suggestionBatches);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-slate-800 bg-slate-950/50">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">
          Live Suggestions
        </h2>
        <button
          type="button"
          disabled={isLoading || isChatStreaming}
          onClick={() => {
            onRefresh();
          }}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Refreshing…" : "Refresh now"}
        </button>
      </header>
      {error && (
        <div className="border-b border-rose-900/50 bg-rose-950/50 px-4 py-2 text-xs text-rose-100">
          {error}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {suggestionBatches.length === 0 && !isLoading ? (
          <p className="text-sm text-slate-500">
            Suggestions refresh on a timer and when you click refresh. Add your
            Groq API key in settings if you have not already.
          </p>
        ) : null}
        {isLoading && suggestionBatches.length === 0 ? (
          <p className="text-sm text-slate-400">Generating first batch…</p>
        ) : null}
        <div className="flex flex-col gap-6">
          {suggestionBatches.map((batch, batchIndex) => (
            <section key={batch.id} className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {new Date(batch.generatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {batchIndex === 0 ? (
                  <span className="text-emerald-400/90">Latest</span>
                ) : (
                  <span>Earlier</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {batch.suggestions.map((item, idx) => (
                  <SuggestionCard
                    key={`${batch.id}-${idx}`}
                    item={item}
                    dimmed={batchIndex > 0}
                    onSelect={() => {
                      if (!isChatStreaming) {
                        onSuggestionSelect(item, batch.id, idx);
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
