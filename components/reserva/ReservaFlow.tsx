"use client";

import Link from "next/link";
import { useState } from "react";
import type { CutSuggestion, CutView, FaceAnalysis } from "@/lib/ai";
import type { Appointment, Salon, SalonCatalog, Slot } from "@/lib/types";
import GuidedCapture, { type CapturedPhotos } from "./GuidedCapture";

type Step = "intro" | "captura" | "analizando" | "elegir" | "detalle" | "reserva" | "listo";
type ImgState = string | "loading" | "error";

const TZ = "America/Argentina/Buenos_Aires";
const money = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fullLabel = (iso: string) => `${new Date(iso).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" })} a las ${timeLabel(iso)}`;

const VIEW_LABEL: Record<CutView, string> = { front: "Frente", left: "Perfil izq.", right: "Perfil der.", back: "Nuca" };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error");
  return data as T;
}

function CutImage({ state, alt }: { state: ImgState | undefined; alt: string }) {
  if (!state || state === "loading")
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-xs text-neutral-400">Probándote el corte...</span>
      </div>
    );
  if (state === "error") return <div className="flex h-full w-full items-center justify-center bg-surface text-xs text-neutral-500">No se pudo generar</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={state} alt={alt} className="h-full w-full object-cover" />;
}

export default function ReservaFlow({ salon, catalog }: { salon: Salon; catalog: SalonCatalog }) {
  const [step, setStep] = useState<Step>("intro");
  const [photos, setPhotos] = useState<CapturedPhotos | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [previews, setPreviews] = useState<ImgState[]>([]);
  const [selected, setSelected] = useState(0);
  const [angles, setAngles] = useState<Partial<Record<CutView, ImgState>>>({});
  const [view, setView] = useState<CutView>("front");
  const [wish, setWish] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [retouch, setRetouch] = useState<Appointment | "loading" | "none" | null>(null);
  const [waitlisted, setWaitlisted] = useState(false);

  const cut: CutSuggestion | undefined = analysis?.cuts[selected];
  const stylistName = (id: string) => catalog.stylists.find((s) => s.id === id)?.name ?? "";
  const service = catalog.services.find((s) => s.id === serviceId);
  const availableViews: CutView[] = photos?.left ? ["front", "left", "right", "back"] : ["front", "back"];

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
      setStep("intro");
    }
  };

  const onCaptured = (p: CapturedPhotos) => {
    setPhotos(p);
    analyze(p);
  };

  const choose = (i: number) => {
    if (!analysis || !photos) return;
    const c = analysis.cuts[i];
    setSelected(i);
    setView("front");
    setStep("detalle");
    const extra: CutView[] = photos.left ? ["left", "right", "back"] : ["back"];
    setAngles(Object.fromEntries(extra.map((v) => [v, "loading"])));
    const refs: Record<CutView, string[]> = {
      front: [photos.front],
      left: [photos.left ?? photos.front],
      right: [photos.right ?? photos.front],
      back: [photos.front, photos.left, photos.right].filter((x): x is string => !!x),
    };
    extra.forEach((v) =>
      postJson<{ image: string }>("/api/ia/corte", { photos: refs[v], prompt: c.imagePrompt, view: v })
        .then((r) => r.image)
        .catch(() => "error" as const)
        .then((img) => setAngles((prev) => ({ ...prev, [v]: img }))),
    );
  };

  const loadSlots = async (svc: string, sty: string) => {
    setSlots(null);
    setSlot(null);
    const qs = new URLSearchParams({ slug: salon.slug, serviceId: svc, ...(sty ? { stylistId: sty } : {}) });
    const { slots: list } = (await (await fetch(`/api/turnos?${qs}`)).json()) as { slots: Slot[] };
    setSlots(list);
    setDay(list[0] ? dayKey(list[0].start) : null);
  };

  const goReserva = () => {
    if (!cut) return;
    setServiceId(cut.serviceId);
    setStylistId(cut.stylistId);
    setStep("reserva");
    loadSlots(cut.serviceId, cut.stylistId);
  };

  const images = () => {
    const front = previews[selected];
    const valid = (s: ImgState | undefined) => (s && s !== "loading" && s !== "error" ? s : undefined);
    return { front: valid(front), left: valid(angles.left), right: valid(angles.right), back: valid(angles.back) };
  };

  const book = async (s: Slot) => {
    if (!cut || !analysis) return null;
    return (
      await postJson<{ appointment: Appointment }>("/api/turnos", {
        slug: salon.slug,
        stylistId: s.stylistId,
        serviceId,
        customerName: name,
        customerPhone: phone,
        start: s.start,
        cutName: cut.name,
        cutDescription: cut.description,
        images: images(),
        recommendedProductIds: cut.productIds,
        notes: `Cara ${analysis.faceShape}. Pelo: ${analysis.hairType}.`,
      })
    ).appointment;
  };

  const confirm = async () => {
    if (!slot) return;
    setBooking(true);
    setError(null);
    try {
      setAppointment(await book(slot));
      setStep("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      loadSlots(serviceId, stylistId);
    } finally {
      setBooking(false);
    }
  };

  const joinWaitlist = async () => {
    setError(null);
    try {
      await postJson("/api/turnos", { slug: salon.slug, waitlist: true, serviceId, customerName: name, customerPhone: phone });
      setWaitlisted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const bookRetouch = async () => {
    if (!appointment || !cut) return;
    setRetouch("loading");
    const target = new Date(appointment.start).getTime() + cut.retouchWeeks * 7 * 86400000;
    const qs = new URLSearchParams({ slug: salon.slug, serviceId, stylistId: appointment.stylistId, days: String(cut.retouchWeeks * 7 + 10) });
    const { slots: list } = (await (await fetch(`/api/turnos?${qs}`)).json()) as { slots: Slot[] };
    const later = list.filter((s) => new Date(s.start).getTime() >= target - 86400000);
    const sameTime = later.find((s) => timeLabel(s.start) === timeLabel(appointment.start));
    const pick = sameTime ?? later[0];
    if (!pick) return setRetouch("none");
    try {
      setRetouch(await book(pick));
    } catch {
      setRetouch("none");
    }
  };

  const daySlots = (() => {
    if (!slots || !day) return [];
    const seen = new Map<string, Slot>();
    for (const s of slots.filter((s) => dayKey(s.start) === day)) if (!seen.has(s.start)) seen.set(s.start, s);
    return [...seen.values()];
  })();
  const days = slots ? [...new Set(slots.map((s) => dayKey(s.start)))].slice(0, 8) : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href={`/peluqueria/${salon.slug}`} className="text-sm text-neutral-400 hover:text-neutral-200">
          ← {salon.name}
        </Link>
        <span className="text-xs uppercase tracking-widest text-accent">Probador IA</span>
      </header>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {step === "intro" && (
        <section className="flex flex-col gap-6 pt-6 text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Probate tu próximo corte antes de sentarte en el sillón</h1>
          <p className="text-neutral-400">
            Te sacamos 3 fotos girando la cabeza, la IA analiza tu cara y te muestra 3 cortes que te quedan bien. Elegís uno, lo ves desde todos
            los ángulos y reservás con el peluquero ideal.
          </p>
          <button onClick={() => setStep("captura")} className="rounded-full bg-accent px-6 py-4 text-lg font-semibold text-ink hover:bg-accent-soft">
            Abrir cámara
          </button>
          <p className="text-xs text-neutral-500">Tus fotos solo se usan para generar las propuestas y para que tu peluquero vea el corte elegido.</p>
        </section>
      )}

      {step === "captura" && <GuidedCapture onDone={onCaptured} />}

      {step === "analizando" && (
        <section className="flex flex-col items-center gap-6 py-16 text-center">
          {photos && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos.front} alt="" className="h-40 w-40 animate-pulse rounded-full object-cover ring-4 ring-accent/60" />
          )}
          <h2 className="text-2xl font-semibold">Analizando tu cara...</h2>
          <p className="text-neutral-400">Forma de cara, tipo de pelo y qué cortes del local te favorecen.</p>
        </section>
      )}

      {step === "elegir" && analysis && (
        <section className="flex flex-col gap-5">
          <div className="rounded-2xl border border-neutral-800 bg-surface/60 p-4">
            <p className="text-xs uppercase tracking-widest text-accent">Tu diagnóstico</p>
            <p className="mt-1 text-sm text-neutral-300">
              Cara <b>{analysis.faceShape}</b> · {analysis.hairType}
            </p>
            <p className="mt-2 text-neutral-200">{analysis.summary}</p>
          </div>
          <h2 className="text-2xl font-bold">Elegí tu corte</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {analysis.cuts.map((c, i) => (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={previews[i] === "loading"}
                className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-surface text-left transition hover:border-accent disabled:cursor-wait"
              >
                <div className="aspect-square w-full">
                  <CutImage state={previews[i]} alt={c.name} />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="font-semibold group-hover:text-accent">{c.name}</span>
                  <span className="text-xs text-neutral-400">{c.why}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-800 p-4">
            <label className="text-sm text-neutral-300">¿Tenías otra idea? Contale a la IA qué querés</label>
            <div className="flex gap-2">
              <input
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="Ej: más corto a los costados, tipo degradé con barba"
                className="flex-1 rounded-xl border border-neutral-700 bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() => photos && wish.trim() && analyze(photos, wish.trim())}
                className="rounded-xl bg-neutral-800 px-4 text-sm font-medium hover:bg-neutral-700"
              >
                Probar
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "detalle" && cut && (
        <section className="flex flex-col gap-5">
          <button onClick={() => setStep("elegir")} className="self-start text-sm text-neutral-400 hover:text-neutral-200">
            ← Ver los otros cortes
          </button>
          <h2 className="text-3xl font-bold">{cut.name}</h2>
          <div className="aspect-square w-full overflow-hidden rounded-3xl border border-neutral-800">
            <CutImage state={view === "front" ? previews[selected] : angles[view]} alt={`${cut.name} - ${VIEW_LABEL[view]}`} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {availableViews.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex flex-col overflow-hidden rounded-xl border text-xs ${view === v ? "border-accent" : "border-neutral-800"}`}
              >
                <div className="aspect-square w-full">
                  <CutImage state={v === "front" ? previews[selected] : angles[v]} alt={VIEW_LABEL[v]} />
                </div>
                <span className="py-1">{VIEW_LABEL[v]}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-800 bg-surface/60 p-4">
              <p className="text-xs uppercase tracking-widest text-accent">Por qué te queda bien</p>
              <p className="mt-2 text-neutral-200">{cut.why}</p>
              <p className="mt-3 text-xs uppercase tracking-widest text-accent">Cómo mantenerlo</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-neutral-300">
                {cut.careTips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-neutral-300">
                Conviene retocarlo cada <b>{cut.retouchWeeks} semanas</b>.
              </p>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-surface/60 p-4">
              <p className="text-xs uppercase tracking-widest text-accent">Lo tenemos en el local</p>
              {cut.productIds.length === 0 && <p className="text-sm text-neutral-400">Este corte no necesita productos especiales.</p>}
              {cut.productIds.map((id) => {
                const p = catalog.products.find((x) => x.id === id);
                return (
                  p && (
                    <div key={id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-neutral-400">{p.description}</p>
                      </div>
                      <span className="whitespace-nowrap text-sm text-accent">{money(p.price)}</span>
                    </div>
                  )
                );
              })}
              <p className="mt-auto text-sm text-neutral-300">
                Te recomendamos a <b>{stylistName(cut.stylistId)}</b> para este corte.
              </p>
            </div>
          </div>

          <button onClick={goReserva} className="rounded-full bg-accent px-6 py-4 text-lg font-semibold text-ink hover:bg-accent-soft">
            Reservar este corte
          </button>
        </section>
      )}

      {step === "reserva" && cut && (
        <section className="flex flex-col gap-5">
          <button onClick={() => setStep("detalle")} className="self-start text-sm text-neutral-400 hover:text-neutral-200">
            ← Volver al corte
          </button>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
              <CutImage state={previews[selected]} alt={cut.name} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Reservá tu {cut.name.toLowerCase()}</h2>
              {service && (
                <p className="text-sm text-neutral-400">
                  {service.name} · {service.durationMin} min · {money(service.price)}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Servicio
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  loadSlots(e.target.value, stylistId);
                }}
                className="rounded-xl border border-neutral-700 bg-background px-3 py-2"
              >
                {catalog.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMin} min)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-300">
              Peluquero
              <select
                value={stylistId}
                onChange={(e) => {
                  setStylistId(e.target.value);
                  loadSlots(serviceId, e.target.value);
                }}
                className="rounded-xl border border-neutral-700 bg-background px-3 py-2"
              >
                <option value="">Cualquiera</option>
                {catalog.stylists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.id === cut.stylistId ? " (recomendado)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!slots ? (
            <p className="text-sm text-neutral-400">Buscando horarios...</p>
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
                        day === d ? "border-accent bg-accent text-ink" : "border-neutral-700"
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
                    className={`rounded-xl border py-2 text-sm ${slot?.start === s.start ? "border-accent bg-accent/20 text-accent-soft" : "border-neutral-800 hover:border-neutral-600"}`}
                  >
                    {timeLabel(s.start)}
                  </button>
                ))}
                {daySlots.length === 0 && <p className="col-span-full text-sm text-neutral-400">No hay horarios disponibles.</p>}
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="rounded-xl border border-neutral-700 bg-background px-3 py-3 outline-none focus:border-accent"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Tu WhatsApp"
              inputMode="tel"
              className="rounded-xl border border-neutral-700 bg-background px-3 py-3 outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={confirm}
            disabled={!slot || !name.trim() || !phone.trim() || booking}
            className="rounded-full bg-accent px-6 py-4 text-lg font-semibold text-ink hover:bg-accent-soft disabled:opacity-40"
          >
            {booking ? "Reservando..." : slot ? `Confirmar ${dayLabel(slot.start)} ${timeLabel(slot.start)} con ${stylistName(slot.stylistId)}` : "Elegí un horario"}
          </button>

          {waitlisted ? (
            <p className="text-center text-sm text-emerald-400">Listo, quedaste en la lista de espera. Si se libera un turno te avisamos por WhatsApp.</p>
          ) : (
            <button
              onClick={joinWaitlist}
              disabled={!name.trim() || !phone.trim()}
              className="text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200 disabled:no-underline disabled:opacity-50"
            >
              ¿No te sirve ningún horario? Anotate en la lista de espera
            </button>
          )}
        </section>
      )}

      {step === "listo" && appointment && cut && (
        <section className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-400">✓</div>
          <h2 className="text-3xl font-bold">¡Turno confirmado!</h2>
          <p className="text-neutral-300">
            {name.split(" ")[0]}, te esperamos el <b>{fullLabel(appointment.start)}</b> con <b>{stylistName(appointment.stylistId)}</b> en {salon.address}.
          </p>
          <div className="w-full max-w-xs overflow-hidden rounded-3xl border border-neutral-800">
            <div className="aspect-square">
              <CutImage state={previews[selected]} alt={cut.name} />
            </div>
            <p className="p-3 text-sm text-neutral-300">
              {stylistName(appointment.stylistId)} ya tiene la foto de tu <b>{cut.name}</b> desde todos los ángulos.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-accent/40 bg-accent/5 p-4">
            {retouch === null && (
              <>
                <p className="text-neutral-200">
                  Este corte se retoca cada <b>{cut.retouchWeeks} semanas</b>. ¿Te dejamos reservado el retoque?
                </p>
                <button onClick={bookRetouch} className="mt-3 rounded-full bg-accent px-5 py-2 font-semibold text-ink hover:bg-accent-soft">
                  Sí, reservame el retoque
                </button>
              </>
            )}
            {retouch === "loading" && <p className="text-neutral-300">Buscando el mejor horario...</p>}
            {retouch === "none" && <p className="text-neutral-300">No encontramos un horario para el retoque todavía. Te escribimos cuando se acerque la fecha.</p>}
            {retouch && typeof retouch === "object" && (
              <p className="text-emerald-400">
                Retoque reservado para el {fullLabel(retouch.start)} con {stylistName(retouch.stylistId)}.
              </p>
            )}
          </div>
          <Link href={`/peluqueria/${salon.slug}`} className="text-sm text-neutral-400 underline underline-offset-4">
            Volver a {salon.name}
          </Link>
        </section>
      )}
    </div>
  );
}
