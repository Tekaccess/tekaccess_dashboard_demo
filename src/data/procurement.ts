// ─── Purchase Orders ────────────────────────────────────────────────────────

export type PurchaseOrderStatus = 'Active' | 'Pending' | 'Draft' | 'Overdue' | 'Completed';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  category: string;
  items: number;
  totalAmount: number;
  currency: string;
  status: PurchaseOrderStatus;
  createdDate: string;
  expectedDate: string;
  approvedBy: string;
}

export const purchaseOrders: PurchaseOrder[] = [
  { id: '1', orderNumber: 'PO-2026-001', supplier: 'Kigali Industrial Supplies', category: 'Raw Materials', items: 12, totalAmount: 4850000, currency: 'RWF', status: 'Active', createdDate: '2026-04-01', expectedDate: '2026-04-20', approvedBy: 'Thierry G.' },
  { id: '2', orderNumber: 'PO-2026-002', supplier: 'East Africa Lubricants Ltd', category: 'Maintenance', items: 5, totalAmount: 1200000, currency: 'RWF', status: 'Pending', createdDate: '2026-04-03', expectedDate: '2026-04-22', approvedBy: 'Marie U.' },
  { id: '3', orderNumber: 'PO-2026-003', supplier: 'TechParts Rwanda', category: 'Spare Parts', items: 8, totalAmount: 780000, currency: 'RWF', status: 'Draft', createdDate: '2026-04-05', expectedDate: '2026-04-28', approvedBy: 'Pending' },
  { id: '4', orderNumber: 'PO-2026-004', supplier: 'Pan African Freight Co.', category: 'Transport', items: 3, totalAmount: 3200000, currency: 'RWF', status: 'Overdue', createdDate: '2026-03-20', expectedDate: '2026-04-05', approvedBy: 'Jean K.' },
  { id: '5', orderNumber: 'PO-2026-005', supplier: 'Nairobi Office Solutions', category: 'Office Supplies', items: 20, totalAmount: 450000, currency: 'RWF', status: 'Completed', createdDate: '2026-03-15', expectedDate: '2026-03-30', approvedBy: 'Sarah M.' },
  { id: '6', orderNumber: 'PO-2026-006', supplier: 'Kigali Industrial Supplies', category: 'Raw Materials', items: 7, totalAmount: 2100000, currency: 'RWF', status: 'Active', createdDate: '2026-04-08', expectedDate: '2026-04-25', approvedBy: 'Thierry G.' },
  { id: '7', orderNumber: 'PO-2026-007', supplier: 'SafeTech Uganda', category: 'Safety Equipment', items: 15, totalAmount: 900000, currency: 'RWF', status: 'Pending', createdDate: '2026-04-10', expectedDate: '2026-04-30', approvedBy: 'Marie U.' },
  { id: '8', orderNumber: 'PO-2026-008', supplier: 'East Africa Lubricants Ltd', category: 'Maintenance', items: 4, totalAmount: 640000, currency: 'RWF', status: 'Active', createdDate: '2026-04-12', expectedDate: '2026-05-05', approvedBy: 'Jean K.' },
  { id: '9', orderNumber: 'PO-2026-009', supplier: 'TechParts Rwanda', category: 'Spare Parts', items: 11, totalAmount: 1560000, currency: 'RWF', status: 'Overdue', createdDate: '2026-03-28', expectedDate: '2026-04-10', approvedBy: 'Sarah M.' },
  { id: '10', orderNumber: 'PO-2026-010', supplier: 'Nairobi Office Solutions', category: 'IT Equipment', items: 6, totalAmount: 5200000, currency: 'RWF', status: 'Completed', createdDate: '2026-03-10', expectedDate: '2026-03-25', approvedBy: 'Thierry G.' },
  { id: '11', orderNumber: 'PO-2026-011', supplier: 'Pan African Freight Co.', category: 'Transport', items: 2, totalAmount: 1800000, currency: 'RWF', status: 'Draft', createdDate: '2026-04-14', expectedDate: '2026-05-10', approvedBy: 'Pending' },
  { id: '12', orderNumber: 'PO-2026-012', supplier: 'SafeTech Uganda', category: 'Safety Equipment', items: 9, totalAmount: 720000, currency: 'RWF', status: 'Active', createdDate: '2026-04-15', expectedDate: '2026-05-07', approvedBy: 'Marie U.' },
];

// Monthly PO volume data for charts
export const poMonthlyVolume = [
  { month: 'Jan', orders: 8, amount: 12400000 },
  { month: 'Feb', orders: 11, amount: 18900000 },
  { month: 'Mar', orders: 14, amount: 22100000 },
  { month: 'Apr', orders: 12, amount: 21450000 },
  { month: 'May', orders: 9, amount: 16800000 },
  { month: 'Jun', orders: 16, amount: 28300000 },
];

export const poCategoryBreakdown = [
  { category: 'Raw Materials', value: 35, color: '#1e3a8a' },
  { category: 'Spare Parts', value: 22, color: '#3b82f6' },
  { category: 'Maintenance', value: 18, color: '#60a5fa' },
  { category: 'Transport', value: 12, color: '#93c5fd' },
  { category: 'Other', value: 13, color: '#bfdbfe' },
];

// ─── Suppliers ───────────────────────────────────────────────────────────────

export type SupplierStatus = 'Active' | 'Inactive' | 'On Hold' | 'Blacklisted';
export type SupplierRating = 1 | 2 | 3 | 4 | 5;

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  category: string;
  status: SupplierStatus;
  rating: SupplierRating;
  totalOrders: number;
  totalSpend: number;
  onTimeDelivery: number; // percentage
  lastOrderDate: string;
  paymentTerms: string;
}

export const suppliers: Supplier[] = [
  { id: '1', name: 'Kigali Industrial Supplies', contactPerson: 'Emmanuel Mutayoba', email: 'e.mutayoba@kis.rw', phone: '+250 788 123 456', country: 'Rwanda', city: 'Kigali', category: 'Raw Materials', status: 'Active', rating: 5, totalOrders: 48, totalSpend: 62000000, onTimeDelivery: 96, lastOrderDate: '2026-04-08', paymentTerms: 'Net 30' },
  { id: '2', name: 'East Africa Lubricants Ltd', contactPerson: 'Amina Hassan', email: 'a.hassan@eal.co.ke', phone: '+254 712 345 678', country: 'Kenya', city: 'Nairobi', category: 'Maintenance', status: 'Active', rating: 4, totalOrders: 32, totalSpend: 18400000, onTimeDelivery: 88, lastOrderDate: '2026-04-12', paymentTerms: 'Net 15' },
  { id: '3', name: 'TechParts Rwanda', contactPerson: 'Patrick Uwimana', email: 'p.uwimana@techparts.rw', phone: '+250 722 987 654', country: 'Rwanda', city: 'Kigali', category: 'Spare Parts', status: 'Active', rating: 4, totalOrders: 27, totalSpend: 14200000, onTimeDelivery: 82, lastOrderDate: '2026-04-05', paymentTerms: 'Net 30' },
  { id: '4', name: 'Pan African Freight Co.', contactPerson: 'David Ochieng', email: 'd.ochieng@pafc.com', phone: '+254 733 456 789', country: 'Kenya', city: 'Mombasa', category: 'Transport', status: 'On Hold', rating: 2, totalOrders: 15, totalSpend: 9800000, onTimeDelivery: 60, lastOrderDate: '2026-03-20', paymentTerms: 'Net 60' },
  { id: '5', name: 'Nairobi Office Solutions', contactPerson: 'Grace Njeri', email: 'g.njeri@nos.co.ke', phone: '+254 745 678 901', country: 'Kenya', city: 'Nairobi', category: 'Office Supplies', status: 'Active', rating: 5, totalOrders: 55, totalSpend: 8600000, onTimeDelivery: 97, lastOrderDate: '2026-04-15', paymentTerms: 'Net 15' },
  { id: '6', name: 'SafeTech Uganda', contactPerson: 'Moses Otieno', email: 'm.otieno@safetech.ug', phone: '+256 712 234 567', country: 'Uganda', city: 'Kampala', category: 'Safety Equipment', status: 'Active', rating: 3, totalOrders: 18, totalSpend: 7200000, onTimeDelivery: 78, lastOrderDate: '2026-04-10', paymentTerms: 'Net 30' },
  { id: '7', name: 'Continental Tyres EA', contactPerson: 'Fatima Al-Rashid', email: 'f.rashid@continental-ea.com', phone: '+254 701 123 456', country: 'Kenya', city: 'Nairobi', category: 'Tyres & Wheels', status: 'Active', rating: 5, totalOrders: 41, totalSpend: 38500000, onTimeDelivery: 94, lastOrderDate: '2026-04-14', paymentTerms: 'Net 45' },
  { id: '8', name: 'Rwanda Fuel Depot', contactPerson: 'Claude Habyarimana', email: 'c.habyarimana@rfd.rw', phone: '+250 733 111 222', country: 'Rwanda', city: 'Kigali', category: 'Fuel', status: 'Active', rating: 4, totalOrders: 120, totalSpend: 145000000, onTimeDelivery: 99, lastOrderDate: '2026-04-16', paymentTerms: 'Net 7' },
  { id: '9', name: 'TZ Mechanical Works', contactPerson: 'Juma Mwamba', email: 'j.mwamba@tzmw.co.tz', phone: '+255 756 789 012', country: 'Tanzania', city: 'Dar es Salaam', category: 'Mechanical Parts', status: 'Inactive', rating: 3, totalOrders: 8, totalSpend: 4300000, onTimeDelivery: 70, lastOrderDate: '2025-12-10', paymentTerms: 'Net 30' },
  { id: '10', name: 'Bujumbura Trading Co.', contactPerson: 'Pierre Nkurunziza', email: 'p.nkurunziza@btc.bi', phone: '+257 79 345 678', country: 'Burundi', city: 'Bujumbura', category: 'Raw Materials', status: 'Blacklisted', rating: 1, totalOrders: 4, totalSpend: 1800000, onTimeDelivery: 40, lastOrderDate: '2025-09-15', paymentTerms: 'Prepayment' },
];

export const supplierPerformance = [
  { name: 'Rwanda Fuel Depot', onTime: 99, quality: 95, cost: 88 },
  { name: 'Nairobi Office Solutions', onTime: 97, quality: 94, cost: 92 },
  { name: 'Kigali Industrial Supplies', onTime: 96, quality: 91, cost: 85 },
  { name: 'Continental Tyres EA', onTime: 94, quality: 93, cost: 80 },
  { name: 'East Africa Lubricants', onTime: 88, quality: 86, cost: 90 },
];

// ─── Shipments ───────────────────────────────────────────────────────────────

export type ShipmentStatus = 'In Transit' | 'Delivered' | 'Delayed' | 'Customs Hold' | 'Cancelled';

export interface Shipment {
  id: string;
  shipmentNumber: string;
  poReference: string;
  supplier: string;
  origin: string;
  destination: string;
  carrier: string;
  status: ShipmentStatus;
  dispatchDate: string;
  estimatedArrival: string;
  actualArrival?: string;
  weightKg: number;
  packages: number;
  trackingId: string;
}

export const shipments: Shipment[] = [
  { id: '1', shipmentNumber: 'SHP-2026-001', poReference: 'PO-2026-001', supplier: 'Kigali Industrial Supplies', origin: 'Kigali, RW', destination: 'Kigali Warehouse A', carrier: 'DHL East Africa', status: 'In Transit', dispatchDate: '2026-04-12', estimatedArrival: '2026-04-18', weightKg: 850, packages: 24, trackingId: 'DHL-88213452' },
  { id: '2', shipmentNumber: 'SHP-2026-002', poReference: 'PO-2026-005', supplier: 'Nairobi Office Solutions', origin: 'Nairobi, KE', destination: 'Kigali Office', carrier: 'Fedex Africa', status: 'Delivered', dispatchDate: '2026-03-22', estimatedArrival: '2026-03-28', actualArrival: '2026-03-27', weightKg: 120, packages: 8, trackingId: 'FX-99328871' },
  { id: '3', shipmentNumber: 'SHP-2026-003', poReference: 'PO-2026-004', supplier: 'Pan African Freight Co.', origin: 'Mombasa, KE', destination: 'Kigali Warehouse B', carrier: 'Pan African Freight', status: 'Delayed', dispatchDate: '2026-03-25', estimatedArrival: '2026-04-02', weightKg: 3200, packages: 40, trackingId: 'PAF-67812300' },
  { id: '4', shipmentNumber: 'SHP-2026-004', poReference: 'PO-2026-002', supplier: 'East Africa Lubricants Ltd', origin: 'Nairobi, KE', destination: 'Maintenance Depot', carrier: 'G4S Logistics', status: 'In Transit', dispatchDate: '2026-04-14', estimatedArrival: '2026-04-22', weightKg: 540, packages: 12, trackingId: 'G4S-45621098' },
  { id: '5', shipmentNumber: 'SHP-2026-005', poReference: 'PO-2026-010', supplier: 'Nairobi Office Solutions', origin: 'Nairobi, KE', destination: 'IT Department', carrier: 'Aramex', status: 'Delivered', dispatchDate: '2026-03-12', estimatedArrival: '2026-03-20', actualArrival: '2026-03-19', weightKg: 280, packages: 6, trackingId: 'ARX-33214567' },
  { id: '6', shipmentNumber: 'SHP-2026-006', poReference: 'PO-2026-007', supplier: 'SafeTech Uganda', origin: 'Kampala, UG', destination: 'Safety Depot', carrier: 'DHL East Africa', status: 'Customs Hold', dispatchDate: '2026-04-11', estimatedArrival: '2026-04-17', weightKg: 420, packages: 18, trackingId: 'DHL-77654321' },
  { id: '7', shipmentNumber: 'SHP-2026-007', poReference: 'PO-2026-006', supplier: 'Kigali Industrial Supplies', origin: 'Kigali, RW', destination: 'Kigali Warehouse A', carrier: 'Local Express RW', status: 'In Transit', dispatchDate: '2026-04-15', estimatedArrival: '2026-04-20', weightKg: 1100, packages: 30, trackingId: 'LER-11234567' },
  { id: '8', shipmentNumber: 'SHP-2026-008', poReference: 'PO-2026-009', supplier: 'TechParts Rwanda', origin: 'Kigali, RW', destination: 'Maintenance Depot', carrier: 'Local Express RW', status: 'Delayed', dispatchDate: '2026-04-01', estimatedArrival: '2026-04-07', weightKg: 300, packages: 15, trackingId: 'LER-22345678' },
  { id: '9', shipmentNumber: 'SHP-2026-009', poReference: 'PO-2026-012', supplier: 'SafeTech Uganda', origin: 'Kampala, UG', destination: 'Field Office', carrier: 'Aramex', status: 'In Transit', dispatchDate: '2026-04-16', estimatedArrival: '2026-04-23', weightKg: 190, packages: 9, trackingId: 'ARX-55678901' },
  { id: '10', shipmentNumber: 'SHP-2026-010', poReference: 'PO-2026-003', supplier: 'TechParts Rwanda', origin: 'Kigali, RW', destination: 'Kigali Warehouse B', carrier: 'Local Express RW', status: 'Cancelled', dispatchDate: '2026-04-06', estimatedArrival: '2026-04-10', weightKg: 0, packages: 0, trackingId: 'N/A' },
];

export const shipmentStatusSummary = [
  { status: 'In Transit', count: 4, color: '#3b82f6' },
  { status: 'Delivered', count: 2, color: '#22c55e' },
  { status: 'Delayed', count: 2, color: '#f59e0b' },
  { status: 'Customs Hold', count: 1, color: '#ef4444' },
  { status: 'Cancelled', count: 1, color: '#6b7280' },
];

// ─── Spare Parts ─────────────────────────────────────────────────────────────

export type SparePartCondition = 'New' | 'Refurbished' | 'Used';
export type StockLevel = 'Critical' | 'Low' | 'Normal' | 'Overstocked';

export interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  category: string;
  supplier: string;
  unitPrice: number;
  stockQuantity: number;
  minStock: number;
  maxStock: number;
  stockLevel: StockLevel;
  condition: SparePartCondition;
  lastRestocked: string;
  location: string;
  compatible: string[];
}

export const spareParts: SparePart[] = [
  { id: '1', partNumber: 'ENG-001-A', name: 'Engine Oil Filter', description: 'Heavy duty oil filter for diesel engines', category: 'Engine', supplier: 'TechParts Rwanda', unitPrice: 15000, stockQuantity: 2, minStock: 10, maxStock: 50, stockLevel: 'Critical', condition: 'New', lastRestocked: '2026-02-15', location: 'Shelf A-01', compatible: ['Scania R450', 'Volvo FH16'] },
  { id: '2', partNumber: 'TYR-004-B', name: 'Truck Tyre 295/80R22.5', description: 'Premium all-weather truck tyre', category: 'Tyres & Wheels', supplier: 'Continental Tyres EA', unitPrice: 420000, stockQuantity: 8, minStock: 6, maxStock: 30, stockLevel: 'Normal', condition: 'New', lastRestocked: '2026-03-20', location: 'Yard B', compatible: ['Scania R450', 'Man TGX', 'Volvo FH16'] },
  { id: '3', partNumber: 'BRK-008-C', name: 'Brake Pads Set', description: 'Complete front/rear brake pad set', category: 'Brakes', supplier: 'TechParts Rwanda', unitPrice: 85000, stockQuantity: 4, minStock: 8, maxStock: 40, stockLevel: 'Low', condition: 'New', lastRestocked: '2026-03-10', location: 'Shelf B-02', compatible: ['All Models'] },
  { id: '4', partNumber: 'ELC-012-A', name: 'Alternator Assembly', description: '24V 150A truck alternator', category: 'Electrical', supplier: 'TechParts Rwanda', unitPrice: 280000, stockQuantity: 3, minStock: 2, maxStock: 10, stockLevel: 'Normal', condition: 'New', lastRestocked: '2026-04-01', location: 'Shelf C-05', compatible: ['Scania R450', 'Volvo FH16'] },
  { id: '5', partNumber: 'FUEL-003-B', name: 'Fuel Injector', description: 'Common rail fuel injector', category: 'Fuel System', supplier: 'East Africa Lubricants Ltd', unitPrice: 350000, stockQuantity: 6, minStock: 4, maxStock: 20, stockLevel: 'Normal', condition: 'New', lastRestocked: '2026-03-25', location: 'Shelf A-03', compatible: ['Scania R450'] },
  { id: '6', partNumber: 'COOL-007-A', name: 'Radiator Core', description: 'Aluminum radiator core assembly', category: 'Cooling', supplier: 'TechParts Rwanda', unitPrice: 195000, stockQuantity: 1, minStock: 3, maxStock: 12, stockLevel: 'Critical', condition: 'New', lastRestocked: '2026-01-30', location: 'Shelf D-02', compatible: ['Man TGX', 'Volvo FH16'] },
  { id: '7', partNumber: 'SUSP-015-C', name: 'Leaf Spring Assembly', description: 'Rear suspension leaf spring pack', category: 'Suspension', supplier: 'TechParts Rwanda', unitPrice: 145000, stockQuantity: 12, minStock: 5, maxStock: 25, stockLevel: 'Normal', condition: 'New', lastRestocked: '2026-04-08', location: 'Yard C', compatible: ['Man TGX'] },
  { id: '8', partNumber: 'GBOX-002-A', name: 'Gearbox Oil Seal Kit', description: 'Complete seal kit for gearbox overhaul', category: 'Transmission', supplier: 'East Africa Lubricants Ltd', unitPrice: 62000, stockQuantity: 18, minStock: 5, maxStock: 30, stockLevel: 'Overstocked', condition: 'New', lastRestocked: '2026-04-10', location: 'Shelf B-04', compatible: ['All Models'] },
  { id: '9', partNumber: 'EXHST-009-B', name: 'Exhaust Flex Pipe', description: 'Stainless steel corrugated flex pipe', category: 'Exhaust', supplier: 'TechParts Rwanda', unitPrice: 45000, stockQuantity: 7, minStock: 5, maxStock: 20, stockLevel: 'Normal', condition: 'New', lastRestocked: '2026-03-18', location: 'Shelf E-01', compatible: ['Scania R450', 'Man TGX'] },
  { id: '10', partNumber: 'CLUT-011-A', name: 'Clutch Disc Set', description: 'Full clutch disc and pressure plate kit', category: 'Transmission', supplier: 'TechParts Rwanda', unitPrice: 320000, stockQuantity: 5, minStock: 3, maxStock: 15, stockLevel: 'Normal', condition: 'New', lastRestocked: '2026-04-05', location: 'Shelf C-03', compatible: ['Scania R450', 'Volvo FH16', 'Man TGX'] },
  { id: '11', partNumber: 'AIR-006-C', name: 'Air Filter Primary', description: 'Primary air filter element', category: 'Engine', supplier: 'East Africa Lubricants Ltd', unitPrice: 28000, stockQuantity: 3, minStock: 10, maxStock: 50, stockLevel: 'Low', condition: 'New', lastRestocked: '2026-02-28', location: 'Shelf A-02', compatible: ['All Models'] },
  { id: '12', partNumber: 'BAT-020-A', name: 'Truck Battery 200Ah', description: '12V 200Ah heavy duty battery', category: 'Electrical', supplier: 'TechParts Rwanda', unitPrice: 180000, stockQuantity: 9, minStock: 4, maxStock: 20, stockLevel: 'Normal', condition: 'New', lastRestocked: '2026-04-12', location: 'Shelf C-06', compatible: ['All Models'] },
];

export const partsStockByCategory = [
  { category: 'Engine', parts: 12, lowStock: 3, value: 1850000 },
  { category: 'Tyres & Wheels', parts: 5, lowStock: 0, value: 8400000 },
  { category: 'Brakes', parts: 8, lowStock: 2, value: 920000 },
  { category: 'Electrical', parts: 15, lowStock: 1, value: 3200000 },
  { category: 'Transmission', parts: 9, lowStock: 0, value: 4150000 },
  { category: 'Suspension', parts: 7, lowStock: 1, value: 2100000 },
];
