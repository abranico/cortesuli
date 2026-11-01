import { redirect } from "next/navigation";
import { getCurrentAdmin, getSalonCatalog, listAppointments, listWaitlist } from "@/lib/data";
import { logoutAction } from "../actions";
import AppointmentCard, { type AppointmentView } from "@/components/admin/AppointmentCard";
import { Logo } from "@/components/landing/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agenda · Panel de peluquerías" };

const TZ = "America/Argentina/Buenos_Aires";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// Página dinámica: se renderiza por request, la hora actual es estable dentro del render.
function requestTime() {
  return Date.now();
}

function dayLabel(key: string, todayKey: string, tomorrowKey: string) {
  const label = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${key}T12:00:00Z`),
  );
  if (key === todayKey) return `Hoy · ${label}`;
  if (key === tomorrowKey) return `Mañana · ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function AdminPanelPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin");
  const { salon } = admin;

  const [appointments, waitlist, catalog] = await Promise.all([
    listAppointments(salon.id),
    listWaitlist(salon.id),
    getSalonCatalog(salon.id),
  ]);

  const services = new Map(catalog.services.map((s) => [s.id, s]));
  const stylists = new Map(catalog.stylists.map((s) => [s.id, s]));
  const products = new Map(catalog.products.map((p) => [p.id, p]));

  const now = requestTime();
  const todayKey = dayKey(new Date(now).toISOString());
  const tomorrowKey = dayKey(new Date(now + 86400000).toISOString());
  const confirmed = appointments.filter((a) => a.status === "confirmado");

  const metrics = [
    { label: "Turnos de hoy", value: String(confirmed.filter((a) => dayKey(a.start) === todayKey).length) },
    {
      label: "Reservados con IA (7 días)",
      value: String(
        confirmed.filter((a) => a.cutName && now - new Date(a.createdAt).getTime() <= 7 * 86400000).length,
      ),
    },
    {
      label: "Facturación estimada",
      value: money(confirmed.reduce((sum, a) => sum + (services.get(a.serviceId)?.price ?? 0), 0)),
    },
    { label: "Productos recomendados", value: String(confirmed.reduce((n, a) => n + a.recommendedProductIds.length, 0)) },
  ];

  // Agenda: desde hoy en adelante, agrupada por día.
  const upcoming = appointments.filter((a) => dayKey(a.start) >= todayKey);
  const groups = new Map<string, AppointmentView[]>();
  for (const a of upcoming) {
    const key = dayKey(a.start);
    const view: AppointmentView = {
      ...a,
      serviceName: services.get(a.serviceId)?.name ?? "Servicio",
      servicePrice: services.get(a.serviceId)?.price ?? 0,
      stylistName: stylists.get(a.stylistId)?.name ?? "Estilista",
      productNames: a.recommendedProductIds.map((id) => products.get(id)?.name).filter((n): n is string => Boolean(n)),
    };
    groups.set(key, [...(groups.get(key) ?? []), view]);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Logo className="mb-6" />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">Panel de la peluquería</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{salon.name}</h1>
          <p className="text-sm text-neutral-500">
            {salon.address} · {salon.city}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/peluqueria/${salon.slug}`}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition hover:bg-neutral-100"
          >
            Ver página pública
          </a>
          <span className="hidden text-sm text-neutral-500 sm:inline">{admin.email}</span>
          <form action={logoutAction}>
            <button className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium transition hover:bg-neutral-200">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-4">
            <p className="text-xs text-neutral-500">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-accent">{m.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <h2 className="text-lg font-semibold">Agenda</h2>
          {groups.size === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
              Todavía no hay turnos próximos.
            </p>
          )}
          <div className="mt-4 space-y-8">
            {[...groups.entries()].map(([key, items]) => (
              <div key={key}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  {dayLabel(key, todayKey, tomorrowKey)}{" "}
                  <span className="font-normal normal-case text-neutral-500">
                    · {items.filter((i) => i.status === "confirmado").length} turnos
                  </span>
                </h3>
                <div className="space-y-3">
                  {items.map((a) => (
                    <AppointmentCard key={a.id} appointment={a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="text-lg font-semibold">Lista de espera</h2>
          <p className="mt-1 text-xs text-neutral-500">Cuando cancelás un turno, se le ofrece al primero de la lista.</p>
          <ul className="mt-4 space-y-2">
            {waitlist.length === 0 && <li className="text-sm text-neutral-500">Nadie en espera.</li>}
            {waitlist.map((w) => (
              <li key={w.id} className="rounded-xl border border-neutral-200 bg-white shadow-sm p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{w.customerName}</p>
                  <span
                    className={
                      w.status === "esperando"
                        ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        : "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                    }
                  >
                    {w.status === "esperando" ? "Esperando" : "Turno ofrecido"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {w.customerPhone}
                  {w.serviceId && services.get(w.serviceId) ? ` · ${services.get(w.serviceId)!.name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
