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

export function useTranscription(): UseTranscriptionResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const appendTranscript = useSessionStore((s) => s.appendTranscript);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const flushRecorder = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }
    await new Promise<void>((resolve) => {
      const onStop = (): void => {
        recorder.removeEventListener("stop", onStop);
        resolve();
      };
      recorder.addEventListener("stop", onStop);
      recorder.stop();
    });
  }, []);

  const stopRecording = useCallback(() => {
    void (async () => {
      await flushRecorder();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      stopTracks();
    })();
  }, [flushRecorder, stopTracks]);

  useEffect(() => {
    return () => {
      void flushRecorder();
      stopTracks();
    };
  }, [flushRecorder, stopTracks]);

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

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          void processChunk(event.data);
        }
      };

      recorder.start(CHUNK_MS);
      setIsRecording(true);
    } catch {
      setError("Microphone access denied or unavailable");
    }
  }, [processChunk]);

  return {
    isRecording,
    error,
    isTranscribing,
    startRecording,
    stopRecording,
  };
}
