# TingiPOS — Cash & Pautang (Community Credit) Engine Implementation Plan

**TingiPOS** is a mobile-first (`390×844`), offline-capable Sari-Sari Store POS engineered around the two core payment flows of neighborhood micro-retail in the Philippines:
1. **Fast-Path Cash Transactions** (smart denomination presets, instant change calculation, `<100ms` 1-tap confirmation).
2. **Pautang (Community Credit) Ledger Engine** (customer credit profiles, ceiling progress bars, inline New Customer Quick-Add, PIN override for over-limit credit, full itemized debt history, and partial/full repayment tracking).

---

## 1. Streamlined Mobile Viewport & Header Architecture

- **Target Viewport**: `390×844` portrait mobile container with `#0B0F15` Obsidian background, `#161C24` elevated surfaces, `#00F2FE` Neon Cyan primary accents, `#00E676` Emerald cash/completion accents, and `#FFAB00` Amber credit/alert accents.
- **52px Compact In-App Header**:
  - **Left**: `TingiPOS` brand mark with an inline pulsing status dot (`#00E676` Emerald for Online/Synced, `#FFAB00` Amber for Offline Queue) + compact operator subtitle (`Maria • Cashier` or `Bossing • Owner`).
  - **Right**: Single compact `[🔑 Shift / PIN]` icon button.
- **Hidden-by-Default Dev Utility Pill**:
  - Evaluator controls (`Role Flip`, `Phone Frame vs Full Screen`, `Offline Toggle`, `Reset Demo Data`) are tucked into a tiny discreet floating pill in the bottom-right corner outside the main flow so the POS renders as an authentic mobile screen.

---

## 2. Local-First Data Schema & State Structures

State is persisted synchronously to `LocalStorage` and asynchronously mirrored to `IndexedDB` (`TingiPOS_WatermelonStore`) for instant `<100ms` mutations and offline durability.

```typescript
export interface Product {
  id: string;
  sku: string;
  name: string;
  shortName: string;
  icon: string;
  category: 'favorites' | 'beverages' | 'soap' | 'noodles' | 'tobacco' | 'rice' | 'snacks';
  isFavorite: boolean;
  unit: string;
  wholesale_cost: number;
  retail_price: number;
  stock_qty: number;
  low_stock_threshold: number;
}

export type CustomerCreditStatus = 'Good Standing' | 'Near Limit' | 'Overdue';

export interface Customer {
  id: string;
  name: string;
  alias: string;
  phone: string;
  credit_limit: number;
  current_balance: number;
  status: CustomerCreditStatus;
  oldest_debt_days: number;
  updated_at: string;
}

export interface TransactionItem {
  product_id: string;
  name: string;
  icon: string;
  qty: number;
  unit_price: number;
  unit_cost: number;
}

export interface Transaction {
  id: string;
  cashier_id: string;
  cashier_name: string;
  type: 'CASH' | 'PAUTANG';
  customer_id?: string;
  customer_name?: string;
  items: TransactionItem[];
  total_amount: number;
  total_cost: number;
  cash_tendered?: number;
  change_given?: number;
  override_approved?: boolean;
  created_at: string;
  timestamp_ms: number;
}

export interface CreditPayment {
  id: string;
  customer_id: string;
  customer_name: string;
  amount_paid: number;
  balance_after: number;
  received_by_user_id: string;
  received_by_name: string;
  note?: string;
  created_at: string;
  timestamp_ms: number;
}
```

---

## 3. UX Edge-Case Handling & Validation Rules

### 3.1 Credit Ceiling Enforcement & Manager PIN Override
- **Dynamic Status Calculation**:
  - `Good Standing`: `current_balance / credit_limit < 0.75` and not overdue.
  - `Near Limit`: `current_balance / credit_limit >= 0.75`.
  - `Overdue`: `oldest_debt_days >= 7` or `current_balance >= credit_limit`.
- **Checkout Gate (`cart_total + current_balance > credit_limit`)**:
  - When a customer's projected balance exceeds `credit_limit`, the primary confirm button locks and displays an Amber/Red ceiling warning showing the exact overage amount.
  - If the active user is a `CASHIER`, they can enter the **Owner/Manager 4-digit PIN (`9999`)** inline right inside the Pautang modal to authorize a one-time credit ceiling override without losing cart state.
  - If the active user is already `OWNER`, they can confirm with a 1-tap override acknowledgement, which flags `override_approved: true` on the transaction audit record.

### 3.2 Partial & Full Repayments (`CreditPayments`)
- **Partial Repayments**:
  - Customers in Sari-Sari stores frequently pay in partial installments (e.g., paying `₱150` toward a `₱350` balance).
  - The **Record Repayment** sheet provides 1-tap preset chips (`₱50`, `₱100`, `₱200`, `Full Balance`) plus a custom numeric input.
  - **Overpayment Guard**: Input is clamped to `[1, customer.current_balance]` (or if cash tendered exceeds balance, displays the exact change to return to the customer while reducing `current_balance` to `₱0.00`).
  - **Automatic Status Promotion**: Once a repayment brings `current_balance` below `75%` of `credit_limit` (or to `₱0.00`), the customer's status pill automatically upgrades to `Good Standing`.

### 3.3 Smart Cash Denomination Presets
- Given any `cart_total` (e.g., `₱81.00`), the Cash Payment Engine always surfaces `[ Exact ₱81 ]` as the first button, followed by standard Philippine peso bills (`₱100`, `₱200`, `₱500`, `₱1,000`), automatically pre-selecting the smallest single bill `>= cart_total` (e.g., `₱100` → Change `₱19.00`) so the cashier can complete the sale in a single tap.
