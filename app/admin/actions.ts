"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignStylist,
  completeAppointment,
  createManualAppointment,
  createStylist,
  deleteAppointment,
  deleteStylist,
  getCurrentAdmin,
  isSlugTaken,
  registerSalon,
  updateStylist,
} from "@/lib/data";
import { geocodeAddress } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completá email y contraseña." };
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };
  redirect("/admin/panel");
}

export async function logoutAction() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/admin");
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Corre una mutación con el salón del admin logueado y revalida el panel. */
async function withAdmin(run: (salonId: string) => Promise<void>, fallback: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Tu sesión expiró. Volvé a ingresar." };
  try {
    await run(admin.salon.id);
    revalidatePath("/admin/panel");
    revalidatePath(`/peluqueria/${admin.salon.slug}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : fallback };
  }
}

export async function assignStylistAction(id: string, stylistId: string | null): Promise<ActionResult> {
  return withAdmin((salonId) => assignStylist(salonId, id, stylistId || null), "No se pudo asignar el peluquero.");
}

export async function completeAppointmentAction(id: string): Promise<ActionResult> {
  return withAdmin((salonId) => completeAppointment(salonId, id), "No se pudo completar el turno.");
}

export async function cancelAppointmentAction(id: string): Promise<ActionResult> {
  return withAdmin((salonId) => deleteAppointment(salonId, id), "No se pudo cancelar el turno.");
}

export async function createStylistAction(name: string, specialties: string): Promise<ActionResult> {
  if (!name.trim()) return { ok: false, error: "Poné un nombre." };
  return withAdmin(async (salonId) => {
    await createStylist(salonId, name.slice(0, 80), specialties.slice(0, 300));
  }, "No se pudo agregar el peluquero.");
}

export async function updateStylistAction(id: string, name: string, specialties: string): Promise<ActionResult> {
  if (!name.trim()) return { ok: false, error: "Poné un nombre." };
  return withAdmin((salonId) => updateStylist(salonId, id, name.slice(0, 80), specialties.slice(0, 300)), "No se pudo guardar.");
}

export type ManualAppointmentInput = {
  customerName: string;
  customerPhone: string;
  start: string;
  serviceId: string;
  stylistId: string;
  notes: string;
};

export async function createManualAppointmentAction(input: ManualAppointmentInput): Promise<ActionResult> {
  const customerName = String(input.customerName ?? "").trim();
  if (!customerName) return { ok: false, error: "Poné el nombre del cliente." };
  if (!input.start || Number.isNaN(new Date(input.start).getTime())) return { ok: false, error: "Elegí un horario." };
  return withAdmin(async () => {
    await createManualAppointment({
      customerName: customerName.slice(0, 120),
      customerPhone: String(input.customerPhone ?? "").trim().slice(0, 40),
      start: input.start,
      serviceId: input.serviceId || null,
      stylistId: input.stylistId || null,
      notes: String(input.notes ?? "").trim().slice(0, 1000),
    });
  }, "No se pudo cargar el turno.");
}

/* -------------------------------- registro --------------------------------- */

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function checkSlugAction(slug: string): Promise<{ available: boolean; error?: string }> {
  const s = String(slug ?? "").trim();
  if (s.length < 3 || s.length > 40 || !SLUG_RE.test(s)) return { available: false, error: "Solo minúsculas, números y guiones (3 a 40)." };
  try {
    return (await isSlugTaken(s)) ? { available: false, error: "Ese link ya está en uso." } : { available: true };
  } catch {
    return { available: true };
  }
}

export type RegisterState = { error: string | null };

export async function registerSalonAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const salonName = get("salonName");
  const slug = get("slug").toLowerCase();
  const address = get("address");
  const city = get("city");
  const phone = get("phone");
  const ownerName = get("ownerName");
  const email = get("email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rawPrice = get("price").replace(/[^\d]/g, "");
  const price = rawPrice ? Number(rawPrice) : null;

  if (salonName.length < 2) return { error: "Poné el nombre de la peluquería." };
  if (slug.length < 3 || slug.length > 40 || !SLUG_RE.test(slug))
    return { error: "El link solo puede tener letras minúsculas, números y guiones (3 a 40 caracteres)." };
  if (ownerName.length < 2) return { error: "Poné tu nombre." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "El email no es válido." };
  if (password.length < 6) return { error: "La contraseña tiene que tener al menos 6 caracteres." };

  const coords = await geocodeAddress(address, city);
  try {
    await registerSalon({
      email,
      password,
      salonName: salonName.slice(0, 80),
      slug,
      address: address.slice(0, 160),
      city: city.slice(0, 80),
      phone: phone.slice(0, 40),
      ownerName: ownerName.slice(0, 80),
      price,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No pudimos crear tu peluquería." };
  }

  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Tu peluquería quedó creada, pero no pudimos iniciar sesión. Ingresá desde el panel." };
  revalidatePath("/");
  redirect("/admin/panel");
}

export async function deleteStylistAction(id: string): Promise<ActionResult> {
  return withAdmin((salonId) => deleteStylist(salonId, id), "No se pudo borrar el peluquero.");
}
