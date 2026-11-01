import { createAppointment, getAvailableSlots, getSalonBySlug } from "@/lib/data";
import type { CutImages } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const salon = await getSalonBySlug(url.searchParams.get("slug") ?? "");
  if (!salon) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const days = Number(url.searchParams.get("days") ?? 6) || 6;
  const slots = await getAvailableSlots(salon.id, Math.min(Math.max(days, 1), 90));
  return Response.json({ slots });
}

type BookingBody = {
  slug: string;
  serviceId?: string | null;
  customerName: string;
  customerPhone: string;
  start: string;
  cutName?: string;
  cutDescription?: string;
  images?: CutImages;
  notes?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as BookingBody;
  const salon = await getSalonBySlug(body.slug);
  if (!salon || !body.customerName?.trim() || !body.customerPhone?.trim())
    return Response.json({ error: "Completá tu nombre y teléfono" }, { status: 400 });
  if (!body.start || Number.isNaN(new Date(body.start).getTime()))
    return Response.json({ error: "Elegí un horario" }, { status: 400 });
  try {
    const appointment = await createAppointment({
      salonId: salon.id,
      serviceId: body.serviceId || null,
      customerName: body.customerName.trim().slice(0, 120),
      customerPhone: body.customerPhone.trim().slice(0, 40),
      start: body.start,
      cutName: (body.cutName ?? "").slice(0, 200),
      cutDescription: (body.cutDescription ?? "").slice(0, 2000),
      images: body.images ?? {},
      notes: (body.notes ?? "").slice(0, 1000),
    });
    return Response.json({ appointment });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "No pudimos reservar" }, { status: 409 });
  }
}
