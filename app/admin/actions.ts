"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelAppointment, getCurrentAdmin } from "@/lib/data";
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

export type CancelResult = { ok: true; offeredTo: string | null } | { ok: false; error: string };

export async function cancelAppointmentAction(id: string): Promise<CancelResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Tu sesión expiró. Volvé a ingresar." };
  try {
    const { offeredTo } = await cancelAppointment(id);
    revalidatePath("/admin/panel");
    return { ok: true, offeredTo: offeredTo?.customerName ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cancelar el turno." };
  }
}
