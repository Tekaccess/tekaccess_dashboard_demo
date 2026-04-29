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
  MapPin,
  PencilSimple,
  Trash,
  X,
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
  apiListSites,
  apiListStockRecords,
  apiGetMovementById,
  apiUpdateMovement,
  apiDeleteMovement,
  apiListInventoryDocs,
  apiCreateInventoryDoc,
  apiDeleteInventoryDoc,
  StockMovement,
  StockItem,
  Warehouse,
  PurchaseOrder,
  Supplier,
  Product,
  Site,
  StockRecord,
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
import { TableSkeleton } from "../../components/ui/Skeleton";

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
  // Outbound destination — a Loading Site (operations.sites with siteType='loading')
  destinationSiteId: string;
  destinationSiteName: string;
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
  sourceDocType: "Invoice" | "Receipt" | "Waybill" | "Weighbridge" | "Site Photo";
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
    destinationSiteId: "",
    destinationSiteName: "",
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
    sourceDocType: "Weighbridge",
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
  { key: "supplier", label: "Supplier / Truck", defaultVisible: true },
  { key: "source", label: "Source", defaultVisible: true },
  { key: "posted", label: "Posted", defaultVisible: true },
  { key: "actions", label: "Actions", defaultVisible: true },
];

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  // The stock record matched to the linked PO — used to honour its routeStops
  // (crushing-site detour) when defaulting the Inbound destination warehouse.
  // Cleared whenever the PO link clears.
  const [linkedRoute, setLinkedRoute] = useState<StockRecord | null>(null);
  // All stock records that have routeStops — small set, used by Transfer mode
  // to detect "this source warehouse is someone's crushing-site stop" and
  // suggest the next destination automatically.
  const [routedRecords, setRoutedRecords] = useState<StockRecord[]>([]);
  // Map of movement_id → docs[] so the Source column can render a thumbnail
  // of the first attached image without a per-row fetch.
  const [movementDocs, setMovementDocs] = useState<
    Record<string, InventoryDoc[]>
  >({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_LIMIT = 50;
  const [panelOpen, setPanelOpen] = useState(false);
  // When set, the form panel is editing an existing movement (PATCH)
  // instead of creating a new one (POST).
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewMovementDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  // Details / edit panel — shown when the user clicks a row.
  const [detailsMovement, setDetailsMovement] = useState<StockMovement | null>(null);
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState<Record<string, string>>({});
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsDeleteConfirm, setDetailsDeleteConfirm] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsRefreshing, setDetailsRefreshing] = useState(false);
  // Add-document state — used when the user attaches a source doc post-hoc.
  const [docUploadType, setDocUploadType] = useState<'Weighbridge' | 'Receipt' | 'Invoice' | 'Waybill' | 'Site Photo'>('Weighbridge');
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docDeleteId, setDocDeleteId] = useState<string | null>(null);
  const [docDeleting, setDocDeleting] = useState(false);
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
      // Pull docs for the loaded movement IDs so the Source column can
      // thumbnail the first attached image without N round-trips.
      const ids = movRes.data.movements.map((m) => m._id);
      if (ids.length > 0) {
        apiListInventoryDocs({
          movement_ids: ids.join(","),
          limit: "500",
        }).then((dr) => {
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
      apiListSites().then((r) => r.success && setSites(r.data.sites)),
      apiListStockRecords({ limit: "200" }).then((r) => {
        if (!r.success) return;
        setRoutedRecords(
          r.data.records.filter((rec) => rec.routeStops?.length > 0),
        );
      }),
    ]);
  }, []);

  // For Transfer mode: detect when the chosen source warehouse is a stop on
  // some stock record's route. If so, that record's final warehouse is the
  // natural transfer destination. Returned as a structured match so the form
  // can both prefill and render a banner.
  const transferRouteMatch = useMemo(() => {
    if (draft.mode !== "transfer" || !draft.warehouseId) return null;
    return (
      routedRecords.find((rec) =>
        rec.routeStops?.some((s) => s.warehouseId === draft.warehouseId),
      ) || null
    );
  }, [draft.mode, draft.warehouseId, routedRecords]);

  // Auto-fill the transfer destination when a route match is found and the
  // user hasn't picked one yet.
  useEffect(() => {
    if (!transferRouteMatch) return;
    if (draft.destinationWarehouseId) return;
    setDraft((d) => ({
      ...d,
      destinationWarehouseId: transferRouteMatch.warehouse_id,
    }));
  }, [transferRouteMatch, draft.destinationWarehouseId]);

  // When a PO is linked, fetch the matching stock record to see if it has
  // a route detour (e.g. crushing site). If so, override the destination
  // warehouse to the first stop. The user can still change it.
  useEffect(() => {
    if (!draft.linkedPoId) {
      setLinkedRoute(null);
      return;
    }
    apiListStockRecords({ source_po_id: draft.linkedPoId, limit: "5" }).then(
      (r) => {
        if (!r.success) return;
        const withRoute = r.data.records.find(
          (rec) => rec.routeStops && rec.routeStops.length > 0,
        );
        if (withRoute) {
          setLinkedRoute(withRoute);
          // Only override if the user hasn't already manually picked a
          // different warehouse for this PO (i.e. matches the PO/supplier
          // default). Keeps the override non-destructive.
          const firstStop = withRoute.routeStops[0];
          setDraft((d) => ({ ...d, warehouseId: firstStop.warehouseId }));
        } else {
          setLinkedRoute(null);
        }
      },
    );
  }, [draft.linkedPoId]);

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
        const pct =
          w.totalCapacity > 0
            ? +((w.currentQty / w.totalCapacity) * 100).toFixed(0)
            : 0;
        const isCrushing = w.siteType === "crushing_site";
        return {
          value: w._id,
          label: isCrushing ? `🔨 ${w.name}` : w.name,
          sublabel: isCrushing
            ? `${w.warehouseCode} · Crushing Site`
            : w.warehouseCode,
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

  const loadingSiteOptions = useMemo<SearchSelectOption[]>(
    () =>
      sites
        .filter((s) => s.siteType?.includes("loading"))
        .map((s) => ({
          value: s._id,
          label: s.name,
          sublabel: s.siteCode,
          meta: s.region || s.country,
        })),
    [sites],
  );

  const selectedStock = stockItems.find((s) => s._id === draft.stockItemId);
  const destWhOptions = useMemo<SearchSelectOption[]>(
    () =>
      warehouses
        // Transfers always end in a Standard Warehouse — material is processed
        // out of the Crushing Site, never moved into another one.
        .filter((w) => w.siteType !== "crushing_site")
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

    // ── EDIT mode: PATCH only the editable metadata fields. Structural
    // fields (qty, warehouseId, type, PO link) are locked in the form, but
    // we don't send them to the backend either — the PATCH whitelist would
    // ignore them anyway.
    if (editingMovementId) {
      const num = (s: string) => (s === "" ? null : Number(s));
      res = await apiUpdateMovement(editingMovementId, {
        notes: draft.notes || null,
        remark: draft.remark || null,
        reason: draft.reason || null,
        supplierName: draft.supplierName || null,
        supplierTin: draft.supplierTin || null,
        supplierVrn: draft.supplierVrn || null,
        supplierPhone: draft.supplierPhone || null,
        truckPlate: draft.truckPlate || null,
        driverName: draft.driverName || null,
        transportMethod: draft.transportMethod || null,
        pickupCode: draft.pickupCode || null,
        deliveryTime: draft.deliveryTime || null,
        grossWeight: num(draft.grossWeight),
        tareWeight: num(draft.tareWeight),
        deductionWeight: num(draft.deductionWeight),
        netWeight: weightReady ? netWeight : null,
        crusherCost: num(draft.crusherCost),
        samplingCost: num(draft.samplingCost),
        otherProcessingCost: num(draft.otherProcessingCost),
        otherProcessingDescription: draft.otherProcessingDescription || null,
      });
      setSaving(false);
      if (!res.success) {
        setError((res as any).message || "Save failed.");
        return;
      }
      setEditingMovementId(null);
      setPanelOpen(false);
      setDraft(emptyDraft());
      load();
      return;
    }

    const qty = weightReady ? netWeight : draft.qty;
    if (qty <= 0) {
      setError("Quantity must be greater than 0.");
      setSaving(false);
      return;
    }

    const commonMovementFields = {
      warehouseId: draft.warehouseId || selectedStock?.warehouseId || "",
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
      // Outbound destination — passed through for the backend to persist
      // when a Loading Site is the drop-off point.
      destinationSiteId: draft.destinationSiteId || undefined,
      destinationSiteName: draft.destinationSiteName || undefined,
    } as any;

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
        setError(
          `Movement saved, but image upload failed: ${(docRes as any).message || "unknown error"}`,
        );
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

  // ── Details / Edit / Delete handlers ───────────────────────────────────────
  // Hydrate the inline draft from a movement so the metadata-edit form has
  // the latest values to show.
  function seedDetailsDraft(m: StockMovement) {
    setDetailsDraft({
      notes: m.notes ?? "",
      remark: m.remark ?? "",
      supplierName: m.supplierName ?? "",
      supplierTin: m.supplierTin ?? "",
      supplierVrn: m.supplierVrn ?? "",
      supplierPhone: m.supplierPhone ?? "",
      truckPlate: m.truckPlate ?? "",
      driverName: m.driverName ?? "",
      transportMethod: m.transportMethod ?? "",
      pickupCode: m.pickupCode ?? "",
      grossWeight: m.grossWeight != null ? String(m.grossWeight) : "",
      tareWeight: m.tareWeight != null ? String(m.tareWeight) : "",
      deductionWeight: m.deductionWeight != null ? String(m.deductionWeight) : "",
      crusherCost: m.crusherCost != null ? String(m.crusherCost) : "",
      samplingCost: m.samplingCost != null ? String(m.samplingCost) : "",
      otherProcessingCost: m.otherProcessingCost != null ? String(m.otherProcessingCost) : "",
      otherProcessingDescription: m.otherProcessingDescription ?? "",
    });
  }

  function openDetails(m: StockMovement) {
    // Show the cached row immediately for snappy feel, then refresh from
    // the server so any out-of-band edits show up.
    setDetailsMovement(m);
    setDetailsEditing(false);
    setDetailsDeleteConfirm(false);
    setDetailsError(null);
    setDocUploadFile(null);
    seedDetailsDraft(m);
    setDetailsRefreshing(true);
    Promise.all([
      apiGetMovementById(m._id),
      apiListInventoryDocs({ movement_ids: m._id, limit: "100" }),
    ]).then(([movRes, docRes]) => {
      if (movRes.success) {
        setDetailsMovement(movRes.data.movement);
        seedDetailsDraft(movRes.data.movement);
      }
      if (docRes.success) {
        setMovementDocs((prev) => ({
          ...prev,
          [m._id]: docRes.data.documents,
        }));
      }
      setDetailsRefreshing(false);
    });
  }

  function closeDetails() {
    setDetailsMovement(null);
    setDetailsEditing(false);
    setDetailsDeleteConfirm(false);
    setDetailsError(null);
  }

  function detailsUpd(patch: Record<string, string>) {
    setDetailsDraft((d) => ({ ...d, ...patch }));
  }

  async function saveDetailsEdit() {
    if (!detailsMovement) return;
    setDetailsSaving(true);
    setDetailsError(null);
    const num = (v: string) => (v === "" ? null : Number(v));
    const res = await apiUpdateMovement(detailsMovement._id, {
      notes: detailsDraft.notes || null,
      remark: detailsDraft.remark || null,
      supplierName: detailsDraft.supplierName || null,
      supplierTin: detailsDraft.supplierTin || null,
      supplierVrn: detailsDraft.supplierVrn || null,
      supplierPhone: detailsDraft.supplierPhone || null,
      truckPlate: detailsDraft.truckPlate || null,
      driverName: detailsDraft.driverName || null,
      transportMethod: detailsDraft.transportMethod || null,
      pickupCode: detailsDraft.pickupCode || null,
      grossWeight: num(detailsDraft.grossWeight),
      tareWeight: num(detailsDraft.tareWeight),
      deductionWeight: num(detailsDraft.deductionWeight),
      crusherCost: num(detailsDraft.crusherCost),
      samplingCost: num(detailsDraft.samplingCost),
      otherProcessingCost: num(detailsDraft.otherProcessingCost),
      otherProcessingDescription: detailsDraft.otherProcessingDescription || null,
    });
    setDetailsSaving(false);
    if (!res.success) {
      setDetailsError((res as any).message || "Save failed.");
      return;
    }
    setDetailsMovement(res.data.movement);
    setDetailsEditing(false);
    load();
  }

  async function deleteDetails() {
    if (!detailsMovement) return;
    setDetailsSaving(true);
    setDetailsError(null);
    const res = await apiDeleteMovement(detailsMovement._id);
    setDetailsSaving(false);
    if (!res.success) {
      setDetailsError((res as any).message || "Delete failed.");
      return;
    }
    closeDetails();
    load();
  }

  // Open the full create-form prefilled with this movement's data, so the
  // user gets the same dynamic UX (truck/supplier search-select autofill,
  // weighbridge live net, etc.) when editing as when creating.
  function openEditFullForm(m: StockMovement) {
    const modeForType: Record<string, NewMovementDraft["mode"]> = {
      INBOUND: "inbound",
      OUTBOUND: "outbound",
      TRANSFER_OUT: "transfer",
      TRANSFER_IN: "transfer",
    };
    setDraft({
      ...emptyDraft(),
      mode: modeForType[m.movementType] || "inbound",
      stockItemId: "",
      warehouseId: m.warehouseId || "",
      productId: "",
      qty: Math.abs(m.qty || 0),
      unitCost: m.unitCost ?? 0,
      reason: m.reason ?? "",
      notes: m.notes ?? "",
      destinationWarehouseId: (m as any).counterpartWarehouseId || "",
      destinationSiteId: "",
      destinationSiteName: "",
      linkedPoId: m.linkedPoId || "",
      linkedPoRef: m.linkedPoRef ?? "",
      supplierId: "",
      supplierName: m.supplierName ?? "",
      supplierTin: m.supplierTin ?? "",
      supplierVrn: m.supplierVrn ?? "",
      supplierPhone: m.supplierPhone ?? "",
      grossWeight: m.grossWeight != null ? String(m.grossWeight) : "",
      tareWeight: m.tareWeight != null ? String(m.tareWeight) : "",
      deductionWeight: m.deductionWeight != null ? String(m.deductionWeight) : "0",
      transportMethod: m.transportMethod ?? "",
      truckPlate: m.truckPlate ?? "",
      driverName: m.driverName ?? "",
      pickupCode: m.pickupCode ?? "",
      deliveryTime: m.deliveryTime
        ? new Date(m.deliveryTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      remark: m.remark ?? "",
      crusherCost: m.crusherCost != null ? String(m.crusherCost) : "",
      samplingCost: m.samplingCost != null ? String(m.samplingCost) : "",
      otherProcessingCost: m.otherProcessingCost != null ? String(m.otherProcessingCost) : "",
      otherProcessingDescription: m.otherProcessingDescription ?? "",
      sourceImage: null,
      sourceDocType: "Weighbridge",
    });
    setEditingMovementId(m._id);
    setError(null);
    closeDetails();
    setPanelOpen(true);
  }

  // Add a source document AFTER the movement was created (e.g. operator
  // forgot to attach it at post time).
  async function uploadSourceDoc() {
    if (!detailsMovement || !docUploadFile) return;
    setDocUploading(true);
    setDetailsError(null);
    const res = await apiCreateInventoryDoc({
      movement_id: detailsMovement._id,
      doc_type: docUploadType,
      image: docUploadFile,
    });
    setDocUploading(false);
    if (!res.success) {
      setDetailsError((res as any).message || "Upload failed.");
      return;
    }
    setDocUploadFile(null);
    // Refetch this movement's docs to render the new thumbnail
    const docRes = await apiListInventoryDocs({
      movement_ids: detailsMovement._id,
      limit: "100",
    });
    if (docRes.success) {
      setMovementDocs((prev) => ({
        ...prev,
        [detailsMovement._id]: docRes.data.documents,
      }));
    }
  }

  async function removeDoc(docId: string) {
    setDocDeleting(true);
    const res = await apiDeleteInventoryDoc(docId);
    setDocDeleting(false);
    setDocDeleteId(null);
    if (!res.success) {
      setDetailsError((res as any).message || 'Delete failed.');
      return;
    }
    if (detailsMovement) {
      const docRes = await apiListInventoryDocs({ movement_ids: detailsMovement._id, limit: '100' });
      if (docRes.success) {
        setMovementDocs((prev) => ({ ...prev, [detailsMovement._id]: docRes.data.documents }));
      }
    }
  }

  // ─── Mode toggle buttons ────────────────────────────────────────────────────

  const modeBtn = (mode: NewMovementDraft["mode"], label: string) => (
    <button
      onClick={() => upd({ mode })}
      disabled={!!editingMovementId}
      className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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

      {editingMovementId && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
          <PencilSimple size={14} weight="duotone" className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            Editing an existing movement. Type, warehouse, quantity, item, and PO link are locked — to change those, delete and re-create.
          </div>
        </div>
      )}

      {/* ── Purchase Order ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest flex items-center gap-1.5">
          <Receipt size={11} weight="duotone" /> Purchase Order
        </p>
        <SearchSelect
          label="Link to PO (optional)"
          options={poOptions}
          value={draft.linkedPoId || null}
          disabled={!!editingMovementId}
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
                po?.destinationWarehouseId ||
                poSupplier?.defaultWarehouseId ||
                "",
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
                    {warehouses.find((w) => w._id === draft.warehouseId)
                      ?.name || "— not set on PO —"}
                  </span>
                </div>
              </div>
            );
          })()}

        {linkedRoute && draft.mode === "inbound" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
            <Hammer
              size={14}
              weight="duotone"
              className="text-amber-500 mt-0.5 shrink-0"
            />
            <div className="text-amber-200 leading-relaxed">
              Routing through{" "}
              <span className="font-bold">
                {linkedRoute.routeStops[0]?.warehouseName}
              </span>{" "}
              first. Final destination:{" "}
              <span className="font-bold">{linkedRoute.warehouse_name}</span>.
            </div>
          </div>
        )}

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
              <Hammer
                size={14}
                weight="duotone"
                className="text-amber-500 mt-0.5 shrink-0"
              />
              <div className="text-amber-200 leading-relaxed">
                <span className="font-bold">{sup.name}</span> delivers{" "}
                <span className="font-bold">uncrushed</span> material. Pick a{" "}
                <span className="font-bold">Crushing Site</span> as the
                destination below. Once it's processed, use
                <span className="font-bold"> Transfer</span> to move it to a
                regular warehouse.
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
          disabled={!!editingMovementId}
          onChange={(v) => upd({ warehouseId: v ?? "" })}
          placeholder="Search warehouse..."
        />

        {draft.linkedPoId ? (
          // Product, qty, and unit cost are auto-filled from the PO line —
          // the preview block below shows what came over. No manual picker.
          (() => {
            const po = purchaseOrders.find((p) => p._id === draft.linkedPoId);
            const li = po?.lineItems[draft.selectedPoLineIdx ?? 0];
            if (!li) return null;
            return (
              <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs space-y-0.5">
                <p className="text-t2 font-medium">
                  Product (from PO): {li.productName || li.description}
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
          })()
        ) : draft.mode === "inbound" ? (
          // Inbound without a PO: pick any product from the full catalog so
          // brand-new stock can be received without needing a pre-existing
          // stock item.
          <SearchSelect
            label="Product *"
            options={productOptions}
            value={draft.productId || null}
            disabled={!!editingMovementId}
            onChange={(v) => {
              const p = products.find((x) => x._id === v);
              upd({
                productId: v ?? "",
                stockItemId: "",
                unitCost: p?.cost_per_unit ?? draft.unitCost,
              });
            }}
            placeholder="Search product..."
          />
        ) : (
          // Outbound / Transfer: must pick from existing stock so we know
          // which warehouse the item leaves and that there's enough on hand.
          <SearchSelect
            label="Item *"
            options={stockOptions}
            value={draft.stockItemId || null}
            disabled={!!editingMovementId}
            onChange={(v) => {
              const si = stockItems.find((s) => s._id === v);
              upd({
                stockItemId: v ?? "",
                productId: "",
                warehouseId: draft.warehouseId || si?.warehouseId || "",
              });
            }}
            placeholder="Search item..."
          />
        )}

        {draft.mode === "transfer" && (
          <>
            {transferRouteMatch ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <Hammer
                  size={14}
                  weight="duotone"
                  className="text-emerald-400 mt-0.5 shrink-0"
                />
                <div className="text-emerald-200 leading-relaxed">
                  Completing route for{" "}
                  <span className="font-bold">
                    {transferRouteMatch.item_code}
                  </span>{" "}
                  → final destination{" "}
                  <span className="font-bold">
                    {transferRouteMatch.warehouse_name}
                  </span>
                  . Capture the second weighbridge reading and any processing
                  costs below.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <Hammer
                  size={14}
                  weight="duotone"
                  className="text-emerald-400 mt-0.5 shrink-0"
                />
                <div className="text-emerald-200 leading-relaxed">
                  Use <span className="font-bold">Transfer</span> to move
                  material from a <span className="font-bold">Crushing Site</span>{" "}
                  to a regular warehouse once it has been processed, or to
                  rebalance stock between any two warehouses.
                </div>
              </div>
            )}
            <SearchSelect
              label="Destination Warehouse *"
              options={destWhOptions}
              value={draft.destinationWarehouseId || null}
              disabled={!!editingMovementId}
              onChange={(v) => upd({ destinationWarehouseId: v ?? "" })}
              placeholder="Select destination..."
              clearable={false}
            />
          </>
        )}

        {draft.mode === "outbound" && (
          <>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs">
              <MapPin
                size={14}
                weight="duotone"
                className="text-rose-400 mt-0.5 shrink-0"
              />
              <div className="text-rose-200 leading-relaxed">
                Pick the <span className="font-bold">Loading Site</span> where
                this stock is being dropped off. Optional — leave blank if the
                outbound is not headed to a tracked site.
              </div>
            </div>
            <SearchSelect
              label="Destination Loading Site"
              options={loadingSiteOptions}
              value={draft.destinationSiteId || null}
              onChange={(v, opt) =>
                upd({
                  destinationSiteId: v ?? "",
                  destinationSiteName: opt?.label || "",
                })
              }
              placeholder="Search loading site..."
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
            <label className="block text-[10px] text-t3 mb-1">
              Document Type
            </label>
            <select
              className={inp}
              value={draft.sourceDocType}
              onChange={(e) =>
                upd({
                  sourceDocType: e.target
                    .value as NewMovementDraft["sourceDocType"],
                })
              }
            >
              <option value="Weighbridge">Weighbridge</option>
              <option value="Receipt">Receipt</option>
              <option value="Invoice">Invoice</option>
              <option value="Waybill">Waybill</option>
              <option value="Site Photo">Site Photo</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-t3 mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              className={`${inp} file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-accent/10 file:text-accent file:text-xs file:font-semibold cursor-pointer`}
              onChange={(e) =>
                upd({ sourceImage: e.target.files?.[0] || null })
              }
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
              <p className="text-xs text-t1 truncate font-medium">
                {draft.sourceImage.name}
              </p>
              <p className="text-[10px] text-t3">
                {(draft.sourceImage.size / 1024).toFixed(1)} KB
              </p>
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
                disabled={!!editingMovementId}
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
        {editingMovementId ? "Save Changes" : "Post Movement"}
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
              setEditingMovementId(null);
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

          {!loading && movements.length === 0 ? (
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
                    {colVis.has("supplier") && (
                      <th className="px-4 py-3 text-left text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Supplier / Truck
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
                    {colVis.has("actions") && (
                      <th className="px-4 py-3 text-right text-xs font-bold text-t3 uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && (
                    <TableSkeleton
                      rows={8}
                      columns={MOV_COLS.filter((c) => colVis.has(c.key)).length}
                    />
                  )}
                  {!loading && movements.map((m) => {
                    const meta = TYPE_META[m.movementType] ?? {
                      label: m.movementType,
                      style: "bg-surface text-t3 border-border",
                      dot: "bg-t3",
                      Icon: ArrowsCounterClockwise,
                    };
                    return (
                      <tr
                        key={m._id}
                        onClick={() => openDetails(m)}
                        className="hover:bg-surface cursor-pointer transition-colors"
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
                        {colVis.has("source") && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {(() => {
                              const docs = movementDocs[m._id] || [];
                              const firstImg = docs.find((d) => d.image_path);
                              if (firstImg) {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewImageUrl(firstImg.image_path);
                                    }}
                                    title={`${docs.length} doc${docs.length > 1 ? "s" : ""} attached — click to preview`}
                                    className="inline-block cursor-pointer"
                                  >
                                    <img
                                      src={firstImg.image_path}
                                      alt={firstImg.doc_type || "source"}
                                      className="w-12 h-12 rounded-md object-cover border border-border hover:border-accent transition-colors"
                                      onError={(e) => {
                                        (
                                          e.currentTarget as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  </button>
                                );
                              }
                              if (m.linkedPoRef || m.sourceRef) {
                                return (
                                  <span className="text-t2 text-xs">
                                    {m.linkedPoRef ? (
                                      <span className="text-accent">
                                        {m.linkedPoRef}
                                      </span>
                                    ) : (
                                      m.sourceRef
                                    )}
                                  </span>
                                );
                              }
                              return (
                                <div
                                  className="w-12 h-12 rounded-md border border-dashed border-border flex items-center justify-center text-t3"
                                  title="No supporting doc"
                                >
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
                                    {dt.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
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
                        {colVis.has("actions") && (
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex gap-1 text-t3">
                              <button
                                onClick={() => { openDetails(m); setDetailsEditing(true); }}
                                className="p-1.5 hover:text-accent hover:bg-accent-glow rounded transition-colors"
                                title="Edit"
                              >
                                <PencilSimple size={14} weight="duotone" />
                              </button>
                              <button
                                onClick={() => { openDetails(m); setDetailsDeleteConfirm(true); }}
                                className="p-1.5 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash size={14} weight="duotone" />
                              </button>
                            </div>
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
            setEditingMovementId(null);
            setDraft(emptyDraft());
          }}
          title={editingMovementId ? "Edit Movement" : "New Movement"}
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

      {/* Delete movement confirmation modal */}
      {detailsDeleteConfirm && detailsMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash size={22} weight="duotone" className="text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-t1 text-center mb-1">Delete Movement?</h3>
            <p className="text-xs font-mono text-t3 text-center mb-2">{detailsMovement.movementRef}</p>
            <p className="text-xs text-t3 text-center mb-6">
              This will reverse its effect on warehouse capacity and permanently remove all attached documents. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDetailsDeleteConfirm(false)}
                disabled={detailsSaving}
                className="flex-1 py-2.5 border border-border text-t2 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteDetails}
                disabled={detailsSaving}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {detailsSaving && <Spinner size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove document confirmation modal */}
      {docDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash size={22} weight="duotone" className="text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-t1 text-center mb-1">Remove Image?</h3>
            <p className="text-xs text-t3 text-center mb-6">
              The image will be permanently deleted from Cloudinary and cannot be recovered.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDocDeleteId(null)}
                disabled={docDeleting}
                className="flex-1 py-2.5 border border-border text-t2 hover:bg-surface rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => removeDoc(docDeleteId)}
                disabled={docDeleting}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {docDeleting && <Spinner size={14} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsMovement && (() => {
        const m = detailsMovement;
        const meta = TYPE_META[m.movementType] ?? {
          label: m.movementType,
          style: "bg-surface text-t3 border-border",
          dot: "bg-t3",
          Icon: ArrowsCounterClockwise,
        };
        const docs = movementDocs[m._id] || [];
        const images = docs.filter((d) => d.image_path);
        return (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={closeDetails}
          >
            <div
              className="w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium ${meta.style}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    <span className="font-mono text-xs text-t3">{m.movementRef}</span>
                  </div>
                  <p className="text-sm font-bold text-t1 truncate">
                    {m.itemName || "—"} · {Math.abs(m.qty).toLocaleString()}
                  </p>
                  <p className="text-xs text-t3 truncate">
                    {m.warehouseName || "—"}
                    {m.movementDate
                      ? ` · ${new Date(m.movementDate).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={closeDetails}
                  className="p-1 text-t3 hover:text-t1 rounded transition-colors shrink-0"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {detailsError && (
                  <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                    {detailsError}
                  </p>
                )}

                {/* Image gallery + uploader — always visible */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black text-t3 uppercase tracking-widest flex items-center gap-1.5">
                      <Receipt size={11} weight="duotone" /> Source Documents ({images.length})
                      {detailsRefreshing && <Spinner size={10} className="animate-spin opacity-60" />}
                    </p>
                  </div>
                  {images.length === 0 ? (
                    <p className="text-xs text-t3 italic px-1 py-2">
                      No images attached to this movement.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {images.map((d) => (
                        <div
                          key={d._id}
                          className="group relative rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(d.image_path)}
                            className="w-full block"
                            title={`${d.doc_type || "doc"} — click to expand`}
                          >
                            <img
                              src={d.image_path}
                              alt={d.doc_type || "source"}
                              className="w-full h-32 object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <span className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] bg-black/60 text-white font-medium truncate">
                              {d.doc_type || "Document"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocDeleteId(d._id)}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/80"
                            title="Remove image"
                          >
                            <Trash size={12} weight="bold" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add document — for cases where the operator forgot to
                      attach the weighbridge ticket / site photo at post time. */}
                  <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
                    <div className="min-w-[120px]">
                      <label className="block text-[10px] text-t3 mb-1">Type</label>
                      <select
                        className={inp}
                        value={docUploadType}
                        onChange={(e) => setDocUploadType(e.target.value as typeof docUploadType)}
                      >
                        <option value="Weighbridge">Weighbridge</option>
                        <option value="Receipt">Receipt</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Waybill">Waybill</option>
                        <option value="Site Photo">Site Photo</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-[10px] text-t3 mb-1">Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        className={`${inp} file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-accent/10 file:text-accent file:text-xs file:font-semibold cursor-pointer`}
                        onChange={(e) => setDocUploadFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <button
                      onClick={uploadSourceDoc}
                      disabled={!docUploadFile || docUploading}
                      className="px-3 py-2 text-xs font-bold bg-accent text-white rounded-lg hover:bg-accent-h transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
                    >
                      {docUploading && <Spinner size={11} className="animate-spin" />}
                      Add Document
                    </button>
                  </div>
                </section>

                {/* Read-only summary — Edit opens the full create form */}
                {(
                  <section className="space-y-2">
                    <p className="text-[11px] font-black text-t3 uppercase tracking-widest">
                      Details
                    </p>
                    <div className="bg-surface rounded-lg border border-border divide-y divide-border text-sm">
                      {[
                        ["Source Ref", m.sourceRef],
                        ["PO Ref", m.linkedPoRef],
                        ["Supplier", m.supplierName],
                        ["Truck Plate", m.truckPlate],
                        ["Driver", m.driverName],
                        ["Transport", m.transportMethod],
                        ["Pickup Code", m.pickupCode],
                        ["Gross Weight", m.grossWeight != null ? `${m.grossWeight} t` : null],
                        ["Tare Weight", m.tareWeight != null ? `${m.tareWeight} t` : null],
                        ["Net Weight", m.netWeight != null ? `${m.netWeight} t` : null],
                        ["Crusher Cost", m.crusherCost != null ? m.crusherCost.toLocaleString() : null],
                        ["Sampling Cost", m.samplingCost != null ? m.samplingCost.toLocaleString() : null],
                        ["Other Cost", m.otherProcessingCost != null ? m.otherProcessingCost.toLocaleString() : null],
                        ["Other Cost Note", m.otherProcessingDescription],
                        ["Notes", m.notes],
                        ["Remark", m.remark],
                        ["Posted By", m.postedBy?.fullName],
                      ]
                        .filter(([, v]) => v != null && v !== "")
                        .map(([label, value]) => (
                          <div key={label as string} className="flex justify-between gap-3 px-3 py-2">
                            <span className="text-t3 shrink-0">{label}</span>
                            <span className="text-t1 font-medium text-right truncate">{value as React.ReactNode}</span>
                          </div>
                        ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-2 p-4 border-t border-border shrink-0">
                <button
                  onClick={() => setDetailsDeleteConfirm(true)}
                  className="px-3 py-2 text-xs border border-rose-500/30 text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors inline-flex items-center gap-1.5"
                >
                  <Trash size={12} /> Delete
                </button>
                <button
                  onClick={() => openEditFullForm(m)}
                  className="px-4 py-2 text-xs font-bold bg-accent text-white rounded-lg hover:bg-accent-h transition-colors inline-flex items-center gap-1.5"
                >
                  <PencilSimple size={12} /> Edit in Full Editor
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
