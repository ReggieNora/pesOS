import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { USERS } from '../data/mockSariSariData';
import { ShiftRecord, UserProfile } from '../types/pos';
import { formatPesoExact, triggerHapticFeedback } from '../utils/localDb';
import { NativeModal } from './NativeModal';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  users?: UserProfile[];
  activeShift: ShiftRecord;
  initialTab?: 'PIN_SWITCH' | 'BLIND_COUNT';
  onSwitchUser: (user: UserProfile) => void;
  onSubmitBlindCount: (countedCash: number, notes: string) => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = USERS,
  activeShift,
  initialTab = 'PIN_SWITCH',
  onSwitchUser,
  onSubmitBlindCount,
}) => {
  const [tab, setTab] = useState<'PIN_SWITCH' | 'BLIND_COUNT'>(initialTab);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [blindCashInput, setBlindCashInput] = useState('2800');
  const [shiftNote, setShiftNote] = useState('');
  const [lastResult, setLastResult] = useState<{
    counted: number;
    expected: number;
    discrepancy: number;
  } | null>(null);

  const ownerOperator = users.find((u) => u.role === 'OWNER') || users[0];

  const handlePinDigit = (digit: string) => {
    triggerHapticFeedback('tap');
    setPinError('');
    const next = (pinInput + digit).slice(0, 4);
    setPinInput(next);

    if (next.length === 4) {
      const matched = users.find((u) => u.pin === next);
      if (matched) {
        triggerHapticFeedback('success');
        setPinInput('');
        onSwitchUser(matched);
        onClose();
      } else {
        triggerHapticFeedback('warning');
        setPinError('Invalid 4-digit PIN. Please try again.');
        setPinInput('');
      }
    }
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="RBAC PIN Gate & Blind Shift Handover"
      subtitle={`Active Operator: ${currentUser.name} (${currentUser.role})`}
      accentColor="cyan"
    >
      <div className="space-y-4">
        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-muted border border-theme">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('tap');
              setTab('PIN_SWITCH');
              setLastResult(null);
            }}
            className={`min-h-[42px] rounded-lg text-xs font-extrabold uppercase tracking-wider transition ${
              tab === 'PIN_SWITCH'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-muted hover:text-primary'
            }`}
          >
            4-Digit PIN Clock-In
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('tap');
              setTab('BLIND_COUNT');
            }}
            className={`min-h-[42px] rounded-lg text-xs font-extrabold uppercase tracking-wider transition ${
              tab === 'BLIND_COUNT'
                ? 'bg-amber-badge text-white shadow-sm'
                : 'text-muted hover:text-primary'
            }`}
          >
            Blind Drawer Count
          </button>
        </div>

        {tab === 'PIN_SWITCH' ? (
          <div className="space-y-3.5">
            {/* Quick 1-Tap Role Switcher Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
                1-Tap Operator Switch (or enter 4-digit PIN below)
              </span>
              <div
                className={`grid ${
                  users.length === 1
                    ? 'grid-cols-1'
                    : users.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                } gap-1.5`}
              >
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback('success');
                        onSwitchUser(u);
                        onClose();
                      }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isCurrent
                          ? 'bg-[#2563EB]/15 border-[#2563EB] text-primary shadow-sm'
                          : 'bg-surface-muted border-theme text-primary hover:border-slate-400'
                      }`}
                    >
                      <div className="text-xs font-extrabold truncate">{u.name}</div>
                      <div className="text-[10px] font-mono text-muted mt-0.5">
                        PIN: ••••
                      </div>
                      <div className="text-[9px] uppercase font-bold text-muted mt-0.5">
                        {u.role}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PIN Dots Display */}
            <div className="rounded-xl bg-surface-muted border border-theme p-3 text-center">
              <div className="flex items-center justify-center gap-3 my-1">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition ${
                      pinInput.length > idx
                        ? 'bg-[#2563EB] border-[#2563EB]'
                        : 'border-slate-400 dark:border-slate-600'
                    }`}
                  />
                ))}
              </div>
              {pinError ? (
                <p className="text-[11px] text-red-500 font-semibold mt-1">{pinError}</p>
              ) : (
                <p className="text-[11px] text-muted mt-1">
                  Enter 4-digit PIN to clock in
                </p>
              )}
            </div>

            {/* 56px Touch Target PIN Pad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'].map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'CLR') {
                        setPinInput('');
                        setPinError('');
                      } else if (key === '⌫') {
                        setPinInput((prev) => prev.slice(0, -1));
                        setPinError('');
                      } else {
                        handlePinDigit(key);
                      }
                    }}
                    className={`min-h-[56px] rounded-xl font-mono font-black text-base border transition active:scale-95 ${
                      key === 'CLR' || key === '⌫'
                        ? 'bg-surface-muted border-theme text-muted text-xs'
                        : 'bg-surface-muted border-theme text-primary hover:border-[#2563EB]'
                    }`}
                  >
                    {key}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          /* Blind Handover Drawer Count Flow */
          <div className="space-y-3.5">
            <div className="rounded-xl bg-amber-badge/10 border border-amber-badge/40 p-3 flex items-start gap-2.5">
              <EyeOff className="w-5 h-5 text-amber-badge shrink-0 mt-0.5" />
              <div className="text-xs text-primary">
                <strong className="text-amber-badge block">
                  Blind Cash Handover Enforced
                </strong>
                Expected system cash is hidden during count to prevent drawer manipulation. Discrepancies are automatically flagged to Bossing&apos;s Audit Trail.
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">
                Physical Cash Counted in Drawer (₱)
              </label>
              <input
                type="number"
                value={blindCashInput}
                onChange={(e) => setBlindCashInput(e.target.value)}
                placeholder="Enter physical drawer cash count"
                className="w-full min-h-[56px] rounded-xl bg-surface-muted border border-theme px-3.5 font-mono font-black text-xl text-primary focus:outline-none focus:border-amber-badge"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setBlindCashInput(String(activeShift.expectedDrawerCash - 45))}
                  className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-500 font-mono text-xs font-bold"
                >
                  Simulate -₱45 Shortage
                </button>
                <button
                  type="button"
                  onClick={() => setBlindCashInput(String(activeShift.expectedDrawerCash))}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-btn/15 border border-emerald-btn/40 text-emerald-btn font-mono text-xs font-bold"
                >
                  Simulate Exact Match
                </button>
              </div>
            </div>

            <input
              type="text"
              value={shiftNote}
              onChange={(e) => setShiftNote(e.target.value)}
              placeholder="Optional handover note (e.g., Petty cash for ice delivery)"
              className="w-full min-h-[46px] rounded-xl bg-surface-muted border border-theme px-3 text-xs text-primary"
            />

            {lastResult && (
              <div
                className={`rounded-xl p-3 border text-xs space-y-1 ${
                  lastResult.discrepancy === 0
                    ? 'bg-emerald-btn/15 border-emerald-btn/50 text-emerald-btn'
                    : 'bg-red-500/15 border-red-500/50 text-red-500'
                }`}
              >
                <div className="font-black uppercase flex items-center gap-1.5">
                  {lastResult.discrepancy === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Drawer Balanced — Zero Discrepancy!</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-4 h-4" />
                      <span>
                        Discrepancy Flagged to Owner Audit Log:{' '}
                        {formatPesoExact(lastResult.discrepancy)}
                      </span>
                    </>
                  )}
                </div>
                <div className="font-mono text-primary">
                  Counted: {formatPesoExact(lastResult.counted)} | System Expected:{' '}
                  {formatPesoExact(lastResult.expected)}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const counted = parseFloat(blindCashInput) || 0;
                const discrepancy = counted - activeShift.expectedDrawerCash;
                if (discrepancy === 0) triggerHapticFeedback('success');
                else triggerHapticFeedback('warning');

                setLastResult({
                  counted,
                  expected: activeShift.expectedDrawerCash,
                  discrepancy,
                });
                onSubmitBlindCount(counted, shiftNote);
              }}
              className="w-full min-h-[56px] rounded-xl bg-amber-badge hover:opacity-95 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition"
            >
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              <span>Submit Blind Cash Count &amp; Log Handover</span>
            </button>
          </div>
        )}
      </div>
    </NativeModal>
  );
};
