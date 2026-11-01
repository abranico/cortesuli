"use client";

import { startTransition, useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";

const DEMO_EMAIL = "demo@navajaytijera.com";
const DEMO_PASSWORD = "demo1234";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function loginDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    const fd = new FormData();
    fd.set("email", DEMO_EMAIL);
    fd.set("password", DEMO_PASSWORD);
    startTransition(() => formAction(fd));
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-zinc-500 focus:border-amber-400";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
      <button
        type="button"
        onClick={loginDemo}
        disabled={pending}
        className="w-full rounded-xl bg-amber-400 px-4 py-3 text-base font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
      >
        {pending ? "Ingresando…" : "Ingresar con cuenta demo"}
      </button>
      <p className="mt-2 text-center text-xs text-zinc-500">Navaja &amp; Tijera · {DEMO_EMAIL}</p>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-white/10" />o con tu cuenta<span className="h-px flex-1 bg-white/10" />
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@tupeluqueria.com"
            className={input}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-300">Contraseña</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={input}
            required
          />
        </label>
        {state.error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-60"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
