import Link from "next/link";
import {
  Eyebrow,
  FaceScanArt,
  Logo,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  Steps,
} from "@/components/landing/ui";

const DEMO_HREF = "/peluqueria/navaja-y-tijera";

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
    text: "El cliente se graba girando la cabeza y ve 3 cortes sugeridos sobre su propia cara, desde frente, perfil y nuca.",
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
    text: "Una landing con tus servicios, precios y equipo. La compartís en Instagram o la pegás en un QR en la vidriera.",
  },
];

const STATS = [
  { value: "1 de 4", label: "consultas por WhatsApp quedan sin respuesta a tiempo" },
  { value: "-60%", label: "de malentendidos cuando el peluquero ve la foto del corte" },
  { value: "+15%", label: "de ocupación llenando cancelaciones desde la lista de espera" },
];

const HOW = [
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
          <Link href={DEMO_HREF} className="hidden text-foreground/70 hover:text-accent sm:inline">
            Demo
          </Link>
          <Link
            href="/admin"
            className="rounded-full border border-foreground/15 px-4 py-2 font-medium hover:border-accent/60 hover:text-accent"
          >
            Ingresar
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(214,160,79,0.18),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:pt-16">
          <div>
            <Eyebrow>Turnos con IA para peluquerías y barberías</Eyebrow>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Que se prueben el corte <span className="italic text-accent">antes</span> de sentarse.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/70">
              Espejo reemplaza el ida y vuelta por WhatsApp: tus clientes se ven con el corte puesto, eligen, y reservan con el
              peluquero ideal. Vos recibís el turno con la foto exacta de lo que quieren.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href={DEMO_HREF} className="w-full sm:w-auto">
                Ver demo: Navaja &amp; Tijera
              </PrimaryButton>
              <SecondaryButton href="/admin" className="w-full sm:w-auto">
                Ir al panel del dueño
              </SecondaryButton>
            </div>
          </div>
          <div className="mx-auto w-full max-w-xs sm:max-w-sm">
            <FaceScanArt />
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="border-t border-foreground/10 bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle
            eyebrow="El problema"
            title="Tu peluquería pierde clientes antes de que crucen la puerta"
            subtitle="Los turnos a mano, por WhatsApp o por teléfono, se pierden, se anotan mal y dejan gente esperando."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-foreground/10 bg-surface p-6">
                <span className="block h-1 w-10 rounded-full bg-accent" />
                <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/60">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <dl className="grid gap-8 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label} className="border-l border-accent/40 pl-5">
                <dt className="font-display text-5xl font-semibold text-accent">{s.value}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-foreground/65">{s.label}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-xs text-foreground/40">Cifras ilustrativas, a modo de ejemplo.</p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-foreground/10 bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle eyebrow="La solución" title="Todo lo que tu mostrador necesita, en un link" />
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-surface p-6 sm:p-7">
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/60">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <SectionTitle eyebrow="Cómo funciona" title="Arrancás en una tarde" />
          <div className="mt-10">
            <Steps steps={HOW} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-foreground/10">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/20 via-surface to-surface p-8 sm:p-12">
            <Eyebrow>Probalo como cliente</Eyebrow>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
              Entrá a Navaja &amp; Tijera, una barbería de Palermo, y reservá como lo haría tu cliente.
            </h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href={DEMO_HREF} className="w-full sm:w-auto">
                Ver demo: Navaja &amp; Tijera
              </PrimaryButton>
              <SecondaryButton href="/admin" className="w-full sm:w-auto">
                Ver el panel del dueño
              </SecondaryButton>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-foreground/45 sm:flex-row sm:px-8">
          <Logo />
          <p>Hecho en Buenos Aires para peluquerías de verdad.</p>
        </div>
      </footer>
    </main>
  );
}
