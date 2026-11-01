import "server-only";

type Coords = { lat: number; lng: number };

async function search(q: string): Promise<Coords | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Cortesuli/1.0 (alta de peluquerias; https://dwday-125150057.online)", "Accept-Language": "es" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    const lat = Number(data[0]?.lat);
    const lng = Number(data[0]?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) && data.length > 0 ? { lat, lng } : null;
  } catch {
    return null;
  }
}

/**
 * Geocodifica la dirección con OpenStreetMap Nominatim (para la búsqueda "cerca mío").
 * Si la dirección exacta no aparece, prueba solo con el barrio/ciudad. Ante errores o demoras (>5 s) devuelve null.
 */
export async function geocodeAddress(address: string, city: string): Promise<Coords | null> {
  const a = address.trim();
  const c = city.trim();
  if (!a && !c) return null;
  const exact = await search([a, c, "Argentina"].filter(Boolean).join(", "));
  if (exact || !a || !c) return exact;
  return search(`${c}, Argentina`);
}
