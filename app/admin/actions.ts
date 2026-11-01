"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assignStylist,
  completeAppointment,
  createStylist,
  deleteAppointment,
  deleteStylist,
  getCurrentAdmin,
  updateStylist,
} from "@/lib/data";
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

export async function deleteStylistAction(id: string): Promise<ActionResult> {
  return withAdmin((salonId) => deleteStylist(salonId, id), "No se pudo borrar el peluquero.");
}
