"use client";

import { useState } from "react";

export default function QrCard({ salonName, url, svg, png, fileName }: { salonName: string; url: string; svg: string; png: string; fileName: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiá el link:", url);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 print:hidden">
        Imprimilo y pegalo en la vidriera, el espejo o la caja: tus clientes escanean y reservan solos, sin escribirte por WhatsApp.
      </p>

      <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm print:mt-16 print:max-w-none print:border-0 print:shadow-none">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Reservá online</p>
        <h2 className="mt-2 font-display text-2xl font-semibold print:text-5xl">{salonName}</h2>
        <p className="mt-1 text-sm text-neutral-500 print:mt-4 print:text-2xl">Escaneá y reservá tu turno</p>
        <div
          className="mt-6 w-full max-w-[260px] [&>svg]:h-auto [&>svg]:w-full print:mt-10 print:max-w-[420px]"
          role="img"
          aria-label={`Código QR de ${url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="mt-4 break-all font-mono text-xs text-neutral-600 print:mt-8 print:text-lg">{url}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <button onClick={copy} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100">
          {copied ? "¡Link copiado!" : "Copiar link"}
        </button>
        <a href={png} download={fileName} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100">
          Descargar PNG
        </a>
        <button onClick={() => window.print()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong">
          Imprimir
        </button>
      </div>
    </div>
  );
}
