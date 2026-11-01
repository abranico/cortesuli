import { analyzeFace } from "@/lib/ai";
import { getSalonBySlug, getSalonCatalog } from "@/lib/data";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { slug, front, wish } = (await req.json()) as { slug: string; front: string; wish?: string };
  const salon = await getSalonBySlug(slug);
  if (!salon || !front) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const analysis = await analyzeFace(front, await getSalonCatalog(salon.id), wish?.slice(0, 300));
    return Response.json(analysis);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No pudimos analizar la foto. Probá de nuevo." }, { status: 500 });
  }
}
