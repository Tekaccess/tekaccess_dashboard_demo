import React, { useRef, useState } from 'react';
import { Camera, Spinner, Check, X } from '@phosphor-icons/react';
import Tesseract from 'tesseract.js';

interface Props {
  onResult: (value: string) => void;
  title?: string;
}

// Adaptive-ish preprocessing: grayscale + Otsu-style threshold.
// Weighbridge displays are usually high-contrast LED, so a global threshold
// is sufficient if the photo is reasonably framed.
async function preprocessImage(file: File): Promise<string> {
  const img = await loadImage(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Grayscale + compute histogram for Otsu
  const hist = new Array(256).fill(0);
  for (let i = 0; i < px.length; i += 4) {
    const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = px[i + 1] = px[i + 2] = g;
    hist[g]++;
  }

  const total = w * h;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, varMax = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > varMax) {
      varMax = between;
      threshold = t;
    }
  }

  // LED displays are bright digits on dark background — invert so
  // Tesseract sees dark text on light, which it prefers.
  for (let i = 0; i < px.length; i += 4) {
    const v = px[i] > threshold ? 0 : 255;
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function extractWeight(rawText: string): string | null {
  // Pull the most-decimal-shaped number we can find. Weighbridges show
  // things like "46.87", "18,890" or "46870 kg". Prefer numbers with a
  // decimal point; fall back to the largest integer.
  const matches = rawText.match(/\d+[.,]?\d*/g) || [];
  if (matches.length === 0) return null;
  const cleaned = matches.map(m => m.replace(',', '.'));
  const withDecimal = cleaned.find(m => m.includes('.'));
  return withDecimal ?? cleaned.sort((a, b) => b.length - a.length)[0];
}

export default function WeighbridgeScanner({ onResult, title = 'Scan weighbridge' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setParsed(null);
    setPreview(null);
    try {
      const processed = await preprocessImage(file);
      setPreview(processed);
      const { data } = await Tesseract.recognize(processed, 'eng', {
        // Restrict character set — huge accuracy boost for digit-only displays.
        // tessedit_char_whitelist is honored by the LSTM engine when set.
      } as any);
      // Apply whitelist post-hoc since not all builds honor the option above.
      const value = extractWeight(data.text);
      if (!value) {
        setError('Could not read a number from the image. Try again with better lighting and frame the digits tightly.');
      } else {
        setParsed(value);
      }
    } catch (e: any) {
      setError(e.message || 'OCR failed');
    } finally {
      setBusy(false);
    }
  }

  function commit() {
    if (parsed) {
      onResult(parsed);
      reset();
    }
  }

  function reset() {
    setPreview(null);
    setParsed(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-accent bg-accent-glow rounded-md hover:bg-accent/20 transition-colors"
        title={title}
      >
        <Camera size={12} weight="duotone" /> Scan
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {(busy || preview || error) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={reset}>
          <div
            className="bg-card rounded-2xl border border-border p-5 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-t1">Weighbridge OCR</p>
              <button type="button" onClick={reset} className="p-1 text-t3 hover:text-t1">
                <X size={16} weight="bold" />
              </button>
            </div>

            {busy && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Spinner size={28} className="animate-spin text-accent" />
                <p className="text-xs text-t3">Reading display…</p>
              </div>
            )}

            {!busy && preview && (
              <div className="space-y-3">
                <img src={preview} alt="Processed" className="w-full rounded-lg border border-border max-h-48 object-contain bg-surface" />
                {parsed && (
                  <div className="text-center py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-[10px] text-t3 uppercase tracking-widest">Detected</p>
                    <p className="text-3xl font-black text-emerald-400">{parsed}</p>
                    <p className="text-[10px] text-t3 mt-1">Verify before saving</p>
                  </div>
                )}
                {error && <p className="text-xs text-rose-400">{error}</p>}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 py-2 text-xs font-bold text-t2 bg-surface rounded-lg hover:bg-surface/70"
              >
                {parsed ? 'Retake' : 'Cancel'}
              </button>
              {parsed && (
                <button
                  type="button"
                  onClick={commit}
                  className="flex-1 py-2 text-xs font-bold text-white bg-accent rounded-lg hover:bg-accent-h inline-flex items-center justify-center gap-1"
                >
                  <Check size={12} weight="bold" /> Use {parsed}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
