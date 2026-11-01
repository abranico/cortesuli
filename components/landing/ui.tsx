import Link from "next/link";
import type { ReactNode } from "react";

export function formatARS(value: number): string {
  return `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-white shadow-sm shadow-accent/30">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M8.1 8.1 20 20M8.1 15.9 20 4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Corte<span className="text-accent">suli</span>
      </span>
    </Link>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{children}</p>
  );
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base leading-relaxed text-foreground/70">{subtitle}</p> : null}
    </div>
  );
}

export function PrimaryButton({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-12px] shadow-accent/70 transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${className}`}
    >
      {children}
      <span aria-hidden className="transition group-hover:translate-x-1">
        &rarr;
      </span>
    </Link>
  );
}

export function SecondaryButton({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full border border-foreground/15 bg-surface px-6 py-4 text-base font-medium text-foreground/90 transition hover:border-accent/60 hover:text-accent ${className}`}
    >
      {children}
    </Link>
  );
}

export type Step = { title: string; text: string };

export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-surface p-6 shadow-sm">
          <span className="font-display text-5xl font-semibold text-accent/30">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="mt-4 text-lg font-semibold leading-snug">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/65">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Ilustración tipográfica de un rostro con guía de escaneo tipo Face ID. */
export function FaceScanArt({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-square w-full max-w-sm ${className}`} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(21,128,61,0.18),transparent_65%)]" />
      <div className="absolute inset-[8%] rounded-full border border-dashed border-accent/40" />
      <div className="absolute inset-[16%] rounded-full border border-foreground/10" />
      <div className="absolute inset-x-[30%] top-[22%] bottom-[18%] rounded-[45%] border-2 border-accent/70 bg-gradient-to-b from-accent/10 to-transparent" />
      <div className="absolute inset-x-[30%] top-[18%] h-[14%] rounded-t-full bg-gradient-to-b from-accent/60 to-accent/10" />
      {["top-[6%] left-1/2 -translate-x-1/2", "bottom-[6%] left-1/2 -translate-x-1/2", "left-[6%] top-1/2 -translate-y-1/2", "right-[6%] top-1/2 -translate-y-1/2"].map((pos) => (
        <span key={pos} className={`absolute h-2 w-2 rounded-full bg-accent ${pos}`} />
      ))}
      <div className="absolute inset-x-[12%] top-1/2 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
    </div>
  );
}
