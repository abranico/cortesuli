import { renderCut, type CutView } from "@/lib/ai";

export const maxDuration = 120;

const VIEWS: CutView[] = ["front", "left", "right"];

export async function POST(req: Request) {
  const { photos, prompt, view, fromFront } = (await req.json()) as { photos: string[]; prompt: string; view: CutView; fromFront?: boolean };
  if (!photos?.length || !prompt || !VIEWS.includes(view)) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    return Response.json({ image: await renderCut(photos.slice(0, 3), prompt.slice(0, 1000), view, Boolean(fromFront)) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "No pudimos generar la imagen." }, { status: 500 });
  }
}
