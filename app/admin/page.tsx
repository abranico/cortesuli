import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/data";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ingresar · Panel de peluquerías" };

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin/panel");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-amber-400">Panel de peluquerías</p>
          <h1 className="mt-2 text-3xl font-bold">Ingresá a tu agenda</h1>
          <p className="mt-2 text-sm text-zinc-400">Mirá tus turnos con el corte exacto que eligió cada cliente.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
