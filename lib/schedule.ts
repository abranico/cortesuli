// Helpers puros de agenda (sin dependencias de servidor): días hábiles y bloques de 30 minutos en hora argentina.

export const TZ = "America/Argentina/Buenos_Aires";
/** Argentina: UTC-3 fijo (sin horario de verano). */
export const TZ_OFFSET_MIN = -180;
export const SLOT_MIN = 30;
const DAY_MS = 86400000;

export type OpeningRules = { openDays: number[]; openHour: number; closeHour: number };

/** "YYYY-MM-DD" del día en Argentina. */
export const dayKey = (iso: string | number | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));

export const timeLabel = (iso: string | number | Date) =>
  new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** Medianoche argentina del día de `now`, expresada como "día UTC" (para iterar sin líos de zona). */
function localDayStart(now: number) {
  const local = new Date(now + TZ_OFFSET_MIN * 60000);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

export type SlotDay = { key: string; weekday: number; starts: number[] };

/**
 * Días abiertos desde hoy (inclusive) durante `days` días corridos, con el inicio (ms UTC) de cada bloque.
 * Descarta los bloques que ya terminaron (el bloque en curso se incluye, para turnos de último momento).
 */
export function openSlotDays(rules: OpeningRules, now: number, days: number): SlotDay[] {
  const base = localDayStart(now);
  const out: SlotDay[] = [];
  for (let d = 0; d < days; d++) {
    const dayUtc = base + d * DAY_MS;
    const weekday = new Date(dayUtc).getUTCDay();
    if (!rules.openDays.includes(weekday)) continue;
    const starts: number[] = [];
    for (let m = rules.openHour * 60; m + SLOT_MIN <= rules.closeHour * 60; m += SLOT_MIN) {
      const start = dayUtc + (m - TZ_OFFSET_MIN) * 60000;
      if (start + SLOT_MIN * 60000 <= now) continue;
      starts.push(start);
    }
    if (starts.length) out.push({ key: new Date(dayUtc).toISOString().slice(0, 10), weekday, starts });
  }
  return out;
}

export function dayLabel(key: string, now: number) {
  const today = dayKey(now);
  if (key === today) return "Hoy";
  if (key === dayKey(now + DAY_MS)) return "Mañana";
  if (key === dayKey(now - DAY_MS)) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${key}T12:00:00Z`))
    .replace(/[.,]/g, "");
}
