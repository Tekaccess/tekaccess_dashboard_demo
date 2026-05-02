import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Spinner } from "@phosphor-icons/react";

// Vite-friendly worker registration. Bundles pdf.worker.min.mjs as a
// module Worker so pdf.js can run off the main thread.
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
  { type: "module" },
);

type TextItemBox = {
  index: number;
  str: string;
  x: number; // canvas px, top-left of em-box
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

/** Form-driven values that auto-populate matched PDF fields. */
export type PurchaseOrderPdfValues = {
  supplierName?: string;
  destinationWarehouseName?: string;
  poRef?: string;
  buyer?: string;
  orderDate?: string;
  expectedArrival?: string;
  paymentTerms?: string;
};

type FieldKey = keyof PurchaseOrderPdfValues;
type FieldMap = Partial<Record<FieldKey, number>>;

/**
 * Text on the PDF that's part of the *template* — keep visible. Everything
 * else is treated as sample data and blanked out at load time so the page
 * starts empty and gets filled in as the form is completed.
 */
const STATIC_PATTERNS: RegExp[] = [
  /^TEKACCESS$/i,
  /^13 KG 599/i,
  /Gishushu/i,
  /Kigali/i,
  /Rwanda/i,
  /^Built on trust/i,
  /Delivered with Excellence/i,
  /^Shipping address$/i,
  /^Buyer$/i,
  /^Order Date:?$/i,
  /^Expected Arrival:?$/i,
  /^Payment Terms:?$/i,
  /^DESCRIPTION$/i,
  /^QTY$/i,
  /^UNIT PRICE$/i,
  /^DISC\.?$/i,
  /^TAXES$/i,
  /^AMOUNT$/i,
  /^Total$/i,
  /^Call:/i,
  /Email:/i,
  /info@tekaccess/i,
  /tekaccess\.rw/i,
  /^Page\s*\d/i,
];

function isStaticTemplateText(c: TextItemBox): boolean {
  const s = c.str.trim();
  return STATIC_PATTERNS.some((p) => p.test(s));
}

// ── Spatial helpers for label-anchored field detection ───────────────────────

function matchText(c: TextItemBox, pattern: RegExp): boolean {
  return pattern.test(c.str.trim());
}

function findCluster(
  clusters: TextItemBox[],
  pattern: RegExp,
): TextItemBox | undefined {
  return clusters.find((c) => matchText(c, pattern));
}

/** Closest cluster below `anchor`, in the same column-ish x range. */
function findBelow(
  clusters: TextItemBox[],
  anchor: TextItemBox,
): TextItemBox | undefined {
  return clusters
    .filter((c) => c.y > anchor.y + anchor.height * 0.5)
    .filter(
      (c) =>
        c.x <
          anchor.x + Math.max(anchor.width * 2, anchor.fontSize * 8) &&
        c.x + c.width > anchor.x - anchor.fontSize * 2,
    )
    .sort((a, b) => a.y - b.y)[0];
}

/** Closest cluster on the same baseline as `anchor`, to its right. */
function findRightOf(
  clusters: TextItemBox[],
  anchor: TextItemBox,
): TextItemBox | undefined {
  return clusters
    .filter((c) => c.x > anchor.x + anchor.width - anchor.fontSize * 0.2)
    .filter((c) => Math.abs(c.y - anchor.y) < anchor.fontSize * 0.6)
    .sort((a, b) => a.x - b.x)[0];
}

/**
 * Resolve form-field keys to cluster indexes by anchoring on labels visible
 * in the template ("Buyer", "Order Date:", "Shipping address", …). This is
 * resilient to small layout changes since it relies on labels, not absolute
 * positions.
 */
function buildFieldMap(clusters: TextItemBox[]): FieldMap {
  const map: FieldMap = {};

  const shipping = findCluster(clusters, /^shipping address$/i);
  if (shipping) {
    const below = findBelow(clusters, shipping);
    if (below) map.destinationWarehouseName = below.index;
    const right = findRightOf(clusters, shipping);
    if (right) map.supplierName = right.index;
  }

  const poRef = findCluster(clusters, /purchase order\s*#/i);
  if (poRef) map.poRef = poRef.index;

  const buyer = findCluster(clusters, /^buyer$/i);
  if (buyer) {
    const v = findBelow(clusters, buyer);
    if (v) map.buyer = v.index;
  }

  const orderDate = findCluster(clusters, /^order date:?$/i);
  if (orderDate) {
    const v = findBelow(clusters, orderDate);
    if (v) map.orderDate = v.index;
  }

  const arrival = findCluster(clusters, /^expected arrival:?$/i);
  if (arrival) {
    const v = findBelow(clusters, arrival);
    if (v) map.expectedArrival = v.index;
  }

  const payment = findCluster(clusters, /^payment terms:?$/i);
  if (payment) {
    const v = findRightOf(clusters, payment) || findBelow(clusters, payment);
    if (v) map.paymentTerms = v.index;
  }

  return map;
}

// Merge raw pdf.js text runs into editable phrases. PDFs split visible text
// (e.g. "BAKALL COMPANY LTD") into many runs that share a baseline. We group
// runs that sit on the same line, share a font size, and are close enough in
// x to be visually continuous. Bigger gaps (column dividers, separate fields)
// stay separate.
function clusterRuns(runs: TextItemBox[]): TextItemBox[] {
  if (!runs.length) return runs;
  const sorted = [...runs].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: TextItemBox[] = [];
  let cur: TextItemBox | null = null;
  for (const it of sorted) {
    const sameLine =
      cur != null &&
      Math.abs(cur.y - it.y) < it.fontSize * 0.4 &&
      Math.abs(cur.fontSize - it.fontSize) < 1;
    const gap = cur ? it.x - (cur.x + cur.width) : Infinity;
    const continuous = sameLine && gap < it.fontSize * 1.5;
    if (cur && continuous) {
      const sep = gap > it.fontSize * 0.3 && !cur.str.endsWith(" ") ? " " : "";
      cur.str += sep + it.str;
      cur.width = it.x + it.width - cur.x;
    } else {
      if (cur) groups.push(cur);
      cur = { ...it };
    }
  }
  if (cur) groups.push(cur);
  return groups.map((g, i) => ({ ...g, index: i }));
}

interface Props {
  pdfUrl: string;
  scale?: number;
  /** Form-driven values; auto-populate the matched fields on the PDF. */
  values?: PurchaseOrderPdfValues;
  /** Called whenever the user edits a field. Keys are cluster indexes. */
  onChange?: (overrides: Record<number, string>) => void;
}

export default function PurchaseOrderPdfEditor({
  pdfUrl,
  scale = 1.15,
  values,
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baselineRef = useRef<HTMLCanvasElement | null>(null);
  const [items, setItems] = useState<TextItemBox[]>([]);
  const [fieldMap, setFieldMap] = useState<FieldMap>({});
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pageDims, setPageDims] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF + extract editable text items
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOverrides({});
    setEditingIndex(null);

    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale });
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        // Snapshot pristine render so overrides re-paint cleanly.
        const baseline = document.createElement("canvas");
        baseline.width = viewport.width;
        baseline.height = viewport.height;
        baseline.getContext("2d")!.drawImage(canvas, 0, 0);
        baselineRef.current = baseline;

        setPageDims({ w: viewport.width, h: viewport.height });

        const text = await page.getTextContent();
        const raw: TextItemBox[] = [];
        text.items.forEach((it: any) => {
          if (typeof it.str !== "string" || !it.str.trim()) return;
          const tx = pdfjsLib.Util.transform(viewport.transform, it.transform);
          // tx[5] is the baseline y in canvas coords; em-box height is hypot(tx[2], tx[3]).
          const fontHeight = Math.hypot(tx[2], tx[3]);
          // it.width is in PDF user units → multiply by viewport scale to get canvas px.
          const widthCanvasPx =
            (it.width || 0) * viewport.scale ||
            it.str.length * fontHeight * 0.5;
          raw.push({
            index: 0, // re-assigned after clustering
            str: it.str,
            x: tx[4],
            y: tx[5] - fontHeight,
            width: widthCanvasPx,
            height: fontHeight,
            fontSize: fontHeight,
          });
        });
        // Cluster adjacent runs on the same line into a single editable field.
        // PDFs split phrases into many small runs; without this, clicks land on
        // a single word fragment instead of the whole label.
        const clustered = clusterRuns(raw);
        const fmap = buildFieldMap(clustered);
        // Start the PDF blank: every non-template cluster gets an empty
        // override. Form values then fill in over the blanks.
        const initialBlanks: Record<number, string> = {};
        clustered.forEach((c) => {
          if (!isStaticTemplateText(c)) initialBlanks[c.index] = "";
        });
        if (!cancelled) {
          setItems(clustered);
          setFieldMap(fmap);
          setOverrides(initialBlanks);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load PDF.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, scale]);

  // Push form-driven values into the override map for matched cluster indexes.
  // Undefined values are skipped (the blank-by-default override stays in
  // place); empty strings explicitly clear the field.
  useEffect(() => {
    if (!Object.keys(fieldMap).length) return;
    setOverrides((prev) => {
      const next = { ...prev };
      (Object.keys(fieldMap) as FieldKey[]).forEach((key) => {
        const idx = fieldMap[key];
        if (idx == null) return;
        const v = values?.[key];
        if (v != null) next[idx] = v;
      });
      return next;
    });
  }, [values, fieldMap]);

  // Re-paint canvas: baseline + override text on top.
  useEffect(() => {
    const canvas = canvasRef.current;
    const baseline = baselineRef.current;
    if (!canvas || !baseline) return;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(baseline, 0, 0);

    Object.entries(overrides).forEach(([idxStr, newStr]) => {
      const item = items[Number(idxStr)];
      if (!item) return;
      ctx.font = `${item.fontSize}px Helvetica, Arial, sans-serif`;
      const measured = ctx.measureText(newStr).width;
      const padX = 2;
      const padY = 2;
      ctx.fillStyle = "white";
      ctx.fillRect(
        item.x - padX,
        item.y - padY,
        Math.max(item.width, measured) + padX * 2,
        item.height + padY * 2,
      );
      ctx.fillStyle = "#1a1a1a";
      // Align the baseline with where the PDF text sits, not the em-box top —
      // visually consistent across font metrics.
      ctx.textBaseline = "alphabetic";
      ctx.fillText(newStr, item.x, item.y + item.fontSize);
    });
    onChange?.(overrides);
  }, [overrides, items]);

  function pointToCanvasCoords(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  }

  function findHit(x: number, y: number): TextItemBox | null {
    const hits = items.filter(
      (it) =>
        x >= it.x - 2 &&
        x <= it.x + it.width + 6 &&
        y >= it.y - 2 &&
        y <= it.y + it.height + 2,
    );
    if (!hits.length) return null;
    return hits.sort((a, b) => a.width * a.height - b.width * b.height)[0];
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const p = pointToCanvasCoords(e.clientX, e.clientY);
    if (!p) return;
    const hit = findHit(p.x, p.y);
    if (hit) setEditingIndex(hit.index);
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const p = pointToCanvasCoords(e.clientX, e.clientY);
    if (!p) return;
    const hit = findHit(p.x, p.y);
    setHoverIndex(hit ? hit.index : null);
  }

  const editing = editingIndex !== null ? items[editingIndex] : null;
  const hover =
    hoverIndex !== null && hoverIndex !== editingIndex
      ? items[hoverIndex]
      : null;

  return (
    <div
      className="relative inline-block bg-white shadow-sm"
      style={{ width: pageDims?.w, height: pageDims?.h }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 gap-2">
          <Spinner size={16} className="animate-spin" /> Loading PDF…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500 p-6 text-center">
          {error}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoverIndex(null)}
        className="block"
        style={{
          width: pageDims?.w,
          height: pageDims?.h,
          cursor: hover ? "text" : "default",
        }}
      />

      {/* Hover halo so users see what's clickable */}
      {hover && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: hover.x - 2,
            top: hover.y - 2,
            width: hover.width + 6,
            height: hover.height + 4,
            background: "rgba(66, 133, 244, 0.12)",
            border: "1px dashed rgba(66, 133, 244, 0.6)",
            borderRadius: 2,
          }}
        />
      )}

      {editing && (
        <input
          autoFocus
          value={overrides[editing.index] ?? editing.str}
          onChange={(e) =>
            setOverrides((o) => ({ ...o, [editing.index]: e.target.value }))
          }
          onBlur={() => setEditingIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              setEditingIndex(null);
            }
          }}
          style={{
            position: "absolute",
            left: editing.x - 3,
            top: editing.y - 3,
            height: editing.height + 6,
            minWidth: Math.max(editing.width + 12, 60),
            fontSize: editing.fontSize,
            lineHeight: `${editing.height}px`,
            padding: "1px 3px",
            border: "1px solid #4285f4",
            outline: "none",
            background: "white",
            color: "#1a1a1a",
            fontFamily: "Helvetica, Arial, sans-serif",
            boxShadow: "0 0 0 2px rgba(66, 133, 244, 0.2)",
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
}
