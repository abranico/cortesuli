"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { checkSlugAction, registerSalonAction, type RegisterState } from "@/app/admin/actions";

const input =
  "w-full rounded-lg border border-neutral-200 bg-white shadow-sm px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-accent";

function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

type SlugStatus = { slug: string; available: boolean; error?: string };

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerSalonAction, { error: null });
  // React resetea el formulario después de la acción: si hubo error, repoblamos con lo que se mandó.
  const v = state.values ?? {};
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [status, setStatus] = useState<SlugStatus | null>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);

  useEffect(() => {
    if (!effectiveSlug) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await checkSlugAction(effectiveSlug);
      if (!cancelled) setStatus({ slug: effectiveSlug, ...res });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [effectiveSlug]);

  const current = status && status.slug === effectiveSlug ? status : null;

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-200/60">
      <fieldset className="space-y-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Tu peluquería</legend>
        <Field label="Nombre de la peluquería">
          <input
            name="salonName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Barbería del Centro"
            maxLength={80}
            className={input}
            required
          />
        </Field>
        <Field label="Link de tu página">
          <div className="flex items-stretch overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm focus-within:border-accent">
            <span className="flex items-center bg-surface-2 px-3 text-sm text-neutral-500">/peluqueria/</span>
            <input
              name="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40));
              }}
              placeholder="barberia-del-centro"
              className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              minLength={3}
              maxLength={40}
            />
          </div>
          <p className={`mt-1 text-xs ${current && !current.available ? "text-red-600" : "text-neutral-500"}`}>
            {!effectiveSlug
              ? "Se arma solo con el nombre; podés editarlo."
              : current && !current.available
                ? current.error
                : `Tu página: /peluqueria/${effectiveSlug}${current?.available ? " ✓ disponible" : ""}`}
          </p>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dirección">
            <input name="address" defaultValue={v.address} placeholder="Av. Corrientes 1234" maxLength={160} className={input} />
          </Field>
          <Field label="Barrio / ciudad">
            <input name="city" defaultValue={v.city} placeholder="Almagro, CABA" maxLength={80} className={input} />
          </Field>
          <Field label="Teléfono / WhatsApp">
            <input name="phone" defaultValue={v.phone} type="tel" placeholder="11 5555-5555" maxLength={40} className={input} />
          </Field>
          <Field label="Precio del corte (opcional)">
            <div className="flex items-stretch overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm focus-within:border-accent">
              <span className="flex items-center bg-surface-2 px-3 text-sm text-neutral-500">$</span>
              <input name="price" defaultValue={v.price} inputMode="numeric" placeholder="12000" maxLength={9} className="min-w-0 flex-1 px-3 py-2.5 text-sm outline-none" />
            </div>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-neutral-100 pt-5">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Tu cuenta</legend>
        <Field label="Tu nombre" hint="Quedás cargado como el primer peluquero del local.">
          <input name="ownerName" defaultValue={v.ownerName} placeholder="Ej: Lucía" maxLength={80} className={input} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input name="email" defaultValue={v.email} type="email" autoComplete="email" placeholder="vos@tupeluqueria.com" className={input} required />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" minLength={6} className={input} required />
          </Field>
        </div>
      </fieldset>

      {state.error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || (current ? !current.available : false)}
        className="w-full rounded-xl bg-accent px-4 py-3 text-base font-semibold text-white shadow-sm shadow-accent/30 transition hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Creando tu peluquería…" : "Crear mi peluquería"}
      </button>
      <p className="text-center text-xs text-neutral-500">
        Arrancás con horario de martes a sábado de 10 a 20 h, en turnos de 30 minutos.{" "}
        <Link href="/admin" className="font-medium text-neutral-700 hover:text-accent">
          ¿Ya tenés cuenta? Ingresá
        </Link>
      </p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}
