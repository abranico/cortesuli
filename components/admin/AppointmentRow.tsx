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
  const [open, setOpen] = useState(false);

  const thumb = a.images.front ?? a.images.left ?? a.images.right ?? a.images.back;
  const hasCut = Boolean(thumb || a.cutName);
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

        {hasCut ? (
          <button
            onClick={() => setOpen(true)}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 hover:border-accent"
            title={a.cutName ? `Ver corte: ${a.cutName}` : "Ver corte"}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={a.cutName || "Corte"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px] text-neutral-500">Corte</span>
            )}
          </button>
        ) : null}

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
      {open && <CutModal appointment={a} onClose={() => setOpen(false)} />}
    </li>
  );
}

function CutModal({ appointment: a, onClose }: { appointment: AppointmentRowData; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const shots = ANGLES.filter((x) => a.images[x.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-500">
              {a.customerName} · {a.time}
            </p>
            <h3 className="text-lg font-semibold">{a.cutName || "Corte elegido"}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-100" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {shots.length > 0 && (
          <div className={`mt-4 grid gap-2 ${shots.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {shots.map((s) => (
              <figure key={s.key} className="overflow-hidden rounded-xl border border-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.images[s.key]} alt={s.label} className="aspect-square w-full object-cover" />
                <figcaption className="py-1 text-center text-xs text-neutral-500">{s.label}</figcaption>
              </figure>
            ))}
          </div>
        )}
        {a.cutDescription && <p className="mt-4 text-sm text-neutral-700">{a.cutDescription}</p>}
      </div>
    </div>
  );
}
