// Métricas del panel calculadas en memoria (escala de demo: cientos de turnos por salón).
import { dayKey, openSlotDays, TZ, type OpeningRules } from "./schedule";
import type { Appointment, SalonCatalog } from "./types";

export type Bar = { label: string; value: number };

export type SalonMetrics = {
  upcoming7: number;
  occupancyPct: number;
  bookedSlots7: number;
  capacity7: number;
  completedMonth: number;
  revenueMonth: number;
  monthLabel: string;
  completedPrevMonth: number;
  revenuePrevMonth: number;
  prevMonthLabel: string;
  byHour: Bar[];
  byWeekday: Bar[];
  topServices: Bar[];
  stylistRanking: Bar[];
  online: number;
  manual: number;
  total: number;
};

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeMetrics(appointments: Appointment[], catalog: SalonCatalog, rules: OpeningRules, now: number): SalonMetrics {
  const capacity = Math.max(catalog.stylists.length, 1);
  const weekEnd = now + 7 * 86400000;
  const pending = appointments.filter((a) => a.status === "pendiente");
  const completed = appointments.filter((a) => a.status === "completado");

  // Próximos 7 días: turnos pendientes y ocupación sobre los cupos de los horarios abiertos que faltan.
  const upcoming = pending.filter((a) => {
    const t = new Date(a.start).getTime();
    return t >= now && t < weekEnd;
  });
  const perSlot = new Map<number, number>();
  for (const a of upcoming) {
    const t = new Date(a.start).getTime();
    perSlot.set(t, (perSlot.get(t) ?? 0) + 1);
  }
  const futureStarts = openSlotDays(rules, now, 8)
    .flatMap((d) => d.starts)
    .filter((t) => t >= now && t < weekEnd);
  const capacity7 = futureStarts.length * capacity;
  const bookedSlots7 = futureStarts.reduce((sum, t) => sum + Math.min(perSlot.get(t) ?? 0, capacity), 0);

  // Este mes (hora argentina).
  const month = dayKey(now).slice(0, 7);
  const prices = new Map(catalog.services.map((s) => [s.id, s.price]));
  const doneMonth = completed.filter((a) => dayKey(a.start).slice(0, 7) === month);
  const revenueMonth = doneMonth.reduce((sum, a) => sum + (a.serviceId ? (prices.get(a.serviceId) ?? 0) : 0), 0);
  const monthName = (d: Date) => new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(d);
  const [y, mo] = month.split("-").map(Number);
  const monthLabel = monthName(new Date(Date.UTC(y, mo - 1, 15)));
  const prevDate = new Date(Date.UTC(y, mo - 2, 15));
  const prevMonth = prevDate.toISOString().slice(0, 7);
  const donePrev = completed.filter((a) => dayKey(a.start).slice(0, 7) === prevMonth);
  const revenuePrevMonth = donePrev.reduce((sum, a) => sum + (a.serviceId ? (prices.get(a.serviceId) ?? 0) : 0), 0);

  // Horarios pico: todas las horas de apertura, aunque tengan 0.
  const hours = new Map<number, number>();
  for (let h = rules.openHour; h < rules.closeHour; h++) hours.set(h, 0);
  for (const a of appointments) {
    const h = Number(hourFmt.format(new Date(a.start)));
    hours.set(h, (hours.get(h) ?? 0) + 1);
  }
  const byHour = [...hours.entries()].sort((a, b) => a[0] - b[0]).map(([h, value]) => ({ label: `${h}h`, value }));

  // Días más pedidos, de lunes a domingo (solo días abiertos o con turnos).
  const days = new Array(7).fill(0) as number[];
  for (const a of appointments) days[WD_EN.indexOf(weekdayFmt.format(new Date(a.start)))]++;
  const byWeekday = [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => rules.openDays.includes(d) || days[d] > 0)
    .map((d) => ({ label: WEEKDAYS[d], value: days[d] }));

  const count = (items: Appointment[], key: (a: Appointment) => string | null, names: Map<string, string>) => {
    const m = new Map<string, number>();
    for (const a of items) {
      const k = key(a);
      if (k && names.has(k)) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, value]) => ({ label: names.get(k)!, value }));
  };
  const serviceNames = new Map(catalog.services.map((s) => [s.id, s.name]));
  const stylistNames = new Map(catalog.stylists.map((s) => [s.id, s.name]));
  const ranked = count(completed, (a) => a.stylistId, stylistNames);
  // Los peluqueros sin turnos completados también aparecen (con 0) para que el ranking sea completo.
  const stylistRanking = [...ranked, ...catalog.stylists.filter((s) => !ranked.some((r) => r.label === s.name)).map((s) => ({ label: s.name, value: 0 }))];

  const manual = appointments.filter((a) => a.source === "manual").length;
  return {
    upcoming7: upcoming.length,
    occupancyPct: capacity7 ? Math.round((bookedSlots7 / capacity7) * 100) : 0,
    bookedSlots7,
    capacity7,
    completedMonth: doneMonth.length,
    revenueMonth,
    monthLabel,
    completedPrevMonth: donePrev.length,
    revenuePrevMonth,
    prevMonthLabel: monthName(prevDate),
    byHour,
    byWeekday,
    topServices: count(appointments, (a) => a.serviceId, serviceNames),
    stylistRanking,
    online: appointments.length - manual,
    manual,
    total: appointments.length,
  };
}
