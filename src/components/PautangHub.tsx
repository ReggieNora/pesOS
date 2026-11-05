import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Coins,
  CreditCard,
  KeyRound,
  Lock,
  Phone,
  Search,
  ShoppingBag,
  Sliders,
  Unlock,
  User,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import {
  CreditPayment,
  Customer,
  Role,
  TransactionRecord,
} from '../types/pos';
import { formatPeso, formatPesoExact, triggerHapticFeedback } from '../utils/localDb';
import { NativeModal } from './NativeModal';

interface PautangHubProps {
  customers: Customer[];
  transactions: TransactionRecord[];
  creditPayments: CreditPayment[];
  onRecordRepayment: (customerId: string, amountPaid: number, note: string) => void;
  onQuickAddCustomer: (name: string, phone: string, creditLimit: number) => Customer;
  currentRole?: Role;
  initialSortBy?: 'HIGHEST_BALANCE' | 'OLDEST_DEBT';
  ownerPin?: string;
}

export const PautangHub: React.FC<PautangHubProps> = React.memo(({
  customers,
  transactions,
  creditPayments,
  onRecordRepayment,
  onQuickAddCustomer,
  currentRole = 'OWNER',
  initialSortBy = 'HIGHEST_BALANCE',
  ownerPin = '9999',
}) => {
  const [sortBy, setSortBy] = useState<'HIGHEST_BALANCE' | 'OLDEST_DEBT'>(
    initialSortBy || 'HIGHEST_BALANCE'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Role-based PIN-gate override state for Credit Limit Slider
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const isOwnerOrUnlocked = currentRole === 'OWNER' || isPinUnlocked;

  // Default to the customer with highest outstanding balance if available
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
    const highestUnpaid = [...customers]
      .filter((c) => c.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)[0];
    return highestUnpaid?.id || customers[0]?.id || null;
  });

  React.useEffect(() => {
    if (initialSortBy) {
      setSortBy(initialSortBy);
      const highestUnpaid = [...customers]
        .filter((c) => c.currentBalance > 0)
        .sort((a, b) => b.currentBalance - a.currentBalance)[0];
      if (highestUnpaid) setSelectedCustomerId(highestUnpaid.id);
    }
  }, [initialSortBy, customers]);

  // Mobile navigation state
  const [mobileDetailView, setMobileDetailView] = useState(false);

  // Repayment form state
  const [repayAmount, setRepayAmount] = useState<string>('100');
  const [repayNote, setRepayNote] = useState<string>('');

  // Quick-Add Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLimit, setNewLimit] = useState('500');

  // Customer credit limit adjustment state
  const [creditLimitOverrides, setCreditLimitOverrides] = useState<Record<string, number>>({});

  // PIN keypad handler for Cashier override
  const handlePinDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setPinError('');

    if (nextPin.length === 4) {
      if (nextPin === ownerPin) {
        triggerHapticFeedback('success');
        setIsPinUnlocked(true);
        setIsPinModalOpen(false);
        setPinInput('');
        setPinError('');
      } else {
        triggerHapticFeedback('warning');
        setPinError(`Incorrect Owner PIN (Default: ${ownerPin})`);
        setPinInput('');
      }
    }
  };

  // Keyboard support for PIN modal
  React.useEffect(() => {
    if (!isPinModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        setPinInput((prev) => prev.slice(0, -1));
        setPinError('');
      } else if (e.key === 'Escape') {
        setIsPinModalOpen(false);
        setPinInput('');
        setPinError('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinModalOpen, pinInput, ownerPin]);

  const totalOutstanding = useMemo(
    () => customers.reduce((sum, c) => sum + c.currentBalance, 0),
    [customers]
  );

  const totalCollected = useMemo(
    () => creditPayments.reduce((sum, p) => sum + p.amountPaid, 0),
    [creditPayments]
  );

  const sortedCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.alias.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === 'HIGHEST_BALANCE') {
        return b.currentBalance - a.currentBalance;
      }
      return b.oldestDebtDays - a.oldestDebtDays;
    });
  }, [customers, searchQuery, sortBy]);

  const activeCustomer =
    customers.find((c) => c.id === selectedCustomerId) || sortedCustomers[0] || null;

  const activeCreditLimit = activeCustomer
    ? creditLimitOverrides[activeCustomer.id] ?? activeCustomer.creditLimit
    : 1000;

  // Credit transactions and repayments for selected customer
  const customerCreditTxns = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.type === 'PAUTANG' && tx.customerId === activeCustomer?.id
      ),
    [transactions, activeCustomer]
  );

  const customerRepayments = useMemo(
    () => creditPayments.filter((p) => p.customerId === activeCustomer?.id),
    [creditPayments, activeCustomer]
  );

  const selectCustomer = (cust: Customer, isMobile = false) => {
    triggerHapticFeedback('tap');
    setSelectedCustomerId(cust.id);
    setRepayAmount(
      cust.currentBalance > 0 ? String(Math.min(100, cust.currentBalance)) : '50'
    );
    setRepayNote('');
    if (isMobile) {
      setMobileDetailView(true);
    }
  };

  const handleExecuteRepayment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeCustomer) return;
    const amount = parseFloat(repayAmount);
    if (!amount || amount <= 0) return;

    triggerHapticFeedback('success');
    onRecordRepayment(activeCustomer.id, amount, repayNote.trim());
    setRepayAmount('');
    setRepayNote('');
  };

  const getStatusBadgeStyle = (status: Customer['status']) => {
    if (status === 'Good Standing') {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40';
    }
    if (status === 'Near Limit') {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40';
    }
    return 'bg-red-500/15 text-red-500 border-red-500/40';
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-background text-primary">
      {/* =========================================================================
          LEFT COLUMN: Directory, Search & Balance Pills (Desktop & Tablet >= 768px, or Mobile list)
         ========================================================================= */}
      <aside
        aria-label="Customer Credit Directory"
        className={`w-full md:w-80 xl:w-96 h-full flex flex-col border-r border-theme shrink-0 overflow-hidden bg-surface ${
          mobileDetailView ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Sticky Header: Metric cards + Search + Sort Pills */}
        <div className="shrink-0 p-3 border-b border-theme space-y-2.5 bg-surface">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface-muted border border-theme p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                Total Pautang
              </span>
              <div className="text-base font-mono font-black text-amber-badge mt-0.5">
                {formatPeso(totalOutstanding)}
              </div>
              <span className="text-[10px] font-mono text-muted">
                {customers.filter((c) => c.currentBalance > 0).length} debtors
              </span>
            </div>

            <div className="rounded-xl bg-surface-muted border border-theme p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                Collected
              </span>
              <div className="text-base font-mono font-black text-emerald-btn mt-0.5">
                {formatPeso(totalCollected)}
              </div>
              <span className="text-[10px] font-mono text-muted">
                {creditPayments.length} receipts
              </span>
            </div>
          </div>

          {/* Search + New Customer Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers or alias..."
                className="w-full min-h-[40px] pl-9 pr-3 rounded-lg bg-surface-muted border border-theme text-xs text-primary placeholder:text-muted focus:outline-none focus:border-[#006AFF]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('tap');
                setIsAddCustomerOpen(true);
              }}
              className="min-h-[40px] px-3 rounded-lg bg-[#006AFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wide flex items-center gap-1 shrink-0 shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Sort Switcher */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-[#006AFF]" />
              <span>Sort:</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setSortBy('HIGHEST_BALANCE');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                  sortBy === 'HIGHEST_BALANCE'
                    ? 'bg-[#006AFF] border-[#006AFF] text-white shadow-sm'
                    : 'bg-surface-muted border-theme text-muted hover:text-primary'
                }`}
              >
                Highest Utang
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setSortBy('OLDEST_DEBT');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                  sortBy === 'OLDEST_DEBT'
                    ? 'bg-[#006AFF] border-[#006AFF] text-white shadow-sm'
                    : 'bg-surface-muted border-theme text-muted hover:text-primary'
                }`}
              >
                Oldest
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Customer List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 pb-24 md:pb-3">
          {sortedCustomers.length === 0 ? (
            <div className="p-8 text-center text-muted space-y-1.5">
              <div className="text-2xl">👥</div>
              <p className="text-xs font-semibold">No customers found</p>
              <p className="text-[11px]">Try adjusting your search</p>
            </div>
          ) : (
            sortedCustomers.map((cust) => {
              const isSelected = activeCustomer?.id === cust.id;
              const limit = creditLimitOverrides[cust.id] ?? cust.creditLimit;
              const pct = Math.min(100, Math.round((cust.currentBalance / limit) * 100));

              return (
                <div
                  key={cust.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectCustomer(cust, window.innerWidth < 768)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectCustomer(cust, window.innerWidth < 768);
                    }
                  }}
                  className={`w-full text-left rounded-xl p-3 border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#006AFF] ring-1 ring-[#006AFF]/30 shadow-sm'
                      : 'bg-surface border-theme hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-primary truncate">
                          {cust.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border ${getStatusBadgeStyle(
                            cust.status
                          )}`}
                        >
                          {cust.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5 font-mono truncate">
                        <span>{cust.alias}</span>
                        <span>•</span>
                        <span>{cust.oldestDebtAt}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="text-sm font-black text-primary">
                        {formatPesoExact(cust.currentBalance)}
                      </div>
                      <div className="text-[10px] text-muted">
                        Limit: {formatPeso(limit)}
                      </div>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="mt-2.5 pt-2 border-t border-theme">
                    <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden border border-theme">
                      <div
                        className={`h-full transition-all ${
                          cust.status === 'Overdue'
                            ? 'bg-red-500'
                            : cust.status === 'Near Limit'
                              ? 'bg-amber-badge'
                              : 'bg-emerald-btn'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* =========================================================================
          RIGHT PANE (Desktop & Tablet >= 768px, or Mobile detail transition):
          Customer Profile, Dedicated Repayment Panel, Slider, & Ledger
         ========================================================================= */}
      <section
        aria-label="Customer Profile & Ledger"
        className={`flex-1 flex-col h-full bg-surface overflow-hidden ${
          mobileDetailView ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeCustomer ? (
          <>
            {/* Top Detail Header */}
            <div className="shrink-0 p-4 border-b border-theme bg-surface flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    setMobileDetailView(false);
                  }}
                  className="md:hidden w-9 h-9 rounded-lg bg-surface-muted border border-theme flex items-center justify-center text-primary shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="w-11 h-11 rounded-xl bg-surface-muted border border-theme flex items-center justify-center text-primary font-black text-base shrink-0">
                  {activeCustomer.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-primary truncate">
                      {activeCustomer.name}
                    </h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getStatusBadgeStyle(
                        activeCustomer.status
                      )}`}
                    >
                      {activeCustomer.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-muted mt-0.5 truncate">
                    Alias: {activeCustomer.alias} • Tel: {activeCustomer.phone} • Barangay Resident
                  </div>
                </div>
              </div>

              {/* Outstanding Debt & Credit Limit Badge */}
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase text-muted block">
                  Current Utang Balance
                </span>
                <span className="text-xl font-mono font-black text-amber-badge">
                  {formatPesoExact(activeCustomer.currentBalance)}
                </span>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24 md:pb-6">
              {/* 1. DEDICATED CASH REPAYMENT PANEL */}
              <div className="rounded-2xl bg-surface-muted/60 border border-theme p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-btn flex items-center gap-1.5">
                    <Coins className="w-4 h-4 stroke-[2.5]" />
                    <span>Record Cash Repayment</span>
                  </span>
                  <span className="text-xs font-mono text-muted">
                    Instant balance update
                  </span>
                </div>

                {/* Preset Chips */}
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase block mb-1.5">
                    Quick Preset Amounts
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback('tap');
                          setRepayAmount(String(amt));
                        }}
                        className={`h-11 rounded-xl font-mono font-bold text-xs border transition ${
                          parseFloat(repayAmount) === amt
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-surface border-theme text-primary hover:border-slate-400'
                        }`}
                      >
                        ₱{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={activeCustomer.currentBalance <= 0}
                      onClick={() => {
                        triggerHapticFeedback('tap');
                        setRepayAmount(String(activeCustomer.currentBalance));
                      }}
                      className={`h-11 rounded-xl font-mono font-bold text-xs border transition ${
                        parseFloat(repayAmount) === activeCustomer.currentBalance
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-surface border-theme text-emerald-btn hover:border-emerald-500'
                      }`}
                    >
                      Full (₱{activeCustomer.currentBalance})
                    </button>
                  </div>
                </div>

                {/* Amount and Note Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted uppercase block mb-1">
                      Cash Amount Tendered (₱)
                    </label>
                    <input
                      type="number"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-12 px-3 rounded-xl bg-surface border border-theme font-mono font-black text-lg text-emerald-btn focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted uppercase block mb-1">
                      Payment Note / Remittance
                    </label>
                    <input
                      type="text"
                      value={repayNote}
                      onChange={(e) => setRepayNote(e.target.value)}
                      placeholder="e.g. Sahod partial, bayad ni ate..."
                      className="w-full h-12 px-3 rounded-xl bg-surface border border-theme text-xs text-primary focus:outline-none focus:border-[#006AFF]"
                    />
                  </div>
                </div>

                {/* Confirm Repayment Action */}
                <button
                  type="button"
                  disabled={!repayAmount || parseFloat(repayAmount) <= 0}
                  onClick={() => handleExecuteRepayment()}
                  className="w-full min-h-[50px] rounded-xl bg-emerald-btn hover:opacity-95 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] disabled:opacity-40"
                >
                  <Coins className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    Record {formatPesoExact(parseFloat(repayAmount) || 0)} Cash Repayment
                  </span>
                </button>
              </div>

              {/* 2. CREDIT LIMIT SECTION (ROLE-BASED: OWNER SLIDER vs CASHIER READ-ONLY CARD) */}
              {isOwnerOrUnlocked ? (
                /* Interactive Slider for OWNER or PIN-unlocked Cashier */
                <div className="rounded-2xl bg-surface-muted/60 border border-theme p-4 md:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#006AFF]" />
                      <span>Credit Ceiling &amp; Limit Slider</span>
                      {isPinUnlocked && currentRole !== 'OWNER' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          <span>PIN Override Active</span>
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#006AFF]">
                        {formatPeso(activeCreditLimit)}
                      </span>
                      {isPinUnlocked && currentRole !== 'OWNER' && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticFeedback('tap');
                            setIsPinUnlocked(false);
                          }}
                          className="text-[10px] font-mono text-muted hover:text-red-500 flex items-center gap-0.5 underline cursor-pointer"
                          title="Re-lock slider for employee mode"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          <span>Lock</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="range"
                    min="200"
                    max="3000"
                    step="100"
                    value={activeCreditLimit}
                    onChange={(e) => {
                      const newLim = parseInt(e.target.value, 10);
                      setCreditLimitOverrides((prev) => ({
                        ...prev,
                        [activeCustomer.id]: newLim,
                      }));
                    }}
                    className="w-full accent-[#006AFF] cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                    <span>Min: ₱200</span>
                    <span>
                      Available Room:{' '}
                      <strong className="text-emerald-btn font-bold">
                        {formatPesoExact(
                          Math.max(0, activeCreditLimit - activeCustomer.currentBalance)
                        )}
                      </strong>
                    </span>
                    <span>Max: ₱3,000</span>
                  </div>
                </div>
              ) : (
                /* Read-Only Static Card for CASHIER / Regular Employee */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    setPinInput('');
                    setPinError('');
                    setIsPinModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      triggerHapticFeedback('tap');
                      setPinInput('');
                      setPinError('');
                      setIsPinModalOpen(true);
                    }
                  }}
                  className="rounded-2xl bg-surface-muted/60 border border-theme p-4 md:p-5 space-y-3 cursor-pointer transition hover:border-amber-500/40 hover:bg-amber-500/5 group text-left shadow-sm"
                  title="Cashier mode restricted. Tap to enter Owner PIN."
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-muted" />
                      <span>Credit Ceiling &amp; Limit</span>
                    </span>

                    {/* Lock Icon Badge: [ 🔒 Owner Only ] */}
                    <span className="px-2.5 py-1 rounded-full bg-amber-badge/15 border border-amber-badge/40 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px] flex items-center gap-1.5 shadow-sm group-hover:scale-105 transition-transform">
                      <Lock className="w-3.5 h-3.5 text-amber-badge" />
                      <span>🔒 Owner Only</span>
                    </span>
                  </div>

                  {/* Main Metric: Label & Available Room */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 py-0.5">
                    <div>
                      <span className="text-xs font-bold text-muted uppercase block">
                        Credit Limit:
                      </span>
                      <span className="font-mono font-black text-xl text-primary flex items-center gap-2">
                        <span>{formatPeso(activeCreditLimit)}</span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-sans">
                          (Locked)
                        </span>
                      </span>
                    </div>

                    <div className="text-left sm:text-right font-mono text-xs text-muted">
                      <span>Available Room: </span>
                      <strong className="text-emerald-btn font-extrabold text-sm">
                        {formatPesoExact(
                          Math.max(0, activeCreditLimit - activeCustomer.currentBalance)
                        )}
                      </strong>
                    </div>
                  </div>

                  {/* Cashier override call-to-action */}
                  <div className="pt-2 border-t border-theme/60 flex items-center justify-between text-[11px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-badge" />
                      <span>Tap to unlock slider with Owner PIN ({ownerPin})</span>
                    </span>
                    <span className="text-[#006AFF] font-bold underline font-mono">
                      Unlock →
                    </span>
                  </div>
                </div>
              )}

              {/* 3. LEDGER TRANSACTION & REPAYMENT HISTORY */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#006AFF]" />
                  <span>Itemized Credit Ledger History</span>
                </h3>

                {/* Credit Purchases Taken */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-badge">
                    Items Taken on Credit ({customerCreditTxns.length})
                  </div>
                  {customerCreditTxns.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface-muted border border-theme text-xs text-muted">
                      No unpaid credit purchases on record.
                    </div>
                  ) : (
                    customerCreditTxns.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-xl bg-surface-muted border border-theme p-3 space-y-1.5 text-xs shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-badge" />
                            <span>{tx.createdAt}</span>
                            <span className="text-[10px] font-mono text-muted">
                              (Cashier: {tx.cashierName})
                            </span>
                          </span>
                          <span className="font-mono font-black text-amber-badge">
                            +{formatPesoExact(tx.totalAmount)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tx.items.map((item, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-surface border border-theme text-[11px] text-primary font-mono"
                            >
                              {item.icon} {item.qty}× {item.name} ({formatPeso(item.unitPrice * item.qty)})
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Repayments History */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-btn">
                    Repayments Logged ({customerRepayments.length})
                  </div>
                  {customerRepayments.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface-muted border border-theme text-xs text-muted">
                      No repayments logged yet.
                    </div>
                  ) : (
                    customerRepayments.map((pay) => (
                      <div
                        key={pay.id}
                        className="rounded-xl bg-surface-muted border border-theme px-3.5 py-2.5 flex items-center justify-between text-xs shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <ArrowDownLeft className="w-4 h-4 text-emerald-btn shrink-0" />
                          <div>
                            <div className="font-extrabold text-primary">
                              Paid {formatPesoExact(pay.amountPaid)} Cash
                            </div>
                            <div className="text-[10px] text-muted">
                              Received by {pay.receivedByName} • {pay.createdAt}
                              {pay.note ? ` — "${pay.note}"` : ''}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono font-black text-emerald-btn text-sm">
                          -{formatPesoExact(pay.amountPaid)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted space-y-2">
            <User className="w-12 h-12 stroke-[1.5]" />
            <h3 className="text-sm font-extrabold text-primary">No Customer Selected</h3>
            <p className="text-xs max-w-sm">
              Select a customer from the directory to review their credit ledger, record repayments, or configure credit limits.
            </p>
          </div>
        )}
      </section>

      {/* Quick Add Customer Modal */}
      <NativeModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add New Customer to Credit Book"
        subtitle="Set initial credit ceiling & mobile number"
        accentColor="cyan"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            const lim = parseFloat(newLimit) || 500;
            const created = onQuickAddCustomer(newName.trim(), newPhone.trim(), lim);
            setSelectedCustomerId(created.id);
            setNewName('');
            setNewPhone('');
            setNewLimit('500');
            setIsAddCustomerOpen(false);
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="text-[11px] font-bold text-muted block mb-1">
              Customer Full Name
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Aling Susan, Mang Berting"
              className="w-full min-h-[44px] rounded-xl bg-surface border border-theme px-3 text-xs text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="0917-XXX-XXXX"
                className="w-full min-h-[44px] rounded-xl bg-surface border border-theme px-3 font-mono text-xs text-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">
                Credit Limit (₱)
              </label>
              <input
                type="number"
                step="50"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-surface border border-theme px-3 font-mono font-bold text-xs text-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[50px] rounded-xl bg-[#006AFF] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Customer Account</span>
          </button>
        </form>
      </NativeModal>

      {/* =========================================================================
          OWNER PIN KEYPAD MODAL (CASHIER OVERRIDE FOR CREDIT LIMIT)
         ========================================================================= */}
      {isPinModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xs bg-surface rounded-2xl border border-theme shadow-2xl p-5 space-y-4 text-center">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-lg bg-amber-badge/15 border border-amber-badge/40 flex items-center justify-center text-amber-badge">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-primary">Owner PIN Required</h3>
                  <p className="text-[10px] text-muted">
                    Unlock {activeCustomer?.name}&apos;s credit ceiling
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinInput('');
                  setPinError('');
                }}
                className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Circular PIN Dots Display */}
            <div className="py-2">
              <div className="flex items-center justify-center gap-3 my-1">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      pinInput.length > idx
                        ? 'bg-[#006AFF] border-[#006AFF] scale-110'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                ))}
              </div>

              {pinError ? (
                <p className="text-[11px] text-rose-500 font-bold mt-2 animate-bounce">
                  {pinError}
                </p>
              ) : (
                <p className="text-[11px] text-muted mt-2 font-mono">
                  Enter 4-digit Owner PIN (Default: {ownerPin})
                </p>
              )}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    if (key === 'C') {
                      setPinInput('');
                      setPinError('');
                    } else if (key === '⌫') {
                      setPinInput((prev) => prev.slice(0, -1));
                      setPinError('');
                    } else {
                      handlePinDigit(key);
                    }
                  }}
                  className={`min-h-[48px] rounded-xl font-black text-sm border transition active:scale-95 cursor-pointer ${
                    key === 'C'
                      ? 'bg-surface-muted text-muted hover:text-primary border-theme text-xs'
                      : key === '⌫'
                        ? 'bg-surface-muted text-muted hover:text-primary border-theme text-xs'
                        : 'bg-surface border-theme text-primary hover:border-[#006AFF] hover:text-[#006AFF]'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsPinModalOpen(false);
                setPinInput('');
                setPinError('');
              }}
              className="w-full py-1.5 text-xs font-bold text-muted hover:text-primary cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
