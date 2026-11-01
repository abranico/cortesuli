import "server-only";
import OpenAI, { toFile } from "openai";
import type { SalonCatalog } from "./types";

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI());
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
const IMAGE_QUALITY = (process.env.OPENAI_IMAGE_QUALITY ?? "medium") as "low" | "medium" | "high";

export type CutSuggestion = {
  name: string;
  description: string;
  why: string;
  imagePrompt: string;
  serviceId: string;
  careTips: string[];
  retouchWeeks: number;
};

export type FaceAnalysis = {
  faceShape: string;
  hairType: string;
  summary: string;
  cuts: CutSuggestion[];
};

export type CutView = "front" | "left" | "right";

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["faceShape", "hairType", "summary", "cuts"],
  properties: {
    faceShape: { type: "string", description: "Forma de cara en español (ovalada, redonda, cuadrada, alargada, corazón, diamante)" },
    hairType: { type: "string", description: "Tipo, largo y densidad actual del pelo, en español" },
    summary: { type: "string", description: "Una o dos frases cálidas para el cliente sobre sus rasgos y qué le favorece" },
    cuts: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "why", "imagePrompt", "serviceId", "careTips", "retouchWeeks"],
        properties: {
          name: { type: "string", description: "Nombre corto del corte en español" },
          description: { type: "string", description: "Descripción técnica para el peluquero: largos por zona, degradé, textura, raya, barba" },
          why: { type: "string", description: "Por qué le queda bien a esta persona, en una o dos frases, tuteando con voseo" },
          imagePrompt: { type: "string", description: "Instrucción en inglés, precisa, describiendo SOLO el nuevo corte de pelo (y barba si corresponde) para un editor de imágenes" },
          serviceId: { type: "string", description: "id del servicio del catálogo que corresponde" },
          careTips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Consejos de peinado y mantenimiento en casa" },
          retouchWeeks: { type: "integer", description: "Cada cuántas semanas conviene retocarlo" },
        },
      },
    },
  },
} as const;

export async function analyzeFace(front: string, catalog: SalonCatalog, wish?: string): Promise<FaceAnalysis> {
  const catalogText = JSON.stringify({
    servicios: catalog.services.map(({ id, name, category }) => ({ id, name, category })),
  });
  const res = await openai().chat.completions.create({
    model: TEXT_MODEL,
    response_format: { type: "json_schema", json_schema: { name: "analisis_corte", strict: true, schema: analysisSchema } },
    messages: [
      {
        role: "system",
        content:
          "Sos un estilista senior de una peluquería/barbería argentina. Analizás la foto del cliente (forma de cara, tipo de pelo, barba) y proponés 3 cortes distintos entre sí que le favorezcan y que el local pueda hacer. Para serviceId usá solo ids de los servicios del catálogo dado. Hablale al cliente con voseo rioplatense. Catálogo del local: " +
          catalogText,
      },
      {
        role: "user",
        content: [
          { type: "text", text: wish ? `El cliente pidió: "${wish}". Tomalo como guía para las 3 propuestas.` : "Proponé 3 cortes para mí." },
          { type: "image_url", image_url: { url: front, detail: "low" } },
        ],
      },
    ],
  });
  const content = res.choices[0]?.message.content;
  if (!content) throw new Error("La IA no devolvió un análisis");
  const analysis = JSON.parse(content) as FaceAnalysis;
  const serviceIds = new Set(catalog.services.map((s) => s.id));
  for (const cut of analysis.cuts) {
    if (!serviceIds.has(cut.serviceId)) cut.serviceId = catalog.services[0]?.id ?? "";
  }
  return analysis;
}

const VIEW_INSTRUCTIONS: Record<CutView, string> = {
  front: "Keep the exact same photo, framing, pose, face, expression, skin, clothing and background.",
  left: "Keep the exact same photo, framing, head pose (profile view), face, clothing and background.",
  right: "Keep the exact same photo, framing, head pose (profile view), face, clothing and background.",
};

async function dataUrlToFile(dataUrl: string, name: string) {
  const [meta, b64] = dataUrl.split(",");
  const type = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  return toFile(Buffer.from(b64, "base64"), `${name}.${type.split("/")[1] ?? "jpg"}`, { type });
}

export async function renderCut(images: string[], cutPrompt: string, view: CutView): Promise<string> {
  const files = await Promise.all(images.map((img, i) => dataUrlToFile(img, `ref-${i}`)));
  const res = await openai().images.edit({
    model: IMAGE_MODEL,
    image: files.length === 1 ? files[0] : files,
    prompt: `Photorealistic hairstyle try-on for a barbershop. Change ONLY the hair (and facial hair if mentioned) of the person to: ${cutPrompt}. ${VIEW_INSTRUCTIONS[view]} The result must look like a real photo, natural hairline, realistic texture.`,
    size: "1024x1024",
    quality: IMAGE_QUALITY,
    output_format: "jpeg",
    output_compression: 80,
    ...(IMAGE_MODEL.startsWith("gpt-image-1") && IMAGE_MODEL !== "gpt-image-1-mini" ? { input_fidelity: "high" as const } : {}),
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("La IA no devolvió una imagen");
  return `data:image/jpeg;base64,${b64}`;
}
