import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Delete,
  KeyRound,
  Moon,
  PackageCheck,
  Plus,
  Rocket,
  RotateCcw,
  Sparkles,
  Store,
  Sun,
  Zap,
} from 'lucide-react';
import { TOP_20_SARI_SARI_STARTER_ITEMS } from '../data/mockSariSariData';
import {
  EnvironmentMode,
  LiveOnboardingPayload,
  StoreStateSnapshot,
} from '../types/pos';
import { formatPeso, triggerHapticFeedback } from '../utils/localDb';
import { PesOSLogo } from './PesOSLogo';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  activeEnvironment: EnvironmentMode;
  existingLiveStore: StoreStateSnapshot | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectDemoMode: () => void;
  onResetDemoData: () => void;
  onSignInLiveStore: (
    storeOrPhone: string,
    pin: string
  ) =>
    | { ok: true }
    | { ok: false; error: string }
    | Promise<{ ok: true } | { ok: false; error: string }>;
  onCompleteOnboarding: (payload: LiveOnboardingPayload) => void | Promise<void>;
  onClose?: () => void;
}

type GatewayView = 'GATEWAY' | 'WIZARD' | 'SIGN_IN';
type WizardScreen = 1 | 2 | 3;
type PinStage = 'CREATE' | 'CONFIRM';

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({
  isOpen,
  existingLiveStore,
  theme,
  onToggleTheme,
  onSelectDemoMode,
  onResetDemoData,
  onSignInLiveStore,
  onCompleteOnboarding,
  onClose,
}) => {
  const [view, setView] = useState<GatewayView>('GATEWAY');
  const [screen, setScreen] = useState<WizardScreen>(1);

  // Wizard Screen 1: Store Name, Owner Name, Barangay/Location
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [barangayLocation, setBarangayLocation] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Wizard Screen 2: Create Owner PIN + Quick Confirmation
  const [pinStage, setPinStage] = useState<PinStage>('CREATE');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMismatchError, setPinMismatchError] = useState('');

  // Sign-In Screen: Store Name or Mobile Number lookup + 4-digit PIN pad
  const [signInLookup, setSignInLookup] = useState(
    existingLiveStore?.profile.storeName || ''
  );
  const [signInPin, setSignInPin] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView('GATEWAY');
      setScreen(1);
      setPinStage('CREATE');
      setFirstPin('');
      setConfirmPin('');
      setPinMismatchError('');
      setSignInPin('');
      setSignInError('');
      setIsLoading(false);
      if (existingLiveStore?.profile.storeName) {
        setSignInLookup(existingLiveStore.profile.storeName);
      }
    }
  }, [isOpen, existingLiveStore]);

  if (!isOpen) return null;

  const isStoreNameValid = storeName.trim().length >= 2;
  const activeWizardPin = pinStage === 'CREATE' ? firstPin : confirmPin;

  // Handle keypad digits for Screen 2 (Create & Confirm Owner PIN)
  const handleWizardPinDigit = (digit: string) => {
    triggerHapticFeedback('tap');
    setPinMismatchError('');

    if (pinStage === 'CREATE') {
      const next = (firstPin + digit).slice(0, 4);
      setFirstPin(next);
      if (next.length === 4) {
        // Automatically advance to quick confirmation step
        setTimeout(() => {
          setPinStage('CONFIRM');
        }, 160);
      }
      return;
    }

    // Confirm stage
    const nextConfirm = (confirmPin + digit).slice(0, 4);
    setConfirmPin(nextConfirm);
    if (nextConfirm.length === 4) {
      if (nextConfirm === firstPin) {
        triggerHapticFeedback('success');
        setTimeout(() => {
          setScreen(3);
        }, 180);
      } else {
        triggerHapticFeedback('warning');
        setPinMismatchError('PINs did not match. Please try confirming again.');
        setConfirmPin('');
      }
    }
  };

  const handleWizardPinBackspace = () => {
    triggerHapticFeedback('tap');
    setPinMismatchError('');
    if (pinStage === 'CREATE') {
      setFirstPin((p) => p.slice(0, -1));
    } else {
      setConfirmPin((p) => p.slice(0, -1));
    }
  };

  const handleWizardPinClear = () => {
    triggerHapticFeedback('tap');
    setPinMismatchError('');
    if (pinStage === 'CREATE') {
      setFirstPin('');
    } else {
      setConfirmPin('');
    }
  };

  // Handle keypad digits for Sign-In Screen
  const handleSignInPinDigit = async (digit: string) => {
    if (isLoading) return;
    triggerHapticFeedback('tap');
    setSignInError('');
    const next = (signInPin + digit).slice(0, 4);
    setSignInPin(next);

    if (next.length === 4) {
      setIsLoading(true);
      try {
        const res = await onSignInLiveStore(signInLookup, next);
        if (!res.ok) {
          triggerHapticFeedback('warning');
          setSignInError(res.error);
          setSignInPin('');
        } else {
          triggerHapticFeedback('success');
        }
      } catch (err: any) {
        setSignInError(err?.message || 'Failed to authenticate store.');
        setSignInPin('');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFinishOnboarding = async (preloadCatalog: boolean) => {
    if (isLoading) return;
    triggerHapticFeedback('success');
    setIsLoading(true);
    try {
      await onCompleteOnboarding({
        storeName: storeName.trim() || "Aling Nena's Sari-Sari",
        ownerName: ownerName.trim() || 'Store Owner',
        ownerPhone: ownerPhone.trim() || undefined,
        barangayCity: barangayLocation.trim() || undefined,
        ownerPin: firstPin || '9999',
        preloadStarterCatalog: preloadCatalog,
      });
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gateway-title"
      className="fixed inset-0 z-50 pos-glass-canvas text-primary flex flex-col items-center justify-center p-4 overflow-y-auto"
    >
      {/* Top-Right Theme Switcher & Optional Close Button */}
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={
            theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
          }
          className="w-10 h-10 rounded-xl bg-surface/90 border border-theme text-primary flex items-center justify-center shadow-sm active:scale-95 transition"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-[#2563EB]" />
          )}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-3.5 rounded-xl bg-surface/90 border border-theme text-xs font-bold text-muted hover:text-primary shadow-sm active:scale-95 transition"
          >
            Resume Session
          </button>
        )}
      </div>

      <div className="w-full max-w-[420px] rounded-3xl bg-surface/95 border border-theme shadow-2xl overflow-hidden my-auto">
        {/* =========================================================
            VIEW 1: APP ENTRY GATEWAY / SPLASH SCREEN
           ========================================================= */}
        {view === 'GATEWAY' && (
          <div className="p-6 space-y-6">
            {/* Brand Header with pesOS Logo */}
            <div className="text-center space-y-3 pt-2 flex flex-col items-center">
              <PesOSLogo imageHeightClass="h-12 md:h-14" />
              <div>
                <p className="text-xs font-bold text-primary tracking-wide">
                  Smart Sari-Sari POS
                </p>
                <p className="text-[11px] font-medium text-muted mt-0.5">
                  Offline-First Register &amp; Pautang Ledger
                </p>
              </div>
            </div>

            {/* Option A (Primary Demo): [ 🚀 Open Interactive Demo Mode ] */}
            <div className="rounded-2xl bg-surface-muted border border-theme p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-btn/20 border border-emerald-btn/50 text-emerald-btn font-mono font-bold text-[10px] uppercase">
                  Instant Preview • Screenshots Ready
                </span>
                <Sparkles className="w-4 h-4 text-emerald-btn" />
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-extrabold text-primary">
                  Explore with Pre-Loaded Store Data
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  Skips login and opens the Cashier Register with 30 items, a
                  sample ₱81.00 cart, and neighborhood Pautang accounts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('success');
                  onSelectDemoMode();
                }}
                className="w-full min-h-[56px] rounded-2xl bg-emerald-btn hover:opacity-95 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition"
              >
                <Rocket className="w-5 h-5 stroke-[2.5]" />
                <span>🚀 Open Interactive Demo Mode</span>
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    onSelectDemoMode();
                  }}
                  className="text-[11px] font-mono font-semibold text-muted hover:text-primary flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3 text-amber-badge" />
                  <span>Reset Demo Data to Fresh State</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-theme w-full" />
              <span className="bg-surface px-3 text-[10px] font-mono uppercase tracking-widest text-muted shrink-0">
                Or Run Your Live Store
              </span>
              <div className="border-t border-theme w-full" />
            </div>

            {/* Option B (Live App): [ 🔑 Sign In ] and [ ➕ Create New Store ] */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setView('SIGN_IN');
                }}
                className="w-full min-h-[52px] rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition"
              >
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
                <span>
                  🔑 Sign In
                  {existingLiveStore
                    ? ` (${existingLiveStore.profile.storeName})`
                    : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setStoreName('');
                  setFirstPin('');
                  setConfirmPin('');
                  setPinStage('CREATE');
                  setScreen(1);
                  setView('WIZARD');
                }}
                className="w-full min-h-[48px] rounded-2xl bg-surface-muted border border-theme hover:border-[#2563EB] text-primary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
              >
                <Plus className="w-4 h-4 text-[#2563EB] stroke-[2.5]" />
                <span>➕ Create New Store (30-Sec Setup)</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 2: ULTRA-SIMPLE, SINGLE-QUESTION-PER-STEP WIZARD
           ========================================================= */}
        {view === 'WIZARD' && (
          <div className="p-6 space-y-5">
            {/* Top Navigation & Progress Tracker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    if (screen === 1) {
                      setView('GATEWAY');
                    } else if (screen === 2) {
                      if (pinStage === 'CONFIRM') {
                        setPinStage('CREATE');
                        setConfirmPin('');
                        setPinMismatchError('');
                      } else {
                        setScreen(1);
                      }
                    } else {
                      setPinStage('CREATE');
                      setConfirmPin('');
                      setScreen(2);
                    }
                  }}
                  className="text-xs font-bold text-muted hover:text-primary flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <span className="text-[11px] font-mono font-bold text-muted">
                  Step {screen} of 3
                </span>
              </div>

              <nav aria-label="Progress">
                <ol className="grid grid-cols-3 gap-1.5">
                  {[
                    { num: 1 as const, label: '1. Store Name' },
                    { num: 2 as const, label: '2. Owner PIN' },
                    { num: 3 as const, label: '3. Stock Shelves' },
                  ].map((item) => {
                    const isCurrent = screen === item.num;
                    const isDone = screen > item.num;
                    return (
                      <li
                        key={item.num}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`h-2 rounded-full transition-all ${
                          isCurrent
                            ? 'bg-[#2563EB]'
                            : isDone
                              ? 'bg-emerald-btn'
                              : 'bg-surface-muted border border-theme'
                        }`}
                        title={item.label}
                      />
                    );
                  })}
                </ol>
              </nav>
            </div>

            {/* SCREEN 1: "Store Details (Store Name, Owner Name, Barangay Location)" */}
            {screen === 1 && (
              <form
                method="POST"
                action="#wizard-store-name"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isStoreNameValid) return;
                  triggerHapticFeedback('tap');
                  setPinStage('CREATE');
                  setFirstPin('');
                  setConfirmPin('');
                  setScreen(2);
                }}
                className="space-y-4 pt-1"
              >
                <div className="space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB]/15 border border-[#2563EB]/40 text-[#2563EB] flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <label
                    htmlFor="wizard-store-name-input"
                    className="block text-lg font-black text-primary tracking-tight pt-1"
                  >
                    30-Second Store Setup
                  </label>
                  <p className="text-xs text-muted">
                    Set up your sari-sari store terminal and isolated cloud database.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                      Store Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="wizard-store-name-input"
                      name="organization"
                      type="text"
                      autoComplete="organization"
                      enterKeyHint="next"
                      autoFocus
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g., Aling Nena's Sari-Sari"
                      className="w-full min-h-[48px] px-3.5 rounded-xl bg-surface-muted border-2 border-theme focus:border-[#2563EB] text-sm font-bold text-primary placeholder:text-muted/60 focus:outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                        Owner Name
                      </label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g., Maria Nora"
                        className="w-full min-h-[44px] px-3 rounded-xl bg-surface-muted border border-theme focus:border-[#2563EB] text-xs font-semibold text-primary placeholder:text-muted/60 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="0917XXXXXXX"
                        className="w-full min-h-[44px] px-3 rounded-xl bg-surface-muted border border-theme focus:border-[#2563EB] text-xs font-semibold text-primary placeholder:text-muted/60 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                      Barangay / Location
                    </label>
                    <input
                      type="text"
                      value={barangayLocation}
                      onChange={(e) => setBarangayLocation(e.target.value)}
                      placeholder="e.g., Brgy. San Antonio, Pasig"
                      className="w-full min-h-[44px] px-3.5 rounded-xl bg-surface-muted border border-theme focus:border-[#2563EB] text-xs font-semibold text-primary placeholder:text-muted/60 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isStoreNameValid}
                  className="w-full min-h-[50px] rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  <span>Next: Set 4-Digit PIN</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            )}

            {/* SCREEN 2: "Create Owner PIN" */}
            {screen === 2 && (
              <div className="space-y-4 pt-1">
                <div className="text-center space-y-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB]/15 text-[#2563EB] font-mono font-bold text-[10px] uppercase">
                    {pinStage === 'CREATE'
                      ? 'Step 2A • Set 4-Digit PIN'
                      : 'Step 2B • Confirm Your PIN'}
                  </span>
                  <h2 className="text-xl font-black text-primary tracking-tight">
                    {pinStage === 'CREATE'
                      ? 'Create Owner PIN'
                      : 'Confirm 4-Digit PIN'}
                  </h2>
                  <p className="text-xs text-muted">
                    {pinStage === 'CREATE'
                      ? `Protects ${storeName.trim()}'s profit dashboard & credit overrides.`
                      : 'Tap the same 4 digits one more time to confirm.'}
                  </p>
                </div>

                {/* Big Circular Digit Indicators */}
                <div className="rounded-2xl bg-surface-muted border border-theme py-4 px-3 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center justify-center gap-4">
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = activeWizardPin.length > idx;
                      return (
                        <div
                          key={idx}
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono font-black text-xl transition-all ${
                            isFilled
                              ? 'bg-[#2563EB] border-[#2563EB] text-white scale-105 shadow-sm'
                              : 'bg-surface border-theme text-muted'
                          }`}
                        >
                          {isFilled ? '●' : ''}
                        </div>
                      );
                    })}
                  </div>

                  <div aria-live="polite" className="min-h-[18px] text-center">
                    {pinMismatchError ? (
                      <span className="text-xs font-bold text-red-500">
                        {pinMismatchError}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-muted">
                        {pinStage === 'CREATE'
                          ? 'Choose any 4 digits (e.g., 9999)'
                          : `Re-enter your 4-digit Owner PIN`}
                      </span>
                    )}
                  </div>
                </div>

                {/* On-Screen Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleWizardPinDigit(digit)}
                      className="min-h-[56px] rounded-2xl bg-surface-muted border border-theme hover:border-[#2563EB] text-primary font-mono font-black text-xl active:scale-95 transition shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleWizardPinClear}
                    className="min-h-[56px] rounded-2xl bg-surface-muted border border-theme text-muted hover:text-primary font-mono font-bold text-xs uppercase active:scale-95 transition"
                  >
                    CLR
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWizardPinDigit('0')}
                    className="min-h-[56px] rounded-2xl bg-surface-muted border border-theme hover:border-[#2563EB] text-primary font-mono font-black text-xl active:scale-95 transition shadow-sm"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handleWizardPinBackspace}
                    aria-label="Backspace"
                    className="min-h-[56px] rounded-2xl bg-surface-muted border border-theme text-muted hover:text-primary flex items-center justify-center active:scale-95 transition"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 3: "Stock Your Shelves" */}
            {screen === 3 && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-btn/20 border border-emerald-btn/50 text-emerald-btn flex items-center justify-center">
                    <PackageCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-primary tracking-tight pt-1">
                    Stock Your Shelves
                  </h2>
                  <p className="text-xs text-muted">
                    Store <strong className="text-primary">{storeName}</strong>{' '}
                    is ready! How would you like to start your inventory?
                  </p>
                </div>

                {/* Clean Decision Card */}
                <div className="rounded-2xl bg-surface-muted border border-theme p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-btn/20 border border-emerald-btn/40 text-emerald-btn font-mono font-bold text-[10px] uppercase">
                      Recommended Starter Pack
                    </span>
                    <span className="text-xs font-mono font-bold text-muted">
                      20 Items
                    </span>
                  </div>

                  <p className="text-sm font-bold text-primary leading-snug">
                    Load 20 popular Sari-Sari items (Coke, instant noodles,
                    coffee, rice) with standard retail prices?
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {TOP_20_SARI_SARI_STARTER_ITEMS.slice(0, 8).map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-0.5 rounded-lg bg-surface border border-theme text-[10px] font-mono font-bold text-primary"
                      >
                        {item.icon} {item.shortName} ({formatPeso(item.sellingPrice)})
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-lg bg-surface border border-theme text-[10px] font-mono font-bold text-emerald-btn">
                      +12 more
                    </span>
                  </div>
                </div>

                {/* Two Full-Width Decision Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleFinishOnboarding(true)}
                    className="w-full min-h-[58px] rounded-2xl bg-emerald-btn hover:opacity-95 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition"
                  >
                    <Check className="w-5 h-5 stroke-[2.75]" />
                    <span>✅ Yes, Pre-load Starter Catalog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFinishOnboarding(false)}
                    className="w-full min-h-[52px] rounded-2xl bg-surface-muted border border-theme hover:border-[#2563EB] text-primary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition"
                  >
                    <Zap className="w-4 h-4 text-[#2563EB]" />
                    <span>⚡ Start with Empty Store</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            VIEW 3: CLEAN, MINIMAL SIGN-IN SCREEN
           ========================================================= */}
        {view === 'SIGN_IN' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setView('GATEWAY');
                }}
                className="text-xs font-bold text-muted hover:text-primary flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('success');
                  onSelectDemoMode();
                }}
                className="text-xs font-extrabold text-emerald-btn hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Try Demo Mode</span>
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-primary tracking-tight">
                Sign In to Your Store
              </h2>
              <p className="text-xs text-muted">
                Enter your Store Name (or Mobile Number) and tap your 4-digit
                PIN.
              </p>
            </div>

            {/* Store Name or Mobile Number Lookup */}
            <div>
              <label
                htmlFor="signin-store-lookup"
                className="block text-xs font-bold text-primary mb-1"
              >
                Store Name or Mobile Number
              </label>
              <input
                id="signin-store-lookup"
                name="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                value={signInLookup}
                onChange={(e) => {
                  setSignInLookup(e.target.value);
                  setSignInError('');
                }}
                placeholder={
                  existingLiveStore
                    ? existingLiveStore.profile.storeName
                    : "e.g., Aling Nena's Sari-Sari or 0917..."
                }
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-surface-muted border border-theme text-sm font-bold text-primary focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* 4-Digit Circular PIN Indicators */}
            <div className="rounded-2xl bg-surface-muted border border-theme py-3.5 px-3 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center justify-center gap-4">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = signInPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-mono font-black text-lg transition-all ${
                        isFilled
                          ? 'bg-[#2563EB] border-[#2563EB] text-white scale-105 shadow-sm'
                          : 'bg-surface border-theme text-muted'
                      }`}
                    >
                      {isFilled ? '●' : ''}
                    </div>
                  );
                })}
              </div>

              <div aria-live="polite" className="min-h-[18px] text-center">
                {isLoading ? (
                  <span className="text-xs font-bold text-sky-500 animate-pulse">
                    Authenticating store...
                  </span>
                ) : signInError ? (
                  <span className="text-xs font-bold text-red-500">
                    {signInError}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-muted">
                    Tap your 4-digit Owner or Cashier PIN
                  </span>
                )}
              </div>
            </div>

            {/* On-Screen 4-Digit PIN Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleSignInPinDigit(digit)}
                  className="min-h-[54px] rounded-2xl bg-surface-muted border border-theme hover:border-[#2563EB] text-primary font-mono font-black text-xl active:scale-95 transition shadow-sm"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setSignInPin('');
                  setSignInError('');
                }}
                className="min-h-[54px] rounded-2xl bg-surface-muted border border-theme text-muted hover:text-primary font-mono font-bold text-xs uppercase active:scale-95 transition"
              >
                CLR
              </button>

              <button
                type="button"
                onClick={() => handleSignInPinDigit('0')}
                className="min-h-[54px] rounded-2xl bg-surface-muted border border-theme hover:border-[#2563EB] text-primary font-mono font-black text-xl active:scale-95 transition shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setSignInPin((p) => p.slice(0, -1));
                  setSignInError('');
                }}
                aria-label="Backspace"
                className="min-h-[54px] rounded-2xl bg-surface-muted border border-theme text-muted hover:text-primary flex items-center justify-center active:scale-95 transition"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Immediate Footer Links: [ ➕ Create New Store ] & [ Try Demo Mode ] */}
            <div className="pt-1 flex items-center justify-between text-xs font-bold border-t border-theme">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setStoreName('');
                  setFirstPin('');
                  setConfirmPin('');
                  setPinStage('CREATE');
                  setScreen(1);
                  setView('WIZARD');
                }}
                className="text-[#2563EB] hover:underline flex items-center gap-1 py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Store</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('success');
                  onSelectDemoMode();
                }}
                className="text-emerald-btn hover:underline flex items-center gap-1 py-1"
              >
                <span>Try Demo Mode →</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
