#!/usr/bin/env node
// Genera las fotos "después" de la landing (public/landing/corte-1..3.jpg) a partir de public/landing/antes.jpg,
// con la MISMA persona y tres cortes distintos, usando la API de imágenes de OpenAI.
//
// Uso:
//   OPENAI_API_KEY=sk-... node scripts/generate-landing-images.mjs
//   (opcional) OPENAI_IMAGE_MODEL=gpt-image-1.5
//
// Sobrescribe las fotos de stock actuales. No se ejecuta en el build.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI, { toFile } from "openai";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "landing");
const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";

// Nombres alineados con PROPOSALS en components/landing/HowItWorks.tsx.
const CUTS = [
  {
    file: "corte-1.jpg",
    prompt:
      "a pompadour haircut: short faded sides, tapered nape, longer textured top swept up and back with volume, clean neat finish",
  },
  {
    file: "corte-2.jpg",
    prompt: "a textured medium-length crop with natural volume and movement on top, softly scissor-cut sides, matte finish",
  },
  {
    file: "corte-3.jpg",
    prompt: "a tidy short buzz cut, even length all over (#3 clipper), sharp clean hairline and neat edges around the ears",
  },
];

const BASE =
  "Edit this portrait photo. Keep EXACTLY the same person: same face, identity, facial features, skin tone, expression, " +
  "facial hair, clothing, pose, camera angle, lighting and neutral background. Only change the hairstyle to ";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Falta OPENAI_API_KEY en el entorno.");
    process.exit(1);
  }
  const client = new OpenAI();
  const source = await readFile(path.join(dir, "antes.jpg"));

  for (const cut of CUTS) {
    process.stdout.write(`Generando ${cut.file} con ${model}... `);
    const res = await client.images.edit({
      model,
      image: await toFile(source, "antes.jpg", { type: "image/jpeg" }),
      prompt: `${BASE}${cut.prompt}. Photorealistic studio portrait, natural hair texture, square framing.`,
      size: "1024x1024",
      quality: "high",
      output_format: "jpeg",
      output_compression: 85,
      // Mantiene mejor la identidad de la persona en los modelos gpt-image-1.x que lo soportan.
      ...(model.startsWith("gpt-image-1") && model !== "gpt-image-1-mini" ? { input_fidelity: "high" } : {}),
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error(`La API no devolvió imagen para ${cut.file}`);
    await writeFile(path.join(dir, cut.file), Buffer.from(b64, "base64"));
    console.log("listo");
  }
  console.log("Imágenes actualizadas en public/landing/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
