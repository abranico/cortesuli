import type { ReactNode } from "react";
import type { Bar, SalonMetrics } from "@/lib/metrics";
import { formatARS } from "@/components/landing/ui";

export default function Metrics({ m }: { m: SalonMetrics }) {
  const onlinePct = m.total ? Math.round((m.online / m.total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Próximos 7 días" value={String(m.upcoming7)} hint={m.upcoming7 === 1 ? "turno reservado" : "turnos reservados"} />
        <Stat
          label="Ocupación"
          value={`${m.occupancyPct}%`}
          hint={m.capacity7 ? `${m.bookedSlots7} de ${m.capacity7} lugares` : "sin horarios abiertos"}
          bar={m.occupancyPct}
        />
        <Stat
          label={`Completados en ${m.monthLabel}`}
          value={String(m.completedMonth)}
          hint={`${m.prevMonthLabel}: ${m.completedPrevMonth} ${m.completedPrevMonth === 1 ? "turno" : "turnos"}`}
        />
        <Stat
          label={`Facturación de ${m.monthLabel}`}
          value={formatARS(m.revenueMonth)}
          hint={`estimada · ${m.prevMonthLabel}: ${formatARS(m.revenuePrevMonth)}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Horarios pico" subtitle="Turnos por hora del día">
          <Columns bars={m.byHour} />
        </Card>
        <Card title="Días más pedidos" subtitle="Turnos por día de la semana">
          <Columns bars={m.byWeekday} />
        </Card>
        <Card title="Servicios más pedidos">
          <Rows bars={m.topServices} empty="Todavía no hay turnos con servicio elegido." />
        </Card>
        <Card title="Ranking de peluqueros" subtitle="Turnos completados">
          <Rows bars={m.stylistRanking} empty="Cargá peluqueros para ver el ranking." />
        </Card>
      </div>

      <Card title="Reservas online vs. cargadas a mano" subtitle="Todos los turnos">
        {m.total === 0 ? (
          <EmptyChart text="Todavía no hay turnos." />
        ) : (
          <div>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
              <div className="bg-accent" style={{ width: `${onlinePct}%` }} />
              <div className="bg-neutral-300" style={{ width: `${100 - onlinePct}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                Online <strong className="tabular-nums">{m.online}</strong>
                <span className="text-neutral-400">({onlinePct}%)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />A mano <strong className="tabular-nums">{m.manual}</strong>
                <span className="text-neutral-400">({100 - onlinePct}%)</span>
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, hint, bar }: { label: string; value: string; hint: string; bar?: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-neutral-500 first-letter:uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(bar, 100)}%` }} />
        </div>
      )}
      <p className="mt-1 text-xs text-neutral-400">{hint}</p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-neutral-400">{text}</p>;
}

function Columns({ bars }: { bars: Bar[] }) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  if (max === 0) return <EmptyChart text="Todavía no hay turnos." />;
  return (
    <div className="flex h-36 items-end gap-1">
      {bars.map((b) => (
        <div key={b.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${b.value}`}>
          <span className="text-[10px] tabular-nums text-neutral-500">{b.value || ""}</span>
          <div className="flex min-h-0 w-full flex-1 items-end">
            <div
              className={`w-full rounded-t-md ${b.value === max ? "bg-accent" : "bg-accent/35"}`}
              style={{ height: `${Math.max((b.value / max) * 100, b.value ? 4 : 1)}%` }}
            />
          </div>
          <span className="truncate text-[10px] text-neutral-500">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function Rows({ bars, empty }: { bars: Bar[]; empty: string }) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  if (bars.length === 0) return <EmptyChart text={empty} />;
  return (
    <ol className="space-y-2.5">
      {bars.slice(0, 6).map((b, i) => (
        <li key={`${b.label}-${i}`} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">
              <span className="mr-1.5 text-xs text-neutral-400">{i + 1}.</span>
              {b.label}
            </span>
            <span className="tabular-nums text-neutral-500">{b.value}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${max ? (b.value / max) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
