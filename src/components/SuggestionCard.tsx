import { type ReactElement } from "react";
import type { SuggestionItem } from "../store/sessionStore";

const TYPE_LABELS: Record<SuggestionItem["type"], string> = {
  question_to_ask: "Question to Ask",
  talking_point: "Talking Point",
  fact_check: "Fact Check",
  clarification: "Clarification",
  answer: "Answer",
};

interface SuggestionCardProps {
  item: SuggestionItem;
  dimmed: boolean;
  onSelect: () => void;
}

export function SuggestionCard({
  item,
  dimmed,
  onSelect,
}: SuggestionCardProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border border-slate-700/80 bg-slate-900/80 p-3 text-left transition hover:border-sky-600/60 hover:bg-slate-900 ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <span className="mb-2 inline-flex rounded-full bg-sky-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
        {TYPE_LABELS[item.type]}
      </span>
      <p className="text-sm font-semibold text-slate-50">{item.headline}</p>
      <p className="mt-1 text-xs text-slate-400">{item.subtext}</p>
    </button>
  );
}
