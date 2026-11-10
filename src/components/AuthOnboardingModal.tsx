import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Delete,
  KeyRound,
  LogOut,
  MapPin,
  Moon,
  PackageCheck,
  Plus,
  Rocket,
  RotateCcw,
  Sparkles,
  Store,
  Sun,
  User,
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
  onGoogleSignIn?: () => Promise<void> | void;
  isGoogleLoading?: boolean;
  googleUser?: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
  } | null;
  onSignOutGoogle?: () => Promise<void> | void;
  onClose?: () => void;
}

type GatewayView = 'GATEWAY' | 'WIZARD' | 'SIGN_IN' | 'GOOGLE_SETUP';
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
  onGoogleSignIn,
  isGoogleLoading,
  googleUser,
  onSignOutGoogle,
  onClose,
}) => {
  const [view, setView] = useState<GatewayView>('GATEWAY');
  const [screen, setScreen] = useState<WizardScreen>(1);

  // Wizard Screen 1: Store Name, Owner Name, Barangay/Location
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [barangayLocation, setBarangayLocation] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [preloadCatalog, setPreloadCatalog] = useState(true);

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
      if (googleUser) {
        setView('GOOGLE_SETUP');
        const inferred =
          googleUser.user_metadata?.full_name ||
          googleUser.user_metadata?.name ||
          (googleUser.email ? googleUser.email.split('@')[0] : '') ||
          'Store Owner';
        setOwnerName(inferred);
        setStoreName((prev) => prev || `${inferred}'s Store`);
      } else {
        setView('GATEWAY');
      }
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
  }, [isOpen, existingLiveStore, googleUser]);

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

  const handleFinishOnboarding = async (preloadCatalogParam: boolean) => {
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
        preloadStarterCatalog: preloadCatalogParam,
        ownerId: googleUser?.id,
        ownerEmail: googleUser?.email,
      });
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishGoogleSetup = async () => {
    if (isLoading) return;
    triggerHapticFeedback('success');
    setIsLoading(true);
    try {
      await onCompleteOnboarding({
        storeName: storeName.trim() || `${ownerName}'s Store`,
        ownerName: ownerName.trim() || 'Store Owner',
        barangayCity: barangayLocation.trim() || undefined,
        ownerPin: '9999',
        preloadStarterCatalog: preloadCatalog,
        ownerId: googleUser?.id,
        ownerEmail: googleUser?.email,
      });
    } catch (err: any) {
      console.error('Failed to complete Google store onboarding:', err);
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

            {/* PRIMARY ENTRY POINT: CONTINUE WITH GOOGLE (Center Stage) */}
            <div className="rounded-2xl bg-surface-muted border border-theme p-4 space-y-3 shadow-sm text-center">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/40 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-[10px] uppercase">
                  Recommended • 1-Tap Entry
                </span>
                <h2 className="text-sm font-black text-primary pt-1">
                  Connect &amp; Open Your Store
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  Sign in or create your sari-sari store account instantly with Google.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  triggerHapticFeedback('tap');
                  if (onGoogleSignIn) {
                    await onGoogleSignIn();
                  }
                }}
                disabled={isGoogleLoading || isLoading}
                className="w-full min-h-[56px] rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-sm flex items-center justify-center gap-3 shadow-md active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.89c2.28-2.1 3.65-5.2 3.65-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.03c-1.08.72-2.45 1.16-4.04 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-theme w-full" />
              <span className="bg-surface px-3 text-[10px] font-mono uppercase tracking-widest text-muted shrink-0">
                Or Continue With
              </span>
              <div className="border-t border-theme w-full" />
            </div>

            {/* SECONDARY OPTIONS: Cashier PIN Unlock & Demo Mode */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setView('SIGN_IN');
                }}
                className="w-full min-h-[48px] rounded-2xl bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-theme text-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-[#2563EB] stroke-[2.5]" />
                <span>
                  🔑 Cashier PIN Unlock
                  {existingLiveStore
                    ? ` (${existingLiveStore.profile.storeName})`
                    : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('success');
                  onSelectDemoMode();
                }}
                className="w-full min-h-[48px] rounded-2xl bg-emerald-btn/15 hover:bg-emerald-btn/25 border border-emerald-btn/50 text-emerald-btn font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
              >
                <Rocket className="w-4 h-4 stroke-[2.5]" />
                <span>🚀 Explore Demo Mode (Pre-Loaded Store)</span>
              </button>

              <div className="flex justify-center pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onResetDemoData();
                    onSelectDemoMode();
                  }}
                  className="text-[11px] font-mono text-muted hover:text-primary flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3 text-amber-badge" />
                  <span>Reset Demo Data to Clean State</span>
                </button>
              </div>
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

        {/* =========================================================
            VIEW 4: GOOGLE USER STORE SETUP
           ========================================================= */}
        {view === 'GOOGLE_SETUP' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <div className="flex items-center gap-2.5 min-w-0">
                {googleUser?.user_metadata?.avatar_url ? (
                  <img
                    src={googleUser.user_metadata.avatar_url}
                    alt="Google Profile"
                    className="w-10 h-10 rounded-full border border-theme shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 text-[#2563EB] flex items-center justify-center font-bold text-sm shrink-0">
                    {googleUser?.email ? googleUser.email.charAt(0).toUpperCase() : 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-black text-primary truncate flex items-center gap-1.5">
                    <span className="truncate">{ownerName || 'Store Owner'}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                      Google
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted truncate">
                    {googleUser?.email}
                  </p>
                </div>
              </div>

              {onSignOutGoogle && (
                <button
                  type="button"
                  onClick={onSignOutGoogle}
                  className="text-[11px] font-bold text-muted hover:text-red-500 flex items-center gap-1 transition shrink-0 cursor-pointer"
                  title="Use different account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Switch</span>
                </button>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-primary">
                Finish Your Store Setup
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Pre-filled from your Google account. Just enter your store name and location to open your counter.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isStoreNameValid) {
                  handleFinishGoogleSetup();
                }
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="google-store-name"
                  className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1.5"
                >
                  Store Name *
                </label>
                <div className="relative">
                  <input
                    id="google-store-name"
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Aling Nena's Sari-Sari Store"
                    className="w-full h-12 pl-10 pr-3 rounded-2xl bg-surface-muted border border-theme focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 text-primary font-bold text-sm outline-none transition"
                  />
                  <Store className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="google-location"
                  className="block text-xs font-mono font-bold uppercase tracking-wider text-muted mb-1.5"
                >
                  Barangay / Location
                </label>
                <div className="relative">
                  <input
                    id="google-location"
                    type="text"
                    value={barangayLocation}
                    onChange={(e) => setBarangayLocation(e.target.value)}
                    placeholder="e.g. Brgy. Poblacion, Cebu City"
                    className="w-full h-12 pl-10 pr-3 rounded-2xl bg-surface-muted border border-theme focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 text-primary font-medium text-sm outline-none transition"
                  />
                  <MapPin className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted border border-theme space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preloadCatalog}
                    onChange={(e) => setPreloadCatalog(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-primary">
                    Pre-load Top 20 Sari-Sari Starter Items
                  </span>
                </label>
                <p className="text-[11px] text-muted pl-6">
                  Includes Nescafe 3in1, Kopiko, Silver Swan, Lucky Me, and standard retail SRPs.
                </p>
              </div>

              <button
                type="submit"
                disabled={!isStoreNameValid || isLoading}
                className="w-full min-h-[52px] rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
              >
                <Rocket className="w-5 h-5 stroke-[2.5]" />
                <span>{isLoading ? 'Setting Up Store...' : 'Launch Store'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
