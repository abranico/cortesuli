"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SalonSearchResult } from "@/lib/types";

type Near = { lat: number; lng: number };
type Status = "idle" | "loading" | "done" | "error";

const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`);

export default function SalonSearch() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [near, setNear] = useState<Near | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [results, setResults] = useState<SalonSearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  const active = Boolean(q.trim() || location.trim() || near);

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (location.trim()) params.set("location", location.trim());
      if (near) {
        params.set("lat", String(near.lat));
        params.set("lng", String(near.lng));
      }
      try {
        const res = await fetch(`/api/peluquerias?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { results: SalonSearchResult[] };
        setResults(data.results);
        setStatus("done");
      } catch {
        if (!ctrl.signal.aborted) setStatus("error");
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, location, near, active]);

  function locate() {
    if (near) {
      setNear(null);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no permite compartir la ubicación.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError("No pudimos obtener tu ubicación. Probá escribiendo tu barrio o ciudad.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const input =
    "w-full rounded-full border border-foreground/15 bg-surface px-4 py-2.5 text-sm outline-none transition placeholder:text-foreground/40 focus:border-accent focus:ring-2 focus:ring-accent/15";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Nombre de la peluquería</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscá tu peluquería por nombre" className={input} />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Barrio o ciudad</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Barrio o ciudad" className={input} />
        </label>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-pressed={Boolean(near)}
          className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
            near ? "border-accent bg-accent text-white hover:bg-accent-strong" : "border-foreground/15 bg-surface text-foreground/80 hover:border-accent/60 hover:text-accent"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {locating ? "Ubicando…" : near ? "Cerca mío ✓" : "Cerca mío"}
        </button>
      </div>

      {geoError && <p className="mt-2 text-xs text-red-700">{geoError}</p>}

      {active && (
        <div className="mt-4" aria-live="polite">
          {status === "loading" && results.length === 0 && <p className="text-sm text-foreground/55">Buscando…</p>}
          {status === "error" && <p className="text-sm text-red-700">No pudimos buscar ahora. Probá de nuevo en un rato.</p>}
          {status === "done" && results.length === 0 && (
            <p className="text-sm text-foreground/55">No encontramos peluquerías con esa búsqueda.</p>
          )}
          {results.length > 0 && (
            <ul className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${status === "loading" ? "opacity-60" : ""}`}>
              {results.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/peluqueria/${s.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-surface px-4 py-3 transition hover:border-accent/50 hover:shadow-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold group-hover:text-accent">{s.name}</span>
                      <span className="block truncate text-xs text-foreground/55">
                        {s.address} · {s.city}
                      </span>
                    </span>
                    {s.distanceKm != null ? (
                      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-strong">
                        {formatKm(s.distanceKm)}
                      </span>
                    ) : (
                      <span aria-hidden className="shrink-0 text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-accent">
                        &rarr;
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
