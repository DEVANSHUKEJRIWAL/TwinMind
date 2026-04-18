import { type ReactElement, useEffect, useRef } from "react";
import { useTranscription } from "../hooks/useTranscription";
import { useSessionStore } from "../store/sessionStore";

export function TranscriptPanel(): ReactElement {
  const fullTranscript = useSessionStore((s) => s.fullTranscript);
  const transcriptionManualSync = useSessionStore(
    (s) => s.transcriptionManualSync
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevSyncRef = useRef(transcriptionManualSync);
  const {
    isRecording,
    error,
    isTranscribing,
    startRecording,
    stopRecording,
    flushPartialSegment,
  } = useTranscription();

  useEffect(() => {
    if (
      isRecording &&
      transcriptionManualSync !== prevSyncRef.current
    ) {
      flushPartialSegment();
    }
    prevSyncRef.current = transcriptionManualSync;
  }, [transcriptionManualSync, isRecording, flushPartialSegment]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [fullTranscript]);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-slate-800 bg-slate-900/40">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-100">
          Mic + Transcript
        </h2>
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                void startRecording();
              }
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              isRecording
                ? "bg-rose-600 text-white hover:bg-rose-500"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {isRecording ? "Stop" : "Start"}
          </button>
        </div>
      </header>
      {error && (
        <div className="border-b border-rose-900/50 bg-rose-950/50 px-4 py-2 text-xs text-rose-100">
          {error}
        </div>
      )}
      {isTranscribing && (
        <div className="border-b border-slate-800 bg-slate-800/60 px-4 py-2 text-xs text-amber-100">
          Transcribing latest audio chunk…
        </div>
      )}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-200"
      >
        {fullTranscript.length === 0 ? (
          <p className="text-slate-500">
            Transcript appears here as you speak. Start the mic to capture
            audio; chunks upload every 30 seconds.
          </p>
        ) : (
          <p className="whitespace-pre-wrap">{fullTranscript}</p>
        )}
      </div>
    </div>
  );
}
