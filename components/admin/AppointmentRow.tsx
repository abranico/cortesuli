"use client";

import { useState, useTransition } from "react";
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
          {shots.map((s) => (
            <figure key={s.key} className="overflow-hidden rounded-xl border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.images[s.key]} alt={`${a.cutName || "Corte"} - ${s.label}`} className="aspect-square w-full object-cover" />
              <figcaption className="py-1.5 text-center text-xs text-neutral-500">{s.label}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </li>
  );
}
