import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Lock,
  X,
  Users,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { StoreStaff } from '../types/pos';
import { triggerHapticFeedback } from '../utils/localDb';

interface CashierSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStaffMember: StoreStaff;
  staffList: StoreStaff[];
  ownerStaff: StoreStaff;
  onSwitchStaff: (staff: StoreStaff) => void;
  onLockCounter: () => void;
}

export const CashierSwitchModal: React.FC<CashierSwitchModalProps> = ({
  isOpen,
  onClose,
  activeStaffMember,
  staffList,
  ownerStaff,
  onSwitchStaff,
  onLockCounter,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Combined selectable staff including Owner
  const allEligibleStaff: StoreStaff[] = [
    ownerStaff,
    ...staffList.filter((s) => s.is_active !== false && s.id !== ownerStaff.id),
  ];

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    triggerHapticFeedback('tap');
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setPinError('');

    if (nextPin.length === 4) {
      // Find matching staff member by PIN
      const matched = allEligibleStaff.find((s) => s.pin === nextPin);
      if (matched) {
        triggerHapticFeedback('success');
        onSwitchStaff(matched);
        setPinInput('');
        onClose();
      } else {
        triggerHapticFeedback('warning');
        setPinError('Invalid 4-digit PIN. Please try again.');
        setPinInput('');
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setPinInput('');
      setPinError('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        setPinInput((prev) => prev.slice(0, -1));
        setPinError('');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pinInput, allEligibleStaff]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm bg-surface rounded-3xl border border-theme shadow-2xl p-5 space-y-4 text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-theme">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-primary">Switch Cashier / Worker</h3>
              <p className="text-[11px] text-muted">
                Active: <span className="font-bold text-primary">{activeStaffMember.name}</span> ({activeStaffMember.role})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-muted hover:text-primary cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Registered Staff Chips Preview */}
        <div className="flex flex-wrap justify-center gap-1.5 py-1">
          {allEligibleStaff.map((staff) => (
            <div
              key={staff.id}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 border ${
                activeStaffMember.id === staff.id
                  ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'bg-surface-muted border-theme text-muted'
              }`}
            >
              <span>{staff.role === 'manager' ? '👑' : '👤'}</span>
              <span>{staff.name}</span>
            </div>
          ))}
        </div>

        {/* 4 PIN Dots */}
        <div>
          <div className="flex items-center justify-center gap-3 my-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pinInput.length > idx
                    ? 'bg-[#2563EB] border-[#2563EB] scale-110'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              />
            ))}
          </div>

          {pinError ? (
            <p className="text-xs text-rose-500 font-bold animate-bounce mt-1">
              {pinError}
            </p>
          ) : (
            <p className="text-[11px] text-muted font-mono mt-1">
              Enter 4-digit PIN to clock in as active cashier
            </p>
          )}
        </div>

        {/* Touch Keypad */}
        <div className="grid grid-cols-3 gap-2 font-mono">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'C') {
                  setPinInput('');
                  setPinError('');
                } else if (key === '⌫') {
                  setPinInput((prev) => prev.slice(0, -1));
                  setPinError('');
                } else {
                  handleDigit(key);
                }
              }}
              className="h-12 rounded-xl bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-theme text-lg font-black text-primary flex items-center justify-center active:scale-95 transition shadow-xs cursor-pointer"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Quick Shift Lock Option without logging out */}
        <div className="pt-2 border-t border-theme">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('warning');
              onClose();
              onLockCounter();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 border border-amber-500/30 transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Counter Now (PIN Lock)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
