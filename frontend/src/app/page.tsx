"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createUserProfile } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const profile = await createUserProfile(displayName, email);
      router.push(`/dashboard/${profile.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "No se pudo crear el perfil.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-50">OntoNav</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Mapeo ontológico de decisiones a través de tus 5 ejes de comportamiento.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Nombre</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-profile"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-400">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-profile"
              placeholder="tu@email.com"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-profile px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {isSubmitting ? "Creando…" : "Comenzar mi mapa"}
          </button>
        </form>
      </div>
    </main>
  );
}
