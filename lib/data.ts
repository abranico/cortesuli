import "server-only";
import { createAnonClient, createClient } from "./supabase/server";
import type {
  Appointment,
  CutImages,
  ManualAppointment,
  NewAppointment,
  Salon,
  SalonCatalog,
  SalonSearchQuery,
  SalonSearchResult,
  Service,
  Slot,
  Stylist,
} from "./types";

// Capa de datos sobre Supabase. Funciones públicas usan el cliente anónimo; las de admin usan la sesión (RLS).

const IMAGE_BUCKET = "cortes";
// Argentina: UTC-3 fijo (sin horario de verano).
const TZ_OFFSET_MIN = -180;
/** Todos los turnos duran lo mismo: bloques fijos de 30 minutos. */
export const SLOT_MIN = 30;

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
    openDays: Array.isArray(r.open_days) ? r.open_days.map(Number) : [2, 3, 4, 5, 6],
    openHour: r.open_hour == null ? 10 : Number(r.open_hour),
    closeHour: r.close_hour == null ? 20 : Number(r.close_hour),
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
    price: Number(r.price),
  };
}

function mapAppointment(r: Row): Appointment {
  return {
    id: str(r.id),
    salonId: str(r.salon_id),
    stylistId: (r.stylist_id as string | null) ?? null,
    serviceId: (r.service_id as string | null) ?? null,
    customerName: str(r.customer_name),
    customerPhone: str(r.customer_phone),
    start: new Date(str(r.start_at)).toISOString(),
    status: r.status as Appointment["status"],
    cutName: str(r.cut_name),
    cutDescription: str(r.cut_description),
    images: (r.images as CutImages | null) ?? {},
    notes: str(r.notes),
    source: r.source === "manual" ? "manual" : "online",
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
function cleanTerm(v: string | undefined): string {
  return (v ?? "").slice(0, 80).replace(/[\\%_,()"*]/g, " ").replace(/\s+/g, " ").trim();
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
  const q = cleanTerm(query.q);
  const location = cleanTerm(query.location);
  const near = query.near && Number.isFinite(query.near.lat) && Number.isFinite(query.near.lng) ? query.near : undefined;

  let req = createAnonClient().from("salons").select("*");
  if (q) req = req.ilike("name", `%${q}%`);
  if (location) req = req.or(`address.ilike."%${location}%",city.ilike."%${location}%"`);
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
  const [st, sv] = await Promise.all([
    sb.from("stylists").select("*").eq("salon_id", salonId).order("sort").order("name"),
    sb.from("services").select("*").eq("salon_id", salonId).order("sort"),
  ]);
  if (st.error) fail("getSalonCatalog", st.error);
  if (sv.error) fail("getSalonCatalog", sv.error);
  return {
    stylists: (st.data ?? []).map(mapStylist),
    services: (sv.data ?? []).map(mapService),
  };
}

/**
 * Horarios libres de los próximos `days` días hábiles (+2 de margen). Cada horario admite tantos turnos
 * como peluqueros tenga el local; los horarios llenos no se devuelven.
 */
export async function getAvailableSlots(salonId: string, days = 6): Promise<Slot[]> {
  const sb = createAnonClient();
  const [salonRes, stylistsRes] = await Promise.all([
    sb.from("salons").select("open_days, open_hour, close_hour").eq("id", salonId).maybeSingle(),
    sb.from("stylists").select("id", { count: "exact", head: true }).eq("salon_id", salonId),
  ]);
  if (!salonRes.data) return [];
  const openDays = (salonRes.data.open_days as number[]) ?? [2, 3, 4, 5, 6];
  const openHour = Number(salonRes.data.open_hour);
  const closeHour = Number(salonRes.data.close_hour);
  const capacity = Math.max(stylistsRes.count ?? 0, 1);

  const now = Date.now();
  const nowLocal = new Date(now + TZ_OFFSET_MIN * 60000);
  const baseDay = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate());
  const totalDays = days + 2;
  const from = new Date(baseDay - TZ_OFFSET_MIN * 60000).toISOString();
  const to = new Date(baseDay + totalDays * 86400000 - TZ_OFFSET_MIN * 60000).toISOString();

  const { data: countData, error } = await sb.rpc("get_slot_counts", { p_salon_id: salonId, p_from: from, p_to: to });
  if (error) fail("getAvailableSlots", error);
  const booked = new Map<number, number>();
  for (const r of (countData ?? []) as Row[]) booked.set(new Date(str(r.start_at)).getTime(), Number(r.booked));

  const slots: Slot[] = [];
  for (let d = 0; d < totalDays; d++) {
    const dayUtc = baseDay + d * 86400000;
    if (!openDays.includes(new Date(dayUtc).getUTCDay())) continue;
    for (let m = openHour * 60; m + SLOT_MIN <= closeHour * 60; m += SLOT_MIN) {
      const start = dayUtc + (m - TZ_OFFSET_MIN) * 60000;
      if (start < now) continue;
      if ((booked.get(start) ?? 0) >= capacity) continue;
      slots.push({ start: new Date(start).toISOString(), available: true });
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
      if (!value || !["front", "left", "right"].includes(key)) return;
      // URLs ya publicadas (absolutas o relativas al sitio) se guardan tal cual.
      if (/^https?:\/\//i.test(value) || /^\/[^/]/.test(value)) {
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
    p_service_id: input.serviceId ?? "",
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_start: new Date(input.start).toISOString(),
    p_cut_name: input.cutName ?? "",
    p_cut_description: input.cutDescription ?? "",
    p_images: images,
    p_notes: input.notes ?? "",
  });
  if (error) {
    // Errores de negocio ("Ese horario se acaba de ocupar, elegí otro", etc.) se propagan tal cual.
    if (error.code === "P0001") throw new Error(error.message);
    fail("createAppointment", error);
  }
  const row = (Array.isArray(data) ? data[0] : data) as Row;
  return mapAppointment(row);
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

/** Turno cargado a mano desde el panel: misma regla de cupos que la reserva online (RPC atómico). */
export async function createManualAppointment(input: ManualAppointment): Promise<Appointment> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("admin_book_appointment", {
    p_service_id: input.serviceId ?? "",
    p_stylist_id: input.stylistId ?? "",
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_start: new Date(input.start).toISOString(),
    p_notes: input.notes,
  });
  if (error) {
    if (error.code === "P0001") throw new Error(error.message);
    fail("createManualAppointment", error);
  }
  return mapAppointment((Array.isArray(data) ? data[0] : data) as Row);
}

export async function isSlugTaken(slug: string): Promise<boolean> {
  const { count, error } = await createAnonClient().from("salons").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (error) fail("isSlugTaken", error);
  return (count ?? 0) > 0;
}

export type NewSalonRegistration = {
  email: string;
  password: string;
  salonName: string;
  slug: string;
  address: string;
  city: string;
  phone: string;
  ownerName: string;
  price: number | null;
  lat: number | null;
  lng: number | null;
};

/** Alta atómica (usuario confirmado + salón + admin + peluquero + servicio) vía RPC `register_salon`. Devuelve el slug. */
export async function registerSalon(input: NewSalonRegistration): Promise<string> {
  const { data, error } = await createAnonClient().rpc("register_salon", {
    p_email: input.email,
    p_password: input.password,
    p_salon_name: input.salonName,
    p_slug: input.slug,
    p_address: input.address,
    p_city: input.city,
    p_phone: input.phone,
    p_owner_name: input.ownerName,
    p_price: input.price,
    p_lat: input.lat,
    p_lng: input.lng,
  });
  if (error) {
    if (error.code === "P0001") throw new Error(error.message);
    fail("registerSalon", error);
  }
  return String(data);
}

export async function assignStylist(salonId: string, id: string, stylistId: string | null): Promise<void> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("appointments")
    .update({ stylist_id: stylistId })
    .eq("id", id)
    .eq("salon_id", salonId)
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") throw new Error("Ese peluquero ya tiene un turno a esa hora.");
  if (error) fail("assignStylist", error);
  if (!data) throw new Error("Turno inexistente");
}

export async function completeAppointment(salonId: string, id: string): Promise<void> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("appointments")
    .update({ status: "completado" })
    .eq("id", id)
    .eq("salon_id", salonId)
    .select("id")
    .maybeSingle();
  if (error) fail("completeAppointment", error);
  if (!data) throw new Error("Turno inexistente");
}

/** Ruta dentro del bucket a partir de la URL pública, solo si pertenece a la carpeta del salón. */
function storagePath(url: string, salonId: string): string | null {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  return path.startsWith(`${salonId}/`) && !path.includes("..") ? path : null;
}

/** Cancelar = borrar el turno y sus imágenes del bucket. */
export async function deleteAppointment(salonId: string, id: string): Promise<void> {
  const sb = await createClient();
  const { data, error } = await sb.from("appointments").delete().eq("id", id).eq("salon_id", salonId).select("images").maybeSingle();
  if (error) fail("deleteAppointment", error);
  if (!data) throw new Error("Turno inexistente");
  const paths = Object.values((data.images as CutImages | null) ?? {})
    .map((u) => (u ? storagePath(u, salonId) : null))
    .filter((p): p is string => !!p);
  if (paths.length) {
    const { error: rmError } = await sb.storage.from(IMAGE_BUCKET).remove(paths);
    if (rmError) console.error("No se pudieron borrar las imágenes", rmError);
  }
}

const parseSpecialties = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

export async function createStylist(salonId: string, name: string, specialties: string): Promise<Stylist> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("stylists")
    .insert({ salon_id: salonId, name: name.trim(), specialties: parseSpecialties(specialties), sort: 100 })
    .select("*")
    .single();
  if (error) fail("createStylist", error);
  return mapStylist(data);
}

export async function updateStylist(salonId: string, id: string, name: string, specialties: string): Promise<void> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("stylists")
    .update({ name: name.trim(), specialties: parseSpecialties(specialties) })
    .eq("id", id)
    .eq("salon_id", salonId)
    .select("id")
    .maybeSingle();
  if (error) fail("updateStylist", error);
  if (!data) throw new Error("Peluquero inexistente");
}

export async function deleteStylist(salonId: string, id: string): Promise<void> {
  const sb = await createClient();
  const { data, error } = await sb.from("stylists").delete().eq("id", id).eq("salon_id", salonId).select("id").maybeSingle();
  if (error) fail("deleteStylist", error);
  if (!data) throw new Error("Peluquero inexistente");
}
