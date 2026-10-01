"use client";

import { useState } from "react";
import { OntologyCanvas } from "@/components/canvas/OntologyCanvas";
import { AudioRecorder } from "@/components/voice/AudioRecorder";
import { analyzeText, ApiError } from "@/lib/api";
import type { AnalyzeResponse } from "@/lib/types";

export default function DashboardPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const [text, setText] = useState("");
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<AnalyzeResponse | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const handleAnalyzed = (response: AnalyzeResponse) => {
    setLastSubmission(response);
    setText("");
  };

  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    setIsSubmittingText(true);
    setError(null);
    try {
      const response = await analyzeText(userId, text.trim());
      handleAnalyzed(response);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo enviar tu entrada.";
      setError(message);
    } finally {
      setIsSubmittingText(false);
    }
  };

  return (
    <main className="relative h-screen w-screen">
      <div className="absolute inset-0">
        <OntologyCanvas userId={userId} />
      </div>

      <button
        onClick={() => setIsComposerOpen((open) => !open)}
        className="absolute bottom-6 right-6 z-10 rounded-full bg-profile px-5 py-3 text-sm font-semibold text-neutral-950 shadow-lg hover:bg-amber-400"
      >
        {isComposerOpen ? "Cerrar" : "Nueva entrada"}
      </button>

      {isComposerOpen && (
        <div className="absolute bottom-24 right-6 z-10 w-96 space-y-4 rounded-2xl border border-neutral-700 bg-neutral-900/95 p-5 shadow-2xl backdrop-blur">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-100">Cuéntame qué está pasando</h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-profile"
              placeholder="Describe la última vez que enfrentaste este problema…"
            />
            <button
              onClick={handleTextSubmit}
              disabled={isSubmittingText || !text.trim()}
              className="mt-2 w-full rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-600 disabled:opacity-50"
            >
              {isSubmittingText ? "Analizando…" : "Enviar texto"}
            </button>
          </div>

          <div className="text-center text-xs text-neutral-500">— o —</div>

          <AudioRecorder userId={userId} onAnalyzed={handleAnalyzed} />

          {error && <p className="text-xs text-red-400">{error}</p>}
          {lastSubmission && (
            <p className="text-xs text-emerald-400">
              Tu entrada fue enviada para revisión. Un administrador la aprobará antes de actualizar tu mapa.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
