import React, { useState, useEffect, useCallback, useMemo } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import {
  Plus,
  MagnifyingGlass,
  ArrowDown,
  ArrowUp,
  ArrowsLeftRight,
  ArrowsCounterClockwise,
  Clipboard,
  Spinner,
  CaretLeft,
  CaretRight,
  Truck,
  Receipt,
  UserCircle,
  Scales,
  Hammer,
} from "@phosphor-icons/react";
import {
  apiListMovements,
  apiCreateMovement,
  apiCreateTransfer,
  apiListStockItems,
  apiGetStockItemById,
  apiListWarehouses,
  apiListPurchaseOrders,
  apiListTrucks,
  apiListSuppliers,
  apiListProducts,
  apiListInventoryDocs,
  apiCreateInventoryDoc,
  StockMovement,
  StockItem,
  Warehouse,
  PurchaseOrder,
  Supplier,
  Product,
  InventoryDoc,
  Truck as TruckType,
} from "../../lib/api";
import SearchSelect, {
  SearchSelectOption,
} from "../../components/ui/SearchSelect";
import DocumentSidePanel from "../../components/DocumentSidePanel";
import ColumnSelector, {
  useColumnVisibility,
  ColDef,
} from "../../components/ui/ColumnSelector";

const MOVEMENT_TABS = [
  { id: "", label: "All" },
  { id: "INBOUND", label: "Inbound" },
  { id: "OUTBOUND", label: "Outbound" },
  { id: "TRANSFER_IN,TRANSFER_OUT", label: "Transfers" },
];

const TYPE_META: Record<
  string,
  { label: string; style: string; dot: string; Icon: React.ComponentType<any> }
> = {
  INBOUND: {
    label: "Inbound",
    style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
    Icon: ArrowDown,
  },
  OUTBOUND: {
    label: "Outbound",
    style: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    dot: "bg-rose-400",
    Icon: ArrowUp,
  },
  TRANSFER_OUT: {
    label: "Transfer Out",
    style: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
    Icon: ArrowsLeftRight,
  },
  TRANSFER_IN: {
    label: "Transfer In",
    style: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    dot: "bg-teal-400",
    Icon: ArrowsLeftRight,
  },
  ADJUSTMENT: {
    label: "Adjustment",
    style: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    dot: "bg-amber-500",
    Icon: ArrowsCounterClockwise,
  },
  STOCK_COUNT: {
    label: "Stock Count",
    style: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dot: "bg-purple-400",
    Icon: Clipboard,
  },
  RETURN: {
    label: "Return",
    style: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dot: "bg-orange-400",
    Icon: ArrowDown,
  },
};

const TRANSPORT_METHODS = [
  "Factory Delivery",
  "Direct Transport",
  "Third-Party Logistics",
  "Company Fleet",
  "Other",
];

interface NewMovementDraft {
  mode: "inbound" | "outbound" | "transfer";
  stockItemId: string;
  warehouseId: string;
  productId: string;
  qty: number;
  unitCost: number;
  reason: string;
  notes: string;
  destinationWarehouseId: string;
  // Inbound / weighbridge fields
  linkedPoId: string;
  linkedPoRef: string;
  supplierId: string;
  supplierName: string;
  supplierTin: string;
  supplierVrn: string;
  supplierPhone: string;
  grossWeight: string;
  tareWeight: string;
  deductionWeight: string;
  transportMethod: string;
  truckPlate: string;
  driverName: string;
  pickupCode: string;
  deliveryTime: string;
  remark: string;
  selectedPoLineIdx?: number;
  // Processing / site costs
  crusherCost: string;
  samplingCost: string;
  otherProcessingCost: string;
  otherProcessingDescription: string;
  // Source supporting doc — uploaded after the movement is created
  sourceImage: File | null;
  sourceDocType: 'Invoice' | 'Receipt' | 'Waybill' | 'Weighbridge';
}

function emptyDraft(): NewMovementDraft {
  return {
    mode: "inbound",
    stockItemId: "",
    warehouseId: "",
    productId: "",
    qty: 0,
    reason: "",
    notes: "",
    destinationWarehouseId: "",
    linkedPoId: "",
    linkedPoRef: "",
    supplierId: "",
    supplierName: "",
    supplierTin: "",
    supplierVrn: "",
    supplierPhone: "",
    grossWeight: "",
    tareWeight: "",
    deductionWeight: "0",
    transportMethod: "",
    truckPlate: "",
    driverName: "",
    pickupCode: "",
    deliveryTime: new Date().toISOString().slice(0, 16),
    remark: "",
    unitCost: 0,
    crusherCost: "",
    samplingCost: "",
    otherProcessingCost: "",
    otherProcessingDescription: "",
    sourceImage: null,
    sourceDocType: 'Weighbridge',
  };
}

const inp =
  "w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors";
const inpReadonly =
  "w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-sm text-t2 outline-none cursor-default";

const MOV_COLS: ColDef[] = [
  { key: "plate", label: "Plate No.", defaultVisible: true },
  { key: "type", label: "Type", defaultVisible: true },
  { key: "product", label: "Product", defaultVisible: true },
  { key: "warehouse", label: "Warehouse", defaultVisible: true },
  { key: "qty", label: "Net / Qty", defaultVisible: true },
  { key: "balance", label: "Before → After", defaultVisible: true },
  { key: "supplier", label: "Supplier / Truck", defaultVisible: true },
  { key: "costs", label: "Processing Costs", defaultVisible: true },
  { key: "source", label: "Source", defaultVisible: true },
  { key: "posted", label: "Posted", defaultVisible: true },
];

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [movementDocs, setMovementDocs] = useState<Record<string, InventoryDoc[]>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 50;
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<NewMovementDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const { visible: colVis, toggle: colToggle } = useColumnVisibility(
    "movements",
    MOV_COLS,
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_LIMIT),
    };
    if (search) params.search = search;
    if (activeTab) params.movementType = activeTab;
    const [movRes, siRes, whRes] = await Promise.all([
      apiListMovements(params),
      apiListStockItems({ limit: "200" }),
      apiListWarehouses(),
    ]);
    if (movRes.success) {
      setMovements(movRes.data.movements);
      setTotal(movRes.data.pagination.total);
      const ids = movRes.data.movements.map(m => m._id);
      if (ids.length > 0) {
        apiListInventoryDocs({ movement_ids: ids.join(','), limit: '500' }).then(dr => {
          if (!dr.success) return;
          const grouped: Record<string, InventoryDoc[]> = {};
          for (const d of dr.data.documents) {
            (grouped[d.movement_id] ||= []).push(d);
          }
          setMovementDocs(grouped);
        });
      } else {
        setMovementDocs({});
      }
    }
    if (siRes.success) setStockItems(siRes.data.items);
    if (whRes.success) setWarehouses(whRes.data.warehouses);
    setLoading(false);
  }, [search, activeTab, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Load POs, suppliers, and trucks once on mount (for the form)
  useEffect(() => {
    Promise.all([
      apiListPurchaseOrders({ limit: "200" }).then(
        (r) => r.success && setPurchaseOrders(r.data.orders),
      ),
      apiListSuppliers().then(
        (r) => r.success && setSuppliers(r.data.suppliers),
      ),
      apiListProducts({ limit: "200" }).then(
        (r) => r.success && setProducts(r.data.products),
      ),
      apiListTrucks().then((r) => r.success && setTrucks(r.data.trucks)),
    ]);
  }, []);

  function upd(patch: Partial<NewMovementDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  async function ensureStockItemLoaded(id: string) {
    if (!id || stockItems.some((si) => si._id === id)) return;
    const res = await apiGetStockItemById(id);
    if (res.success) setStockItems((prev) => [...prev, res.data.item]);
  }

  // Computed net weight from weighbridge inputs
  const gross = parseFloat(draft.grossWeight) || 0;
  const tare = parseFloat(draft.tareWeight) || 0;
  const deduction = parseFloat(draft.deductionWeight) || 0;
  const netWeight = Math.max(0, +(gross - tare).toFixed(4));
  const weightReady = gross > 0 && tare > 0;

  // Option lists
  const stockOptions = useMemo<SearchSelectOption[]>(
    () =>
      stockItems.map((si) => ({
        value: si._id,
        label: si.name,
        sublabel: si.itemCode,
        meta: si.warehouseName,
      })),
    [stockItems],
  );

  const poOptions = useMemo<SearchSelectOption[]>(
    () =>
      purchaseOrders.map((po) => ({
        value: po._id,
        label: po.poRef,
        sublabel: po.supplierName,
        meta: po.procurementType,
      })),
    [purchaseOrders],
  );

  const supplierOptions = useMemo<SearchSelectOption[]>(
    () =>
      suppliers.map((s) => ({
        value: s._id,
        label: s.name,
        sublabel: s.supplierCode,
        meta: s.country,
      })),
    [suppliers],
  );

  const productOptions = useMemo<SearchSelectOption[]>(
    () =>
      products.map((p) => ({
        value: p._id,
        label: p.name,
        meta: `${p.cost_per_unit.toLocaleString()} ${p.currency}`,
      })),
    [products],
  );

  const warehouseOptions = useMemo<SearchSelectOption[]>(
    () =>
      warehouses.map((w) => {
        const pct = w.totalCapacity > 0
          ? +((w.currentQty / w.totalCapacity) * 100).toFixed(0)
          : 0;
        return {
          value: w._id,
          label: w.name,
          sublabel: w.warehouseCode,
          meta: `${pct}% used`,
        };
      }),
    [warehouses],
  );

  const truckOptions = useMemo<SearchSelectOption[]>(
    () =>
      trucks.map((t) => ({
        value: t._id,
        label: t.plateNumber,
        sublabel: t.assignedDriverName || "No driver assigned",
        meta: `${t.make} ${t.model}`,
      })),
    [trucks],
  );

  const selectedStock = stockItems.find((s) => s._id === draft.stockItemId);
  const destWhOptions = useMemo<SearchSelectOption[]>(
    () =>
      warehouses
        .filter((w) => w._id !== (selectedStock as any)?.warehouseId)
        .map((w) => ({
          value: w._id,
          label: w.name,
          sublabel: w.warehouseCode,
        })),
    [warehouses, selectedStock],
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    let res: any;

    const qty = weightReady ? netWeight : draft.qty;
    if (qty <= 0) {
      setError("Quantity must be greater than 0.");
      setSaving(false);
      return;
    }

    const commonMovementFields = {
      warehouseId: draft.warehouseId || selectedStock?.warehouseId || '',
      stockItemId: draft.stockItemId || undefined,
      productId: draft.productId || undefined,
      qty,
      unitCost: draft.unitCost || undefined,
      sourceRef: draft.linkedPoRef || "Manual entry",
      reason: draft.reason || undefined,
      notes: draft.notes || undefined,
      linkedPoId: draft.linkedPoId || undefined,
      linkedPoRef: draft.linkedPoRef || undefined,
      supplierName: draft.supplierName || undefined,
      supplierTin: draft.supplierTin || undefined,
      supplierVrn: draft.supplierVrn || undefined,
      supplierPhone: draft.supplierPhone || undefined,
      grossWeight: gross || undefined,
      tareWeight: tare || undefined,
      deductionWeight: deduction || undefined,
      netWeight: weightReady ? netWeight : undefined,
      transportMethod: draft.transportMethod || undefined,
      truckPlate: draft.truckPlate || undefined,
      driverName: draft.driverName || undefined,
      pickupCode: draft.pickupCode || undefined,
      deliveryTime: draft.deliveryTime || undefined,
      remark: draft.remark || undefined,
      crusherCost: draft.crusherCost
        ? parseFloat(draft.crusherCost)
        : undefined,
      samplingCost: draft.samplingCost
        ? parseFloat(draft.samplingCost)
        : undefined,
      otherProcessingCost: draft.otherProcessingCost
        ? parseFloat(draft.otherProcessingCost)
        : undefined,
      otherProcessingDescription: draft.otherProcessingDescription || undefined,
    };

    if (draft.mode === "transfer") {
      if (!draft.destinationWarehouseId) {
        setError("Destination warehouse is required.");
        setSaving(false);
        return;
      }
      res = await apiCreateTransfer({
        qty,
        destinationWarehouseId: draft.destinationWarehouseId,
        notes: draft.notes || undefined,
      });
    } else if (draft.mode === "outbound") {
      res = await apiCreateMovement({
        movementType: "OUTBOUND",
        ...commonMovementFields,
      });
    } else {
      res = await apiCreateMovement({
        movementType: "INBOUND",
        ...commonMovementFields,
      });
    }

    if (!res.success) {
      setSaving(false);
      setError((res as any).message || "Movement failed.");
      return;
    }

    // Movement saved — upload the source image if the user attached one.
    // The transfer endpoint returns { transfer: { ... } } not { movement },
    // so we only attach to direct movements.
    const newMovementId = res.data?.movement?._id;
    if (draft.sourceImage && newMovementId) {
      const docRes = await apiCreateInventoryDoc({
        movement_id: newMovementId,
        doc_type: draft.sourceDocType,
        image: draft.sourceImage,
      });
      if (!docRes.success) {
        setSaving(false);
        setError(`Movement saved, but image upload failed: ${(docRes as any).message || 'unknown error'}`);
        load();
        return;
      }
    }

    setSaving(false);
    setPanelOpen(false);
    setDraft(emptyDraft());
    load();
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ─── Mode toggle buttons ────────────────────────────────────────────────────

  const modeBtn = (mode: NewMovementDraft["mode"], label: string) => (
    <button
      onClick={() => upd({ mode })}
      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
        draft.mode === mode
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-t2 hover:text-t1 hover:border-border"
      }`}
    >
      {label}
    </button>
  );

  // ─── Form ───────────────────────────────────────────────────────────────────

  const formContent = (
    <div className="space-y-5 pb-10">
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* Mode selector */}
      <div className="flex gap-2">
        {modeBtn("inbound", "Inbound")}
        {modeBtn("outbound", "Outbound")}
        {modeBtn("transfer", "Transfer")}
      </div>

      {/* ── Purchase Order ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest flex items-center gap-1.5">
          <Receipt size={11} weight="duotone" /> Purchase Order
        </p>
        <SearchSelect
          label="Link to PO (optional)"
          options={poOptions}
          value={draft.linkedPoId || null}
          onChange={(val, opt) => {
            if (!val) {
              upd({
                linkedPoId: "",
                linkedPoRef: "",
                supplierId: "",
                supplierName: "",
                supplierPhone: "",
                selectedPoLineIdx: undefined,
                stockItemId: "",
                warehouseId: "",
                productId: "",
                unitCost: 0,
                qty: 0,
              });
              return;
            }
            const po = purchaseOrders.find((p) => p._id === val);
            const firstLine = po?.lineItems?.[0];
            const poSupplier = suppliers.find((s) => s._id === po?.supplierId);
            upd({
              linkedPoId: val,
              linkedPoRef: opt?.label || "",
              supplierId: po?.supplierId || "",
              supplierName: po?.supplierName || "",
              supplierPhone: poSupplier?.contactPhone || "",
              selectedPoLineIdx:
                po?.lineItems && po.lineItems.length > 0 ? 0 : undefined,
              stockItemId: "",
              // Resolve the destination warehouse via PO → supplier default →
              // empty (user picks manually). Without this, an inbound on a PO
              // missing destinationWarehouseId would post with warehouseId=null
              // and the warehouse usedPct wouldn't move.
              warehouseId:
                po?.destinationWarehouseId
                || poSupplier?.defaultWarehouseId
                || "",
              productId: firstLine?.productId || "",
              unitCost: firstLine?.unitPrice ?? 0,
              qty: firstLine?.orderedQty ?? 0,
            });
          }}
          placeholder="Search PO reference..."
        />

        {draft.linkedPoId &&
          (() => {
            const po = purchaseOrders.find((p) => p._id === draft.linkedPoId);
            if (!po) return null;
            return (
              <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-t3">Type</span>
                  <span className="text-t1 capitalize">
                    {po.procurementType.replace("_", " ")}
                  </span>
                </div>
                {po.expectedDeliveryDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-t3">Expected</span>
                    <span className="text-t1">
                      {new Date(po.expectedDeliveryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-t3">Ordered Qty</span>
                  <span className="text-t1 font-medium">
                    {po.totalOrderedQty} {po.lineItems[0]?.unit ?? ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-t3">Value</span>
                  <span className="text-t1 font-medium">
                    {po.currency} {po.totalValueWithTax.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-t3">Warehouse</span>
                  <span className="text-t1 font-medium">
                    {warehouses.find((w) => w._id === draft.warehouseId)?.name
                      || "— not set on PO —"}
                  </span>
                </div>
              </div>
            );
          })()}

        {draft.linkedPoId &&
          purchaseOrders.find((p) => p._id === draft.linkedPoId)?.lineItems
            .length! > 1 && (
            <div>
              <label className="block text-[10px] text-t3 mb-1">
                Select PO Item
              </label>
              <select
                className={inp}
                value={draft.selectedPoLineIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  const po = purchaseOrders.find(
                    (p) => p._id === draft.linkedPoId,
                  );
                  const li = po?.lineItems[idx];
                  upd({
                    selectedPoLineIdx: idx,
                    stockItemId: "",
                    productId: li?.productId || "",
                    unitCost: li?.unitPrice ?? 0,
                    qty: li?.orderedQty ?? 0,
                  });
                }}
              >
                {purchaseOrders
                  .find((p) => p._id === draft.linkedPoId)
                  ?.lineItems.map((li, idx) => (
                    <option key={idx} value={idx}>
                      {li.description} ({li.orderedQty} {li.unit})
                    </option>
                  ))}
              </select>
            </div>
          )}
      </section>

      {/* ── Supplier ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest flex items-center gap-1.5">
          <UserCircle size={11} weight="duotone" /> Supplier
        </p>
        <div>
          <label className="block text-[10px] text-t3 mb-1">
            Supplier Name
          </label>
          <SearchSelect
            options={supplierOptions}
            value={draft.supplierId || null}
            onChange={(val, opt) => {
              const sup = suppliers.find((s) => s._id === val);
              upd({
                supplierId: val || "",
                supplierName: opt?.label || "",
                supplierPhone: sup?.contactPhone || draft.supplierPhone,
              });
            }}
            placeholder="Search supplier..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">TIN</label>
            <input
              className={inp}
              value={draft.supplierTin}
              onChange={(e) => upd({ supplierTin: e.target.value })}
              placeholder="—"
            />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">VRN</label>
            <input
              className={inp}
              value={draft.supplierVrn}
              onChange={(e) => upd({ supplierVrn: e.target.value })}
              placeholder="—"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Phone</label>
          <input
            className={inp}
            value={draft.supplierPhone}
            onChange={(e) => upd({ supplierPhone: e.target.value })}
            placeholder="—"
          />
        </div>
        {(() => {
          const sup = suppliers.find((s) => s._id === draft.supplierId);
          if (!sup || sup.hasCrusher !== false) return null;
          return (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
              <Hammer size={14} weight="duotone" className="text-amber-500 mt-0.5 shrink-0" />
              <div className="text-amber-200 leading-relaxed">
                <span className="font-bold">{sup.name}</span> delivers <span className="font-bold">uncrushed</span> material.
                Pick a <span className="font-bold">Crushing Site</span> as the destination below. Once it's processed, use
                <span className="font-bold"> Transfer</span> to move it to a regular warehouse.
              </div>
            </div>
          );
        })()}
      </section>

      {/* ── Warehouse & Product ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">
          Warehouse &amp; Product
        </p>

        <SearchSelect
          label="Warehouse"
          options={warehouseOptions}
          value={draft.warehouseId || null}
          onChange={(v) => upd({ warehouseId: v ?? "" })}
          placeholder="Search warehouse..."
        />

        <SearchSelect
          label="Item"
          options={stockOptions}
          value={draft.stockItemId || null}
          onChange={(v) => {
            const si = stockItems.find((s) => s._id === v);
            upd({
              stockItemId: v ?? "",
              warehouseId: draft.warehouseId || si?.warehouseId || "",
            });
          }}
          placeholder="Search item..."
        />

        {draft.linkedPoId &&
          (() => {
            const po = purchaseOrders.find((p) => p._id === draft.linkedPoId);
            const li = po?.lineItems[draft.selectedPoLineIdx ?? 0];
            if (!li) return null;
            return (
              <div className="rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs space-y-0.5">
                <p className="text-t2 font-medium">
                  PO line: {li.productName || li.description}
                </p>
                <div className="flex items-center gap-3 text-t3">
                  {li.itemCode && <span>{li.itemCode}</span>}
                  <span>
                    {li.orderedQty} {li.unit} ordered ·{" "}
                    {li.unitPrice?.toLocaleString() ?? "0"} / {li.unit}
                  </span>
                </div>
              </div>
            );
          })()}

        {draft.mode === "transfer" && (
          <>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
              <Hammer size={14} weight="duotone" className="text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-emerald-200 leading-relaxed">
                Use <span className="font-bold">Transfer</span> to move material from a <span className="font-bold">Crushing Site</span> to a regular warehouse once it has been processed,
                or to rebalance stock between any two warehouses.
              </div>
            </div>
            <SearchSelect
              label="Destination Warehouse *"
              options={destWhOptions}
              value={draft.destinationWarehouseId || null}
              onChange={(v) => upd({ destinationWarehouseId: v ?? "" })}
              placeholder="Select destination..."
              clearable={false}
            />
          </>
        )}
      </section>

      {/* ── Source Document (image upload) ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest flex items-center gap-1.5">
          <Receipt size={11} weight="duotone" /> Source Document
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">Document Type</label>
            <select
              className={inp}
              value={draft.sourceDocType}
              onChange={(e) => upd({ sourceDocType: e.target.value as NewMovementDraft['sourceDocType'] })}
            >
              <option value="Weighbridge">Weighbridge</option>
              <option value="Receipt">Receipt</option>
              <option value="Invoice">Invoice</option>
              <option value="Waybill">Waybill</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              className={`${inp} file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-accent/10 file:text-accent file:text-xs file:font-semibold cursor-pointer`}
              onChange={(e) => upd({ sourceImage: e.target.files?.[0] || null })}
            />
          </div>
        </div>
        {draft.sourceImage && (
          <div className="flex items-center gap-3 p-2 bg-surface/50 border border-border rounded-lg">
            <img
              src={URL.createObjectURL(draft.sourceImage)}
              alt="preview"
              className="w-16 h-16 rounded object-cover border border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-t1 truncate font-medium">{draft.sourceImage.name}</p>
              <p className="text-[10px] text-t3">{(draft.sourceImage.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={() => upd({ sourceImage: null })}
              className="text-t3 hover:text-rose-400 text-xs"
            >
              Remove
            </button>
          </div>
        )}
      </section>

      {/* ── Weighbridge & Quantity ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest flex items-center gap-1.5">
          <Scales size={11} weight="duotone" /> Weighbridge &amp; Quantity
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              Gross Weight (tons)
            </label>
            <input
              type="number"
              min={0}
              step={0.001}
              className={inp}
              value={draft.grossWeight}
              onChange={(e) => upd({ grossWeight: e.target.value })}
              placeholder="e.g. 46.87"
            />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              Tare Weight (tons)
            </label>
            <input
              type="number"
              min={0}
              step={0.001}
              className={inp}
              value={draft.tareWeight}
              onChange={(e) => upd({ tareWeight: e.target.value })}
              placeholder="e.g. 18.89"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              Deduction (tons)
            </label>
            <input
              type="number"
              min={0}
              step={0.001}
              className={inp}
              value={draft.deductionWeight}
              onChange={(e) => upd({ deductionWeight: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              Quantity *
              {weightReady && (
                <span className="text-emerald-400 ml-1">· weighbridge</span>
              )}
            </label>
            {weightReady ? (
              <div className="px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                {netWeight} tons
              </div>
            ) : (
              <input
                type="number"
                min={0.001}
                step={0.001}
                className={inp}
                value={draft.qty || ""}
                onChange={(e) => upd({ qty: Number(e.target.value) })}
                placeholder="Enter quantity"
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Transport ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest flex items-center gap-1.5">
          <Truck size={11} weight="duotone" /> Transport
        </p>

        <SearchSelect
          label="Truck / License Plate"
          options={truckOptions}
          value={null}
          onChange={(val, opt) => {
            const truck = trucks.find((t) => t._id === val);
            upd({
              truckPlate: truck?.plateNumber || opt?.label || "",
              driverName: truck?.assignedDriverName || "",
            });
          }}
          placeholder="Search plate number..."
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              License Plate
            </label>
            <input
              className={inp}
              value={draft.truckPlate}
              onChange={(e) => upd({ truckPlate: e.target.value })}
              placeholder="e.g. T841ELA"
            />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              Driver Name
            </label>
            <input
              className={inp}
              value={draft.driverName}
              onChange={(e) => upd({ driverName: e.target.value })}
              placeholder="Auto-filled from truck"
            />
          </div>
        </div>
      </section>

      {/* ── Details ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest">
          Details
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              Pickup Code
            </label>
            <input
              className={inp}
              value={draft.pickupCode}
              onChange={(e) => upd({ pickupCode: e.target.value })}
              placeholder="e.g. 311D6267"
            />
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">
              Delivery Time
            </label>
            <input
              type="datetime-local"
              className={inp}
              value={draft.deliveryTime}
              onChange={(e) => upd({ deliveryTime: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Reason</label>
          <input
            className={inp}
            value={draft.reason}
            onChange={(e) => upd({ reason: e.target.value })}
            placeholder={
              draft.mode === "outbound"
                ? "e.g. Issued to site"
                : draft.mode === "transfer"
                  ? "e.g. Stock rebalancing"
                  : "e.g. Purchase receipt"
            }
          />
        </div>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Remark</label>
          <input
            className={inp}
            value={draft.remark}
            onChange={(e) => upd({ remark: e.target.value })}
            placeholder="—"
          />
        </div>
        <div>
          <label className="block text-[10px] text-t3 mb-1">Notes</label>
          <textarea
            rows={2}
            className={`${inp} resize-none`}
            value={draft.notes}
            onChange={(e) => upd({ notes: e.target.value })}
          />
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-h transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saving && <Spinner className="animate-spin" size={14} />}
        Post Movement
      </button>
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-t1">Stock Movements</h1>
            <p className="text-sm text-t3 mt-1">
              Immutable movement ledger — {total.toLocaleString()} records
            </p>
          </div>
          <button
            onClick={() => {
              setDraft(emptyDraft());
              setError(null);
              setPanelOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-h transition-colors"
          >
            <Plus size={16} /> New Movement
          </button>
        </div>

        <div className="bg-card rounded-xl border border-border">
          <div className="flex gap-1 px-4 border-b border-border overflow-x-auto">
            {MOVEMENT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? "border-accent text-accent font-semibold" : "border-transparent text-t3 hover:text-t1"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-t3"
              />
              <input
                className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-t1 placeholder-t3 outline-none focus:border-accent transition-colors"
                placeholder="Search ref, product, source..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <ColumnSelector
              cols={MOV_COLS}
              visible={colVis}
              onToggle={colToggle}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Spinner size={28} className="animate-spin text-accent" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-t3">
              <ArrowsCounterClockwise size={40} className="mb-2 opacity-40" />
              <p>No movements found.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent
              options={{ scrollbars: { autoHide: "never" } }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    {colVis.has("plate") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Plate No.
                      </th>
                    )}
                    {colVis.has("type") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Type
                      </th>
                    )}
                    {colVis.has("product") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Product
                      </th>
                    )}
                    {colVis.has("warehouse") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Warehouse
                      </th>
                    )}
                    {colVis.has("qty") && (
                      <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Net / Qty
                      </th>
                    )}
                    {colVis.has("balance") && (
                      <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Before → After
                      </th>
                    )}
                    {colVis.has("supplier") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Supplier / Truck
                      </th>
                    )}
                    {colVis.has("costs") && (
                      <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Processing Costs
                      </th>
                    )}
                    {colVis.has("source") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Source
                      </th>
                    )}
                    {colVis.has("posted") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Posted
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((m) => {
                    const meta = TYPE_META[m.movementType] ?? {
                      label: m.movementType,
                      style: "bg-surface text-t3 border-border",
                      dot: "bg-t3",
                      Icon: ArrowsCounterClockwise,
                    };
                    const totalProcessing =
                      (m.crusherCost ?? 0) +
                      (m.samplingCost ?? 0) +
                      (m.otherProcessingCost ?? 0);
                    return (
                      <tr
                        key={m._id}
                        className="hover:bg-surface transition-colors"
                      >
                        {colVis.has("plate") && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {m.truckPlate ? (
                              <span className="font-mono text-sm font-semibold text-accent">
                                {m.truckPlate}
                              </span>
                            ) : (
                              <span className="text-t3 text-xs">—</span>
                            )}
                          </td>
                        )}
                        {colVis.has("type") && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium ${meta.style}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}
                              />
                              {meta.label}
                            </span>
                          </td>
                        )}
                        {colVis.has("product") && (
                          <td className="px-4 py-3.5">
                            <p className="text-t1 font-medium">{m.itemName}</p>
                            <p className="text-xs text-t3">{m.itemCode}</p>
                          </td>
                        )}
                        {colVis.has("warehouse") && (
                          <td className="px-4 py-3.5 text-t2 whitespace-nowrap">
                            {m.warehouseName}
                          </td>
                        )}
                        {colVis.has("qty") && (
                          <td className="px-4 py-3.5 text-right font-medium text-t1 whitespace-nowrap">
                            {m.netWeight != null ? (
                              <div>
                                <span className="text-emerald-400 font-bold">
                                  {m.netWeight} t
                                </span>
                                <div className="text-[10px] text-t3">
                                  {m.qty > 0 ? "+" : ""}
                                  {m.qty}
                                </div>
                              </div>
                            ) : (
                              <span>
                                {m.qty > 0 ? "+" : ""}
                                {m.qty.toLocaleString()}
                              </span>
                            )}
                          </td>
                        )}
                        {colVis.has("balance") && (
                          <td className="px-4 py-3.5 text-right text-xs text-t3 whitespace-nowrap">
                            {m.qtyBefore != null && m.qtyAfter != null
                              ? `${m.qtyBefore.toLocaleString()} → ${m.qtyAfter.toLocaleString()}`
                              : "—"}
                          </td>
                        )}
                        {colVis.has("supplier") && (
                          <td className="px-4 py-3.5">
                            {m.supplierName && (
                              <p className="text-xs text-t2">
                                {m.supplierName}
                              </p>
                            )}
                            {m.truckPlate && (
                              <p className="text-xs text-t3 flex items-center gap-1">
                                <Truck size={10} /> {m.truckPlate}
                                {m.driverName ? ` · ${m.driverName}` : ""}
                              </p>
                            )}
                            {!m.supplierName && !m.truckPlate && (
                              <span className="text-t3 text-xs">—</span>
                            )}
                          </td>
                        )}
                        {colVis.has("costs") && (
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            {totalProcessing > 0 ? (
                              <div>
                                <span className="text-amber-500 font-semibold text-sm">
                                  {totalProcessing.toLocaleString()}
                                </span>
                                <div className="text-[10px] text-t3 space-y-0.5 mt-0.5 text-left">
                                  {(m.crusherCost ?? 0) > 0 && (
                                    <p>
                                      Crusher: {m.crusherCost?.toLocaleString()}
                                    </p>
                                  )}
                                  {(m.samplingCost ?? 0) > 0 && (
                                    <p>
                                      Sampling:{" "}
                                      {m.samplingCost?.toLocaleString()}
                                    </p>
                                  )}
                                  {(m.otherProcessingCost ?? 0) > 0 && (
                                    <p>
                                      {m.otherProcessingDescription || "Other"}:{" "}
                                      {m.otherProcessingCost?.toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-t3 text-xs">—</span>
                            )}
                          </td>
                        )}
                        {colVis.has("source") && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {(() => {
                              const docs = movementDocs[m._id] || [];
                              const firstImg = docs.find(d => d.image_path);
                              if (firstImg) {
                                return (
                                  <button
                                    onClick={e => { e.stopPropagation(); setPreviewImageUrl(firstImg.image_path); }}
                                    title={`${docs.length} doc${docs.length > 1 ? 's' : ''} attached — click to preview`}
                                    className="inline-block cursor-pointer"
                                  >
                                    <img
                                      src={firstImg.image_path}
                                      alt={firstImg.doc_type || 'source'}
                                      className="w-12 h-12 rounded-md object-cover border border-border hover:border-accent transition-colors"
                                      onError={e => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </button>
                                );
                              }
                              if (m.linkedPoRef || m.sourceRef) {
                                return (
                                  <span className="text-t2 text-xs">
                                    {m.linkedPoRef ? (
                                      <span className="text-accent">{m.linkedPoRef}</span>
                                    ) : (
                                      m.sourceRef
                                    )}
                                  </span>
                                );
                              }
                              return (
                                <div className="w-12 h-12 rounded-md border border-dashed border-border flex items-center justify-center text-t3" title="No supporting doc">
                                  <Receipt size={16} weight="duotone" />
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        {colVis.has("posted") && (
                          <td className="px-4 py-3.5 text-xs text-t3 whitespace-nowrap">
                            {(() => {
                              const d = m.movementDate || m.createdAt;
                              if (!d) return <span>—</span>;
                              const dt = new Date(d);
                              if (isNaN(dt.getTime())) return <span>—</span>;
                              return (
                                <>
                                  <p>{dt.toLocaleDateString()}</p>
                                  <p className="text-t3/70">
                                    {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </>
                              );
                            })()}
                            {m.postedBy && (
                              <p className="text-t3/60 mt-0.5">
                                {m.postedBy.fullName}
                              </p>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </OverlayScrollbarsComponent>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-t3">
                Page {page} of {totalPages} · {total.toLocaleString()} records
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors"
                >
                  <CaretLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface disabled:opacity-40 transition-colors"
                >
                  <CaretRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {panelOpen && (
        <DocumentSidePanel
          isOpen={true}
          onClose={() => {
            setPanelOpen(false);
            setError(null);
          }}
          title="New Movement"
          formContent={formContent}
          previewContent={null}
        />
      )}

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-zoom-out"
          onClick={() => setPreviewImageUrl(null)}
        >
          <img
            src={previewImageUrl}
            alt="Source document"
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </>
  );
}
