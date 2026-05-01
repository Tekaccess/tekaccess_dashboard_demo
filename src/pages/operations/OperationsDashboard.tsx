import React, { useState, useMemo } from "react";
import {
  Truck,
  Hourglass,
  ArrowsClockwise,
  Package,
  MapPin,
  ArrowRight,
  Camera,
  X,
  Warning,
  ChartBar,
  Clipboard,
  ArrowDown,
  ArrowUp,
  Users,
  Buildings,
} from "@phosphor-icons/react";
import {
  mockTruckAllocations,
  mockMovementRecords,
  mockStockSummary,
  mockWarehouseStock,
  TIPPER_STAGE_CONFIGS,
  FLATBED_STAGE_CONFIGS,
  type TruckAllocation,
  type TruckType,
  type TruckStage,
  type StageConfig,
  type MovementRecord,
  type WarehouseStock,
} from "../../data/truckMovements";

// ─── Color Helpers ────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<
  string,
  { bg: string; text: string; dot: string; ring: string; dotGlow: string }
> = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    dot: "bg-blue-500",
    ring: "ring-blue-500/30",
    dotGlow: "shadow-blue-500/50",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    dotGlow: "shadow-amber-500/50",
  },
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    dot: "bg-orange-500",
    ring: "ring-orange-500/30",
    dotGlow: "shadow-orange-500/50",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    dot: "bg-purple-500",
    ring: "ring-purple-500/30",
    dotGlow: "shadow-purple-500/50",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    dotGlow: "shadow-emerald-500/50",
  },
  indigo: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    dot: "bg-indigo-500",
    ring: "ring-indigo-500/30",
    dotGlow: "shadow-indigo-500/50",
  },
};

function getStageIcon(id: TruckStage) {
  switch (id) {
    case "allocated":
      return Clipboard;
    case "waiting_mine":
    case "waiting_bagged":
    case "waiting_crushing":
    case "wait_shunting":
      return Hourglass;
    case "loading_mine":
    case "loading_bagged":
    case "loading_crushed":
    case "loading":
      return ArrowDown;
    case "shunting":
      return ArrowsClockwise;
    case "transit":
      return Truck;
    default:
      return Package;
  }
}

// ─── Stage Card ───────────────────────────────────────────────────────────────

function StageCard({
  config,
  trucks,
  onClick,
}: {
  config: StageConfig;
  trucks: TruckAllocation[];
  onClick: () => void;
}) {
  const c = STAGE_COLORS[config.color];
  const Icon = getStageIcon(config.id);
  const totalTons = trucks.reduce((s, t) => s + t.quantity, 0);
  const count = trucks.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group bg-card rounded-xl border border-border p-3 text-left transition-all hover:ring-2 ${c.ring} ${count === 0 ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${c.bg} shrink-0`}>
          <Icon size={14} weight="duotone" className={c.text} />
        </div>
        {count > 0 && <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
      </div>
      <p
        className={`text-2xl font-bold leading-tight ${count > 0 ? "text-t1" : "text-t3"}`}
      >
        {count}
      </p>
      <p className="text-[11px] text-t3 mt-0.5 leading-tight">
        {config.shortLabel}
      </p>
      {count > 0 && (
        <p className={`text-[10px] font-semibold mt-1 ${c.text}`}>
          {totalTons}t
        </p>
      )}
      <p
        className={`text-[10px] font-semibold text-accent mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}
      >
        View <ArrowRight size={10} weight="bold" />
      </p>
    </button>
  );
}

// ─── Truck Type Section ───────────────────────────────────────────────────────

function TruckTypeSection({
  type,
  stageConfigs,
  allocations,
  onCardClick,
}: {
  type: TruckType;
  stageConfigs: StageConfig[];
  allocations: TruckAllocation[];
  onCardClick: (stageId: TruckStage) => void;
}) {
  const trucks = allocations.filter((t) => t.truckType === type);
  const totalTons = trucks.reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`p-2 rounded-lg ${type === "tipper" ? "bg-accent-glow" : "bg-purple-500/10"} shrink-0`}
        >
          <Truck
            size={16}
            weight="duotone"
            className={type === "tipper" ? "text-accent" : "text-purple-400"}
          />
        </div>
        <div>
          <p className="text-sm font-bold text-t1">
            {type === "tipper" ? "Tipper Trucks" : "Flatbed Trucks"}
          </p>
          <p className="text-xs text-t3">
            {trucks.length} trucks · {totalTons}t allocated today
          </p>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="grid grid-cols-7 gap-2 min-w-[560px]">
          {stageConfigs.map((cfg) => (
            <StageCard
              key={cfg.id}
              config={cfg}
              trucks={trucks.filter((t) => t.currentStage === cfg.id)}
              onClick={() => onCardClick(cfg.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Truck Journey Timeline ───────────────────────────────────────────────────

function TruckJourneyRow({
  truck,
  stageConfigs,
}: {
  truck: TruckAllocation;
  stageConfigs: StageConfig[];
}) {
  const reachedStages = new Set(truck.history.map((h) => h.stage));

  function stageStatus(
    stageId: TruckStage,
  ): "current" | "completed" | "future" {
    if (truck.currentStage === stageId) return "current";
    if (reachedStages.has(stageId)) return "completed";
    return "future";
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  const lastEntry = truck.history[truck.history.length - 1];

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      {/* Truck header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-t1">
              {truck.plateNumber}
            </span>
            {truck.trailerNumber && (
              <span className="text-xs text-t3 font-mono">
                + {truck.trailerNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-t3 mt-0.5">
            {truck.driverName} · {truck.transporterName}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-t1">{truck.quantity}t</p>
          <p className="text-xs text-t3">{truck.purchaseOrderRef}</p>
        </div>
      </div>

      {truck.truckType === 'tipper' ? (
        <p className="text-xs text-t3 mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="font-medium text-t2">{truck.productName}</span>
          {(() => {
            const mineEntry  = truck.history.find(h => h.stage === 'waiting_mine');
            const shuntEntry = truck.history.find(h => h.stage === 'shunting');
            const mine    = mineEntry?.toLocation;
            const crusher = shuntEntry?.toLocation;
            return (
              <>
                {mine    && <><span className="text-t3">·</span><span className="text-amber-500">Mine:</span> {mine}</>}
                {crusher && <><span className="text-t3">→</span><span className="text-purple-400">Crusher:</span> {crusher}</>}
              </>
            );
          })()}
        </p>
      ) : (
        <p className="text-xs text-t3 mb-3">
          <span className="font-medium text-t2">{truck.productName}</span>
          {' → '}{truck.warehouseName}
        </p>
      )}

      {/* Journey timeline */}
      <div className="overflow-x-auto">
        <div className="flex items-start gap-0 min-w-max">
          {stageConfigs.map((cfg, i) => {
            const status = stageStatus(cfg.id);
            const c = STAGE_COLORS[cfg.color];
            const historyEntry = truck.history.find((h) => h.stage === cfg.id);

            return (
              <div key={cfg.id} className="flex items-start">
                {/* Stage dot + label */}
                <div className="flex flex-col items-center w-[72px]">
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-all ${
                      status === "current"
                        ? `${c.dot} border-transparent ring-2 ${c.ring} shadow-md ${c.dotGlow}`
                        : status === "completed"
                          ? `${c.dot} border-transparent`
                          : "bg-transparent border-border"
                    }`}
                  />
                  <p
                    className={`text-[9px] text-center mt-1 leading-tight max-w-[64px] ${
                      status === "current"
                        ? `font-bold ${c.text}`
                        : status === "completed"
                          ? "text-t2"
                          : "text-t3 opacity-50"
                    }`}
                  >
                    {cfg.shortLabel}
                  </p>
                  {historyEntry && (
                    <p className="text-[8px] text-t3 mt-0.5">
                      {formatTime(historyEntry.enteredAt)}
                    </p>
                  )}
                </div>

                {/* Connector line */}
                {i < stageConfigs.length - 1 && (
                  <div
                    className={`h-0.5 w-4 mt-[5px] flex-shrink-0 ${
                      stageStatus(stageConfigs[i + 1].id) !== "future" ||
                      status === "completed"
                        ? "bg-border"
                        : "bg-border opacity-30"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Last posted by */}
      {lastEntry && (
        <p className="text-[10px] text-t3 mt-3">
          Last updated by <span className="text-t2">{lastEntry.postedBy}</span>
          {lastEntry.fromLocation && lastEntry.toLocation && (
            <>
              {" "}
              · {lastEntry.fromLocation} → {lastEntry.toLocation}
            </>
          )}
          {lastEntry.weighbridgePicture && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-blue-400">
              <Camera size={10} weight="fill" /> Weighbridge photo
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// ─── Truck Stage Modal ────────────────────────────────────────────────────────

function TruckStageModal({
  truckType,
  stageId,
  stageConfigs,
  allocations,
  onClose,
}: {
  truckType: TruckType;
  stageId: TruckStage;
  stageConfigs: StageConfig[];
  allocations: TruckAllocation[];
  onClose: () => void;
}) {
  const stageCfg = stageConfigs.find((s) => s.id === stageId);
  const c = stageCfg ? STAGE_COLORS[stageCfg.color] : STAGE_COLORS.blue;

  const trucksInStage = allocations.filter(
    (t) => t.truckType === truckType && t.currentStage === stageId,
  );

  // For flatbeds on standby (wait_shunting), the per-truck journey timeline
  // adds no information — the queue is what the user wants to see. Show a
  // flat table instead.
  const isStandbyView = truckType === 'flatbed' && stageId === 'wait_shunting';

  const suppliers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; trucks: TruckAllocation[] }
    >();
    // All suppliers that have trucks of this type today
    allocations
      .filter((t) => t.truckType === truckType)
      .forEach((t) => {
        if (!map.has(t.supplierId)) {
          map.set(t.supplierId, {
            id: t.supplierId,
            name: t.supplierName,
            trucks: [],
          });
        }
        if (t.currentStage === stageId) {
          map.get(t.supplierId)!.trucks.push(t);
        }
      });
    return Array.from(map.values()).sort(
      (a, b) => b.trucks.length - a.trucks.length,
    );
  }, [allocations, truckType, stageId]);

  const [activeSupplier, setActiveSupplier] = useState(suppliers[0]?.id ?? "");
  const currentSupplierData = suppliers.find((s) => s.id === activeSupplier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${c.bg}`}>
                {React.createElement(getStageIcon(stageId), {
                  size: 14,
                  weight: "duotone",
                  className: c.text,
                })}
              </div>
              <div>
                <p className="text-xs text-t3">
                  {truckType === "tipper" ? "Tipper Trucks" : "Flatbed Trucks"}
                </p>
                <h3 className="text-base font-bold text-t1">
                  {stageCfg?.label ?? stageId}
                </h3>
              </div>
            </div>
            <p className="text-xs text-t3 mt-1.5">
              {trucksInStage.length} truck
              {trucksInStage.length !== 1 ? "s" : ""} currently here ·{" "}
              {trucksInStage.reduce((s, t) => s + t.quantity, 0)}t total
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface transition-colors text-t3 hover:text-t1"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {isStandbyView ? (
          <div className="overflow-y-auto flex-1 p-5">
            <StandbyQueueTable trucks={trucksInStage} />
          </div>
        ) : (
          <>
            {/* Supplier tabs */}
            <div className="border-b border-border px-5">
              <nav className="-mb-px flex gap-0 overflow-x-auto">
                {suppliers.map((sup) => (
                  <button
                    key={sup.id}
                    type="button"
                    onClick={() => setActiveSupplier(sup.id)}
                    className={`whitespace-nowrap py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
                      activeSupplier === sup.id
                        ? "border-accent text-accent"
                        : "border-transparent text-t3 hover:text-t2 hover:border-border"
                    }`}
                  >
                    {sup.name}
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sup.trucks.length > 0
                          ? `${c.bg} ${c.text}`
                          : "bg-surface text-t3"
                      }`}
                    >
                      {sup.trucks.length}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Truck list */}
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {!currentSupplierData || currentSupplierData.trucks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Truck
                    size={32}
                    weight="duotone"
                    className="text-t3 opacity-30 mb-3"
                  />
                  <p className="text-sm text-t3">
                    No trucks from this supplier at this stage
                  </p>
                </div>
              ) : (
                currentSupplierData.trucks.map((truck) => (
                  <TruckJourneyRow
                    key={truck._id}
                    truck={truck}
                    stageConfigs={stageConfigs}
                  />
                ))
              )}
            </div>

            {/* Footer: all trucks from this supplier today */}
            {currentSupplierData && (
              <div className="border-t border-border px-5 py-3">
                <p className="text-xs text-t3">
                  All {truckType === "tipper" ? "tipper" : "flatbed"} trucks from{" "}
                  <span className="text-t2 font-medium">
                    {currentSupplierData.name}
                  </span>{" "}
                  today:{" "}
                  {allocations
                    .filter(
                      (t) =>
                        t.truckType === truckType &&
                        t.supplierId === activeSupplier,
                    )
                    .map((t) => (
                      <span key={t._id} className="font-mono text-t1 mr-2">
                        {t.plateNumber}
                      </span>
                    ))}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Warehouse Stock Card ─────────────────────────────────────────────────────

function WarehouseStockCard({ wh }: { wh: WarehouseStock }) {
  const total = wh.uncrushedTons + wh.crushedTons;
  const isCrusher = wh.siteRole === 'crushing_site';
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start gap-2 mb-3">
        <div className={`p-2 rounded-lg shrink-0 ${isCrusher ? 'bg-purple-500/10' : 'bg-accent-glow'}`}>
          <Buildings
            size={14}
            weight="duotone"
            className={isCrusher ? 'text-purple-400' : 'text-accent'}
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-t1 truncate">{wh.warehouseName}</p>
          <p className="text-[10px] text-t3 capitalize">
            {isCrusher ? 'Crushing site' : 'Warehouse'}
          </p>
        </div>
      </div>
      <p className="text-2xl font-bold text-t1 leading-tight">{total}t</p>
      <p className="text-[10px] text-t3 mt-0.5">Total on hand</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="bg-surface rounded-md px-2 py-1.5">
          <p className="text-[10px] text-t3 leading-tight">Uncrushed</p>
          <p className="text-sm font-bold text-amber-500 leading-tight">{wh.uncrushedTons}t</p>
        </div>
        <div className="bg-surface rounded-md px-2 py-1.5">
          <p className="text-[10px] text-t3 leading-tight">Crushed</p>
          <p className="text-sm font-bold text-emerald-400 leading-tight">{wh.crushedTons}t</p>
        </div>
      </div>
    </div>
  );
}

// ─── Standby Queue Table ──────────────────────────────────────────────────────
// For Flatbed Trucks at the "Standby" (wait_shunting) stage we show a flat
// table — plate, driver, contact, and how long it has been queued — instead
// of the per-truck journey timeline used for downstream stages.

function timeAgo(iso: string, now: Date = new Date()) {
  const diffMs = Math.max(0, now.getTime() - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function formatHm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function StandbyQueueTable({ trucks }: { trucks: TruckAllocation[] }) {
  if (trucks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Truck size={32} weight="duotone" className="text-t3 opacity-30 mb-3" />
        <p className="text-sm text-t3">No flatbed trucks currently on standby</p>
      </div>
    );
  }

  const sorted = [...trucks].sort((a, b) => {
    const aT = a.history.find((h) => h.stage === 'wait_shunting')?.enteredAt ?? a.allocatedAt;
    const bT = b.history.find((h) => h.stage === 'wait_shunting')?.enteredAt ?? b.allocatedAt;
    return new Date(aT).getTime() - new Date(bT).getTime();
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            {['Plate', 'Driver', 'Contact', 'Added', 'In queue'].map((h) => (
              <th
                key={h}
                className="text-left text-[10px] font-black text-t3 uppercase tracking-widest px-3 py-2"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const queued = t.history.find((h) => h.stage === 'wait_shunting')?.enteredAt ?? t.allocatedAt;
            return (
              <tr
                key={t._id}
                className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors"
              >
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs font-bold text-t1">{t.plateNumber}</span>
                  {t.trailerNumber && (
                    <p className="font-mono text-[10px] text-t3">+ {t.trailerNumber}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-t1">{t.driverName}</td>
                <td className="px-3 py-2.5 text-xs text-t2 font-mono">
                  {t.driverContact ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-xs text-t2">{formatHm(queued)}</td>
                <td className="px-3 py-2.5 text-xs font-semibold text-amber-500">
                  {timeAgo(queued)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Stock Summary Cards ──────────────────────────────────────────────────────

function StockKpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  const c = STAGE_COLORS[color] ?? STAGE_COLORS.blue;
  return (
    <div className={`bg-card rounded-xl border border-border p-4`}>
      <div className={`w-2 h-2 rounded-full ${c.dot} mb-3`} />
      <p className={`text-2xl font-bold ${c.text} leading-tight`}>{value}</p>
      <p className="text-xs text-t3 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-t3 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Movements Table ──────────────────────────────────────────────────────────

const MOV_TYPE_COLORS: Record<string, string> = {
  inbound: "bg-emerald-500/10 text-emerald-400",
  outbound: "bg-rose-500/10 text-rose-400",
  processing: "bg-purple-500/10 text-purple-400",
  transfer: "bg-blue-500/10 text-blue-400",
};

function MovementsTable({ records }: { records: MovementRecord[] }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <ChartBar size={16} weight="duotone" className="text-accent" />
        <p className="text-sm font-semibold text-t1">Today's Movements</p>
        <span className="ml-auto text-xs text-t3">
          {records.length} records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-border">
              {[
                "Plate No.",
                "Type",
                "Product",
                "Transporter",
                "Supplier",
                "Qty (t)",
                "Warehouse",
                "Photo",
                "Posted By",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left text-[10px] font-black text-t3 uppercase tracking-widest px-4 py-2.5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-sm text-t3 py-10">
                  No movements recorded today
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr
                  key={rec._id}
                  className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-t1">
                      {rec.plateNumber}
                    </span>
                    <p className="text-[10px] text-t3 capitalize">
                      {rec.truckType}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${MOV_TYPE_COLORS[rec.movementType] ?? "bg-surface text-t3"}`}
                    >
                      {rec.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-t1 max-w-[140px]">
                    <p className="truncate">{rec.productName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-t2 max-w-[120px]">
                    <p className="truncate">{rec.transporterName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-t2 max-w-[120px]">
                    <p className="truncate">{rec.supplierName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-t1">
                      {rec.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-t2 max-w-[130px]">
                    <p className="truncate">{rec.warehouseName}</p>
                  </td>
                  <td className="px-4 py-3">
                    {rec.weighbridgePicture ? (
                      <button
                        type="button"
                        title={rec.weighbridgePicture}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Camera size={14} weight="fill" />
                        <span className="text-[10px]">View</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-t3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-t3 max-w-[120px]">
                    <p className="truncate">{rec.postedBy}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Operations Dashboard ────────────────────────────────────────────────

type ModalState = {
  truckType: TruckType;
  stageId: TruckStage;
} | null;

export default function OperationsDashboard() {
  const [modal, setModal] = useState<ModalState>(null);

  const tipperAllocations = mockTruckAllocations.filter(
    (t) => t.truckType === "tipper",
  );
  const flatbedAllocations = mockTruckAllocations.filter(
    (t) => t.truckType === "flatbed",
  );

  const s = mockStockSummary;

  return (
    <div className="space-y-6">
      {/* ── Truck Movements ── */}
      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">
          Truck Movements
        </p>
        <div className="space-y-3">
          <TruckTypeSection
            type="tipper"
            stageConfigs={TIPPER_STAGE_CONFIGS}
            allocations={mockTruckAllocations}
            onCardClick={(stageId) =>
              setModal({ truckType: "tipper", stageId })
            }
          />
          <TruckTypeSection
            type="flatbed"
            stageConfigs={FLATBED_STAGE_CONFIGS}
            allocations={mockTruckAllocations}
            onCardClick={(stageId) =>
              setModal({ truckType: "flatbed", stageId })
            }
          />
        </div>
      </div>

      {/* ── Warehouse Stock On Hand ── */}
      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">
          Warehouses — Stock On Hand
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {mockWarehouseStock.map((wh) => (
            <WarehouseStockCard key={wh.warehouseId} wh={wh} />
          ))}
        </div>
      </div>

      {/* ── Stock Summary ── */}
      <div>
        <p className="text-[11px] font-black text-t3 uppercase tracking-widest mb-3">
          Stock Summary — Today
        </p>
        {/*<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StockKpiCard
            label="Inbound"
            value={`${s.inboundToday.tons}t`}
            sub={`${s.inboundToday.count} movements`}
            color="emerald"
          />
          <StockKpiCard
            label="Processing / Crushing"
            value={`${s.processingToday.tons}t`}
            sub={`${s.processingToday.count} movements`}
            color="purple"
          />
          <StockKpiCard
            label="Transfers"
            value={`${s.transferToday.tons}t`}
            sub={`${s.transferToday.count} movements`}
            color="blue"
          />
          <StockKpiCard
            label="Outbound"
            value={`${s.outboundToday.tons}t`}
            sub={`${s.outboundToday.count} movements`}
            color="orange"
          />
          <StockKpiCard
            label="Currently in Transit"
            value={`${s.transitNow.tons}t`}
            sub={`${s.transitNow.count} trucks`}
            color="indigo"
          />
        </div>*/}
      </div>

      {/*── Movements Table ── */}
      <MovementsTable records={mockMovementRecords} />

      {/* ── Modal ── */}
      {modal && (
        <TruckStageModal
          truckType={modal.truckType}
          stageId={modal.stageId}
          stageConfigs={
            modal.truckType === "tipper"
              ? TIPPER_STAGE_CONFIGS
              : FLATBED_STAGE_CONFIGS
          }
          allocations={
            modal.truckType === "tipper"
              ? tipperAllocations
              : flatbedAllocations
          }
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
