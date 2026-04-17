import { type FormEvent, type ReactElement, useEffect, useState } from "react";
import {
  CHAT_SYSTEM_PROMPT,
  DETAILED_ANSWER_PROMPT,
  SUGGESTION_PROMPT,
} from "../lib/prompts";
import { useSettingsStore } from "../store/settingsStore";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({
  open,
  onClose,
}: SettingsModalProps): ReactElement | null {
  const groqApiKey = useSettingsStore((s) => s.groqApiKey);
  const suggestionPrompt = useSettingsStore((s) => s.suggestionPrompt);
  const detailedAnswerPrompt = useSettingsStore(
    (s) => s.detailedAnswerPrompt
  );
  const chatSystemPrompt = useSettingsStore((s) => s.chatSystemPrompt);
  const suggestionContextWordCount = useSettingsStore(
    (s) => s.suggestionContextWordCount
  );
  const chatContextWordCount = useSettingsStore(
    (s) => s.chatContextWordCount
  );
  const refreshIntervalSeconds = useSettingsStore(
    (s) => s.refreshIntervalSeconds
  );
  const model = useSettingsStore((s) => s.model);

  const setGroqApiKey = useSettingsStore((s) => s.setGroqApiKey);
  const setSuggestionPrompt = useSettingsStore((s) => s.setSuggestionPrompt);
  const setDetailedAnswerPrompt = useSettingsStore(
    (s) => s.setDetailedAnswerPrompt
  );
  const setChatSystemPrompt = useSettingsStore((s) => s.setChatSystemPrompt);
  const setSuggestionContextWordCount = useSettingsStore(
    (s) => s.setSuggestionContextWordCount
  );
  const setChatContextWordCount = useSettingsStore(
    (s) => s.setChatContextWordCount
  );
  const setRefreshIntervalSeconds = useSettingsStore(
    (s) => s.setRefreshIntervalSeconds
  );
  const setModel = useSettingsStore((s) => s.setModel);

  const [localKey, setLocalKey] = useState(groqApiKey);
  const [localSuggestionPrompt, setLocalSuggestionPrompt] =
    useState(suggestionPrompt);
  const [localDetailedPrompt, setLocalDetailedPrompt] = useState(
    detailedAnswerPrompt
  );
  const [localChatPrompt, setLocalChatPrompt] = useState(chatSystemPrompt);
  const [localSuggestionWords, setLocalSuggestionWords] = useState(
    String(suggestionContextWordCount)
  );
  const [localChatWords, setLocalChatWords] = useState(
    String(chatContextWordCount)
  );
  const [localRefresh, setLocalRefresh] = useState(
    String(refreshIntervalSeconds)
  );
  const [localModel, setLocalModel] = useState(model);

  useEffect(() => {
    if (open) {
      setLocalKey(groqApiKey);
      setLocalSuggestionPrompt(suggestionPrompt);
      setLocalDetailedPrompt(detailedAnswerPrompt);
      setLocalChatPrompt(chatSystemPrompt);
      setLocalSuggestionWords(String(suggestionContextWordCount));
      setLocalChatWords(String(chatContextWordCount));
      setLocalRefresh(String(refreshIntervalSeconds));
      setLocalModel(model);
    }
  }, [
    open,
    groqApiKey,
    suggestionPrompt,
    detailedAnswerPrompt,
    chatSystemPrompt,
    suggestionContextWordCount,
    chatContextWordCount,
    refreshIntervalSeconds,
    model,
  ]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const sugWords = Number.parseInt(localSuggestionWords, 10);
    const chatWords = Number.parseInt(localChatWords, 10);
    const refreshSec = Number.parseInt(localRefresh, 10);
    setGroqApiKey(localKey.trim());
    setSuggestionPrompt(localSuggestionPrompt);
    setDetailedAnswerPrompt(localDetailedPrompt);
    setChatSystemPrompt(localChatPrompt);
    setSuggestionContextWordCount(
      Number.isFinite(sugWords) && sugWords > 0 ? sugWords : 800
    );
    setChatContextWordCount(
      Number.isFinite(chatWords) && chatWords > 0 ? chatWords : 2000
    );
    setRefreshIntervalSeconds(
      Number.isFinite(refreshSec) && refreshSec > 0 ? refreshSec : 30
    );
    setModel(localModel.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            Close
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
        >
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Groq API key
            <input
              type="password"
              autoComplete="off"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
              placeholder="gsk_…"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Suggestion prompt
            <textarea
              value={localSuggestionPrompt}
              onChange={(e) => setLocalSuggestionPrompt(e.target.value)}
              rows={8}
              className="resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] leading-snug text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
            />
            <button
              type="button"
              onClick={() =>
                setLocalSuggestionPrompt(SUGGESTION_PROMPT)
              }
              className="self-start text-[11px] text-sky-400 hover:underline"
            >
              Reset to default
            </button>
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Detailed answer prompt
            <textarea
              value={localDetailedPrompt}
              onChange={(e) => setLocalDetailedPrompt(e.target.value)}
              rows={6}
              className="resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] leading-snug text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
            />
            <button
              type="button"
              onClick={() =>
                setLocalDetailedPrompt(DETAILED_ANSWER_PROMPT)
              }
              className="self-start text-[11px] text-sky-400 hover:underline"
            >
              Reset to default
            </button>
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Chat system prompt
            <textarea
              value={localChatPrompt}
              onChange={(e) => setLocalChatPrompt(e.target.value)}
              rows={6}
              className="resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] leading-snug text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setLocalChatPrompt(CHAT_SYSTEM_PROMPT)}
              className="self-start text-[11px] text-sky-400 hover:underline"
            >
              Reset to default
            </button>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Suggestion context (words)
              <input
                type="number"
                min={50}
                value={localSuggestionWords}
                onChange={(e) => setLocalSuggestionWords(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Chat context (words)
              <input
                type="number"
                min={50}
                value={localChatWords}
                onChange={(e) => setLocalChatWords(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Refresh interval (seconds)
              <input
                type="number"
                min={5}
                value={localRefresh}
                onChange={(e) => setLocalRefresh(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Model
              <input
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-sky-500/30 focus:border-sky-500 focus:ring-2"
              />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-2 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
