"use client";

import { useState, useTransition } from "react";
import { cancelAppointmentAction } from "@/app/admin/actions";
import type { Appointment, CutImages } from "@/lib/types";

export type AppointmentView = Appointment & {
  serviceName: string;
  servicePrice: number;
  stylistName: string;
  productNames: string[];
};

const ANGLES: { key: keyof CutImages; label: string }[] = [
  { key: "front", label: "Frente" },
  { key: "left", label: "Izq." },
  { key: "right", label: "Der." },
  { key: "back", label: "Atrás" },
];

const time = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(iso),
  );

export default function AppointmentCard({ appointment: a }: { appointment: AppointmentView }) {
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const cancelled = a.status === "cancelado";

  function cancel() {
    if (!confirm(`¿Cancelar el turno de ${a.customerName}?`)) return;
    startTransition(async () => {
      const res = await cancelAppointmentAction(a.id);
      if (!res.ok) setMessage({ tone: "error", text: res.error });
      else
        setMessage({
          tone: "ok",
          text: res.offeredTo
            ? `Turno cancelado. Se le ofreció el turno a ${res.offeredTo} de la lista de espera.`
            : "Turno cancelado. No había nadie en la lista de espera.",
        });
    });
  }

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        cancelled ? "border-white/5 bg-white/[0.02] opacity-60" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 flex-row items-baseline gap-2 sm:w-20 sm:flex-col sm:gap-0">
          <p className="text-2xl font-bold tabular-nums">{time(a.start)}</p>
          <p className="text-xs text-zinc-500">a {time(a.end)}</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold">{a.customerName}</h4>
            {cancelled ? (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Cancelado</span>
            ) : a.cutName ? (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">Reservado con IA</span>
            ) : null}
          </div>
          <p className="text-sm text-zinc-400">
            {a.customerPhone && <a href={`tel:${a.customerPhone.replace(/\s/g, "")}`}>{a.customerPhone}</a>}
            {a.customerPhone && " · "}
            {a.serviceName} con {a.stylistName}
          </p>

          {a.cutName && (
            <div className="mt-3">
              <p className="text-sm font-medium text-amber-300">✂ {a.cutName}</p>
              {a.cutDescription && <p className="mt-0.5 text-sm text-zinc-300">{a.cutDescription}</p>}
            </div>
          )}

          {a.productNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.productNames.map((p) => (
                <span key={p} className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                  {p}
                </span>
              ))}
            </div>
          )}
          {a.notes && <p className="mt-2 text-xs text-zinc-500">{a.notes}</p>}
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          <div className="flex gap-1.5">
            {ANGLES.map(({ key, label }) => {
              const src = a.images?.[key];
              return src ? (
                <button
                  key={key}
                  type="button"
                  onClick={() => setZoom({ src, label })}
                  className="group relative h-16 w-16 overflow-hidden rounded-lg border border-white/10"
                  title={`Ver ${label}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${a.cutName} – ${label}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white">{label}</span>
                </button>
              ) : (
                <div
                  key={key}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] text-zinc-600"
                >
                  <span className="text-lg">✂</span>
                  <span className="text-[10px]">{label}</span>
                </div>
              );
            })}
          </div>
          {!cancelled && (
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-lg border border-red-400/30 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              {pending ? "Cancelando…" : "Cancelar"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.tone === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          <figure className="max-h-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom.src} alt={zoom.label} className="max-h-[80vh] w-auto rounded-xl" />
            <figcaption className="mt-2 flex items-center justify-between text-sm text-zinc-300">
              <span>
                {a.cutName} · {zoom.label}
              </span>
              <button type="button" onClick={() => setZoom(null)} className="rounded-md bg-white/10 px-3 py-1 hover:bg-white/20">
                Cerrar
              </button>
            </figcaption>
          </figure>
        </div>
      )}
    </article>
  );
}
