import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSalonBySlug, getSalonCatalog } from "@/lib/data";
import {
  Eyebrow,
  FaceScanArt,
  PrimaryButton,
  SectionTitle,
  Steps,
  formatARS,
  initials,
} from "@/components/landing/ui";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  if (!salon) return { title: "Peluquería no encontrada" };
  return {
    title: `${salon.name} — Reservá tu turno`,
    description: `${salon.tagline}. Reservá tu turno online en ${salon.name}, ${salon.city}. Si querés, probate antes el corte con IA.`,
  };
}

const STEPS = [
  {
    title: "Elegí día y hora",
    text: "Reservar es así de simple: elegís el día, el horario que te queda cómodo, y dejás tu nombre y WhatsApp.",
  },
  {
    title: "Si querés, probate el corte con IA",
    text: "Es opcional. Una selfie guiada de pocos segundos y la IA te muestra tres cortes aplicados sobre vos.",
  },
  {
    title: "Miralo desde todos los ángulos",
    text: "Frente, perfil y nuca, con tips de peinado y cada cuánto conviene volver.",
  },
  {
    title: "Sumalo a tu turno",
    text: "Agregás el corte que te gustó a tu reserva y en el local ven la foto exacta de lo que querés.",
  },
];

export default async function SalonPage({ params }: Props) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  if (!salon) notFound();
  const { services, stylists } = await getSalonCatalog(salon.id);
  const bookHref = `/peluqueria/${slug}/reservar`;
  const igHandle = salon.instagram.replace(/^@/, "");
  const minPrice = services.length ? Math.min(...services.map((s) => s.price)) : null;

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(21,128,61,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_22px,rgba(20,32,26,0.025)_22px_23px)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:pb-24 lg:pt-16">
          <div>
            <div className="flex items-center gap-3 text-sm text-foreground/60">
              <span className="h-px w-8 bg-accent" />
              <span>{salon.city}</span>
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              {salon.name}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-foreground/70 sm:text-xl">{salon.tagline}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryButton href={bookHref} className="w-full sm:w-auto">
                Reservá tu turno
              </PrimaryButton>
              <a
                href="#servicios"
                className="text-center text-sm font-medium text-foreground/60 underline-offset-4 hover:text-accent hover:underline sm:px-4"
              >
                Ver servicios y precios
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-foreground/10 pt-6 text-sm">
              <div>
                <dt className="text-foreground/50">Desde</dt>
                <dd className="mt-1 font-semibold">{minPrice !== null ? formatARS(minPrice) : "—"}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Equipo</dt>
                <dd className="mt-1 font-semibold">{stylists.length} peluqueros</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Reserva</dt>
                <dd className="mt-1 font-semibold">En 2 minutos</dd>
              </div>
            </dl>
          </div>
          <div className="mx-auto hidden w-full max-w-sm sm:block">
            <FaceScanArt />
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-t border-foreground/10 bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle
            eyebrow="Cómo funciona"
            title="Reservás en un minuto. Y si querés, te probás el corte antes"
            subtitle="Probarte el corte con IA es opcional. Si lo hacés, se terminó el “yo te pedí otra cosa”: lo que elegís es lo que ven en el local."
          />
          <div className="mt-10">
            <Steps steps={STEPS} />
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="scroll-mt-6 border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle eyebrow="Servicios" title="Precios claros" />
          <ul className="mt-10 divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-foreground/10 bg-surface">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-base font-semibold sm:text-lg">{s.name}</p>
                  <p className="mt-1 text-sm text-foreground/55">
                    <span className="capitalize">{s.category}</span>
                  </p>
                </div>
                <p className="font-display text-xl font-semibold text-accent sm:text-2xl">{formatARS(s.price)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Equipo */}
      <section className="border-t border-foreground/10 bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle
            eyebrow="El equipo"
            title="Nuestro equipo"
            subtitle="Las personas que te van a atender en el local."
          />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stylists.map((st) => (
              <li key={st.id} className="rounded-2xl border border-foreground/10 bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  {st.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={st.avatarUrl} alt={st.name} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-full border border-accent/50 bg-gradient-to-br from-accent-soft to-surface-2 font-display text-xl font-semibold text-accent">
                      {initials(st.name)}
                    </span>
                  )}
                  <div>
                    <p className="text-lg font-semibold">{st.name}</p>
                    <p className="text-sm text-foreground/55">{st.bio}</p>
                  </div>
                </div>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {st.specialties.map((sp) => (
                    <li
                      key={sp}
                      className="rounded-full border border-foreground/15 px-3 py-1 text-xs font-medium capitalize text-foreground/75"
                    >
                      {sp}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Info */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-20">
          <div>
            <SectionTitle eyebrow="Dónde estamos" title={`Vení a ${salon.name}`} subtitle={salon.description} />
          </div>
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2">
            <InfoItem label="Dirección">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.address}, ${salon.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent"
              >
                {salon.address}
                <span className="block text-foreground/55">{salon.city}</span>
              </a>
            </InfoItem>
            <InfoItem label="Horarios">{salon.hours}</InfoItem>
            <InfoItem label="Teléfono">
              <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="hover:text-accent">
                {salon.phone}
              </a>
            </InfoItem>
            <InfoItem label="Instagram">
              <a
                href={`https://instagram.com/${igHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent"
              >
                {salon.instagram}
              </a>
            </InfoItem>
          </dl>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent-soft via-surface to-surface p-8 sm:p-12">
            <Eyebrow>Tu próximo corte</Eyebrow>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Reservá tu turno en un minuto.
            </h2>
            <p className="mt-3 max-w-xl text-foreground/65">Si querés, antes te probás el corte con IA. Es opcional.</p>
            <PrimaryButton href={bookHref} className="mt-8 w-full sm:w-auto">
              Reservá tu turno
            </PrimaryButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-foreground/45 sm:flex-row sm:px-8">
          <p>
            {salon.name} · Reservas con{" "}
            <Link href="/" className="text-foreground/70 hover:text-accent">
              Cortesuli
            </Link>
          </p>
          <Link href="/admin" className="text-xs hover:text-accent">
            ¿Sos el dueño? Ingresá
          </Link>
        </div>
      </footer>
    </main>
  );
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-surface p-6">
      <dt className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{label}</dt>
      <dd className="mt-2 text-base leading-relaxed">{children}</dd>
    </div>
  );
}
