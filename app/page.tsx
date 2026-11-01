import Image from "next/image";
import Link from "next/link";
import { Eyebrow, Logo, PrimaryButton, SecondaryButton, SectionTitle, Steps } from "@/components/landing/ui";
import HowItWorks, { PROPOSALS } from "@/components/landing/HowItWorks";
import SalonSearch from "@/components/landing/SalonSearch";
import antes from "@/public/landing/antes.jpg";

const ADMIN_HREF = "/admin";

const PAINS = [
  {
    title: "Mensajes que se pierden",
    text: "El WhatsApp explota un sábado a la mañana y el turno que no contestaste a tiempo se fue a la peluquería de la otra cuadra.",
  },
  {
    title: "Pedidos mal anotados",
    text: "“Cortito a los costados” significa algo distinto para cada uno. Termina en “yo te pedí otra cosa” y un cliente que no vuelve.",
  },
  {
    title: "Huecos en la agenda",
    text: "Alguien cancela a último momento y el sillón queda vacío, mientras otro cliente se cansó de esperar y se fue.",
  },
];

const FEATURES = [
  {
    title: "Probador de cortes con IA",
    text: "El cliente se saca una selfie girando la cabeza y ve 3 cortes sugeridos sobre su propia cara, desde frente, perfil y nuca.",
  },
  {
    title: "Agenda con la foto del corte",
    text: "Cada turno llega con la imagen exacta de lo que el cliente quiere. Tu peluquero sabe qué hacer antes de que se siente.",
  },
  {
    title: "Turno con la duración correcta",
    text: "Un corte no dura lo mismo que un color. La reserva bloquea el tiempo real y la asigna a quien mejor hace ese corte.",
  },
  {
    title: "Lista de espera automática",
    text: "Si alguien cancela, le ofrecemos el lugar al siguiente de la lista. El hueco se llena solo.",
  },
  {
    title: "Recomendaciones que venden",
    text: "Tips de peinado, los productos que vendés en tu local y cuándo volver. Más ticket promedio, más visitas.",
  },
  {
    title: "Tu página propia, lista hoy",
    text: "Una página con tus servicios, precios y equipo. La compartís en Instagram o la pegás en un QR en la vidriera.",
  },
];

const STATS = [
  { value: "1 de 4", label: "consultas por WhatsApp quedan sin respuesta a tiempo" },
  { value: "-60%", label: "de malentendidos cuando el peluquero ve la foto del corte" },
  { value: "+15%", label: "de ocupación llenando cancelaciones desde la lista de espera" },
];

const OWNER_STEPS = [
  { title: "Cargás tu salón", text: "Servicios, precios, duraciones y tu equipo con sus especialidades." },
  { title: "Compartís tu link", text: "En la bio de Instagram, en WhatsApp o con un QR en el espejo." },
  { title: "Tus clientes se prueban el corte", text: "Selfie guiada, 3 propuestas con IA y vista desde todos los ángulos." },
  { title: "Vos atendés, no anotás", text: "La agenda se llena sola, con la foto de cada corte y la lista de espera." },
];

export default function Home() {
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-5 text-sm">
          <a href="#como-funciona" className="hidden text-foreground/70 hover:text-accent sm:inline">
            Cómo funciona
          </a>
          <a href="#buscar" className="hidden text-foreground/70 hover:text-accent sm:inline">
            Buscar peluquería
          </a>
          <Link
            href={ADMIN_HREF}
            className="rounded-full border border-foreground/15 bg-surface px-4 py-2 font-medium hover:border-accent/60 hover:text-accent"
          >
            Ingresar
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(21,128,61,0.14),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:pt-16">
          <div>
            <Eyebrow>Turnos con IA para peluquerías y barberías</Eyebrow>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Que se prueben el corte <span className="italic text-accent">antes</span> de sentarse.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/70">
              Cortesuli reemplaza el ida y vuelta por WhatsApp: tus clientes se ven con el corte puesto, lo eligen y reservan su turno en
              minutos. Vos recibís cada turno con la foto exacta de lo que quieren.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href={ADMIN_HREF} className="w-full sm:w-auto">
                Gestionar mis turnos
              </PrimaryButton>
              <SecondaryButton href="#como-funciona" className="w-full sm:w-auto">
                Ver cómo funciona
              </SecondaryButton>
            </div>
          </div>

          {/* Visual: antes + propuestas */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-foreground/10 bg-surface shadow-xl shadow-accent/10">
              <Image src={PROPOSALS[0].src} alt={PROPOSALS[0].name} fill priority sizes="(min-width: 1024px) 24rem, 90vw" placeholder="blur" className="object-cover" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 p-3 shadow">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">Propuesta de la IA</p>
                <p className="text-sm font-semibold text-ink">{PROPOSALS[0].name}</p>
              </div>
            </div>
            <div className="absolute -left-6 top-8 w-28 overflow-hidden rounded-2xl border-4 border-white bg-surface shadow-lg sm:-left-10 sm:w-32">
              <div className="relative aspect-square">
                <Image src={antes} alt="Antes" fill sizes="128px" className="object-cover" />
              </div>
              <p className="bg-white py-1 text-center text-[11px] font-semibold text-ink">Antes</p>
            </div>
            <div className="absolute -right-4 top-1/2 flex flex-col gap-2 sm:-right-8">
              {PROPOSALS.slice(1).map((p) => (
                <div key={p.name} className="relative h-16 w-16 overflow-hidden rounded-xl border-[3px] border-white shadow-md sm:h-20 sm:w-20">
                  <Image src={p.src} alt={p.name} fill sizes="80px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-6 border-t border-foreground/10 bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle
            eyebrow="Cómo funciona"
            title="De la selfie al turno, en cuatro pasos"
            subtitle="Tu cliente ve el corte en su cara antes de sentarse en el sillón. Lo que elige es lo que tu peluquero ve."
          />
          <div className="mt-10">
            <HowItWorks />
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle
            eyebrow="El problema"
            title="Tu peluquería pierde clientes antes de que crucen la puerta"
            subtitle="Los turnos a mano, por WhatsApp o por teléfono, se pierden, se anotan mal y dejan gente esperando."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-foreground/10 bg-surface p-6 shadow-sm">
                <span className="block h-1 w-10 rounded-full bg-accent" />
                <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/65">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-foreground/10 bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <dl className="grid gap-8 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label} className="border-l-2 border-accent/40 pl-5">
                <dt className="font-display text-5xl font-semibold text-accent">{s.value}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-foreground/70">{s.label}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-xs text-foreground/50">Cifras ilustrativas, a modo de ejemplo.</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle eyebrow="La solución" title="Todo lo que tu mostrador necesita, en un link" />
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface p-6 sm:p-7">
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/65">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para dueños */}
      <section className="border-t border-foreground/10 bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle eyebrow="Para dueños" title="Arrancás en una tarde" />
          <div className="mt-10">
            <Steps steps={OWNER_STEPS} />
          </div>
        </div>
      </section>

      {/* CTA dueños */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent-soft via-surface to-surface p-8 sm:p-12">
            <Eyebrow>¿Tenés una peluquería?</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Entrá al panel y gestioná tus turnos, tu agenda y tu lista de espera en un solo lugar.
            </h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href={ADMIN_HREF} className="w-full sm:w-auto">
                Gestionar mis turnos
              </PrimaryButton>
            </div>
          </div>
        </div>
      </section>

      {/* Buscador de peluquerías (discreto) */}
      <section id="buscar" className="scroll-mt-6 border-t border-foreground/10">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
          <h2 className="text-lg font-semibold">¿Buscás una peluquería?</h2>
          <p className="mt-1 text-sm text-foreground/60">Encontrá la tuya por nombre o por barrio, probate el corte y reservá.</p>
          <div className="mt-5">
            <SalonSearch />
          </div>
        </div>
      </section>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-foreground/55 sm:flex-row sm:px-8">
          <Logo />
          <p>Hecho en Buenos Aires para peluquerías de verdad.</p>
        </div>
      </footer>
    </main>
  );
}
