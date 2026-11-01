"use client";

import { useEffect, useRef, useState } from "react";

export type CapturedPhotos = { front: string; left?: string; right?: string };

const STEPS = [
  { key: "front", label: "Mirá de frente a la cámara" },
  { key: "left", label: "Girá despacio la cabeza hacia tu izquierda" },
  { key: "right", label: "Ahora girá hacia tu derecha" },
] as const;

const SIZE = 768;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const side = Math.min(img.width, img.height);
      canvas.width = canvas.height = SIZE;
      canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function GuidedCapture({ onDone }: { onDone: (photos: CapturedPhotos) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [shots, setShots] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("No pudimos acceder a la cámara. Podés subir una foto de frente."));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const grab = () => {
    const video = videoRef.current!;
    const canvas = document.createElement("canvas");
    const side = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const start = async () => {
    setRunning(true);
    const taken: string[] = [];
    for (let i = 0; i < STEPS.length; i++) {
      setStepIdx(i);
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await sleep(i === 0 && c === 3 ? 1200 : 800);
      }
      setCountdown(null);
      taken.push(grab());
      setShots([...taken]);
      setFlash(true);
      await sleep(250);
      setFlash(false);
      await sleep(400);
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onDone({ front: taken[0], left: taken[1], right: taken[2] });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onDone({ front: await fileToDataUrl(file) });
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-3xl bg-surface">
        {!error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setReady(true)}
            className="h-full w-full -scale-x-100 object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={`h-[78%] w-[60%] rounded-[50%] border-4 transition-colors duration-300 ${
              flash ? "border-emerald-400" : running ? "border-accent" : "border-white/60"
            }`}
            style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
          />
        </div>
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center text-8xl font-bold text-white drop-shadow-lg">
            {countdown}
          </div>
        )}
        {flash && <div className="absolute inset-0 bg-white/60" />}
        {error && <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-neutral-300">{error}</div>}
      </div>

      <div className="flex gap-3">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 text-xs ${
              shots[i] ? "border-emerald-400" : running && i === stepIdx ? "border-accent" : "border-neutral-700"
            }`}
          >
            {shots[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shots[i]} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-neutral-500">{i + 1}</span>
            )}
          </div>
        ))}
      </div>

      <p className="min-h-[3rem] text-center text-lg font-medium">
        {running ? STEPS[stepIdx].label : "Vamos a tomar 3 fotos: de frente y de cada perfil. Poné tu cara dentro del óvalo."}
      </p>

      {!running && !error && (
        <button
          onClick={start}
          disabled={!ready}
          className="w-full max-w-md rounded-full bg-accent px-6 py-4 text-lg font-semibold text-ink transition hover:bg-accent-soft disabled:opacity-40"
        >
          {ready ? "Empezar" : "Abriendo cámara..."}
        </button>
      )}
      {!running && (
        <label className="cursor-pointer text-sm text-neutral-400 underline underline-offset-4 hover:text-neutral-200">
          O subí una foto de frente
          <input type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
        </label>
      )}
    </div>
  );
}
