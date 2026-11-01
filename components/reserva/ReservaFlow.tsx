"use client";

import { useState } from "react";
import type { CutSuggestion, CutView, FaceAnalysis } from "@/lib/ai";
import type { Appointment, CutImages, Salon, SalonCatalog, Slot } from "@/lib/types";
import GuidedCapture, { type CapturedPhotos } from "./GuidedCapture";

type Step = "captura" | "analizando" | "elegir" | "detalle" | "reserva" | "listo";
type ImgState = string | "loading" | "error";

/** Corte probado con IA que el cliente agregó a su turno. */
type AttachedCut = {
  name: string;
  description: string;
  images: CutImages;
  retouchWeeks: number;
  notes: string;
};

const TZ = "America/Argentina/Buenos_Aires";
const money = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fullLabel = (iso: string) => `${new Date(iso).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" })} a las ${timeLabel(iso)}`;

const VIEW_LABEL: Record<CutView, string> = { front: "Frente", left: "Perfil izq.", right: "Perfil der." };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error");
  return data as T;
}

async function fetchSlots(slug: string, days?: number): Promise<Slot[]> {
  const qs = new URLSearchParams({ slug, ...(days ? { days: String(days) } : {}) });
  const res = await fetch(`/api/turnos?${qs}`, { cache: "no-store" });
  const data = (await res.json()) as { slots?: Slot[] };
  return (data.slots ?? []).filter((s) => s.available);
}

function CutImage({ state, alt }: { state: ImgState | undefined; alt: string }) {
  if (!state || state === "loading")
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-xs text-neutral-500">Probándote el corte...</span>
      </div>
    );
  if (state === "error") return <div className="flex h-full w-full items-center justify-center bg-surface-2 text-xs text-neutral-500">No se pudo generar</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={state} alt={alt} className="h-full w-full object-cover" />;
}

export default function ReservaFlow({ salon, catalog, initialSlots }: { salon: Salon; catalog: SalonCatalog; initialSlots: Slot[] }) {
  const [step, setStep] = useState<Step>("reserva");
  const [photos, setPhotos] = useState<CapturedPhotos | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [previews, setPreviews] = useState<ImgState[]>([]);
  const [selected, setSelected] = useState(0);
  const [angles, setAngles] = useState<Partial<Record<CutView, ImgState>>>({});
  const [view, setView] = useState<CutView>("front");
  const [wish, setWish] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [attached, setAttached] = useState<AttachedCut | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(initialSlots);
  const [day, setDay] = useState<string | null>(initialSlots[0] ? dayKey(initialSlots[0].start) : null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [retouch, setRetouch] = useState<Appointment | "loading" | "none" | null>(null);

  const cut: CutSuggestion | undefined = analysis?.cuts[selected];
  const availableViews: CutView[] = photos?.left ? ["front", "left", "right"] : ["front"];

  const analyze = async (p: CapturedPhotos, w?: string) => {
    setStep("analizando");
    setError(null);
    try {
      const a = await postJson<FaceAnalysis>("/api/ia/analizar", { slug: salon.slug, front: p.front, wish: w });
      setAnalysis(a);
      setPreviews(a.cuts.map(() => "loading"));
      setStep("elegir");
      a.cuts.forEach((c, i) =>
        postJson<{ image: string }>("/api/ia/corte", { photos: [p.front], prompt: c.imagePrompt, view: "front" })
          .then((r) => r.image)
          .catch(() => "error" as const)
          .then((img) => setPreviews((prev) => prev.map((v, j) => (j === i ? img : v)))),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setStep("reserva");
    }
  };

  const onCaptured = (p: CapturedPhotos) => {
    setPhotos(p);
    analyze(p, description.trim() || undefined);
  };

  const choose = (i: number) => {
    if (!analysis || !photos) return;
    const c = analysis.cuts[i];
    setSelected(i);
    setView("front");
    setStep("detalle");
    const extra: CutView[] = photos.left ? ["left", "right"] : [];
    setAngles(Object.fromEntries(extra.map((v) => [v, "loading"])));
    const refs: Record<CutView, string[]> = {
      front: [photos.front],
      left: [photos.left ?? photos.front],
      right: [photos.right ?? photos.front],
    };
    extra.forEach((v) =>
      postJson<{ image: string }>("/api/ia/corte", { photos: refs[v], prompt: c.imagePrompt, view: v })
        .then((r) => r.image)
        .catch(() => "error" as const)
        .then((img) => setAngles((prev) => ({ ...prev, [v]: img }))),
    );
  };

  const loadSlots = async () => {
    setSlots(null);
    setSlot(null);
    try {
      const list = await fetchSlots(salon.slug);
      setSlots(list);
      setDay((prev) => (prev && list.some((s) => dayKey(s.start) === prev) ? prev : list[0] ? dayKey(list[0].start) : null));
    } catch {
      setSlots([]);
      setError("No pudimos cargar los horarios. Probá de nuevo.");
    }
  };

  const goReserva = () => {
    setError(null);
    setStep("reserva");
    if (!slots) loadSlots();
  };

  const valid = (s: ImgState | undefined) => (s && s !== "loading" && s !== "error" ? s : undefined);

  const attachCut = () => {
    if (!cut || !analysis) return;
    const images: CutImages = {};
    const front = valid(previews[selected]);
    if (front) images.front = front;
    for (const v of ["left", "right"] as const) {
      const img = valid(angles[v]);
      if (img) images[v] = img;
    }
    setAttached({
      name: cut.name,
      description: cut.description,
      images,
      retouchWeeks: cut.retouchWeeks,
      notes: `Cara ${analysis.faceShape}. Pelo: ${analysis.hairType}.`,
    });
    if (catalog.services.some((s) => s.id === cut.serviceId)) setServiceId(cut.serviceId);
    goReserva();
  };

  const tryCut = () => {
    setError(null);
    setStep(analysis ? "elegir" : "captura");
  };

  const customerNote = description.trim();
  const cutDescription = attached
    ? [attached.description, customerNote && `Lo que pidió el cliente: ${customerNote}`].filter(Boolean).join("\n\n")
    : customerNote;

  const book = async (start: string) =>
    (
      await postJson<{ appointment: Appointment }>("/api/turnos", {
        slug: salon.slug,
        serviceId: serviceId || null,
        customerName: name,
        customerPhone: phone,
        start,
        cutName: attached?.name ?? "",
        cutDescription,
        images: attached?.images ?? {},
        notes: attached?.notes ?? "",
      })
    ).appointment;

  const confirm = async () => {
    if (!slot) return;
    setBooking(true);
    setError(null);
    try {
      setAppointment(await book(slot.start));
      setStep("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos reservar. Probá de nuevo.");
      loadSlots();
    } finally {
      setBooking(false);
    }
  };

  const bookRetouch = async () => {
    if (!appointment || !attached) return;
    setRetouch("loading");
    try {
      const weeks = Math.min(Math.max(attached.retouchWeeks, 1), 10);
      const target = new Date(appointment.start).getTime() + weeks * 7 * 86400000;
      const list = await fetchSlots(salon.slug, weeks * 7 + 10);
      const later = list.filter((s) => new Date(s.start).getTime() >= target);
      const sameTime = later.find(
        (s) => timeLabel(s.start) === timeLabel(appointment.start) && new Date(s.start).getTime() < target + 7 * 86400000,
      );
      const pick = sameTime ?? later[0];
      if (!pick) return setRetouch("none");
      setRetouch(await book(pick.start));
    } catch {
      setRetouch("none");
    }
  };

  const daySlots = slots && day ? slots.filter((s) => dayKey(s.start) === day) : [];
  const days = slots ? [...new Set(slots.map((s) => dayKey(s.start)))].slice(0, 8) : [];
  const service = catalog.services.find((s) => s.id === serviceId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="border-b border-neutral-200 pb-4">
        <p className="text-xs uppercase tracking-widest text-accent">Reservá tu turno</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{salon.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {salon.address} · {salon.city}
          {salon.hours && ` · ${salon.hours}`}
        </p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {step === "captura" && (
        <section className="flex flex-col gap-4">
          <button onClick={() => setStep("reserva")} className="self-start text-sm text-neutral-500 hover:text-neutral-900">
            ← Volver
          </button>
          <GuidedCapture onDone={onCaptured} />
        </section>
      )}

      {step === "analizando" && (
        <section className="flex flex-col items-center gap-6 py-16 text-center">
          {photos && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos.front} alt="" className="h-40 w-40 animate-pulse rounded-full object-cover ring-4 ring-accent/60" />
          )}
          <h2 className="text-2xl font-semibold">Analizando tu cara...</h2>
          <p className="text-neutral-500">Forma de cara, tipo de pelo y qué cortes te favorecen.</p>
        </section>
      )}

      {step === "elegir" && analysis && (
        <section className="flex flex-col gap-5">
          <div className="rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-accent">Tu diagnóstico</p>
            <p className="mt-1 text-sm text-neutral-600">
              Cara <b>{analysis.faceShape}</b> · {analysis.hairType}
            </p>
            <p className="mt-2 text-neutral-800">{analysis.summary}</p>
          </div>
          <h2 className="text-2xl font-bold">Elegí tu corte</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {analysis.cuts.map((c, i) => (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={previews[i] === "loading"}
                className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-surface text-left transition hover:border-accent disabled:cursor-wait"
              >
                <div className="aspect-square w-full">
                  <CutImage state={previews[i]} alt={c.name} />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="font-semibold group-hover:text-accent">{c.name}</span>
                  <span className="text-xs text-neutral-500">{c.why}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
            <label className="text-sm text-neutral-600">¿Tenías otra idea? Contale a la IA qué querés</label>
            <div className="flex gap-2">
              <input
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="Ej: más corto a los costados, tipo degradé con barba"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() => photos && wish.trim() && analyze(photos, wish.trim())}
                className="rounded-xl bg-neutral-100 px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-200"
              >
                Probar
              </button>
            </div>
          </div>
          <button onClick={goReserva} className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
            Volver al formulario sin elegir corte
          </button>
        </section>
      )}

      {step === "detalle" && cut && (
        <section className="flex flex-col gap-5">
          <button onClick={() => setStep("elegir")} className="self-start text-sm text-neutral-500 hover:text-neutral-900">
            ← Ver los otros cortes
          </button>
          <h2 className="text-3xl font-bold">{cut.name}</h2>
          <div className="aspect-square w-full overflow-hidden rounded-3xl border border-neutral-200">
            <CutImage state={view === "front" ? previews[selected] : angles[view]} alt={`${cut.name} - ${VIEW_LABEL[view]}`} />
          </div>
          <div className={`grid grid-cols-3 gap-2 ${availableViews.length < 2 ? "hidden" : ""}`}>
            {availableViews.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex flex-col overflow-hidden rounded-xl border text-xs ${view === v ? "border-accent" : "border-neutral-200"}`}
              >
                <div className="aspect-square w-full">
                  <CutImage state={v === "front" ? previews[selected] : angles[v]} alt={VIEW_LABEL[v]} />
                </div>
                <span className="py-1">{VIEW_LABEL[v]}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-accent">Por qué te queda bien</p>
            <p className="mt-2 text-neutral-800">{cut.why}</p>
            <p className="mt-4 text-xs uppercase tracking-widest text-accent">Cómo mantenerlo</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-neutral-600">
              {cut.careTips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-neutral-600">
              Conviene retocarlo cada <b>{cut.retouchWeeks} semanas</b>.
            </p>
          </div>

          <button onClick={attachCut} className="rounded-full bg-accent px-6 py-4 text-lg font-semibold text-white hover:bg-accent-strong">
            Agregar este corte a mi turno
          </button>
        </section>
      )}

      {step === "reserva" && (
        <section className="flex flex-col gap-5">
          <h2 className="text-xl font-semibold">Elegí día y horario</h2>

          {!slots ? (
            <p className="text-sm text-neutral-500">Buscando horarios...</p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500">
              No hay horarios libres en los próximos días.
            </p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d) => {
                  const first = slots.find((s) => dayKey(s.start) === d)!;
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setDay(d);
                        setSlot(null);
                      }}
                      className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm capitalize ${
                        day === d ? "border-accent bg-accent text-white" : "border-neutral-300"
                      }`}
                    >
                      {dayLabel(first.start)}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {daySlots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => setSlot(s)}
                    className={`rounded-xl border py-2 text-sm ${slot?.start === s.start ? "border-accent bg-accent-soft font-semibold text-accent-strong" : "border-neutral-200 hover:border-neutral-400"}`}
                  >
                    {timeLabel(s.start)}
                  </button>
                ))}
              </div>
            </>
          )}

          {catalog.services.length > 0 && (
            <label className="flex flex-col gap-1 text-sm text-neutral-600">
              Servicio (opcional)
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2"
              >
                <option value="">Lo defino en el local</option>
                {catalog.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {money(s.price)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-surface p-4">
            <div>
              <p className="font-semibold">¿Qué corte querés? <span className="text-sm font-normal text-neutral-500">(opcional)</span></p>
              <p className="text-sm text-neutral-500">Describilo con tus palabras, o generá propuestas con IA sobre tu propia cara.</p>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ej: degradé bajo a los costados, arriba largo con textura y la barba prolija"
              className="resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {attached ? (
              <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Corte generado con IA</p>
                    <p className="truncate font-semibold">{attached.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={tryCut} className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-white">
                      Cambiar
                    </button>
                    <button onClick={() => setAttached(null)} className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-white">
                      Quitar
                    </button>
                  </div>
                </div>
                {attached.images.front && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attached.images.front} alt={attached.name} className="aspect-square w-full max-w-xs rounded-xl object-cover" />
                )}
              </div>
            ) : (
              <button
                onClick={tryCut}
                className="flex items-center justify-center gap-2 rounded-xl border border-accent px-4 py-3 text-sm font-semibold text-accent transition hover:bg-accent-soft"
              >
                Generar mi corte con IA
              </button>
            )}
            {!attached && (
              <p className="text-xs text-neutral-500">
                Con IA te sacamos 3 fotos girando la cabeza y te mostramos 3 cortes. Si escribiste una descripción, la usamos como guía. Tus fotos
                solo se usan para generar las propuestas y para que el local vea el corte que elegiste.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="rounded-xl border border-neutral-300 bg-white px-3 py-3 outline-none focus:border-accent"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Tu WhatsApp"
              inputMode="tel"
              className="rounded-xl border border-neutral-300 bg-white px-3 py-3 outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={confirm}
            disabled={!slot || !name.trim() || !phone.trim() || booking}
            className="rounded-full bg-accent px-6 py-4 text-lg font-semibold text-white hover:bg-accent-strong disabled:opacity-40"
          >
            {booking ? "Reservando..." : slot ? `Confirmar ${dayLabel(slot.start)} a las ${timeLabel(slot.start)}` : "Elegí un horario"}
          </button>
        </section>
      )}

      {step === "listo" && appointment && (
        <section className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
          <h2 className="text-3xl font-bold">¡Turno reservado!</h2>
          <p className="text-neutral-600">
            {name.split(" ")[0]}, te esperamos el <b>{fullLabel(appointment.start)}</b> en {salon.address}.
            {service && (
              <>
                {" "}
                Servicio: <b>{service.name}</b>.
              </>
            )}
          </p>
          {attached && (
            <>
              <div className="w-full max-w-xs overflow-hidden rounded-3xl border border-neutral-200">
                {attached.images.front && (
                  <div className="aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attached.images.front} alt={attached.name} className="h-full w-full object-cover" />
                  </div>
                )}
                <p className="p-3 text-sm text-neutral-600">
                  El local ya tiene las fotos de tu <b>{attached.name}</b>.
                </p>
              </div>

              <div className="w-full rounded-2xl border border-accent/40 bg-accent-soft/50 p-4">
                {retouch === null && (
                  <>
                    <p className="text-neutral-800">
                      Este corte se retoca cada <b>{attached.retouchWeeks} semanas</b>. ¿Te dejamos reservado el retoque?
                    </p>
                    <button onClick={bookRetouch} className="mt-3 rounded-full bg-accent px-5 py-2 font-semibold text-white hover:bg-accent-strong">
                      Sí, reservame el retoque
                    </button>
                  </>
                )}
                {retouch === "loading" && <p className="text-neutral-600">Buscando el mejor horario...</p>}
                {retouch === "none" && <p className="text-neutral-600">No encontramos un horario para el retoque todavía. Te escribimos cuando se acerque la fecha.</p>}
                {retouch && typeof retouch === "object" && <p className="text-emerald-700">Retoque reservado para el {fullLabel(retouch.start)}.</p>}
              </div>
            </>
          )}
          <button onClick={() => window.location.reload()} className="text-sm text-neutral-500 underline underline-offset-4">
            Reservar otro turno
          </button>
        </section>
      )}
    </div>
  );
}
