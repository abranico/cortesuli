"use client";

import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createManualAppointmentAction } from "@/app/admin/actions";

export type ManualSlot = { start: string; label: string; remaining: number; busyStylists: string[] };
export type ManualDay = { key: string; label: string; slots: ManualSlot[] };

const field = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-neutral-50";

export default function NewAppointmentButton({
  days,
  services,
  stylists,
}: {
  days: ManualDay[];
  services: { id: string; name: string; price: number }[];
  stylists: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-accent/30 transition hover:bg-accent-strong"
      >
        + Nuevo turno
      </button>
      {open && <NewAppointmentDialog days={days} services={services} stylists={stylists} onClose={() => setOpen(false)} />}
    </>
  );
}

function NewAppointmentDialog({
  days,
  services,
  stylists,
  onClose,
}: {
  days: ManualDay[];
  services: { id: string; name: string; price: number }[];
  stylists: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dayKey, setDayKey] = useState(days[0]?.key ?? "");
  const day = days.find((d) => d.key === dayKey);
  const firstFree = (d?: ManualDay) => d?.slots.find((s) => s.remaining > 0)?.start ?? "";
  const [start, setStart] = useState(firstFree(days[0]));
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [notes, setNotes] = useState("");
  const slot = day?.slots.find((s) => s.start === start);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const res = await createManualAppointmentAction({ customerName: name, customerPhone: phone, start, serviceId, stylistId, notes });
      if (res.ok) onClose();
      else setError(res.error);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-appt-title"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="new-appt-title" className="text-lg font-semibold">
              Nuevo turno
            </h3>
            <p className="text-xs text-neutral-500">Para reservas por teléfono, WhatsApp o en el local.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-neutral-400 hover:bg-neutral-100" aria-label="Cerrar">
            ✕
          </button>
        </div>

        {days.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            No hay horarios disponibles en las próximas semanas.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Label text="Cliente">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" maxLength={120} className={field} required autoFocus />
              </Label>
              <Label text="Teléfono">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11 5555-5555" type="tel" maxLength={40} className={field} />
              </Label>
              <Label text="Día">
                <select
                  value={dayKey}
                  onChange={(e) => {
                    setDayKey(e.target.value);
                    setStart(firstFree(days.find((d) => d.key === e.target.value)));
                  }}
                  className={field}
                >
                  {days.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Label>
              <Label text="Horario">
                <select value={start} onChange={(e) => setStart(e.target.value)} className={field} required>
                  {!firstFree(day) && <option value="">Día completo</option>}
                  {day?.slots.map((s) => (
                    <option key={s.start} value={s.start} disabled={s.remaining <= 0}>
                      {s.label} · {s.remaining > 0 ? `${s.remaining} ${s.remaining === 1 ? "lugar" : "lugares"}` : "completo"}
                    </option>
                  ))}
                </select>
              </Label>
              <Label text="Servicio (opcional)">
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={field}>
                  <option value="">Sin especificar</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Label>
              <Label text="Peluquero (opcional)">
                <select value={stylistId} onChange={(e) => setStylistId(e.target.value)} className={field}>
                  <option value="">Sin asignar</option>
                  {stylists.map((s) => {
                    const busy = slot?.busyStylists.includes(s.id) ?? false;
                    return (
                      <option key={s.id} value={s.id} disabled={busy}>
                        {s.name}
                        {busy ? " · ocupado" : ""}
                      </option>
                    );
                  })}
                </select>
              </Label>
            </div>
            <Label text="Notas (opcional)">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder="Ej: quiere degradé bajo" className={`${field} resize-none`} />
            </Label>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || !start || !name.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar turno"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">{text}</span>
      {children}
    </label>
  );
}
