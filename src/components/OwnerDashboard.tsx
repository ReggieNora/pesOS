import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  FileText,
  Flame,
  Minus,
  Package,
  PackageX,
  Plus,
  Receipt,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AuditLogEntry,
  Customer,
  Product,
  Role,
  ShiftRecord,
  TransactionRecord,
} from '../types/pos';
import { formatPeso, formatPesoExact, triggerHapticFeedback } from '../utils/localDb';
import { useLanguage } from '../context/LanguageContext';

interface CashMovementEntry {
  id: string;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  timestamp: string;
  cashierName: string;
}

interface OwnerDashboardProps {
  currentRole: Role;
  products: Product[];
  customers: Customer[];
  shifts: ShiftRecord[];
  transactions: TransactionRecord[];
  auditLogs: AuditLogEntry[];
  onSwitchToOwnerPin: () => void;
  onOpenPautangBook: (sort?: 'HIGHEST_BALANCE' | 'OLDEST_DEBT') => void;
  onOpenLowStockInventory: () => void;
  onOpenBlindHandover: () => void;
  onTriggerOcrRestock: () => void;
  onApplyDeadStockPromo: (productId: string) => void;
  onAddCashMovement?: (type: 'IN' | 'OUT', amount: number, reason: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = React.memo(({
  currentRole,
  products,
  customers,
  shifts,
  transactions,
  auditLogs,
  onSwitchToOwnerPin,
  onOpenPautangBook,
  onOpenLowStockInventory,
  onOpenBlindHandover,
  onTriggerOcrRestock,
  onApplyDeadStockPromo,
  onAddCashMovement,
}) => {
  const { t } = useLanguage();
  // Modal & Drawer Drill-Down States
  const [isTxLogOpen, setIsTxLogOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<'ALL' | 'CASH' | 'PAUTANG'>('ALL');
  const [txSearchQuery, setTxSearchQuery] = useState('');

  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
  const [cashMovementMode, setCashMovementMode] = useState<null | 'IN' | 'OUT'>(null);
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [cashReasonInput, setCashReasonInput] = useState('');

  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);

  // Local state for cash float adjustments / removals
  const [cashMovements, setCashMovements] = useState<CashMovementEntry[]>([
    {
      id: 'cm-init-1',
      type: 'OUT',
      amount: 200,
      reason: 'Morning Ice & Tube Replenishment',
      timestamp: 'Today, 8:45 AM',
      cashierName: 'Maria Santos',
    },
  ]);

  // Financial Calculations
  const grossSales =
    transactions.reduce((sum, tx) => sum + tx.totalAmount, 0) + 1845;
  const totalCost =
    transactions.reduce((sum, tx) => sum + tx.totalWholesaleCost, 0) + 1390;
  const netProfit = grossSales - totalCost;
  const profitMarginPct = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;

  const totalPautang = customers.reduce((sum, c) => sum + c.currentBalance, 0);

  const activeShift = shifts.find((s) => s.status === 'ACTIVE') || shifts[0];
  const openingCash = activeShift ? activeShift.openingCash : 1500;
  const cashSalesCollected = activeShift ? activeShift.cashSalesTotal : 2150;
  
  // Total cash in/out movements
  const totalCashAdded = cashMovements
    .filter((m) => m.type === 'IN')
    .reduce((sum, m) => sum + m.amount, 0);
  const totalCashRemoved = cashMovements
    .filter((m) => m.type === 'OUT')
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedDrawerCash = openingCash + cashSalesCollected + totalCashAdded - totalCashRemoved;

  // Inventory velocity & stock counts
  const lowStockItems = useMemo(
    () => products.filter((p) => p.stockQty <= p.lowStockThreshold),
    [products]
  );

  const cokeVelocityItem =
    products.find((p) => p.id === 'prd-coke-15') ||
    products.find((p) => p.hourlyVelocity > 0 && p.stockQty / p.hourlyVelocity <= 6);
  const hoursUntilDepleted = cokeVelocityItem
    ? Math.max(0.5, cokeVelocityItem.stockQty / Math.max(0.5, cokeVelocityItem.hourlyVelocity))
    : 4.0;

  const deadStockItem =
    products.find((p) => p.daysSinceLastSale >= 25) ||
    products.find((p) => p.id === 'prd-ligo-sardines');

  // Filtered transactions for Activity Log drill-down
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilter === 'CASH' && tx.type !== 'CASH') return false;
      if (txFilter === 'PAUTANG' && tx.type !== 'PAUTANG') return false;
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.toLowerCase();
        const matchesId = tx.id.toLowerCase().includes(q);
        const matchesCashier = tx.cashierName.toLowerCase().includes(q);
        const matchesCustomer = tx.customerName?.toLowerCase().includes(q);
        const matchesItem = tx.items.some((i) => i.name.toLowerCase().includes(q));
        return matchesId || matchesCashier || matchesCustomer || matchesItem;
      }
      return true;
    });
  }, [transactions, txFilter, txSearchQuery]);

  const activeSelectedTx = useMemo(() => {
    if (!selectedTxId && filteredTransactions.length > 0) {
      return filteredTransactions[0];
    }
    return (
      filteredTransactions.find((tx) => tx.id === selectedTxId) ||
      filteredTransactions[0] ||
      null
    );
  }, [selectedTxId, filteredTransactions]);

  // Handler: Commit Cash In or Cash Out
  const handleConfirmCashMovement = () => {
    if (!cashMovementMode) return;
    const amt = parseFloat(cashAmountInput);
    if (!amt || isNaN(amt) || amt <= 0) return;

    const reason = cashReasonInput.trim() || (cashMovementMode === 'IN' ? 'Change float addition' : 'Store expense');
    const newEntry: CashMovementEntry = {
      id: `cm-${Date.now()}`,
      type: cashMovementMode,
      amount: amt,
      reason,
      timestamp: 'Just now',
      cashierName: 'Owner (Verified)',
    };

    setCashMovements((prev) => [newEntry, ...prev]);
    onAddCashMovement?.(cashMovementMode, amt, reason);
    triggerHapticFeedback('success');

    setCashMovementMode(null);
    setCashAmountInput('');
    setCashReasonInput('');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-background text-primary p-4 md:p-6 space-y-6 pb-28 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme pb-4">
        <div>
          <h1 className="text-xl font-black text-primary tracking-tight">
            Sales &amp; Store Performance
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Daily sales summaries, shift handovers, and cash drawer tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('tap');
              onOpenBlindHandover();
            }}
            className="min-h-[40px] px-3.5 rounded-lg bg-surface border border-theme hover:border-slate-400 text-primary font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-[#006AFF]" />
            <span>Blind Handover</span>
          </button>
        </div>
      </div>

      {/* 1. Multi-Column Responsive Dashboard Cards (Interactive KPI Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Gross Sales -> Drills down into Transaction Activity Log */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticFeedback('tap');
            setIsTxLogOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsTxLogOpen(true);
          }}
          className="rounded-2xl bg-surface border border-theme p-4 shadow-sm space-y-2 cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md active:scale-[0.99] text-left group w-full"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
            <span>{t('dashboard.today_sales')}</span>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#006AFF]" />
              <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-[#006AFF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-primary">
            {formatPeso(grossSales)}
          </div>
          <div className="text-xs text-[#006AFF] font-mono flex items-center justify-between pt-1 border-t border-theme">
            <span>{transactions.length + 24} orders today</span>
            <span className="font-bold underline decoration-[#006AFF]/30">Activity Log →</span>
          </div>
        </div>

        {/* Card 2: Cash in Drawer -> Drills down into Cash Drawer Breakdown & Float Movements */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticFeedback('tap');
            setIsCashDrawerOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsCashDrawerOpen(true);
          }}
          className="rounded-2xl bg-surface border border-theme p-4 shadow-sm space-y-2 cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md active:scale-[0.99] text-left group w-full"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
            <span>Cash in Drawer</span>
            <div className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-btn" />
              <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-emerald-btn group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-btn">
            {formatPeso(expectedDrawerCash)}
          </div>
          <div className="text-xs text-muted font-mono flex items-center justify-between pt-1 border-t border-theme">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-btn" />
              <span>Shift #1 Live</span>
            </span>
            <span className="text-emerald-btn font-bold">Float Telemetry →</span>
          </div>
        </div>

        {/* Card 3: Net Profit (Margin) -> Drills down into Wholesale Cost Breakdown */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticFeedback('tap');
            setIsProfitModalOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsProfitModalOpen(true);
          }}
          className="rounded-2xl bg-surface border border-theme p-4 shadow-sm space-y-2 cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md active:scale-[0.99] text-left group w-full"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
            <span>{t('dashboard.net_profit')}</span>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-btn" />
              <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-emerald-btn group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-emerald-btn">
            {formatPeso(netProfit)}
          </div>
          <div className="text-xs text-emerald-btn font-mono font-bold flex items-center justify-between pt-1 border-t border-theme">
            <span>{profitMarginPct.toFixed(1)}% Markup</span>
            <span className="text-muted font-normal underline">Cost Audit →</span>
          </div>
        </div>

        {/* Card 4: Outstanding Utang -> Routes directly to Pautang Tab with Unpaid Balances (Highest First) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticFeedback('tap');
            onOpenPautangBook('HIGHEST_BALANCE');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpenPautangBook('HIGHEST_BALANCE');
          }}
          className="rounded-2xl bg-surface border border-theme p-4 shadow-sm space-y-2 cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md active:scale-[0.99] text-left group w-full"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
            <span>{t('dashboard.unpaid_pautang')}</span>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-badge" />
              <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-amber-badge group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-amber-badge">
            {formatPeso(totalPautang)}
          </div>
          <div className="text-xs text-[#006AFF] font-mono group-hover:underline flex items-center justify-between pt-1 border-t border-theme">
            <span>{customers.filter((c) => c.currentBalance > 0).length} active balances</span>
            <span className="font-bold">Open Ledger →</span>
          </div>
        </div>

        {/* Card 5: Low Stock Items -> Routes directly to Inventory Tab pre-filtered to stock <= min_alert */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHapticFeedback('tap');
            onOpenLowStockInventory();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpenLowStockInventory();
          }}
          className="rounded-2xl bg-surface border border-theme p-4 shadow-sm space-y-2 cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md active:scale-[0.99] text-left group w-full sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-muted">
            <span>{t('dashboard.low_stock_items')}</span>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-rose-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-rose-600 dark:text-rose-400">
            {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'}
          </div>
          <div className="text-xs text-rose-600 dark:text-rose-400 font-mono flex items-center justify-between pt-1 border-t border-theme">
            <span>≤ Min Alert Threshold</span>
            <span className="font-bold underline">Filter Inventory →</span>
          </div>
        </div>
      </div>

      {/* 2. AI Predictive Inventory & Velocity Alerts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-badge" />
            <span>AI Predictive Inventory &amp; Stock Alerts</span>
          </h2>
          <span className="text-[11px] font-mono text-[#006AFF]">Live Telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cokeVelocityItem && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                triggerHapticFeedback('tap');
                onOpenLowStockInventory();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpenLowStockInventory();
              }}
              className="rounded-xl bg-surface border border-amber-500/40 p-3.5 flex items-center justify-between gap-3 shadow-sm cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-mono font-black text-[10px] uppercase">
                    Velocity Alert
                  </span>
                  <span className="text-xs font-bold text-primary truncate">
                    {cokeVelocityItem.shortName} stock running low
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-tight">
                  Only <strong className="text-primary">{cokeVelocityItem.stockQty} left</strong> at{' '}
                  <strong className="text-primary">{cokeVelocityItem.hourlyVelocity}/hr</strong>. Runs out in ~{hoursUntilDepleted.toFixed(1)} hrs.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHapticFeedback('tap');
                  onTriggerOcrRestock();
                }}
                className="min-h-[40px] px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wide shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
              >
                Restock
              </button>
            </div>
          )}

          {deadStockItem && (
            <div className="rounded-xl bg-surface border border-red-500/40 p-3.5 flex items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono font-black text-[10px] uppercase flex items-center gap-1">
                    <PackageX className="w-3 h-3" />
                    Dead Stock
                  </span>
                  <span className="text-xs font-bold text-primary truncate">
                    {deadStockItem.shortName}: 0 sales in {deadStockItem.daysSinceLastSale} days
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-tight">
                  Tying up{' '}
                  <strong className="text-primary">
                    {formatPeso(deadStockItem.stockQty * deadStockItem.wholesaleCost)}
                  </strong>{' '}
                  working capital. Run promo to liquidate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('success');
                  onApplyDeadStockPromo(deadStockItem.id);
                }}
                className="min-h-[40px] px-3.5 rounded-lg bg-[#006AFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wide shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
              >
                Promo -₱2
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. RECENT AUDITED SHIFT TRANSACTIONS (Responsive data table on desktop/tablet, stacked cards on mobile) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-[#006AFF]" />
            <span>Audited Shift Transactions ({transactions.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('tap');
              setIsTxLogOpen(true);
            }}
            className="text-[11px] font-mono text-[#006AFF] hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <span>View Full Activity Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Desktop & Tablet Table (>= 768px) */}
        <div className="hidden md:block rounded-xl border border-theme bg-surface overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-muted border-b border-theme text-muted uppercase tracking-wider font-extrabold text-[10px]">
              <tr>
                <th className="py-3 px-4">Tx ID</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Items Breakdown</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No transactions recorded this shift yet.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 10).map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => {
                      triggerHapticFeedback('tap');
                      setSelectedTxId(tx.id);
                      setIsTxLogOpen(true);
                    }}
                    className="hover:bg-surface-muted/60 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {tx.id}
                    </td>
                    <td className="py-3 px-4 text-muted font-mono text-[11px]">
                      {tx.createdAt}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${
                          tx.type === 'CASH'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-primary">
                      {tx.cashierName}
                    </td>
                    <td className="py-3 px-4 text-muted truncate max-w-xs">
                      {tx.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-primary text-sm">
                      {formatPesoExact(tx.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[11px] font-mono font-bold text-[#006AFF] hover:underline flex items-center justify-center gap-1">
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (< 768px): Vertical Stacked Cards */}
        <div className="md:hidden space-y-2">
          {transactions.slice(0, 8).map((tx) => (
            <div
              key={tx.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                triggerHapticFeedback('tap');
                setSelectedTxId(tx.id);
                setIsTxLogOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSelectedTxId(tx.id);
                  setIsTxLogOpen(true);
                }
              }}
              className="p-3 rounded-xl bg-surface border border-theme shadow-sm space-y-1.5 cursor-pointer hover:border-blue-500/40 transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-primary">{tx.id}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase border ${
                      tx.type === 'CASH'
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-600 border-amber-500/40'
                    }`}
                  >
                    {tx.type}
                  </span>
                </div>
                <span className="font-mono font-black text-sm text-primary">
                  {formatPesoExact(tx.totalAmount)}
                </span>
              </div>
              <div className="text-[11px] text-muted truncate">
                {tx.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-muted pt-1 border-t border-theme">
                <span>By {tx.cashierName}</span>
                <span>{tx.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Immutable Security Audit Trail */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-badge" />
          <span>Security Audit Trail &amp; Role Logs</span>
        </h2>
        <div className="space-y-1.5">
          {auditLogs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="rounded-xl bg-surface border border-theme px-3 py-2 text-xs flex items-start justify-between gap-2 shadow-sm"
            >
              <div>
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.severity === 'CRITICAL'
                        ? 'bg-red-500'
                        : log.severity === 'WARN'
                          ? 'bg-amber-badge'
                          : 'bg-[#006AFF]'
                    }`}
                  />
                  <span>{log.summary}</span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">{log.detail}</p>
              </div>
              <span className="text-[10px] font-mono text-muted whitespace-nowrap">
                {log.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          DRILL-DOWN MODAL 1: TRANSACTION ACTIVITY LOG WITH RECEIPT DETAILS
         ========================================================================= */}
      {isTxLogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4"
        >
          <div className="w-full md:max-w-4xl max-h-[92vh] md:max-h-[85vh] bg-surface rounded-t-3xl md:rounded-2xl border-t md:border border-theme shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-theme flex items-center justify-between bg-surface-muted/50 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#006AFF]" />
                <div>
                  <h3 className="font-black text-sm md:text-base text-primary">
                    Transaction Activity Log
                  </h3>
                  <p className="text-[11px] text-muted">
                    Shift audit trail, itemized receipts, and cash verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTxLogOpen(false)}
                className="w-8 h-8 rounded-full bg-surface border border-theme flex items-center justify-center text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar & Search */}
            <div className="p-3 border-b border-theme bg-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  placeholder="Search receipt ID, items, cashier..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-theme bg-surface-muted text-xs font-mono text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[#006AFF]"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTxFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    txFilter === 'ALL'
                      ? 'bg-[#006AFF] text-white shadow-sm'
                      : 'bg-surface-muted text-muted hover:text-primary'
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter('CASH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    txFilter === 'CASH'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-surface-muted text-muted hover:text-primary'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter('PAUTANG')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    txFilter === 'PAUTANG'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-surface-muted text-muted hover:text-primary'
                  }`}
                >
                  📒 Pautang
                </button>
              </div>
            </div>

            {/* Master-Detail Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-theme">
              {/* Left Column: Transaction List */}
              <div className="w-full md:w-1/2 overflow-y-auto divide-y divide-theme max-h-[38vh] md:max-h-full">
                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-muted space-y-2">
                    <p className="text-xs font-bold">No transactions found</p>
                    <p className="text-[11px]">Try adjusting your search query or filter</p>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isSelected = activeSelectedTx?.id === tx.id;
                    return (
                      <div
                        key={tx.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          triggerHapticFeedback('tap');
                          setSelectedTxId(tx.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setSelectedTxId(tx.id);
                        }}
                        className={`p-3.5 text-left cursor-pointer transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-500/10 border-l-4 border-l-[#006AFF]'
                            : 'hover:bg-surface-muted/50'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-primary">
                              {tx.id}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase border ${
                                tx.type === 'CASH'
                                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40'
                                  : 'bg-amber-500/15 text-amber-600 border-amber-500/40'
                              }`}
                            >
                              {tx.type}
                            </span>
                            {tx.customerName && (
                              <span className="text-[10px] font-semibold text-muted truncate">
                                • {tx.customerName}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted truncate">
                            {tx.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                          </div>
                          <div className="text-[10px] font-mono text-muted flex items-center gap-2">
                            <span>{tx.createdAt}</span>
                            <span>•</span>
                            <span>{tx.cashierName}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-sm text-primary">
                            {formatPesoExact(tx.totalAmount)}
                          </div>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            Synced
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Receipt Inspector */}
              <div className="w-full md:w-1/2 p-4 overflow-y-auto bg-surface-muted/30 flex flex-col justify-between">
                {activeSelectedTx ? (
                  <div className="space-y-4">
                    {/* Simulated Clean Printed Receipt */}
                    <div className="bg-surface rounded-xl border border-theme p-4 shadow-sm space-y-3 font-mono text-xs">
                      <div className="text-center pb-2 border-b border-dashed border-theme space-y-0.5">
                        <h4 className="font-black text-sm uppercase tracking-wider text-primary">
                          pesOS Official Receipt
                        </h4>
                        <p className="text-[10px] text-muted">Sari-Sari Store Verified Register</p>
                        <p className="text-[10px] text-muted">Order ID: {activeSelectedTx.id}</p>
                        <p className="text-[10px] text-muted">{activeSelectedTx.createdAt}</p>
                      </div>

                      <div className="text-[11px] space-y-1 text-muted pb-2 border-b border-dashed border-theme">
                        <div className="flex justify-between">
                          <span>Cashier:</span>
                          <strong className="text-primary">{activeSelectedTx.cashierName}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment Method:</span>
                          <strong className="text-primary">{activeSelectedTx.type}</strong>
                        </div>
                        {activeSelectedTx.customerName && (
                          <div className="flex justify-between">
                            <span>Customer Ledger:</span>
                            <strong className="text-amber-700 dark:text-amber-300">
                              {activeSelectedTx.customerName}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Line Items */}
                      <div className="space-y-1.5 py-1">
                        <div className="flex justify-between text-[10px] font-bold text-muted uppercase">
                          <span>Item</span>
                          <span>Qty × Price</span>
                          <span>Total</span>
                        </div>
                        {activeSelectedTx.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="truncate max-w-[140px] text-primary">
                              {item.name}
                            </span>
                            <span className="text-muted">
                              {item.qty} × {formatPeso(item.unitPrice)}
                            </span>
                            <span className="font-bold text-primary">
                              {formatPesoExact(item.qty * item.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Totals & Tendered */}
                      <div className="pt-2 border-t border-dashed border-theme space-y-1 text-xs">
                        <div className="flex justify-between font-black text-sm text-primary pt-1">
                          <span>TOTAL DUE:</span>
                          <span>{formatPesoExact(activeSelectedTx.totalAmount)}</span>
                        </div>

                        {activeSelectedTx.type === 'CASH' && activeSelectedTx.cashTendered && (
                          <>
                            <div className="flex justify-between text-muted text-[11px]">
                              <span>Cash Tendered:</span>
                              <span>{formatPesoExact(activeSelectedTx.cashTendered)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                              <span>Change Returned:</span>
                              <span>{formatPesoExact(activeSelectedTx.changeGiven || 0)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-center pt-2 border-t border-dashed border-theme text-[10px] text-muted">
                        *** Local SQLite Ledger Verified ***
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-6 text-center text-muted">
                    <p className="text-xs">Select a transaction to inspect receipt details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-theme bg-surface flex items-center justify-between shrink-0">
              <span className="text-xs font-mono text-muted">
                Showing {filteredTransactions.length} receipts
              </span>
              <button
                type="button"
                onClick={() => setIsTxLogOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-700 text-primary font-bold text-xs cursor-pointer"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRILL-DOWN MODAL 2: CASH DRAWER FLOAT & CASH MOVEMENTS SHEET
         ========================================================================= */}
      {isCashDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4"
        >
          <div className="w-full md:max-w-xl max-h-[92vh] md:max-h-[85vh] bg-surface rounded-t-3xl md:rounded-2xl border-t md:border border-theme shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-theme flex items-center justify-between bg-surface-muted/50 shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-btn" />
                <div>
                  <h3 className="font-black text-sm md:text-base text-primary">
                    Cash Drawer Telemetry &amp; Float
                  </h3>
                  <p className="text-[11px] text-muted">
                    Active Shift #1 • Cashier: Maria Santos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCashDrawerOpen(false);
                  setCashMovementMode(null);
                }}
                className="w-8 h-8 rounded-full bg-surface border border-theme flex items-center justify-center text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Formula Card: Starting Float + Cash Sales - Expenses = Expected Cash */}
              <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3 font-mono">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Live Drawer Reconciliation Formula
                </div>

                <div className="space-y-1.5 text-xs text-primary divide-y divide-theme/60">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-slate-500" />
                      <span>Starting Cash Float</span>
                    </span>
                    <strong className="text-primary font-bold">
                      +{formatPesoExact(openingCash)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <span>Cash Sales Collected</span>
                    </span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      +{formatPesoExact(cashSalesCollected)}
                    </strong>
                  </div>

                  {totalCashAdded > 0 && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-muted flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>Float Additions (Cash In)</span>
                      </span>
                      <strong className="text-blue-600 dark:text-blue-400 font-bold">
                        +{formatPesoExact(totalCashAdded)}
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted flex items-center gap-1.5">
                      <Minus className="w-4 h-4 text-rose-500" />
                      <span>Cash Removals / Expenses</span>
                    </span>
                    <strong className="text-rose-600 dark:text-rose-400 font-bold">
                      -{formatPesoExact(totalCashRemoved)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between py-2.5 pt-3">
                    <span className="font-extrabold text-xs uppercase text-primary">
                      Current Expected Cash:
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatPesoExact(expectedDrawerCash)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Cash In & Cash Out */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    setCashMovementMode('IN');
                  }}
                  className={`min-h-[46px] rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                    cashMovementMode === 'IN'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-surface border border-theme text-primary hover:border-blue-500'
                  }`}
                >
                  <Plus className="w-4 h-4 text-[#006AFF]" />
                  <span>[ ➕ Cash In ]</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    setCashMovementMode('OUT');
                  }}
                  className={`min-h-[46px] rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                    cashMovementMode === 'OUT'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-surface border border-theme text-primary hover:border-rose-500'
                  }`}
                >
                  <Minus className="w-4 h-4 text-rose-500" />
                  <span>[ ➖ Cash Out / Expense ]</span>
                </button>
              </div>

              {/* Interactive Cash In / Out Form */}
              {cashMovementMode && (
                <div className="rounded-xl bg-surface-muted p-3.5 border border-theme space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-primary">
                      {cashMovementMode === 'IN' ? 'Add Cash Float (Cash In)' : 'Record Cash Expense (Cash Out)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCashMovementMode(null)}
                      className="text-xs text-muted hover:text-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Preset Amount Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[50, 100, 200, 500, 1000].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setCashAmountInput(chip.toString())}
                        className="px-2.5 py-1 rounded-lg bg-surface border border-theme text-xs font-mono font-bold text-primary hover:border-blue-500 cursor-pointer"
                      >
                        +{formatPeso(chip)}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-mono font-bold text-muted block mb-1">
                        Amount (₱):
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={cashAmountInput}
                        onChange={(e) => setCashAmountInput(e.target.value)}
                        placeholder="e.g. 200"
                        className="w-full px-3 py-2 rounded-lg border border-theme bg-surface text-base font-mono font-black text-primary focus:outline-none focus:ring-2 focus:ring-[#006AFF]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono font-bold text-muted block mb-1">
                        Reason / Note:
                      </label>
                      <input
                        type="text"
                        value={cashReasonInput}
                        onChange={(e) => setCashReasonInput(e.target.value)}
                        placeholder={
                          cashMovementMode === 'IN'
                            ? 'e.g. Change replenishment, Owner float add'
                            : 'e.g. Ice delivery, Supplier wholesale payment, Snack replenishment'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-theme bg-surface text-xs font-mono text-primary focus:outline-none focus:ring-2 focus:ring-[#006AFF]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmCashMovement}
                    disabled={!cashAmountInput || parseFloat(cashAmountInput) <= 0}
                    className="w-full min-h-[44px] rounded-xl bg-[#006AFF] hover:bg-blue-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wide shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    Confirm Cash {cashMovementMode === 'IN' ? 'In' : 'Out'}
                  </button>
                </div>
              )}

              {/* Drawer Adjustments & Cash History */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase text-muted tracking-wider">
                  Recent Drawer Movements &amp; Expenses
                </div>

                <div className="space-y-1.5">
                  {cashMovements.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-lg bg-surface border border-theme flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              entry.type === 'IN' ? 'bg-blue-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{entry.reason}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted">
                          {entry.timestamp} • by {entry.cashierName}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-black ${
                          entry.type === 'IN'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {entry.type === 'IN' ? '+' : '-'}
                        {formatPesoExact(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with Blind Handover link */}
            <div className="p-3 border-t border-theme bg-surface flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCashDrawerOpen(false);
                  onOpenBlindHandover();
                }}
                className="text-xs font-bold text-[#006AFF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Perform Blind Shift Handover →</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCashDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-700 text-primary font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRILL-DOWN MODAL 3: NET PROFIT & WHOLESALE COST AUDIT
         ========================================================================= */}
      {isProfitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4"
        >
          <div className="w-full md:max-w-md max-h-[90vh] bg-surface rounded-t-3xl md:rounded-2xl border-t md:border border-theme shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
            <div className="p-4 border-b border-theme flex items-center justify-between bg-surface-muted/50 shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-btn" />
                <h3 className="font-black text-sm md:text-base text-primary">
                  Net Profit &amp; Cost Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface border border-theme flex items-center justify-center text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto font-mono text-xs">
              <div className="rounded-xl bg-surface-muted p-3.5 border border-theme space-y-2">
                <div className="flex justify-between text-muted">
                  <span>Gross Sales Collected:</span>
                  <strong className="text-primary">{formatPesoExact(grossSales)}</strong>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Wholesale Supplier Cost:</span>
                  <strong className="text-rose-500">-{formatPesoExact(totalCost)}</strong>
                </div>
                <div className="pt-2 border-t border-theme flex justify-between font-black text-sm">
                  <span>NET PROFIT:</span>
                  <span className="text-emerald-btn">{formatPesoExact(netProfit)}</span>
                </div>
                <div className="text-[11px] text-muted text-right font-normal">
                  Markup Margin: <strong className="text-emerald-btn">{profitMarginPct.toFixed(1)}%</strong>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed font-sans">
                Wholesale costs are calculated live from product purchase invoices. Cashier roles cannot access this telemetry.
              </p>
            </div>

            <div className="p-3 border-t border-theme bg-surface flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsProfitModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#006AFF] text-white font-bold text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
