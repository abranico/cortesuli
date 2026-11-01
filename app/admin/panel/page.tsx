import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentAdmin, getSalonCatalog, listAppointments } from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { dayKey, dayLabel, openSlotDays, shortDate, timeLabel } from "@/lib/schedule";
import type { Appointment } from "@/lib/types";
import { logoutAction } from "../actions";
import AppointmentRow, { type AppointmentRowData } from "@/components/admin/AppointmentRow";
import Metrics from "@/components/admin/Metrics";
import NewAppointmentButton, { type ManualDay } from "@/components/admin/NewAppointmentButton";
import QrCard from "@/components/admin/QrCard";
import StylistsManager from "@/components/admin/StylistsManager";
import { Logo } from "@/components/landing/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agenda · Panel de peluquerías" };

type Tab = "turnos" | "historial" | "peluqueros" | "metricas" | "qr";
const TABS: { key: Tab; label: string }[] = [
  { key: "turnos", label: "Turnos" },
  { key: "historial", label: "Historial" },
  { key: "peluqueros", label: "Peluqueros" },
  { key: "metricas", label: "Métricas" },
  { key: "qr", label: "Mi QR" },
];
const FILTERABLE: Tab[] = ["turnos", "historial"];

// Página dinámica: se renderiza por request, la hora actual es estable dentro del render.
function requestTime() {
  return Date.now();
}

function groupByDay(items: AppointmentRowData[]) {
  const groups = new Map<string, AppointmentRowData[]>();
  for (const a of items) {
    const key = dayKey(a.start);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups.entries()];
}

/** Origen público del sitio para el QR: siempre el dominio de producción (se puede pisar con NEXT_PUBLIC_SITE_URL). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://dwday-125150057.online";

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
  const todayKey = dayKey(now);
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
    // Las reservas online guardan en notas el análisis de la IA (ya resumido en el corte); solo mostramos las notas manuales.
    notes: a.source === "manual" ? a.notes : "",
    manual: a.source === "manual",
  });

  const pendingAppointments = appointments.filter((a) => a.status === "pendiente");
  const pending = pendingAppointments.map(toRow);
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

  // Horarios para cargar turnos a mano: 3 semanas, con lugares libres y peluqueros ocupados por bloque.
  const capacity = Math.max(catalog.stylists.length, 1);
  const manualDays: ManualDay[] =
    tab === "turnos"
      ? openSlotDays(salon, now, 21).map((d) => ({
          key: d.key,
          label: dayLabel(d.key, now) === shortDate(d.key) ? shortDate(d.key) : `${dayLabel(d.key, now)} · ${shortDate(d.key)}`,
          slots: d.starts.map((t) => {
            const iso = new Date(t).toISOString();
            const here = pendingAppointments.filter((a) => a.start === iso);
            return {
              start: iso,
              label: timeLabel(t),
              remaining: Math.max(capacity - here.length, 0),
              busyStylists: here.map((a) => a.stylistId).filter((x): x is string => !!x),
            };
          }),
        }))
      : [];

  const metrics = tab === "metricas" ? computeMetrics(appointments, catalog, salon, now) : null;

  let qr: { url: string; svg: string; png: string } | null = null;
  if (tab === "qr") {
    const url = `${SITE_URL}/peluqueria/${salon.slug}`;
    const opts = { margin: 1, errorCorrectionLevel: "M" as const, color: { dark: "#14201a", light: "#ffffff" } };
    const [svg, png] = await Promise.all([QRCode.toString(url, { ...opts, type: "svg" }), QRCode.toDataURL(url, { ...opts, width: 1024 })]);
    qr = { url, svg, png };
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
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

      <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 sm:mx-0 sm:px-0 print:hidden">
        {TABS.map((t) => {
          const count = t.key === "turnos" ? pending.length : t.key === "historial" ? done.length : t.key === "peluqueros" ? catalog.stylists.length : null;
          return (
            <Link
              key={t.key}
              href={`/admin/panel?tab=${t.key}${filter && FILTERABLE.includes(t.key) ? `&peluquero=${filter}` : ""}`}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? "border-accent text-accent" : "border-transparent text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {t.label} {count !== null && <span className="text-xs font-normal text-neutral-400">{count}</span>}
            </Link>
          );
        })}
      </nav>

      {FILTERABLE.includes(tab) && (catalog.stylists.length > 0 || tab === "turnos") && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {catalog.stylists.length > 0 && (
              <>
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
              </>
            )}
          </div>
          {tab === "turnos" && (
            <NewAppointmentButton
              days={manualDays}
              services={catalog.services.map((s) => ({ id: s.id, name: s.name, price: s.price }))}
              stylists={stylistOptions}
            />
          )}
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

      {metrics && (
        <section className="mt-6">
          <Metrics m={metrics} />
        </section>
      )}

      {qr && (
        <section className="mt-6">
          <QrCard salonName={salon.name} url={qr.url} svg={qr.svg} png={qr.png} fileName={`qr-${salon.slug}.png`} />
        </section>
      )}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">{text}</p>;
}
