export type Role = 'CASHIER' | 'OWNER';

export interface StaffPermissions {
  can_checkout: boolean;
  can_record_pautang: boolean;
  can_settle_pautang: boolean;
  can_edit_inventory: boolean;
  can_view_margins: boolean;
  can_export_reports: boolean;
}

export interface StoreStaff {
  id: string;
  store_id: string;
  name: string;
  pin: string;
  role: 'cashier' | 'manager';
  is_active: boolean;
  permissions: StaffPermissions;
  created_at?: string;
}

export const DEFAULT_OWNER_PERMISSIONS: StaffPermissions = {
  can_checkout: true,
  can_record_pautang: true,
  can_settle_pautang: true,
  can_edit_inventory: true,
  can_view_margins: true,
  can_export_reports: true,
};

export const DEFAULT_CASHIER_PERMISSIONS: StaffPermissions = {
  can_checkout: true,
  can_record_pautang: true,
  can_settle_pautang: false,
  can_edit_inventory: false,
  can_view_margins: false,
  can_export_reports: false,
};

export const DEFAULT_MANAGER_PERMISSIONS: StaffPermissions = {
  can_checkout: true,
  can_record_pautang: true,
  can_settle_pautang: true,
  can_edit_inventory: true,
  can_view_margins: true,
  can_export_reports: true,
};

export type CategoryId =
  | 'favorites'
  | 'beverages'
  | 'soap'
  | 'noodles'
  | 'tobacco'
  | 'rice'
  | 'snacks';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  shortLabel: string;
  emoji: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  shortName: string;
  category: Exclude<CategoryId, 'favorites'>;
  isFavorite: boolean;
  icon: string;
  accentColor: string;
  unit: string;
  wholesaleCost: number;
  sellingPrice: number;
  stockQty: number;
  lowStockThreshold: number;
  hourlyVelocity: number;
  daysSinceLastSale: number;
  voiceAliases: string[];
  imageUrl?: string;
  image_url?: string;
  image?: string;
  emoji?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export type CustomerCreditStatus = 'Good Standing' | 'Near Limit' | 'Overdue';

export interface Customer {
  id: string;
  name: string;
  alias: string;
  phone: string;
  creditLimit: number;
  currentBalance: number;
  status: CustomerCreditStatus;
  oldestDebtDays: number;
  oldestDebtAt: string;
  lastTransactionNote: string;
}

export interface ShiftRecord {
  id: string;
  cashierId: string;
  cashierName: string;
  pin: string;
  startedAt: string;
  endedAt?: string;
  openingCash: number;
  cashSalesTotal: number;
  pautangSalesTotal: number;
  repaymentsCollectedTotal: number;
  expectedDrawerCash: number;
  blindCountedCash?: number;
  discrepancy?: number;
  status: 'ACTIVE' | 'CLOSED_MATCH' | 'CLOSED_DISCREPANCY';
  notes?: string;
}

export interface TransactionRecord {
  id: string;
  createdAt: string;
  timestampMs: number;
  cashierId: string;
  cashierName: string;
  type: 'CASH' | 'PAUTANG';
  totalAmount: number;
  totalWholesaleCost: number;
  cashTendered?: number;
  changeGiven?: number;
  customerId?: string;
  customerName?: string;
  overrideApproved?: boolean;
  items: {
    productId: string;
    name: string;
    icon: string;
    qty: number;
    unitPrice: number;
    unitCost: number;
  }[];
  syncStatus: 'SYNCED' | 'PENDING_SYNC';
}

export interface CreditPayment {
  id: string;
  customerId: string;
  customerName: string;
  amountPaid: number;
  balanceAfter: number;
  receivedByUserId: string;
  receivedByName: string;
  createdAt: string;
  timestampMs: number;
  note?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: Role;
  eventType:
    | 'SHIFT_OPEN'
    | 'BLIND_COUNT_MISMATCH'
    | 'BLIND_COUNT_MATCH'
    | 'PRICE_EDIT'
    | 'OCR_STOCK_IN'
    | 'PAUTANG_CREDIT'
    | 'PAUTANG_REPAYMENT'
    | 'NEW_CUSTOMER'
    | 'CASH_OVERRIDE';
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  summary: string;
  detail: string;
}

export interface OcrDetectedItem {
  productId: string;
  sku: string;
  name: string;
  detectedQty: number;
  wholesaleUnitCost: number;
  suggestedRetailPrice: number;
  currentStock: number;
}

export interface OcrInvoicePreset {
  id: string;
  supplierName: string;
  invoiceNo: string;
  timestamp: string;
  items: OcrDetectedItem[];
}

export interface UserProfile {
  id: string;
  name: string;
  role: Role;
  pin: string;
  badge: string;
}

export type EnvironmentMode = 'DEMO' | 'LIVE';

export interface StoreProfile {
  id: string;
  storeName: string;
  barangayCity: string;
  ownerPhone: string;
  ownerName: string;
  createdAt: string;
  environment: EnvironmentMode;
  ownerId?: string;
  ownerEmail?: string;
}

export interface StoreStateSnapshot {
  profile: StoreProfile;
  users: UserProfile[];
  products: Product[];
  customers: Customer[];
  shifts: ShiftRecord[];
  transactions: TransactionRecord[];
  creditPayments: CreditPayment[];
  auditLogs: AuditLogEntry[];
}

export interface LiveOnboardingPayload {
  storeName: string;
  ownerPin: string;
  preloadStarterCatalog: boolean;
  ownerName?: string;
  ownerPhone?: string;
  barangayCity?: string;
  openingDrawerCash?: number;
  createCashierProfile?: boolean;
  cashierName?: string;
  cashierPin?: string;
  ownerId?: string;
  ownerEmail?: string;
}
