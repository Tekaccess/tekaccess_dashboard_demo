export type TruckType = 'tipper' | 'flatbed';

export type TipperStage =
  | 'allocated'
  | 'waiting_mine'
  | 'loading_mine'
  | 'shunting'
  | 'waiting_crushing'
  | 'loading_crushed'
  | 'transit';

export type FlatbedStage =
  | 'wait_shunting'
  | 'allocated'
  | 'waiting_bagged'
  | 'loading_bagged'
  | 'waiting_crushing'
  | 'loading'
  | 'transit';

export type TruckStage = TipperStage | FlatbedStage;

export interface StageHistoryEntry {
  stage: TruckStage;
  enteredAt: string;
  fromLocation?: string;
  toLocation?: string;
  weighbridgePicture?: string;
  postedBy: string;
  quantity?: number;
}

export interface TruckAllocation {
  _id: string;
  plateNumber: string;
  trailerNumber?: string;
  truckType: TruckType;
  driverName: string;
  transporterId: string;
  transporterName: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  purchaseOrderRef: string;
  quantity: number;
  warehouseName: string;
  currentStage: TruckStage;
  allocatedAt: string;
  history: StageHistoryEntry[];
}

export interface MovementRecord {
  _id: string;
  allocationId: string;
  plateNumber: string;
  truckType: TruckType;
  movementType: 'inbound' | 'outbound' | 'processing' | 'transfer';
  fromLocation: string;
  toLocation: string;
  quantity: number;
  weighbridgePicture?: string;
  postedBy: string;
  timestamp: string;
  transporterName: string;
  supplierName: string;
  productName: string;
  warehouseName: string;
}

export interface StageConfig {
  id: TruckStage;
  label: string;
  shortLabel: string;
  color: 'blue' | 'amber' | 'orange' | 'purple' | 'emerald' | 'indigo';
}

export const TIPPER_STAGE_CONFIGS: StageConfig[] = [
  { id: 'allocated',        label: 'Allocated',           shortLabel: 'Allocated',   color: 'blue' },
  { id: 'waiting_mine',     label: 'At Mine — Queued',    shortLabel: 'At Mine',     color: 'amber' },
  { id: 'loading_mine',     label: 'Loading at Mine',     shortLabel: 'Loading',     color: 'orange' },
  { id: 'shunting',         label: 'Shunting to Crusher', shortLabel: 'Shunting',    color: 'purple' },
  { id: 'waiting_crushing', label: 'At Crusher — Queued', shortLabel: 'At Crusher',  color: 'amber' },
  { id: 'loading_crushed',  label: 'Loading Crushed',     shortLabel: 'Loaded',      color: 'emerald' },
  { id: 'transit',          label: 'In Transit',          shortLabel: 'In Transit',  color: 'indigo' },
];

export const FLATBED_STAGE_CONFIGS: StageConfig[] = [
  { id: 'wait_shunting',    label: 'On Standby',          shortLabel: 'Standby',     color: 'amber' },
  { id: 'allocated',        label: 'Allocated',           shortLabel: 'Allocated',   color: 'blue' },
  { id: 'waiting_bagged',   label: 'Awaiting Cargo',      shortLabel: 'Awaiting',    color: 'amber' },
  { id: 'loading_bagged',   label: 'Loading Cargo',       shortLabel: 'Loading',     color: 'orange' },
  { id: 'waiting_crushing', label: 'At Crusher — Queued', shortLabel: 'At Crusher',  color: 'amber' },
  { id: 'loading',          label: 'Loading at Crusher',  shortLabel: 'Loaded',      color: 'emerald' },
  { id: 'transit',          label: 'In Transit',          shortLabel: 'In Transit',  color: 'indigo' },
];

// ─── Real Data ────────────────────────────────────────────────────────────────
// Suppliers: Bakal (SUP-005), Hazamoda (SUP-004), Hyle (SUP-003)
// Transporters: TEKACCESS LTD (own fleet), Toya (TRP-0007), Imperial (TRP-0008),
//               Tahita (TRP-0009), Real labest (TRP-0010)
// Trucks: RAJ 187-196 Q (TEKACCESS LTD owned flatbeds with RL trailers)
//         + 4 tipper trucks from external transporters

const D = '2026-04-30';

export const mockTruckAllocations: TruckAllocation[] = [

  // ─── Bakal (SUP-005) ─── mine: Bakal warehouse · crusher: Marziq crushing site ───
  // Flatbed 1 · RAJ 187 Q · SALMIN KITHUMA → transit (completed full journey)
  {
    _id: 'ta-001',
    plateNumber: 'RAJ 187 Q',
    trailerNumber: 'RL 8519',
    truckType: 'flatbed',
    driverName: 'SALMIN KITHUMA',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-001',
    supplierName: 'Bakal',
    productId: 'prod-001',
    productName: 'Raw Stone',
    purchaseOrderRef: 'P00193',
    quantity: 28,
    warehouseName: 'Bakal warehouse',
    currentStage: 'transit',
    allocatedAt: `${D}T06:00:00Z`,
    history: [
      { stage: 'wait_shunting',    enteredAt: `${D}T05:45:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'allocated',        enteredAt: `${D}T06:00:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'waiting_bagged',   enteredAt: `${D}T07:00:00Z`, fromLocation: 'Depot', toLocation: 'Bakal warehouse', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'loading_bagged',   enteredAt: `${D}T08:10:00Z`, quantity: 28, postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'waiting_crushing', enteredAt: `${D}T09:00:00Z`, fromLocation: 'Bakal warehouse', toLocation: 'Marziq crushing site', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'loading',          enteredAt: `${D}T10:05:00Z`, quantity: 27, weighbridgePicture: 'wb_raj187q_2026-04-30.jpg', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'transit',          enteredAt: `${D}T10:35:00Z`, fromLocation: 'Marziq crushing site', toLocation: 'Bakal warehouse', postedBy: 'Enock Kariuki (Field)' },
    ],
  },

  // Flatbed 2 · RAJ 188 Q · UZABARINDA JEAN BAPTISTE → loading (at crusher)
  {
    _id: 'ta-002',
    plateNumber: 'RAJ 188 Q',
    trailerNumber: 'RL 8520',
    truckType: 'flatbed',
    driverName: 'UZABARINDA JEAN BAPTISTE',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-001',
    supplierName: 'Bakal',
    productId: 'prod-001',
    productName: 'Raw Stone',
    purchaseOrderRef: 'P00193',
    quantity: 30,
    warehouseName: 'Bakal warehouse',
    currentStage: 'loading',
    allocatedAt: `${D}T06:00:00Z`,
    history: [
      { stage: 'wait_shunting',    enteredAt: `${D}T05:45:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'allocated',        enteredAt: `${D}T06:00:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'waiting_bagged',   enteredAt: `${D}T07:20:00Z`, fromLocation: 'Depot', toLocation: 'Bakal warehouse', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'loading_bagged',   enteredAt: `${D}T08:30:00Z`, quantity: 30, postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'waiting_crushing', enteredAt: `${D}T09:30:00Z`, fromLocation: 'Bakal warehouse', toLocation: 'Marziq crushing site', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'loading',          enteredAt: `${D}T10:50:00Z`, quantity: 29, weighbridgePicture: 'wb_raj188q_2026-04-30.jpg', postedBy: 'Enock Kariuki (Field)' },
    ],
  },

  // Flatbed 3 · RAJ 189 Q · NGANGO PIEUX → waiting_bagged
  {
    _id: 'ta-003',
    plateNumber: 'RAJ 189 Q',
    trailerNumber: 'RL 8521',
    truckType: 'flatbed',
    driverName: 'NGANGO PIEUX',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-001',
    supplierName: 'Bakal',
    productId: 'prod-001',
    productName: 'Raw Stone',
    purchaseOrderRef: 'P00172',
    quantity: 28,
    warehouseName: 'Bakal warehouse',
    currentStage: 'waiting_bagged',
    allocatedAt: `${D}T07:00:00Z`,
    history: [
      { stage: 'wait_shunting',  enteredAt: `${D}T06:45:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'allocated',      enteredAt: `${D}T07:00:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'waiting_bagged', enteredAt: `${D}T08:30:00Z`, fromLocation: 'Depot', toLocation: 'Bakal warehouse', postedBy: 'Rayan Ken NSONERA (Field)' },
    ],
  },

  // ─── Hazamoda (SUP-004) ─── mine: Hazamoda warehouse · crusher: Marziq crushing site ───
  // Flatbed 4 · RAJ 193 Q · MUGISHA JEAN BOSCO → allocated
  {
    _id: 'ta-004',
    plateNumber: 'RAJ 193 Q',
    trailerNumber: 'RL 8524',
    truckType: 'flatbed',
    driverName: 'MUGISHA JEAN BOSCO',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-002',
    supplierName: 'Hazamoda',
    productId: 'prod-002',
    productName: 'Raw Aggregate',
    purchaseOrderRef: 'P00167',
    quantity: 32,
    warehouseName: 'Hazamoda warehouse',
    currentStage: 'allocated',
    allocatedAt: `${D}T07:30:00Z`,
    history: [
      { stage: 'wait_shunting', enteredAt: `${D}T07:15:00Z`, postedBy: 'Rogers Paris (Transport)' },
      { stage: 'allocated',     enteredAt: `${D}T07:30:00Z`, postedBy: 'Rogers Paris (Transport)' },
    ],
  },

  // Flatbed 5 · RAJ 190 Q · UWAYEZU RAMADHAN → transit (completed full journey)
  {
    _id: 'ta-005',
    plateNumber: 'RAJ 190 Q',
    trailerNumber: 'RL 8522',
    truckType: 'flatbed',
    driverName: 'UWAYEZU RAMADHAN',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-002',
    supplierName: 'Hazamoda',
    productId: 'prod-002',
    productName: 'Raw Aggregate',
    purchaseOrderRef: 'P00167',
    quantity: 29,
    warehouseName: 'Hazamoda warehouse',
    currentStage: 'transit',
    allocatedAt: `${D}T05:45:00Z`,
    history: [
      { stage: 'wait_shunting',    enteredAt: `${D}T05:30:00Z`, postedBy: 'Rogers Paris (Transport)' },
      { stage: 'allocated',        enteredAt: `${D}T05:45:00Z`, postedBy: 'Rogers Paris (Transport)' },
      { stage: 'waiting_bagged',   enteredAt: `${D}T06:30:00Z`, fromLocation: 'Depot', toLocation: 'Hazamoda warehouse', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'loading_bagged',   enteredAt: `${D}T07:30:00Z`, quantity: 29, postedBy: 'Enock Kariuki (Field)' },
      { stage: 'waiting_crushing', enteredAt: `${D}T08:30:00Z`, fromLocation: 'Hazamoda warehouse', toLocation: 'Marziq crushing site', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'loading',          enteredAt: `${D}T09:45:00Z`, quantity: 28, weighbridgePicture: 'wb_raj190q_2026-04-30.jpg', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'transit',          enteredAt: `${D}T10:15:00Z`, fromLocation: 'Marziq crushing site', toLocation: 'Hazamoda warehouse', postedBy: 'Enock Kariuki (Field)' },
    ],
  },

  // Flatbed 6 · RAJ 192 Q · BIZIMANA AIME → loading_bagged
  {
    _id: 'ta-006',
    plateNumber: 'RAJ 192 Q',
    trailerNumber: 'RL 3523',
    truckType: 'flatbed',
    driverName: 'BIZIMANA AIME',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-002',
    supplierName: 'Hazamoda',
    productId: 'prod-002',
    productName: 'Raw Aggregate',
    purchaseOrderRef: 'P00167',
    quantity: 31,
    warehouseName: 'Hazamoda warehouse',
    currentStage: 'loading_bagged',
    allocatedAt: `${D}T06:30:00Z`,
    history: [
      { stage: 'wait_shunting',  enteredAt: `${D}T06:15:00Z`, postedBy: 'Rogers Paris (Transport)' },
      { stage: 'allocated',      enteredAt: `${D}T06:30:00Z`, postedBy: 'Rogers Paris (Transport)' },
      { stage: 'waiting_bagged', enteredAt: `${D}T07:30:00Z`, fromLocation: 'Depot', toLocation: 'Hazamoda warehouse', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'loading_bagged', enteredAt: `${D}T09:00:00Z`, quantity: 31, postedBy: 'Enock Kariuki (Field)' },
    ],
  },

  // ─── Hyle (SUP-003) ─── mine: Hyle warehouse · crusher: Tusmo crushing site ───
  // Flatbed 7 · RAJ 194 Q · JOHN NJAGI → wait_shunting
  {
    _id: 'ta-007',
    plateNumber: 'RAJ 194 Q',
    trailerNumber: 'RL 8525',
    truckType: 'flatbed',
    driverName: 'JOHN NJAGI',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-003',
    supplierName: 'Hyle',
    productId: 'prod-003',
    productName: 'Stone Chips',
    purchaseOrderRef: 'P00175',
    quantity: 27,
    warehouseName: 'Hyle warehouse',
    currentStage: 'wait_shunting',
    allocatedAt: `${D}T08:00:00Z`,
    history: [
      { stage: 'wait_shunting', enteredAt: `${D}T08:00:00Z`, postedBy: 'MUGABO Richard (Transport)' },
    ],
  },

  // Flatbed 8 · RAJ 195 Q · NTAWUGARUKA CLEMENT → transit (completed full journey)
  {
    _id: 'ta-008',
    plateNumber: 'RAJ 195 Q',
    trailerNumber: 'RL 8526',
    truckType: 'flatbed',
    driverName: 'NTAWUGARUKA CLEMENT',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-003',
    supplierName: 'Hyle',
    productId: 'prod-003',
    productName: 'Stone Chips',
    purchaseOrderRef: 'P00175',
    quantity: 26,
    warehouseName: 'Hyle warehouse',
    currentStage: 'transit',
    allocatedAt: `${D}T05:30:00Z`,
    history: [
      { stage: 'wait_shunting',    enteredAt: `${D}T05:15:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'allocated',        enteredAt: `${D}T05:30:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'waiting_bagged',   enteredAt: `${D}T06:15:00Z`, fromLocation: 'Depot', toLocation: 'Hyle warehouse', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'loading_bagged',   enteredAt: `${D}T07:00:00Z`, quantity: 26, postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'waiting_crushing', enteredAt: `${D}T08:00:00Z`, fromLocation: 'Hyle warehouse', toLocation: 'Tusmo crushing site', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'loading',          enteredAt: `${D}T09:15:00Z`, quantity: 25, weighbridgePicture: 'wb_raj195q_2026-04-30.jpg', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'transit',          enteredAt: `${D}T09:45:00Z`, fromLocation: 'Tusmo crushing site', toLocation: 'Hyle warehouse', postedBy: 'Rayan Ken NSONERA (Field)' },
    ],
  },

  // Flatbed 9 · RAJ 196 Q · SEBAHIRE GASTON → waiting_crushing
  {
    _id: 'ta-009',
    plateNumber: 'RAJ 196 Q',
    trailerNumber: 'RL 8527',
    truckType: 'flatbed',
    driverName: 'SEBAHIRE GASTON',
    transporterId: 'trp-own',
    transporterName: 'TEKACCESS LTD',
    supplierId: 'sup-003',
    supplierName: 'Hyle',
    productId: 'prod-003',
    productName: 'Stone Chips',
    purchaseOrderRef: 'P00175',
    quantity: 28,
    warehouseName: 'Hyle warehouse',
    currentStage: 'waiting_crushing',
    allocatedAt: `${D}T06:00:00Z`,
    history: [
      { stage: 'wait_shunting',    enteredAt: `${D}T05:45:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'allocated',        enteredAt: `${D}T06:00:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'waiting_bagged',   enteredAt: `${D}T07:00:00Z`, fromLocation: 'Depot', toLocation: 'Hyle warehouse', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'loading_bagged',   enteredAt: `${D}T08:00:00Z`, quantity: 28, postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'waiting_crushing', enteredAt: `${D}T09:30:00Z`, fromLocation: 'Hyle warehouse', toLocation: 'Tusmo crushing site', postedBy: 'Rayan Ken NSONERA (Field)' },
    ],
  },

  // ─── Tipper trucks from external transporters ────────────────────────────────
  // Imperial (TRP-0008) → Hazamoda · transit (completed full journey)
  {
    _id: 'ta-012',
    plateNumber: 'RAG 518 D',
    truckType: 'tipper',
    driverName: 'NIYONZIMA ALEX',
    transporterId: 'trp-003',
    transporterName: 'Imperial',
    supplierId: 'sup-002',
    supplierName: 'Hazamoda',
    productId: 'prod-002',
    productName: 'Raw Aggregate',
    purchaseOrderRef: 'P00167',
    quantity: 32,
    warehouseName: 'Hazamoda warehouse',
    currentStage: 'transit',
    allocatedAt: `${D}T05:30:00Z`,
    history: [
      { stage: 'allocated',        enteredAt: `${D}T05:30:00Z`, postedBy: 'Rogers Paris (Transport)' },
      { stage: 'waiting_mine',     enteredAt: `${D}T06:15:00Z`, fromLocation: 'Depot', toLocation: 'Hazamoda warehouse', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'loading_mine',     enteredAt: `${D}T07:00:00Z`, postedBy: 'Enock Kariuki (Field)' },
      { stage: 'shunting',         enteredAt: `${D}T08:00:00Z`, fromLocation: 'Mine loading bay', toLocation: 'Marziq crushing site', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'waiting_crushing', enteredAt: `${D}T08:15:00Z`, postedBy: 'Enock Kariuki (Field)' },
      { stage: 'loading_crushed',  enteredAt: `${D}T09:30:00Z`, quantity: 30, weighbridgePicture: 'wb_rag518d_2026-04-30.jpg', postedBy: 'Enock Kariuki (Field)' },
      { stage: 'transit',          enteredAt: `${D}T10:00:00Z`, fromLocation: 'Marziq crushing site', toLocation: 'Hazamoda warehouse', postedBy: 'Enock Kariuki (Field)' },
    ],
  },

  // Tahita (TRP-0009) → Hyle · loading_crushed
  {
    _id: 'ta-013',
    plateNumber: 'RAF 261 E',
    truckType: 'tipper',
    driverName: 'KARANGWA PASCAL',
    transporterId: 'trp-002',
    transporterName: 'Tahita',
    supplierId: 'sup-003',
    supplierName: 'Hyle',
    productId: 'prod-003',
    productName: 'Stone Chips',
    purchaseOrderRef: 'P00175',
    quantity: 27,
    warehouseName: 'Hyle warehouse',
    currentStage: 'loading_crushed',
    allocatedAt: `${D}T06:00:00Z`,
    history: [
      { stage: 'allocated',        enteredAt: `${D}T06:00:00Z`, postedBy: 'MUGABO Richard (Transport)' },
      { stage: 'waiting_mine',     enteredAt: `${D}T07:00:00Z`, fromLocation: 'Depot', toLocation: 'Hyle warehouse', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'loading_mine',     enteredAt: `${D}T07:45:00Z`, postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'shunting',         enteredAt: `${D}T08:30:00Z`, fromLocation: 'Mine loading bay', toLocation: 'Tusmo crushing site', postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'waiting_crushing', enteredAt: `${D}T08:45:00Z`, postedBy: 'Rayan Ken NSONERA (Field)' },
      { stage: 'loading_crushed',  enteredAt: `${D}T10:00:00Z`, quantity: 25, weighbridgePicture: 'wb_raf261e_2026-04-30.jpg', postedBy: 'Rayan Ken NSONERA (Field)' },
    ],
  },
];

// ─── Movement Records ─────────────────────────────────────────────────────────

export const mockMovementRecords: MovementRecord[] = [
  {
    _id: 'mv-001', allocationId: 'ta-001', plateNumber: 'RAJ 187 Q', truckType: 'flatbed',
    movementType: 'inbound', fromLocation: 'Marziq crushing site', toLocation: 'Bakal warehouse',
    quantity: 27, weighbridgePicture: 'wb_raj187q_2026-04-30.jpg', postedBy: 'Enock Kariuki',
    timestamp: `${D}T10:35:00Z`, transporterName: 'TEKACCESS LTD',
    supplierName: 'Bakal', productName: 'Raw Stone', warehouseName: 'Bakal warehouse',
  },
  {
    _id: 'mv-002', allocationId: 'ta-002', plateNumber: 'RAJ 188 Q', truckType: 'flatbed',
    movementType: 'processing', fromLocation: 'Bakal warehouse', toLocation: 'Marziq crushing site',
    quantity: 29, weighbridgePicture: 'wb_raj188q_2026-04-30.jpg', postedBy: 'Enock Kariuki',
    timestamp: `${D}T10:50:00Z`, transporterName: 'TEKACCESS LTD',
    supplierName: 'Bakal', productName: 'Raw Stone', warehouseName: 'Bakal warehouse',
  },
  {
    _id: 'mv-003', allocationId: 'ta-005', plateNumber: 'RAJ 190 Q', truckType: 'flatbed',
    movementType: 'inbound', fromLocation: 'Marziq crushing site', toLocation: 'Hazamoda warehouse',
    quantity: 28, weighbridgePicture: 'wb_raj190q_2026-04-30.jpg', postedBy: 'Enock Kariuki',
    timestamp: `${D}T10:15:00Z`, transporterName: 'TEKACCESS LTD',
    supplierName: 'Hazamoda', productName: 'Raw Aggregate', warehouseName: 'Hazamoda warehouse',
  },
  {
    _id: 'mv-004', allocationId: 'ta-008', plateNumber: 'RAJ 195 Q', truckType: 'flatbed',
    movementType: 'inbound', fromLocation: 'Tusmo crushing site', toLocation: 'Hyle warehouse',
    quantity: 25, weighbridgePicture: 'wb_raj195q_2026-04-30.jpg', postedBy: 'Rayan Ken NSONERA',
    timestamp: `${D}T09:45:00Z`, transporterName: 'TEKACCESS LTD',
    supplierName: 'Hyle', productName: 'Stone Chips', warehouseName: 'Hyle warehouse',
  },
  {
    _id: 'mv-005', allocationId: 'ta-012', plateNumber: 'RAG 518 D', truckType: 'tipper',
    movementType: 'inbound', fromLocation: 'Marziq crushing site', toLocation: 'Hazamoda warehouse',
    quantity: 30, weighbridgePicture: 'wb_rag518d_2026-04-30.jpg', postedBy: 'Enock Kariuki',
    timestamp: `${D}T10:00:00Z`, transporterName: 'Imperial',
    supplierName: 'Hazamoda', productName: 'Raw Aggregate', warehouseName: 'Hazamoda warehouse',
  },
  {
    _id: 'mv-006', allocationId: 'ta-013', plateNumber: 'RAF 261 E', truckType: 'tipper',
    movementType: 'processing', fromLocation: 'Hyle warehouse', toLocation: 'Tusmo crushing site',
    quantity: 25, weighbridgePicture: 'wb_raf261e_2026-04-30.jpg', postedBy: 'Rayan Ken NSONERA',
    timestamp: `${D}T10:00:00Z`, transporterName: 'Tahita',
    supplierName: 'Hyle', productName: 'Stone Chips', warehouseName: 'Hyle warehouse',
  },
];

// ─── Stock Summary ────────────────────────────────────────────────────────────

export const mockStockSummary = {
  inboundToday:    { count: 4, tons: 110 },
  processingToday: { count: 2, tons: 54 },
  transferToday:   { count: 0, tons: 0 },
  outboundToday:   { count: 0, tons: 0 },
  transitNow:      { count: 3, tons: 85 },
};
