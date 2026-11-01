"use client";

import { useState, useTransition } from "react";
import { createStylistAction, deleteStylistAction, updateStylistAction, type ActionResult } from "@/app/admin/actions";

type StylistItem = { id: string; name: string; specialties: string[] };

const input = "rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent";

export default function StylistsManager({ stylists }: { stylists: StylistItem[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [specialties, setSpecialties] = useState("");

  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) onOk?.();
      else setError(res.error);
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        La cantidad de peluqueros define cuántos clientes podés atender en el mismo horario: con {Math.max(stylists.length, 1)}{" "}
        {stylists.length === 1 ? "peluquero" : "peluqueros"}, cada horario acepta hasta {Math.max(stylists.length, 1)}{" "}
        {Math.max(stylists.length, 1) === 1 ? "turno" : "turnos"}.
      </p>

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {stylists.length === 0 && <li className="p-6 text-center text-sm text-neutral-500">Todavía no cargaste peluqueros.</li>}
        {stylists.map((s) => (
          <StylistRow key={s.id} stylist={s} disabled={pending} run={run} />
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createStylistAction(name, specialties),
            () => {
              setName("");
              setSpecialties("");
            },
          );
        }}
        className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className={`${input} sm:w-40`} required />
        <input
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          placeholder="Especialidades (opcional, separadas por coma)"
          className={`${input} flex-1`}
        />
        <button disabled={pending || !name.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50">
          Agregar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function StylistRow({
  stylist: s,
  disabled,
  run,
}: {
  stylist: StylistItem;
  disabled: boolean;
  run: (fn: () => Promise<ActionResult>, onOk?: () => void) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.name);
  const [specialties, setSpecialties] = useState(s.specialties.join(", "));

  if (editing)
    return (
      <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} sm:w-40`} aria-label="Nombre" />
        <input
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          placeholder="Especialidades, separadas por coma"
          className={`${input} flex-1`}
          aria-label="Especialidades"
        />
        <div className="flex gap-1">
          <button
            disabled={disabled || !name.trim()}
            onClick={() => run(() => updateStylistAction(s.id, name, specialties), () => setEditing(false))}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-strong disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            onClick={() => {
              setName(s.name);
              setSpecialties(s.specialties.join(", "));
              setEditing(false);
            }}
            className="rounded-lg px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100"
          >
            Cancelar
          </button>
        </div>
      </li>
    );

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{s.name}</p>
        {s.specialties.length > 0 && <p className="truncate text-xs text-neutral-500">{s.specialties.join(", ")}</p>}
      </div>
      <button onClick={() => setEditing(true)} disabled={disabled} className="rounded-lg px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100">
        Editar
      </button>
      <button
        onClick={() => {
          if (window.confirm(`¿Borrar a ${s.name}? Sus turnos asignados quedan sin asignar.`)) run(() => deleteStylistAction(s.id));
        }}
        disabled={disabled}
        className="rounded-lg px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-700"
      >
        Borrar
      </button>
    </li>
  );
}
