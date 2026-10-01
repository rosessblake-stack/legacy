"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeAudio, ApiError } from "@/lib/api";
import type { AnalyzeResponse } from "@/lib/types";

type RecorderStatus = "idle" | "requesting" | "recording" | "recorded" | "uploading" | "error";

interface AudioRecorderProps {
  userId: string;
  onAnalyzed: (response: AnalyzeResponse) => void;
  chunkIntervalMs?: number;
}

function pickSupportedMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "audio/webm";
}

export function AudioRecorder({ userId, onAnalyzed, chunkIntervalMs = 1000 }: AudioRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => stopStream, []);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      setChunkCount(0);
      setElapsedSeconds(0);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          setChunkCount((count) => count + 1);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        setPreviewUrl(URL.createObjectURL(blob));
        setStatus("recorded");
        clearTimer();
        stopStream();
      };

      recorder.start(chunkIntervalMs);
      mediaRecorderRef.current = recorder;
      setStatus("recording");

      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } catch {
      setErrorMessage("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
      setStatus("error");
    }
  }, [chunkIntervalMs]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const discardRecording = useCallback(() => {
    chunksRef.current = [];
    setChunkCount(0);
    setElapsedSeconds(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus("idle");
  }, [previewUrl]);

  const submitRecording = useCallback(async () => {
    if (chunksRef.current.length === 0) return;
    setStatus("uploading");
    setErrorMessage(null);
    try {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      const extension = mimeTypeRef.current.includes("mp4") ? "m4a" : "webm";
      const response = await analyzeAudio(userId, blob, `entrada-${Date.now()}.${extension}`);
      onAnalyzed(response);
      discardRecording();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo enviar el audio.";
      setErrorMessage(message);
      setStatus("recorded");
    }
  }, [discardRecording, onAnalyzed, userId]);

  const formattedTime = `${Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-200">Grabación de voz</span>
        {status === "recording" && (
          <span className="flex items-center gap-2 text-xs text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {formattedTime} · {chunkCount} fragmentos capturados
          </span>
        )}
      </div>

      {errorMessage && <p className="mb-3 text-xs text-red-400">{errorMessage}</p>}

      {status === "idle" || status === "error" ? (
        <button
          onClick={startRecording}
          className="w-full rounded-lg bg-red-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          Iniciar grabación
        </button>
      ) : null}

      {status === "requesting" && (
        <p className="text-sm text-neutral-400">Solicitando acceso al micrófono…</p>
      )}

      {status === "recording" && (
        <button
          onClick={stopRecording}
          className="w-full rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-600"
        >
          Detener grabación
        </button>
      )}

      {status === "recorded" && previewUrl && (
        <div className="space-y-3">
          <audio controls src={previewUrl} className="w-full" />
          <div className="flex gap-2">
            <button
              onClick={submitRecording}
              className="flex-1 rounded-lg bg-emerald-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Enviar para análisis
            </button>
            <button
              onClick={discardRecording}
              className="rounded-lg border border-neutral-600 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {status === "uploading" && (
        <p className="text-sm text-neutral-400">Transcribiendo y analizando tu entrada…</p>
      )}
    </div>
  );
}
