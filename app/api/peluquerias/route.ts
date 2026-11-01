import { searchSalons } from "@/lib/data";

// GET /api/peluquerias?q=&location=&lat=&lng=  → { results: (Salon & { distanceKm?: number })[] }
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const location = url.searchParams.get("location") ?? undefined;
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const hasNear =
    url.searchParams.has("lat") &&
    url.searchParams.has("lng") &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  try {
    const results = await searchSalons({ q, location, near: hasNear ? { lat, lng } : undefined });
    return Response.json({ results });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No pudimos buscar peluquerías" }, { status: 500 });
  }
}
