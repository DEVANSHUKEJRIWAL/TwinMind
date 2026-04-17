import { type FormEvent, type ReactElement, useState } from "react";
import type { ChatMessage } from "../store/sessionStore";

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  onSend: (content: string) => void;
}

export function ChatPanel({
  chatHistory,
  isStreaming,
  error,
  onSend,
}: ChatPanelProps): ReactElement {
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (isStreaming) {
      return;
    }
    onSend(draft);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-900/30">
      <header className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">
          Chat
        </h2>
      </header>
      {error && (
        <div className="border-b border-rose-900/50 bg-rose-950/50 px-4 py-2 text-xs text-rose-100">
          {error}
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {chatHistory.length === 0 ? (
          <p className="text-sm text-slate-500">
            Ask TwinMind anything about the meeting. Click a suggestion card to
            send it here automatically.
          </p>
        ) : null}
        {chatHistory.map((message, index) => {
          const isUser = message.role === "user";
          const isPendingAssistant =
            message.role === "assistant" &&
            message.content.length === 0 &&
            index === chatHistory.length - 1 &&
            isStreaming;
          return (
            <div
              key={`${message.timestamp}-${index}`}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  isUser
                    ? "bg-sky-700 text-sky-50"
                    : "border border-slate-700 bg-slate-900 text-slate-100"
                }`}
              >
                {isPendingAssistant ? (
                  <span className="text-slate-500">Thinking…</span>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 p-3"
      >
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isStreaming}
            placeholder="Message TwinMind…"
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/40 focus:border-sky-500 focus:ring-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || draft.trim().length === 0}
            className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
