import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin, getSalonCatalog, listAppointments } from "@/lib/data";
import type { Appointment } from "@/lib/types";
import { logoutAction } from "../actions";
import AppointmentRow, { type AppointmentRowData } from "@/components/admin/AppointmentRow";
import StylistsManager from "@/components/admin/StylistsManager";
import { Logo } from "@/components/landing/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agenda · Panel de peluquerías" };

const TZ = "America/Argentina/Buenos_Aires";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

type Tab = "turnos" | "historial" | "peluqueros";
const TABS: { key: Tab; label: string }[] = [
  { key: "turnos", label: "Turnos" },
  { key: "historial", label: "Historial" },
  { key: "peluqueros", label: "Peluqueros" },
];

// Página dinámica: se renderiza por request, la hora actual es estable dentro del render.
function requestTime() {
  return Date.now();
}

function dayLabel(key: string, now: number) {
  const today = dayKey(new Date(now).toISOString());
  if (key === today) return "Hoy";
  if (key === dayKey(new Date(now + 86400000).toISOString())) return "Mañana";
  if (key === dayKey(new Date(now - 86400000).toISOString())) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${key}T12:00:00Z`))
    .replace(/[.,]/g, "");
}

function groupByDay(items: AppointmentRowData[]) {
  const groups = new Map<string, AppointmentRowData[]>();
  for (const a of items) {
    const key = dayKey(a.start);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups.entries()];
}

const UNASSIGNED = "sin-asignar";

export default async function AdminPanelPage({ searchParams }: { searchParams: Promise<{ tab?: string; peluquero?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin");
  const { salon } = admin;
  const { tab: rawTab, peluquero } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === rawTab) ? (rawTab as Tab) : "turnos";

  const [appointments, catalog] = await Promise.all([listAppointments(salon.id), getSalonCatalog(salon.id)]);
  const services = new Map(catalog.services.map((s) => [s.id, s.name]));
  const stylists = new Map(catalog.stylists.map((s) => [s.id, s.name]));

  const now = requestTime();
  const todayKey = dayKey(new Date(now).toISOString());
  const toRow = (a: Appointment): AppointmentRowData => ({
    id: a.id,
    start: a.start,
    time: timeLabel(a.start),
    customerName: a.customerName,
    customerPhone: a.customerPhone,
    serviceName: a.serviceId ? (services.get(a.serviceId) ?? "") : "",
    stylistId: a.stylistId,
    stylistName: a.stylistId ? (stylists.get(a.stylistId) ?? "") : "",
    cutName: a.cutName,
    cutDescription: a.cutDescription,
    images: a.images,
  });

  const pending = appointments.filter((a) => a.status === "pendiente").map(toRow);
  const done = appointments
    .filter((a) => a.status === "completado")
    .sort((a, b) => b.start.localeCompare(a.start))
    .map(toRow);
  const todayCount = pending.filter((a) => dayKey(a.start) === todayKey).length;
  const stylistOptions = catalog.stylists.map((s) => ({ id: s.id, name: s.name }));

  const filter = peluquero && (peluquero === UNASSIGNED || stylists.has(peluquero)) ? peluquero : "";
  const matches = (a: AppointmentRowData) => !filter || (filter === UNASSIGNED ? !a.stylistId : a.stylistId === filter);
  const filterHref = (value: string) => `/admin/panel?tab=${tab}${value ? `&peluquero=${value}` : ""}`;
  const filterOptions = [{ id: "", name: "Todos" }, ...stylistOptions, { id: UNASSIGNED, name: "Sin asignar" }];
  const visiblePending = pending.filter(matches);
  const visibleDone = done.filter(matches);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="h-5 w-px bg-neutral-200" />
          <div>
            <h1 className="text-base font-semibold leading-tight">{salon.name}</h1>
            <p className="text-xs text-neutral-500">
              {todayCount} {todayCount === 1 ? "turno" : "turnos"} hoy · {pending.length} {pending.length === 1 ? "pendiente" : "pendientes"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <a href={`/peluqueria/${salon.slug}`} className="rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100">
            Página pública
          </a>
          <form action={logoutAction}>
            <button className="rounded-lg px-3 py-1.5 text-neutral-600 hover:bg-neutral-100">Salir</button>
          </form>
        </div>
      </header>

      <nav className="mt-6 flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => {
          const count = t.key === "turnos" ? pending.length : t.key === "historial" ? done.length : catalog.stylists.length;
          return (
            <Link
              key={t.key}
              href={`/admin/panel?tab=${t.key}${filter && t.key !== "peluqueros" ? `&peluquero=${filter}` : ""}`}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? "border-accent text-accent" : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {t.label} <span className="text-xs font-normal text-neutral-400">{count}</span>
            </Link>
          );
        })}
      </nav>

      {tab !== "peluqueros" && catalog.stylists.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">Peluquero:</span>
          {filterOptions.map((o) => (
            <Link
              key={o.id || "todos"}
              href={filterHref(o.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === o.id ? "border-accent bg-accent text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {o.name}
            </Link>
          ))}
        </div>
      )}

      {tab === "turnos" && (
        <section className="mt-6 space-y-8">
          {visiblePending.length === 0 && <Empty text={filter ? "No hay turnos pendientes para este filtro." : "No hay turnos pendientes."} />}
          {groupByDay(visiblePending).map(([key, items]) => (
            <div key={key}>
              <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wide ${key < todayKey ? "text-amber-600" : "text-neutral-500"}`}>
                {dayLabel(key, now)}
                {key < todayKey && " · sin completar"}
              </h2>
              <ul className="space-y-3">
                {items.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} stylists={stylistOptions} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "historial" && (
        <section className="mt-6 space-y-8">
          {visibleDone.length === 0 && <Empty text={filter ? "No hay turnos completados para este filtro." : "Todavía no hay turnos completados."} />}
          {groupByDay(visibleDone).map(([key, items]) => (
            <div key={key}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{dayLabel(key, now)}</h2>
              <ul className="space-y-3">
                {items.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} stylists={stylistOptions} readOnly />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "peluqueros" && (
        <section className="mt-6">
          <StylistsManager stylists={catalog.stylists.map((s) => ({ id: s.id, name: s.name, specialties: s.specialties }))} />
        </section>
      )}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">{text}</p>;
}
