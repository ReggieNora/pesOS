import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  KeyRound,
  Mic,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { Customer, Product, Role } from '../types/pos';
import { formatPeso, formatPesoExact, triggerHapticFeedback } from '../utils/localDb';
import {
  ParsedVoiceCommand,
  parseVoiceOrder,
  VOICE_PRESET_PHRASES,
} from '../utils/voiceParser';
import { NativeModal } from './NativeModal';

interface CashModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  initialTendered: number | null;
  onCompleteCash: (cashTendered: number, changeGiven: number) => void;
}

export const CashCheckoutModal: React.FC<CashModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  initialTendered,
  onCompleteCash,
}) => {
  const standardBills = [50, 100, 200, 500, 1000];
  const smartPresets = useMemo(
    () => standardBills.filter((bill) => bill > subtotal),
    [subtotal]
  );

  const [tendered, setTendered] = useState<number>(initialTendered || subtotal);
  const [customBill, setCustomBill] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setCustomBill('');
      if (initialTendered && initialTendered >= subtotal) {
        setTendered(initialTendered);
      } else {
        const nextPreset = smartPresets[0] || subtotal;
        setTendered(nextPreset);
      }
    }
  }, [isOpen, subtotal, initialTendered, smartPresets]);

  const change = Math.max(0, tendered - subtotal);
  const isSufficient = tendered >= subtotal && subtotal > 0;

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Payment Engine"
      subtitle="Smart bill presets • Instant sukli calculator"
      accentColor="mint"
    >
      <div className="space-y-4">
        {/* Prominent Total Due & Large Emerald Change Display */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-surface-muted border border-theme p-3.5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">
              Total Due
            </span>
            <div className="text-2xl font-mono font-bold text-primary mt-1">
              {formatPesoExact(subtotal)}
            </div>
            <span className="text-[10px] font-mono text-muted">
              Tendered: {formatPesoExact(tendered)}
            </span>
          </div>
          <div className="rounded-2xl bg-surface-muted border border-emerald-btn p-3.5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-emerald-btn font-bold block">
              Change Due (Sukli)
            </span>
            <div className="text-3xl font-mono font-black text-emerald-btn mt-0.5 tracking-tight">
              {formatPesoExact(change)}
            </div>
            <span className="text-[10px] font-mono text-muted">
              {change === 0 ? 'Exact amount' : 'Return to customer'}
            </span>
          </div>
        </div>

        {/* Smart Bill Preset Buttons (min 56px touch targets) */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
            Smart Bill Presets (Tap Bill Received)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('tap');
                setCustomBill('');
                setTendered(subtotal);
              }}
              className={`min-h-[56px] rounded-xl font-mono font-bold text-xs border transition flex flex-col items-center justify-center px-2 shadow-sm ${
                tendered === subtotal && !customBill
                  ? 'bg-[#2563EB] border-[#2563EB] text-white'
                  : 'bg-surface-muted border-theme text-primary hover:border-slate-400 active:scale-95'
              }`}
            >
              <span>Exact {formatPeso(subtotal)}</span>
              <span className="text-[10px] opacity-80">No Change</span>
            </button>

            {standardBills.map((bill) => {
              const disabled = bill < subtotal;
              const active = tendered === bill && !customBill;
              return (
                <button
                  key={bill}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    setCustomBill('');
                    setTendered(bill);
                  }}
                  className={`min-h-[56px] rounded-xl font-mono font-bold text-base border transition flex flex-col items-center justify-center shadow-sm ${
                    disabled
                      ? 'bg-surface-muted/50 border-theme text-muted/40 cursor-not-allowed'
                      : active
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : 'bg-surface-muted border-theme text-primary hover:border-slate-400 active:scale-95'
                  }`}
                >
                  <span>₱{bill.toLocaleString()}</span>
                  {!disabled && (
                    <span
                      className={`text-[10px] font-semibold ${
                        active ? 'text-blue-100' : 'text-emerald-btn'
                      }`}
                    >
                      +{formatPeso(bill - subtotal)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Cash Input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customBill}
            onChange={(e) => {
              setCustomBill(e.target.value);
              const val = parseFloat(e.target.value);
              if (!Number.isNaN(val) && val > 0) {
                setTendered(val);
              }
            }}
            placeholder="Or enter custom cash amount (₱)..."
            className="w-full min-h-[48px] rounded-xl bg-surface-muted border border-theme px-3.5 font-mono text-sm text-primary focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        {/* 1-Tap Complete Sale CTA (bg-emerald-btn) */}
        <button
          type="button"
          disabled={!isSufficient}
          onClick={() => {
            triggerHapticFeedback('success');
            onCompleteCash(tendered, change);
          }}
          className="w-full min-h-[58px] rounded-xl bg-emerald-btn hover:opacity-95 text-white font-bold text-base tracking-wide uppercase flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition disabled:opacity-40"
        >
          <Wallet className="w-5 h-5 stroke-[2.25]" />
          <span>
            Complete Sale • Change {formatPesoExact(change)}
          </span>
        </button>
      </div>
    </NativeModal>
  );
};

interface PautangModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  customers: Customer[];
  currentRole: Role;
  ownerPin?: string;
  preselectedCustomerId?: string | null;
  onCompletePautang: (customer: Customer, overrideUsed: boolean) => void;
  onQuickAddCustomer: (name: string, phone: string, creditLimit: number) => Customer;
}

export const PautangCheckoutModal: React.FC<PautangModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  customers,
  currentRole,
  ownerPin = '9999',
  preselectedCustomerId,
  onCompletePautang,
  onQuickAddCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(customers[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLimit, setNewLimit] = useState('500');

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setShowAddForm(false);
      setPinInput('');
      setPinError('');
      setOverrideUnlocked(false);
      if (preselectedCustomerId && customers.some((c) => c.id === preselectedCustomerId)) {
        setSelectedId(preselectedCustomerId);
      } else if (customers[0]) {
        setSelectedId(customers[0].id);
      }
    }
  }, [isOpen, preselectedCustomerId, customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.alias.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const selectedCustomer =
    customers.find((c) => c.id === selectedId) || filteredCustomers[0] || customers[0];
  const projectedBalance = selectedCustomer ? selectedCustomer.currentBalance + subtotal : 0;
  const exceedsCeiling = selectedCustomer
    ? projectedBalance > selectedCustomer.creditLimit
    : false;
  const canConfirm =
    selectedCustomer && (!exceedsCeiling || overrideUnlocked || currentRole === 'OWNER');

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const limitNum = parseFloat(newLimit) || 500;
    const created = onQuickAddCustomer(
      newName.trim(),
      newPhone.trim() || '0917-000-0000',
      limitNum
    );
    triggerHapticFeedback('success');
    setSelectedId(created.id);
    setNewName('');
    setNewPhone('');
    setNewLimit('500');
    setShowAddForm(false);
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pautang • Community Credit"
      subtitle={`Assign ${formatPesoExact(subtotal)} to customer credit ledger`}
      accentColor="amber"
    >
      <div className="space-y-3">
        {/* Search Bar + New Customer Quick-Add Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Aling Marites, Mang Boyong..."
              className="w-full min-h-[46px] pl-9 pr-3 rounded-xl bg-surface-muted border border-theme text-xs text-primary focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('tap');
              setShowAddForm((prev) => !prev);
            }}
            className={`min-h-[46px] px-3 rounded-xl font-semibold text-xs border flex items-center gap-1.5 shrink-0 transition ${
              showAddForm
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-surface-muted border-theme text-primary hover:border-slate-400'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#2563EB]" />
            <span>{showAddForm ? 'Cancel' : '+ New'}</span>
          </button>
        </div>

        {/* Inline New Customer Quick-Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleQuickCreate}
            className="rounded-2xl bg-surface-muted border border-theme p-3 space-y-2.5 shadow-sm"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-primary">
              New Customer Quick-Add
            </div>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full Name / Alias (e.g., Mang Tonio)"
              className="w-full min-h-[44px] rounded-xl bg-surface border border-theme px-3 text-xs text-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone (0917-...)"
                className="w-full min-h-[44px] rounded-xl bg-surface border border-theme px-3 text-xs text-primary font-mono"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted font-mono">
                  Limit ₱
                </span>
                <input
                  type="number"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-surface border border-theme pl-14 pr-3 text-xs text-primary font-mono font-bold"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm"
            >
              Save &amp; Select Customer
            </button>
          </form>
        )}

        {/* Neighborhood Regulars List */}
        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-0.5">
          {filteredCustomers.map((cust) => {
            const isSelected = cust.id === selectedCustomer?.id;
            const newBal = cust.currentBalance + subtotal;
            const willExceed = newBal > cust.creditLimit;
            const currentPct = Math.min(
              100,
              Math.round((cust.currentBalance / cust.creditLimit) * 100)
            );
            const projectedPct = Math.min(
              100,
              Math.round((newBal / cust.creditLimit) * 100)
            );

            const statusColor =
              cust.status === 'Good Standing'
                ? 'bg-emerald-btn/15 text-emerald-btn border-emerald-btn/40'
                : cust.status === 'Near Limit'
                  ? 'bg-amber-badge/15 text-amber-badge border-amber-badge/40'
                  : 'bg-red-500/15 text-red-500 border-red-500/40';

            return (
              <button
                key={cust.id}
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setSelectedId(cust.id);
                  setOverrideUnlocked(false);
                  setPinError('');
                }}
                className={`w-full text-left p-3 rounded-2xl border transition min-h-[76px] shadow-sm ${
                  isSelected
                    ? willExceed
                      ? 'bg-surface-muted border-red-500 ring-1 ring-red-500/50'
                      : 'bg-surface-muted border-amber-badge ring-1 ring-amber-badge/50'
                    : 'bg-surface-muted/80 border-theme hover:border-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-sm text-primary flex items-center gap-1.5 flex-wrap">
                      <span>{cust.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor}`}
                      >
                        {cust.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{cust.alias}</p>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <div className="text-xs text-muted">
                      <span className="font-bold text-primary">
                        {formatPesoExact(cust.currentBalance)}
                      </span>{' '}
                      <span className="text-[10px] text-muted">
                        / {formatPeso(cust.creditLimit)}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] font-bold mt-0.5 ${
                        willExceed ? 'text-red-500' : 'text-amber-badge'
                      }`}
                    >
                      After: {formatPesoExact(newBal)}
                    </div>
                  </div>
                </div>

                {/* Credit Limit Progress Bar */}
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden mt-2 border border-theme">
                  <div
                    className={`h-full transition-all ${
                      willExceed
                        ? 'bg-red-500'
                        : projectedPct >= 75
                          ? 'bg-amber-badge'
                          : 'bg-emerald-btn'
                    }`}
                    style={{ width: `${isSelected ? projectedPct : currentPct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Credit Limit Exceeded Enforcement & Manager PIN Override */}
        {selectedCustomer && exceedsCeiling && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/40 p-3 text-xs space-y-2.5">
            <div className="flex items-start gap-2 text-red-500 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Credit Limit Exceeded! {selectedCustomer.name}&apos;s new balance (
                {formatPesoExact(projectedBalance)}) exceeds their{' '}
                {formatPeso(selectedCustomer.creditLimit)} limit by{' '}
                {formatPesoExact(projectedBalance - selectedCustomer.creditLimit)}.
              </span>
            </div>

            {currentRole === 'CASHIER' && !overrideUnlocked && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinError('');
                    }}
                    placeholder={`Owner PIN (${ownerPin}) to override`}
                    className="w-full min-h-[42px] pl-8 pr-2 rounded-xl bg-surface border border-theme font-mono text-xs text-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (pinInput === ownerPin) {
                      triggerHapticFeedback('success');
                      setOverrideUnlocked(true);
                      setPinError('');
                    } else {
                      triggerHapticFeedback('warning');
                      setPinError(`Enter Owner PIN ${ownerPin}`);
                    }
                  }}
                  className="min-h-[42px] px-3 rounded-xl bg-amber-badge hover:opacity-95 text-white font-bold text-xs uppercase shrink-0"
                >
                  Unlock
                </button>
              </div>
            )}
            {pinError && <p className="text-[11px] text-amber-badge font-semibold">{pinError}</p>}
            {overrideUnlocked && (
              <p className="text-[11px] text-emerald-btn font-bold">
                ✓ Owner PIN {ownerPin} Verified — One-time credit ceiling override unlocked.
              </p>
            )}
          </div>
        )}

        {/* 1-Tap Confirm Pautang Button (bg-amber-badge) */}
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            if (!selectedCustomer) return;
            triggerHapticFeedback('success');
            onCompletePautang(selectedCustomer, exceedsCeiling);
          }}
          className={`w-full min-h-[56px] rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition ${
            canConfirm
              ? 'bg-amber-badge hover:opacity-95 text-white active:scale-[0.99]'
              : 'bg-surface-muted border border-theme text-muted/50 cursor-not-allowed'
          }`}
        >
          <UserCheck className="w-5 h-5 stroke-[2.25]" />
          <span>
            {exceedsCeiling
              ? `Confirm Override Pautang (${formatPesoExact(subtotal)})`
              : `Confirm Pautang • ${selectedCustomer?.name || 'Customer'}`}
          </span>
        </button>
      </div>
    </NativeModal>
  );
};

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Product[];
  onApplyVoiceCommand: (parsed: ParsedVoiceCommand) => void;
}

export const VoiceDictationModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onApplyVoiceCommand,
}) => {
  const [phrase, setPhrase] = useState(VOICE_PRESET_PHRASES[0]);
  const [isListening, setIsListening] = useState(false);

  const parsed = useMemo<ParsedVoiceCommand>(
    () =>
      isOpen
        ? parseVoiceOrder(phrase, catalog)
        : {
            rawTranscript: phrase,
            matchedItems: [],
            suggestedPaymentMethod: 'CASH',
            customerQuery: null,
            tenderedCash: null,
          },
    [isOpen, phrase, catalog]
  );
  const parsedSubtotal = useMemo(
    () =>
      parsed.matchedItems.reduce(
        (sum, item) => sum + item.product.sellingPrice * item.qty,
        0
      ),
    [parsed.matchedItems]
  );
  const parsedChange =
    parsed.tenderedCash && parsed.tenderedCash >= parsedSubtotal
      ? parsed.tenderedCash - parsedSubtotal
      : null;

  const startBrowserSpeech = () => {
    triggerHapticFeedback('tap');
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const nextPreset =
        VOICE_PRESET_PHRASES[
          (VOICE_PRESET_PHRASES.indexOf(phrase) + 1) % VOICE_PRESET_PHRASES.length
        ];
      setPhrase(nextPreset);
      triggerHapticFeedback('success');
    }, 800);
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="Voice Dictation • Taglish NLP"
      subtitle="Speak natural orders + tendered bill for 1-tap checkout"
      accentColor="cyan"
    >
      <div className="space-y-3.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startBrowserSpeech}
            className={`min-w-[56px] min-h-[56px] rounded-xl flex items-center justify-center border transition ${
              isListening
                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                : 'bg-[#2563EB] border-[#2563EB] text-white shadow-sm'
            }`}
          >
            <Mic className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. Two Pantene, one Coke 1.5, paid 100"
            className="w-full min-h-[56px] rounded-xl bg-surface-muted border border-theme px-3 text-sm text-primary font-medium focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
            1-Tap Voice Order Presets
          </span>
          <div className="flex flex-wrap gap-1.5">
            {VOICE_PRESET_PHRASES.slice(0, 3).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setPhrase(preset);
                }}
                className={`text-left text-xs px-2.5 py-2 rounded-lg border transition ${
                  phrase === preset
                    ? 'bg-[#2563EB] border-[#2563EB] text-white font-semibold'
                    : 'bg-surface-muted border-theme text-muted hover:text-primary'
                }`}
              >
                &ldquo;{preset}&rdquo;
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface-muted border border-theme p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1 text-[#2563EB] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Parsed Items ({parsed.matchedItems.length})
            </span>
            <span className="font-mono font-bold text-primary">
              Subtotal: {formatPesoExact(parsedSubtotal)}
            </span>
          </div>

          <div className="space-y-1.5">
            {parsed.matchedItems.map(({ product, qty }) => (
              <div
                key={product.id}
                className="flex items-center justify-between text-xs bg-surface border border-theme px-2.5 py-1.5 rounded-lg"
              >
                <span className="font-semibold text-primary">
                  {product.icon} {qty}× {product.shortName}
                </span>
                <span className="font-mono text-emerald-btn font-bold">
                  {formatPeso(product.sellingPrice * qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-theme flex items-center justify-between text-xs">
            <span className="text-muted">
              Mode:{' '}
              <strong className="text-primary">
                {parsed.suggestedPaymentMethod === 'PAUTANG' ? 'PAUTANG' : 'CASH'}
              </strong>
              {parsed.tenderedCash ? ` (Bill: ₱${parsed.tenderedCash})` : ''}
            </span>
            {parsedChange !== null && (
              <span className="font-mono font-bold text-emerald-btn">
                Change: {formatPesoExact(parsedChange)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={parsed.matchedItems.length === 0}
          onClick={() => {
            triggerHapticFeedback('success');
            onApplyVoiceCommand(parsed);
          }}
          className="w-full min-h-[56px] rounded-xl bg-emerald-btn hover:opacity-95 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition disabled:opacity-40"
        >
          <CreditCard className="w-5 h-5 stroke-[2.25]" />
          <span>Populate Cart &amp; Open Checkout</span>
        </button>
      </div>
    </NativeModal>
  );
};
