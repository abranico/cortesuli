import "server-only";
import { createAnonClient, createClient } from "./supabase/server";
import type {
  Appointment,
  CutImages,
  NewAppointment,
  NewWaitlistEntry,
  Product,
  Salon,
  SalonCatalog,
  SalonSearchQuery,
  SalonSearchResult,
  Service,
  Slot,
  Stylist,
  WaitlistEntry,
} from "./types";

// Capa de datos sobre Supabase. Funciones públicas usan el cliente anónimo; las de admin usan la sesión (RLS).

const IMAGE_BUCKET = "cortes";
// Argentina: UTC-3 fijo (sin horario de verano).
const TZ_OFFSET_MIN = -180;

/* ---------------------------------- mappers --------------------------------- */

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));
const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

function mapSalon(r: Row): Salon {
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    tagline: str(r.tagline),
    description: str(r.description),
    address: str(r.address),
    city: str(r.city),
    phone: str(r.phone),
    instagram: str(r.instagram),
    hours: str(r.hours),
    coverImageUrl: (r.cover_image_url as string | null) ?? null,
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
  };
}

function mapStylist(r: Row): Stylist {
  return {
    id: str(r.id),
    salonId: str(r.salon_id),
    name: str(r.name),
    bio: str(r.bio),
    specialties: arr(r.specialties),
    avatarUrl: (r.avatar_url as string | null) ?? null,
  };
}

function mapService(r: Row): Service {
  return {
    id: str(r.id),
    salonId: str(r.salon_id),
    name: str(r.name),
    category: r.category as Service["category"],
    durationMin: Number(r.duration_min),
    price: Number(r.price),
  };
}

function mapProduct(r: Row): Product {
  return {
    id: str(r.id),
    salonId: str(r.salon_id),
    name: str(r.name),
    description: str(r.description),
    price: Number(r.price),
    tags: arr(r.tags),
  };
}

function mapAppointment(r: Row): Appointment {
  return {
    id: str(r.id),
    salonId: str(r.salon_id),
    stylistId: str(r.stylist_id),
    serviceId: str(r.service_id),
    customerName: str(r.customer_name),
    customerPhone: str(r.customer_phone),
    start: new Date(str(r.start_at)).toISOString(),
    end: new Date(str(r.end_at)).toISOString(),
    status: r.status as Appointment["status"],
    cutName: str(r.cut_name),
    cutDescription: str(r.cut_description),
    images: (r.images as CutImages | null) ?? {},
    recommendedProductIds: arr(r.recommended_product_ids),
    notes: str(r.notes),
    createdAt: new Date(str(r.created_at)).toISOString(),
  };
}

function mapWaitlist(r: Row): WaitlistEntry {
  return {
    id: str(r.id),
    salonId: str(r.salon_id),
    customerName: str(r.customer_name),
    customerPhone: str(r.customer_phone),
    serviceId: (r.service_id as string | null) ?? null,
    status: r.status as WaitlistEntry["status"],
    createdAt: new Date(str(r.created_at)).toISOString(),
  };
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "error desconocido"}`);
}

/* --------------------------------- públicas --------------------------------- */

export async function getSalonBySlug(slug: string): Promise<Salon | null> {
  const { data, error } = await createAnonClient().from("salons").select("*").eq("slug", slug).maybeSingle();
  if (error) fail("getSalonBySlug", error);
  return data ? mapSalon(data) : null;
}

/** Saca comodines de LIKE y caracteres reservados del filtro `or` de PostgREST. */
function likeTerm(v: string): string {
  return `%${v.replace(/[\\%_,()"*]/g, " ").replace(/\s+/g, " ").trim()}%`;
}

const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Búsqueda pública de peluquerías por nombre, barrio/ciudad y/o cercanía (ordena por distancia si hay `near`). */
export async function searchSalons(query: SalonSearchQuery): Promise<SalonSearchResult[]> {
  const q = query.q?.trim().slice(0, 80) ?? "";
  const location = query.location?.trim().slice(0, 80) ?? "";
  const near = query.near && Number.isFinite(query.near.lat) && Number.isFinite(query.near.lng) ? query.near : undefined;

  let req = createAnonClient().from("salons").select("*");
  if (q) req = req.ilike("name", likeTerm(q));
  if (location) {
    const term = likeTerm(location);
    req = req.or(`address.ilike."${term}",city.ilike."${term}"`);
  }
  const { data, error } = await req.order("name").limit(50);
  if (error) fail("searchSalons", error);

  let salons: SalonSearchResult[] = (data ?? []).map(mapSalon);
  if (salons.length === 0 && (q || location)) {
    // Fallback sin acentos ("cordoba" encuentra "Córdoba"): pocos salones, filtramos en memoria.
    const all = await createAnonClient().from("salons").select("*").order("name").limit(500);
    if (all.error) fail("searchSalons", all.error);
    const fq = fold(q);
    const fl = fold(location);
    salons = (all.data ?? [])
      .map(mapSalon)
      .filter((s) => (!fq || fold(s.name).includes(fq)) && (!fl || fold(`${s.address} ${s.city}`).includes(fl)));
  }
  if (!near) return salons.slice(0, 12);
  return salons
    .map((s) => (s.lat != null && s.lng != null ? { ...s, distanceKm: haversineKm(near, { lat: s.lat, lng: s.lng }) } : s))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, 12);
}

export async function getSalonCatalog(salonId: string): Promise<SalonCatalog> {
  const sb = createAnonClient();
  const [st, sv, pr] = await Promise.all([
    sb.from("stylists").select("*").eq("salon_id", salonId).order("sort"),
    sb.from("services").select("*").eq("salon_id", salonId).order("sort"),
    sb.from("products").select("*").eq("salon_id", salonId).order("sort"),
  ]);
  if (st.error) fail("getSalonCatalog", st.error);
  if (sv.error) fail("getSalonCatalog", sv.error);
  if (pr.error) fail("getSalonCatalog", pr.error);
  return {
    stylists: (st.data ?? []).map(mapStylist),
    services: (sv.data ?? []).map(mapService),
    products: (pr.data ?? []).map(mapProduct),
  };
}

export async function getAvailableSlots(salonId: string, serviceId: string, stylistId?: string, days = 6): Promise<Slot[]> {
  const sb = createAnonClient();
  const [salonRes, serviceRes, stylistsRes] = await Promise.all([
    sb.from("salons").select("open_days, open_hour, close_hour, step_min").eq("id", salonId).maybeSingle(),
    sb.from("services").select("duration_min").eq("id", serviceId).eq("salon_id", salonId).maybeSingle(),
    sb.from("stylists").select("id").eq("salon_id", salonId).order("sort"),
  ]);
  if (!salonRes.data || !serviceRes.data) return [];
  const openDays = (salonRes.data.open_days as number[]) ?? [2, 3, 4, 5, 6];
  const openHour = Number(salonRes.data.open_hour);
  const closeHour = Number(salonRes.data.close_hour);
  const step = Number(salonRes.data.step_min) || 30;
  const duration = Number(serviceRes.data.duration_min);
  const stylistIds = (stylistsRes.data ?? []).map((s) => String(s.id)).filter((id) => !stylistId || id === stylistId);

  const now = Date.now();
  const nowLocal = new Date(now + TZ_OFFSET_MIN * 60000);
  const baseDay = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate());
  const totalDays = days + 2;
  const from = new Date(baseDay - TZ_OFFSET_MIN * 60000).toISOString();
  const to = new Date(baseDay + totalDays * 86400000 - TZ_OFFSET_MIN * 60000).toISOString();

  const { data: busyData, error } = await sb.rpc("get_busy_slots", { p_salon_id: salonId, p_from: from, p_to: to });
  if (error) fail("getAvailableSlots", error);
  const busy = ((busyData ?? []) as Row[]).map((b) => ({
    stylistId: str(b.stylist_id),
    start: new Date(str(b.start_at)).getTime(),
    end: new Date(str(b.end_at)).getTime(),
  }));

  const slots: Slot[] = [];
  for (let d = 0; d < totalDays; d++) {
    const dayUtc = baseDay + d * 86400000;
    if (!openDays.includes(new Date(dayUtc).getUTCDay())) continue;
    for (let m = openHour * 60; m + duration <= closeHour * 60; m += step) {
      const start = dayUtc + (m - TZ_OFFSET_MIN) * 60000;
      const end = start + duration * 60000;
      if (start < now) continue;
      for (const id of stylistIds) {
        const clash = busy.some((b) => b.stylistId === id && b.start < end && b.end > start);
        if (!clash) slots.push({ stylistId: id, start: new Date(start).toISOString(), end: new Date(end).toISOString() });
      }
    }
  }
  return slots;
}

async function uploadImages(salonId: string, images: CutImages): Promise<CutImages> {
  const sb = createAnonClient();
  const folder = `${salonId}/${crypto.randomUUID()}`;
  const out: CutImages = {};
  await Promise.all(
    (Object.entries(images) as [keyof CutImages, string | undefined][]).map(async ([key, value]) => {
      if (!value) return;
      if (/^https?:\/\//i.test(value)) {
        out[key] = value;
        return;
      }
      const match = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(value);
      if (!match) return;
      const contentType = match[1].toLowerCase();
      const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const path = `${folder}/${key}.${ext}`;
      const { error } = await sb.storage
        .from(IMAGE_BUCKET)
        .upload(path, Buffer.from(match[2], "base64"), { contentType, upsert: false });
      if (error) fail("Subida de imagen", error);
      out[key] = sb.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    }),
  );
  return out;
}

export async function createAppointment(input: NewAppointment): Promise<Appointment> {
  const images = await uploadImages(input.salonId, input.images ?? {});
  const { data, error } = await createAnonClient().rpc("book_appointment", {
    p_salon_id: input.salonId,
    p_stylist_id: input.stylistId,
    p_service_id: input.serviceId,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_start: new Date(input.start).toISOString(),
    p_cut_name: input.cutName ?? "",
    p_cut_description: input.cutDescription ?? "",
    p_images: images,
    p_recommended_product_ids: input.recommendedProductIds ?? [],
    p_notes: input.notes ?? "",
  });
  if (error) {
    // Errores de negocio ("Ese horario ya fue tomado", "Servicio inexistente") se propagan tal cual.
    if (error.code === "P0001") throw new Error(error.message);
    if (error.code === "23P01") throw new Error("Ese horario ya fue tomado");
    fail("createAppointment", error);
  }
  const row = (Array.isArray(data) ? data[0] : data) as Row;
  return mapAppointment(row);
}

export async function addToWaitlist(input: NewWaitlistEntry): Promise<WaitlistEntry> {
  const entry: WaitlistEntry = {
    ...input,
    serviceId: input.serviceId ?? null,
    id: crypto.randomUUID(),
    status: "esperando",
    createdAt: new Date().toISOString(),
  };
  // El cliente anónimo puede insertar pero no leer: no usamos .select().
  const { error } = await createAnonClient().from("waitlist").insert({
    id: entry.id,
    salon_id: entry.salonId,
    customer_name: entry.customerName,
    customer_phone: entry.customerPhone,
    service_id: entry.serviceId,
    status: entry.status,
    created_at: entry.createdAt,
  });
  if (error) fail("addToWaitlist", error);
  return entry;
}

/* ---------------------------------- admin ----------------------------------- */

export type AdminContext = { userId: string; email: string; salon: Salon };

/** Admin logueado + su peluquería (vía salon_admins). null si no hay sesión o no es admin. */
export async function getCurrentAdmin(): Promise<AdminContext | null> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("salon_admins").select("salon_id, salons(*)").eq("user_id", user.id).limit(1).maybeSingle();
  const salonRow = data?.salons as unknown as Row | Row[] | null | undefined;
  const salon = Array.isArray(salonRow) ? salonRow[0] : salonRow;
  if (!salon) return null;
  return { userId: user.id, email: user.email ?? "", salon: mapSalon(salon) };
}

export async function listAppointments(salonId: string): Promise<Appointment[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("appointments").select("*").eq("salon_id", salonId).order("start_at");
  if (error) fail("listAppointments", error);
  return (data ?? []).map(mapAppointment);
}

export async function cancelAppointment(id: string): Promise<{ appointment: Appointment; offeredTo: WaitlistEntry | null }> {
  const sb = await createClient();
  const { data, error } = await sb.from("appointments").update({ status: "cancelado" }).eq("id", id).select("*").maybeSingle();
  if (error) fail("cancelAppointment", error);
  if (!data) throw new Error("Turno inexistente");
  const appointment = mapAppointment(data);

  const { data: waiting } = await sb
    .from("waitlist")
    .select("*")
    .eq("salon_id", appointment.salonId)
    .eq("status", "esperando")
    .order("created_at");
  const candidates = (waiting ?? []).map(mapWaitlist);
  const pick =
    candidates.find((w) => w.serviceId === appointment.serviceId) ??
    candidates.find((w) => w.serviceId === null) ??
    candidates[0] ??
    null;

  let offeredTo: WaitlistEntry | null = null;
  if (pick) {
    const { data: upd } = await sb
      .from("waitlist")
      .update({ status: "notificado" })
      .eq("id", pick.id)
      .eq("status", "esperando")
      .select("*")
      .maybeSingle();
    if (upd) offeredTo = mapWaitlist(upd);
  }
  return { appointment, offeredTo };
}

export async function listWaitlist(salonId: string): Promise<WaitlistEntry[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("waitlist").select("*").eq("salon_id", salonId).order("created_at");
  if (error) fail("listWaitlist", error);
  return (data ?? []).map(mapWaitlist);
}
