import { useCallback, useEffect, useRef, useState } from "react";
import { GroqClientError, transcribeAudioBlob } from "../lib/groqClient";
import { useSessionStore } from "../store/sessionStore";

const CHUNK_MS = 30_000;

interface UseTranscriptionResult {
  isRecording: boolean;
  error: string | null;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

function pickRecorderMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return (
    candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ""
  );
}

export function useTranscription(): UseTranscriptionResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimerRef = useRef<number | null>(null);
  const isSessionActiveRef = useRef(false);
  const appendTranscript = useSessionStore((s) => s.appendTranscript);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearChunkTimer = useCallback(() => {
    if (chunkTimerRef.current !== null) {
      window.clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  const processChunk = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        return;
      }
      setIsTranscribing(true);
      setError(null);
      try {
        const text = await transcribeAudioBlob(blob);
        if (text.length > 0) {
          appendTranscript(text);
        }
      } catch (err) {
        const message =
          err instanceof GroqClientError
            ? err.message +
              (err.responseBody ? `: ${err.responseBody}` : "")
            : "Transcription failed";
        setError(message);
      } finally {
        setIsTranscribing(false);
      }
    },
    [appendTranscript]
  );

  const beginSegment = useCallback(
    (stream: MediaStream): void => {
      if (!isSessionActiveRef.current) {
        return;
      }
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const segmentChunks: Blob[] = [];

      recorder.addEventListener("dataavailable", (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          segmentChunks.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const mergedType =
          segmentChunks[0]?.type && segmentChunks[0].type.length > 0
            ? segmentChunks[0].type
            : recorder.mimeType || "audio/webm";
        const blob = new Blob(segmentChunks, { type: mergedType });
        mediaRecorderRef.current = null;
        if (blob.size > 0) {
          void processChunk(blob);
        }
        if (isSessionActiveRef.current && streamRef.current) {
          beginSegment(streamRef.current);
        } else {
          stopTracks();
        }
      });

      mediaRecorderRef.current = recorder;
      recorder.start();
    },
    [processChunk, stopTracks]
  );

  const stopRecording = useCallback(() => {
    isSessionActiveRef.current = false;
    clearChunkTimer();
    setIsRecording(false);
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      mediaRecorderRef.current = null;
      stopTracks();
    }
  }, [clearChunkTimer, stopTracks]);

  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      clearChunkTimer();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      stopTracks();
    };
  }, [clearChunkTimer, stopTracks]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }
    chunkTimerRef.current = window.setInterval(() => {
      const recorder = mediaRecorderRef.current;
      if (
        isSessionActiveRef.current &&
        recorder &&
        recorder.state === "recording"
      ) {
        recorder.stop();
      }
    }, CHUNK_MS);
    return () => {
      if (chunkTimerRef.current !== null) {
        window.clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isSessionActiveRef.current = true;
      beginSegment(stream);
      setIsRecording(true);
    } catch {
      setError("Microphone access denied or unavailable");
    }
  }, [beginSegment]);

  return {
    isRecording,
    error,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
