import { addToWaitlist, createAppointment, getAvailableSlots, getSalonBySlug } from "@/lib/data";
import type { CutImages } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const salon = await getSalonBySlug(url.searchParams.get("slug") ?? "");
  const serviceId = url.searchParams.get("serviceId");
  if (!salon || !serviceId) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const days = Number(url.searchParams.get("days") ?? 6);
  const slots = await getAvailableSlots(salon.id, serviceId, url.searchParams.get("stylistId") ?? undefined, Math.min(days, 40));
  return Response.json({ slots });
}

type BookingBody = {
  slug: string;
  waitlist?: boolean;
  stylistId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  start: string;
  cutName: string;
  cutDescription: string;
  images: CutImages;
  recommendedProductIds: string[];
  notes: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as BookingBody;
  const salon = await getSalonBySlug(body.slug);
  if (!salon || !body.customerName?.trim() || !body.customerPhone?.trim())
    return Response.json({ error: "Completá tu nombre y teléfono" }, { status: 400 });
  try {
    if (body.waitlist) {
      const entry = await addToWaitlist({
        salonId: salon.id,
        customerName: body.customerName.trim(),
        customerPhone: body.customerPhone.trim(),
        serviceId: body.serviceId || null,
      });
      return Response.json({ waitlist: entry });
    }
    const appointment = await createAppointment({
      salonId: salon.id,
      stylistId: body.stylistId,
      serviceId: body.serviceId,
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone.trim(),
      start: body.start,
      cutName: body.cutName,
      cutDescription: body.cutDescription,
      images: body.images ?? {},
      recommendedProductIds: body.recommendedProductIds ?? [],
      notes: body.notes ?? "",
    });
    return Response.json({ appointment });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "No pudimos reservar" }, { status: 409 });
  }
}
