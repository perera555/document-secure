"use client";

export type Filter = "auto" | "color" | "gray" | "bw" | "original";

export const FILTERS: { id: Filter; label: string }[] = [
  { id: "auto", label: "Auto enhance" },
  { id: "color", label: "Vivid color" },
  { id: "gray", label: "Grayscale" },
  { id: "bw", label: "Black & white" },
  { id: "original", label: "Original" },
];

/** Max long edge we keep. ~300 DPI A4 = 3508px, so documents stay print quality. */
const MAX_EDGE = 3600;

export async function loadImage(blob: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(blob, { imageOrientation: "from-image" });
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Applies rotation (deg, multiples of 90) and a document filter, returns high-quality JPEG. */
export async function processImage(
  src: Blob,
  opts: { rotate?: number; filter?: Filter } = {},
): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await loadImage(src);
  const rotate = (((opts.rotate ?? 0) % 360) + 360) % 360;
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const swap = rotate === 90 || rotate === 270;
  const canvas = makeCanvas(swap ? h : w, swap ? w : h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  bmp.close();

  const filter = opts.filter ?? "auto";
  if (filter !== "original") applyFilter(ctx, canvas.width, canvas.height, filter);

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.93),
  );
  return { blob, width: canvas.width, height: canvas.height };
}

function applyFilter(ctx: CanvasRenderingContext2D, w: number, h: number, filter: Filter) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // Histogram of luminance to find black/white points (auto levels).
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    hist[(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0]++;
  }
  const total = w * h;
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.01) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.05) { hi = i; break; } }
  if (hi - lo < 40) { lo = 0; hi = 255; }
  const range = hi - lo;

  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    let v = ((i - lo) / range) * 255;
    // gentle S-curve for crisper text
    v = 255 / (1 + Math.exp(-(v - 128) / 42));
    lut[i] = v;
  }

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const y = r * 0.299 + g * 0.587 + b * 0.114;
    if (filter === "gray") {
      const v = lut[y | 0];
      d[i] = d[i + 1] = d[i + 2] = v;
    } else if (filter === "bw") {
      const v = lut[y | 0] > 150 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
    } else if (filter === "color") {
      // levels per channel + saturation boost
      const sat = 1.35;
      for (let c = 0; c < 3; c++) {
        const ch = d[i + c];
        const boosted = y + (ch - y) * sat;
        d[i + c] = lut[Math.max(0, Math.min(255, boosted)) | 0];
      }
    } else {
      // auto: levels on each channel, mild saturation, whiten paper background
      for (let c = 0; c < 3; c++) {
        const ch = d[i + c];
        const boosted = y + (ch - y) * 1.12;
        let v = lut[Math.max(0, Math.min(255, boosted)) | 0];
        if (y > hi - 8) v = Math.min(255, v + 12);
        d[i + c] = v;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export async function makeThumbnail(src: Blob, size = 480): Promise<Blob> {
  const bmp = await loadImage(src);
  const scale = Math.min(1, size / Math.max(bmp.width, bmp.height));
  const canvas = makeCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.8));
}

/** Smaller copy for sending to AI extraction (keeps request size reasonable). */
export async function downscaleForAI(src: Blob, edge = 2000): Promise<Blob> {
  const bmp = await loadImage(src);
  const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height));
  const canvas = makeCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.88));
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export function isImage(type: string) {
  return type.startsWith("image/");
}
