import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  ShoppingBag,
  UserCheck,
  Zap,
} from 'lucide-react';
import { formatPeso, formatPesoExact, triggerHapticFeedback } from '../utils/localDb';
import {
  buildSmsUri,
  CompletedSaleSummary,
  formatPlaintextReceipt,
} from '../utils/receiptFormatter';
import { NativeModal } from './NativeModal';

interface SaleCompletedModalProps {
  sale: CompletedSaleSummary | null;
  onDismissNextSale: () => void;
}

export const SaleCompletedModal: React.FC<SaleCompletedModalProps> = ({
  sale,
  onDismissNextSale,
}) => {
  const [phone, setPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    if (!sale) return;
    setPhone(sale.customerPhone || '');
    setSmsSent(false);
    setShowItems(true);
    setShowRawText(false);
  }, [sale]);

  const receiptText = useMemo(
    () => (sale ? formatPlaintextReceipt(sale) : ''),
    [sale]
  );

  if (!sale) return null;

  const {
    transaction,
    shiftTag,
    customerNewBalance,
    customerCreditLimit,
  } = sale;
  const isCash = transaction.type === 'CASH';

  const handleSendSms = () => {
    triggerHapticFeedback('success');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const encodedBody = encodeURIComponent(receiptText);
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const smsUri = `sms:${cleanPhone}${separator}body=${encodedBody}`;

    setSmsSent(true);
    window.location.href = smsUri;
  };

  return (
    <NativeModal
      isOpen={Boolean(sale)}
      onClose={onDismissNextSale}
      title="✓ Sale Completed"
      subtitle={`${transaction.createdAt} • Order #${transaction.id}`}
      accentColor="mint"
    >
      <div className="space-y-3.5 mt-4">
        {/* Hero Readout: Cash Sale vs Pautang Sale */}
        {isCash ? (
          <div className="rounded-2xl bg-surface-muted border border-theme p-3.5 shadow-sm space-y-2.5">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-theme text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">
                  Grand Total Due
                </span>
                <span className="font-mono font-bold text-base text-primary">
                  {formatPesoExact(transaction.totalAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">
                  Cash Tendered
                </span>
                <span className="font-mono font-bold text-base text-primary">
                  {formatPesoExact(transaction.cashTendered ?? transaction.totalAmount)}
                </span>
              </div>
            </div>

            {/* Ultra-Prominent Emerald CHANGE DUE (text-emerald-btn) */}
            <div className="text-center py-1">
              <span className="text-[11px] uppercase tracking-widest text-emerald-btn font-bold block">
                CHANGE DUE (SUKLI)
              </span>
              <div className="text-4xl font-mono font-black text-emerald-btn tracking-tight mt-0.5">
                {formatPesoExact(transaction.changeGiven ?? 0)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-muted border border-amber-badge/50 p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between border-b border-theme pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-badge/15 text-amber-badge flex items-center justify-center">
                  <UserCheck className="w-4 h-4 stroke-[2.25]" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted font-bold block">
                    Charged to Customer
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {transaction.customerName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-amber-badge font-bold block">
                  Amount Added
                </span>
                <span className="text-lg font-mono font-bold text-amber-badge">
                  +{formatPesoExact(transaction.totalAmount)}
                </span>
              </div>
            </div>

            {customerNewBalance !== undefined && customerCreditLimit !== undefined && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted">New Balance vs Ceiling:</span>
                  <span className="font-bold text-primary">
                    {formatPesoExact(customerNewBalance)}{' '}
                    <span className="text-muted font-normal">
                      / {formatPeso(customerCreditLimit)}
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-theme">
                  <div
                    className={`h-full ${
                      customerNewBalance > customerCreditLimit
                        ? 'bg-red-500'
                        : 'bg-amber-badge'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((customerNewBalance / customerCreditLimit) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* SMS Receipt Dispatcher Card */}
        <div className="rounded-2xl bg-surface-muted border border-theme p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#006AFF]" />
              <span>SMS Digital Receipt</span>
            </span>
            <button
              type="button"
              onClick={() => setShowRawText((p) => !p)}
              className="text-[10px] font-mono text-muted hover:text-primary underline"
            >
              {showRawText ? 'Hide SMS Preview' : 'Preview Text'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSmsSent(false);
              }}
              placeholder="09XX XXX XXXX"
              className="w-full min-h-[44px] rounded-xl bg-surface border border-theme px-3 font-mono text-xs text-primary focus:outline-none focus:border-[#006AFF]"
            />
          </div>

          {showRawText && (
            <pre className="p-2.5 rounded-xl bg-surface border border-theme text-[10px] font-mono text-primary whitespace-pre-wrap leading-relaxed">
              {receiptText}
            </pre>
          )}

          <button
            type="button"
            onClick={handleSendSms}
            data-sms-uri={buildSmsUri(phone, receiptText)}
            className={`w-full min-h-[46px] rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border transition active:scale-[0.98] shadow-sm ${
              smsSent
                ? 'bg-emerald-btn/15 border-emerald-btn/50 text-emerald-btn'
                : 'bg-[#006AFF] hover:bg-blue-600 border-[#006AFF] text-white'
            }`}
          >
            {smsSent ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.25]" />
                <span>✓ Opened in Messages</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>✉️ Open in Messages / Send SMS</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible / Scrollable Itemized Summary */}
        <div className="rounded-xl bg-surface-muted border border-theme overflow-hidden">
          <button
            type="button"
            onClick={() => setShowItems((p) => !p)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-muted hover:text-primary"
          >
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#006AFF]" />
              <span>
                Purchased Items ({transaction.items.reduce((s, i) => s + i.qty, 0)})
              </span>
            </span>
            {showItems ? (
              <ChevronUp className="w-4 h-4 text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" />
            )}
          </button>

          {showItems && (
            <div className="px-3 pb-2.5 pt-1 border-t border-theme space-y-1 max-h-[110px] overflow-y-auto">
              {transaction.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono text-muted"
                >
                  <span className="text-primary">
                    {item.icon} {item.qty}× {item.name}
                  </span>
                  <span className="font-bold text-emerald-btn">
                    {formatPesoExact(item.unitPrice * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cashier & Shift Footer Tag */}
        <div className="flex items-center justify-between text-[10px] font-mono text-muted px-1">
          <span>Cashier: {transaction.cashierName}</span>
          <span>Shift #{shiftTag}</span>
        </div>

        {/* Explicit Dismissal Button: Solid Emerald [ ⚡ NEXT SALE ] */}
        <button
          type="button"
          onClick={() => {
            triggerHapticFeedback('tap');
            onDismissNextSale();
          }}
          className="w-full min-h-[56px] rounded-2xl bg-emerald-btn hover:opacity-95 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
        >
          <Zap className="w-5 h-5 stroke-[2.25] fill-current" />
          <span>⚡ Next Sale</span>
        </button>
      </div>
    </NativeModal>
  );
};
