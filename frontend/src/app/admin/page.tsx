"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useDraftStore } from "@/store/draftStore";
import { AXIS_LABELS } from "@/lib/types";

export default function AdminDraftsPage() {
  const drafts = useDraftStore((state) => state.drafts);
  const isLoading = useDraftStore((state) => state.isLoading);
  const error = useDraftStore((state) => state.error);
  const loadDrafts = useDraftStore((state) => state.loadDrafts);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-50">Borradores pendientes</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Revisa el análisis de los 5 ejes antes de liberar el mapa actualizado al usuario.
        </p>

        {isLoading && <p className="text-sm text-neutral-400">Cargando…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!isLoading && drafts.length === 0 && (
          <p className="text-sm text-neutral-500">No hay borradores pendientes de revisión.</p>
        )}

        <div className="space-y-2">
          {drafts.map((draft) => (
            <Link
              key={draft.analysis_entry_id}
              href={`/admin/${draft.analysis_entry_id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 hover:border-profile/60"
            >
              <div>
                <p className="text-sm font-medium text-neutral-100">{draft.user_display_name}</p>
                <p className="text-xs text-neutral-500">
                  {new Date(draft.created_at).toLocaleString("es-ES")} · {AXIS_LABELS[draft.dominant_axis]}
                </p>
              </div>
              {draft.has_contradictions && (
                <span className="rounded-full bg-contradiction/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                  Contradicción detectada
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
