"use client";

import { useEffect, useState, useTransition } from "react";
import { assignStylistAction, cancelAppointmentAction, completeAppointmentAction, type ActionResult } from "@/app/admin/actions";
import type { CutImages } from "@/lib/types";

export type AppointmentRowData = {
  id: string;
  start: string;
  time: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  stylistId: string | null;
  stylistName: string;
  cutName: string;
  cutDescription: string;
  images: CutImages;
};

const ANGLES: { key: keyof CutImages; label: string }[] = [
  { key: "front", label: "Frente" },
  { key: "left", label: "Perfil izq." },
  { key: "right", label: "Perfil der." },
  { key: "back", label: "Nuca" },
];

export default function AppointmentRow({
  appointment: a,
  stylists,
  readOnly = false,
}: {
  appointment: AppointmentRowData;
  stylists: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stylistId, setStylistId] = useState(a.stylistId ?? "");
  const [zoom, setZoom] = useState<number | null>(null);
  const shots = ANGLES.filter((x) => a.images[x.key]);
  const digits = a.customerPhone.replace(/\D/g, "");

  const run = (fn: () => Promise<ActionResult>, onFail?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        onFail?.();
      }
    });

  const onAssign = (value: string) => {
    const prev = stylistId;
    setStylistId(value);
    run(
      () => assignStylistAction(a.id, value || null),
      () => setStylistId(prev),
    );
  };

  const onCancel = () => {
    if (!window.confirm(`¿Cancelar el turno de ${a.customerName} a las ${a.time}? Se borra el turno y sus fotos.`)) return;
    run(() => cancelAppointmentAction(a.id));
  };

  return (
    <li className={`px-4 py-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="w-12 shrink-0 font-mono text-sm font-semibold tabular-nums">{a.time}</span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{a.customerName}</p>
          <p className="flex flex-wrap gap-x-2 text-xs text-neutral-500">
            {a.customerPhone && (
              <>
                <a href={`tel:${a.customerPhone.replace(/[^\d+]/g, "")}`} className="hover:text-neutral-900">
                  {a.customerPhone}
                </a>
                {digits && (
                  <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    WhatsApp
                  </a>
                )}
              </>
            )}
            {a.serviceName && <span>· {a.serviceName}</span>}
          </p>
        </div>

        {readOnly ? (
          <span className="text-xs text-neutral-500">{a.stylistName ? `Atendió ${a.stylistName}` : "Sin peluquero asignado"}</span>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={stylistId}
              onChange={(e) => onAssign(e.target.value)}
              disabled={pending}
              aria-label="Asignar peluquero"
              className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs"
            >
              <option value="">Sin asignar</option>
              {stylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => run(() => completeAppointmentAction(a.id))}
              disabled={pending}
              className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-strong"
            >
              Completar
            </button>
            <button
              onClick={onCancel}
              disabled={pending}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:bg-red-50 hover:text-red-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {(shots.length > 0 || a.cutName || a.cutDescription) && (
        <div className="mt-3 flex flex-col gap-3">
          {(a.cutName || a.cutDescription) && (
            <div>
              {a.cutName && <p className="text-sm font-semibold">{a.cutName}</p>}
              {a.cutDescription && <p className="whitespace-pre-line text-sm text-neutral-600">{a.cutDescription}</p>}
            </div>
          )}
          {shots.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shots.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setZoom(i)}
                  className="overflow-hidden rounded-xl border border-neutral-200 text-left transition hover:border-accent"
                  title="Ver en grande"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.images[s.key]} alt={`${a.cutName || "Corte"} - ${s.label}`} className="aspect-square w-full object-cover" />
                  <span className="block py-1 text-center text-xs text-neutral-500">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {zoom !== null && shots[zoom] && (
        <Lightbox
          src={a.images[shots[zoom].key]!}
          label={`${a.cutName || "Corte"} · ${shots[zoom].label}`}
          onClose={() => setZoom(null)}
          onPrev={shots.length > 1 ? () => setZoom((zoom - 1 + shots.length) % shots.length) : undefined}
          onNext={shots.length > 1 ? () => setZoom((zoom + 1) % shots.length) : undefined}
        />
      )}
    </li>
  );
}

function Lightbox({
  src,
  label,
  onClose,
  onPrev,
  onNext,
}: {
  src: string;
  label: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const nav = "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg text-neutral-800 shadow hover:bg-white";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <figure className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="max-h-[85vh] w-full rounded-2xl object-contain" />
        <figcaption className="mt-2 text-center text-sm text-white/80">{label}</figcaption>
        {onPrev && (
          <button onClick={onPrev} className={`${nav} left-2`} aria-label="Anterior">
            ‹
          </button>
        )}
        {onNext && (
          <button onClick={onNext} className={`${nav} right-2`} aria-label="Siguiente">
            ›
          </button>
        )}
        <button onClick={onClose} className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-neutral-800 shadow hover:bg-white" aria-label="Cerrar">
          ✕
        </button>
      </figure>
    </div>
  );
}
