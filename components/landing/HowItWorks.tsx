import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import antes from "@/public/landing/antes.jpg";
import corte1 from "@/public/landing/corte-1.jpg";
import corte2 from "@/public/landing/corte-2.jpg";
import corte3 from "@/public/landing/corte-3.jpg";
import perfil from "@/public/landing/perfil.jpg";

export const PROPOSALS: { src: StaticImageData; name: string; note: string }[] = [
  { src: corte1, name: "Pompadour con laterales cortos", note: "Suma altura y estiliza la cara" },
  { src: corte2, name: "Texturizado con volumen", note: "Movimiento natural, fácil de peinar" },
  { src: corte3, name: "Buzz cut prolijo", note: "Cero mantenimiento diario" },
];

function StepCard({ n, title, text, children }: { n: number; title: string; text: string; children: ReactNode }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-3xl border border-foreground/10 bg-surface shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">{children}</div>
      <div className="flex flex-1 flex-col p-5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">{n}</span>
        <h3 className="mt-3 text-lg font-semibold leading-snug">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">{text}</p>
      </div>
    </li>
  );
}

const photo = "object-cover";
const sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

/** Paso a paso para el cliente, ilustrado con fotos: antes → propuestas de la IA. */
export default function HowItWorks() {
  return (
    <div className="space-y-12">
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StepCard n={1} title="Selfie girando la cabeza" text="Una selfie guiada de pocos segundos: de frente y de cada perfil, como el Face ID del celu.">
          <Image src={antes} alt="Selfie de frente dentro de la guía de captura" fill sizes={sizes} placeholder="blur" className={photo} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[82%] w-[52%] rounded-[50%] border-[3px] border-white/90" style={{ boxShadow: "0 0 0 9999px rgba(20,32,26,0.35)" }} />
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {["Frente", "Izq.", "Der."].map((l, i) => (
              <span key={l} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${i === 0 ? "bg-accent text-white" : "bg-white/85 text-ink"}`}>
                {l}
              </span>
            ))}
          </div>
        </StepCard>

        <StepCard n={2} title="La IA analiza tu cara y propone 3 cortes" text="Mira la forma de tu cara y tu tipo de pelo, y te muestra tres cortes aplicados sobre vos.">
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-[1fr_auto] gap-1 p-1">
            <div className="relative col-span-3 overflow-hidden rounded-md">
              <Image src={antes} alt="Foto original" fill sizes={sizes} className="object-cover object-[50%_30%]" />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink">Antes</span>
              <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">Cara ovalada · pelo lacio</span>
            </div>
            {PROPOSALS.map((p) => (
              <div key={p.name} className="relative aspect-square overflow-hidden rounded-md">
                <Image src={p.src} alt={p.name} fill sizes="120px" className="object-cover" />
              </div>
            ))}
          </div>
        </StepCard>

        <StepCard n={3} title="Lo ves desde todos los ángulos" text="De frente y de perfil, con tips para mantenerlo y cada cuánto retocarlo.">
          <Image src={perfil} alt="Vista de perfil del corte" fill sizes={sizes} placeholder="blur" className={photo} />
          <div className="absolute left-3 top-3 flex gap-1">
            {["Frente", "Perfil"].map((l) => (
              <span key={l} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${l === "Perfil" ? "bg-accent text-white" : "bg-white/85 text-ink"}`}>
                {l}
              </span>
            ))}
          </div>
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/95 p-2.5 text-[11px] leading-snug text-ink shadow">
            <p className="font-semibold text-accent">Recomendaciones</p>
            <p>Peinalo con los dedos · retoque cada 5 semanas</p>
          </div>
        </StepCard>

        <StepCard n={4} title="Reservás tu turno" text="Elegís día y horario. Si te probaste un corte, el local recibe la foto exacta.">
          <div className="absolute inset-0 flex flex-col justify-center gap-3 bg-gradient-to-br from-accent-soft to-surface p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                <Image src={corte1} alt="" fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 text-xs">
                <p className="truncate font-semibold text-ink">Pompadour con laterales cortos</p>
                <p className="text-foreground/60">Corte agregado a tu turno</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-medium">
              {["10:00", "10:30", "11:00", "11:30"].map((t) => (
                <span key={t} className={`rounded-lg border py-1 ${t === "11:00" ? "border-accent bg-accent text-white" : "border-foreground/15 bg-white text-ink"}`}>
                  {t}
                </span>
              ))}
            </div>
            <span className="rounded-full bg-accent py-2 text-center text-xs font-semibold text-white">Confirmar sábado 11:00</span>
          </div>
        </StepCard>
      </ol>

      {/* Antes → propuestas de la IA */}
      <div className="rounded-3xl border border-foreground/10 bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Antes → propuestas de la IA</p>
            <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Una foto, tres cortes para elegir</h3>
          </div>
          <p className="text-xs text-foreground/50">Propuestas generadas por la IA de Cortesuli a partir de una sola foto.</p>
        </div>
        <div className="mt-6 grid items-center gap-4 lg:grid-cols-[1fr_auto_3fr]">
          <figure className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl lg:max-w-none">
            <Image src={antes} alt="Foto antes del corte" fill sizes="(min-width: 1024px) 22vw, 80vw" placeholder="blur" className="object-cover" />
            <figcaption className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink">Antes</figcaption>
          </figure>
          <div className="flex items-center justify-center text-accent" aria-hidden>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-xl font-semibold">
              <span className="rotate-90 lg:rotate-0">&rarr;</span>
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROPOSALS.map((p, i) => (
              <li key={p.name} className="overflow-hidden rounded-2xl border border-foreground/10 bg-surface">
                <div className="relative aspect-square">
                  <Image src={p.src} alt={p.name} fill sizes="(min-width: 640px) 22vw, 90vw" placeholder="blur" className="object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">Propuesta {i + 1}</span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-foreground/60">{p.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
