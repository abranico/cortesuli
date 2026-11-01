import { notFound } from "next/navigation";
import ReservaFlow from "@/components/reserva/ReservaFlow";
import { getSalonBySlug, getSalonCatalog } from "@/lib/data";

export default async function ReservarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  if (!salon) notFound();
  const catalog = await getSalonCatalog(salon.id);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ReservaFlow salon={salon} catalog={catalog} />
    </main>
  );
}
