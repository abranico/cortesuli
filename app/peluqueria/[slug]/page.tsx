import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReservaFlow from "@/components/reserva/ReservaFlow";
import { getAvailableSlots, getSalonBySlug, getSalonCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  if (!salon) return { title: "Peluquería no encontrada" };
  return {
    title: `${salon.name} — Reservá tu turno`,
    description: `${salon.tagline}. Reservá tu turno online en ${salon.name}, ${salon.city}. Si querés, probate antes el corte con IA.`,
  };
}

export default async function SalonPage({ params }: Props) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  if (!salon) notFound();
  const [catalog, slots] = await Promise.all([getSalonCatalog(salon.id), getAvailableSlots(salon.id)]);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ReservaFlow salon={salon} catalog={catalog} initialSlots={slots.filter((s) => s.available)} />
    </main>
  );
}
