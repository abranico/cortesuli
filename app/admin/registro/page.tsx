import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/data";
import RegisterForm from "@/components/admin/RegisterForm";
import { Logo } from "@/components/landing/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Creá tu peluquería · Cortesuli" };

export default async function RegisterSalonPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin/panel");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <Logo className="mb-6" />
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Alta de peluquería</p>
          <h1 className="mt-2 text-3xl font-bold">Creá tu peluquería</h1>
          <p className="mt-2 text-sm text-neutral-500">
            En un minuto tenés tu página con reservas online, el probador de cortes con IA y tu agenda.
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}
