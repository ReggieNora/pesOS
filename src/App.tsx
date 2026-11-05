import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Eye,
  Lock,
  Moon,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { AuthOnboardingModal } from './components/AuthOnboardingModal';
import { CashierRegister } from './components/CashierRegister';
import { InventoryHub } from './components/InventoryHub';
import { OwnerDashboard } from './components/OwnerDashboard';
import { PautangHub } from './components/PautangHub';
import { PesOSLogo } from './components/PesOSLogo';
import {
  CashCheckoutModal,
  PautangCheckoutModal,
  VoiceDictationModal,
} from './components/PaymentModals';
import { ShiftHandoverModal } from './components/ShiftHandoverModal';
import { SaleCompletedModal } from './components/SaleCompletedModal';
import {
  computeCustomerStatus,
  INITIAL_PRODUCTS,
  USERS,
} from './data/mockSariSariData';
import {
  AuditLogEntry,
  CartItem,
  CreditPayment,
  Customer,
  EnvironmentMode,
  LiveOnboardingPayload,
  OcrInvoicePreset,
  Product,
  ShiftRecord,
  StoreProfile,
  TransactionRecord,
  UserProfile,
} from './types/pos';
import {
  authenticateLiveStore,
  clearActiveSession,
  getExistingLiveStoreSnapshot,
  getSavedEnvironmentMode,
  hasActiveSession,
  loadEnvironmentSnapshot,
  persistEnvironmentSnapshot,
  provisionLiveStoreAccount,
  resetDemoEnvironment,
  saveEnvironmentMode,
  setActiveSession,
} from './utils/dataProvider';
import {
  formatPesoExact,
  triggerHapticFeedback,
} from './utils/localDb';
import { CompletedSaleSummary } from './utils/receiptFormatter';
import { ParsedVoiceCommand } from './utils/voiceParser';

type NavTab = 'REGISTER' | 'INVENTORY' | 'PAUTANG_BOOK' | 'OWNER';
type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'tingipos_theme';

function resolveInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // Ignore storage access errors
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function applyDocumentTheme(theme: ThemeMode, hasExplicitOverride: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');

  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute('content', hasExplicitOverride ? theme : 'light dark');
  }
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', theme === 'dark' ? '#0F172A' : '#F8FAFC');
  }
}

export function App() {
  // Theme state with localStorage('tingipos_theme') + prefers-color-scheme fallback
  const [theme, setTheme] = useState<ThemeMode>(resolveInitialTheme);

  useEffect(() => {
    let hasStored = false;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      hasStored = stored === 'dark' || stored === 'light';
    } catch {
      // Ignore storage read errors
    }
    applyDocumentTheme(theme, hasStored);
  }, [theme]);

  // Listen for OS prefers-color-scheme changes (when not overridden) & cross-tab storage sync
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleMediaChange = (e: MediaQueryListEvent) => {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
          return; // Keep explicit user preference pinned
        }
      } catch {
        // Ignore storage errors
      }
      setTheme(e.matches ? 'dark' : 'light');
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        if (e.newValue === 'dark' || e.newValue === 'light') {
          setTheme(e.newValue);
        } else {
          setTheme(mediaQuery.matches ? 'dark' : 'light');
        }
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleToggleTheme = () => {
    triggerHapticFeedback('tap');
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Still apply theme to document even if localStorage is blocked
    }
    setTheme(nextTheme);
    applyDocumentTheme(nextTheme, true);
  };

  // Dual-Environment Mode ('DEMO' | 'LIVE') & Splash/Onboarding Screen State
  const [environmentMode, setEnvironmentMode] = useState<EnvironmentMode>(
    getSavedEnvironmentMode
  );
  const initialSnapshot = useMemo(
    () => loadEnvironmentSnapshot(environmentMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [storeProfile, setStoreProfile] = useState<StoreProfile>(
    initialSnapshot.profile
  );
  const [users, setUsers] = useState<UserProfile[]>(initialSnapshot.users);
  const [products, setProducts] = useState<Product[]>(initialSnapshot.products);
  const [customers, setCustomers] = useState<Customer[]>(
    initialSnapshot.customers
  );
  const [shifts, setShifts] = useState<ShiftRecord[]>(initialSnapshot.shifts);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(
    initialSnapshot.transactions
  );
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>(
    initialSnapshot.creditPayments
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(
    initialSnapshot.auditLogs
  );

  // Active User / Role (Default to first operator in the environment)
  const [currentUser, setCurrentUser] = useState<UserProfile>(
    initialSnapshot.users[0] || USERS[0]
  );
  const [activeTab, setActiveTab] = useState<NavTab>('REGISTER');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [phoneFrameMode, setPhoneFrameMode] = useState<boolean>(false);

  // Splash / Login & 3-Step Store Onboarding Modal (Opens automatically when no active session exists)
  const [isAuthSplashOpen, setIsAuthSplashOpen] = useState<boolean>(
    () => !hasActiveSession()
  );

  // Default Cart pre-populated to ₱81.00 in DEMO mode; empty ready-to-sell in LIVE mode
  const [cart, setCart] = useState<CartItem[]>(() =>
    environmentMode === 'DEMO'
      ? [
          { product: INITIAL_PRODUCTS[0], qty: 1 },
          { product: INITIAL_PRODUCTS[6], qty: 2 },
        ]
      : []
  );

  // Drill-down filtering states from Dashboard
  const [inventoryFilterLowOnly, setInventoryFilterLowOnly] = useState<boolean>(false);
  const [pautangSortBy, setPautangSortBy] = useState<'HIGHEST_BALANCE' | 'OLDEST_DEBT'>('HIGHEST_BALANCE');

  // Modals State
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isCashOpen, setIsCashOpen] = useState(false);
  const [cashModalPreset, setCashModalPreset] = useState<number | null>(null);
  const [isPautangOpen, setIsPautangOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftModalTab, setShiftModalTab] = useState<'PIN_SWITCH' | 'BLIND_COUNT'>('PIN_SWITCH');
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<CompletedSaleSummary | null>(null);

  // User Profile Quick Actions & Station Lock State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isStationLocked, setIsStationLocked] = useState(false);
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockPinError, setLockPinError] = useState('');

  // Toast Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Persist active environment snapshot to IndexedDB + LocalStorage (+ Supabase if configured in LIVE mode)
  useEffect(() => {
    persistEnvironmentSnapshot(environmentMode, {
      profile: storeProfile,
      users,
      products,
      customers,
      shifts,
      transactions,
      creditPayments,
      auditLogs,
    });
  }, [
    environmentMode,
    storeProfile,
    users,
    products,
    customers,
    shifts,
    transactions,
    creditPayments,
    auditLogs,
  ]);

  const applyEnvironmentSnapshot = (
    mode: EnvironmentMode,
    snap: ReturnType<typeof loadEnvironmentSnapshot>,
    activeOperator?: UserProfile
  ) => {
    setEnvironmentMode(mode);
    saveEnvironmentMode(mode);
    setStoreProfile(snap.profile);
    setUsers(snap.users);
    setProducts(snap.products);
    setCustomers(snap.customers);
    setShifts(snap.shifts);
    setTransactions(snap.transactions);
    setCreditPayments(snap.creditPayments);
    setAuditLogs(snap.auditLogs);
    setCurrentUser(activeOperator || snap.users[0] || USERS[0]);
    setCart(
      mode === 'DEMO'
        ? [
            { product: INITIAL_PRODUCTS[0], qty: 1 },
            { product: INITIAL_PRODUCTS[6], qty: 2 },
          ]
        : []
    );
    setActiveTab('REGISTER');
  };

  const handleResetDemoData = () => {
    triggerHapticFeedback('warning');
    const fresh = resetDemoEnvironment();
    applyEnvironmentSnapshot('DEMO', fresh, fresh.users[0]);
    showToast('Demo Mode Reset to Clean Screenshot State (₱81.00 Cart)');
  };

  const handleSelectDemoMode = () => {
    const demoSnap = loadEnvironmentSnapshot('DEMO');
    applyEnvironmentSnapshot('DEMO', demoSnap, demoSnap.users[0]);
    setActiveSession('DEMO');
    setIsAuthSplashOpen(false);
    showToast('Exploring Interactive Demo Mode');
  };

  const handleExitDemoOrStore = () => {
    triggerHapticFeedback('tap');
    clearActiveSession();
    setIsAuthSplashOpen(true);
  };

  const handleSignInLiveStore = (storeOrPhone: string, pin: string) => {
    const auth = authenticateLiveStore(storeOrPhone, pin);
    if (!auth.ok) return auth;
    applyEnvironmentSnapshot('LIVE', auth.snapshot, auth.matchedUser);
    setActiveSession('LIVE');
    setIsAuthSplashOpen(false);
    return { ok: true as const };
  };

  const handleCompleteOnboarding = (payload: LiveOnboardingPayload) => {
    const { snapshot, activeUser } = provisionLiveStoreAccount(payload);
    applyEnvironmentSnapshot('LIVE', snapshot, activeUser);
    setActiveSession('LIVE');
    setIsAuthSplashOpen(false);
    showToast(
      `Welcome to ${snapshot.profile.storeName}! Shift #1 initialized (${snapshot.products.length} items ready).`
    );
  };

  const handleUpdateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveProduct(productId);
    } else {
      setCart((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, qty } : i))
      );
    }
  };

  const handleCashDrawerMovement = (type: 'IN' | 'OUT', amount: number, reason: string) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.status === 'ACTIVE') {
          const delta = type === 'IN' ? amount : -amount;
          return {
            ...s,
            expectedDrawerCash: Math.max(0, s.expectedDrawerCash + delta),
          };
        }
        return s;
      })
    );

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        eventType: 'CASH_OVERRIDE',
        severity: type === 'OUT' ? 'WARN' : 'INFO',
        summary: `Cash ${type === 'IN' ? 'In (Float Add)' : 'Out (Expense/Drop)'}: ${formatPesoExact(amount)}`,
        detail: `Reason: ${reason} • Authorized by ${currentUser.name}`,
      },
      ...prev,
    ]);

    triggerHapticFeedback('success');
    showToast(`Recorded Cash ${type}: ${formatPesoExact(amount)} (${reason})`);
  };

  // Lock station keypad & digit handling
  const handleLockPinDigit = (digit: string) => {
    if (lockPinInput.length >= 4) return;
    const nextPin = lockPinInput + digit;
    setLockPinInput(nextPin);
    setLockPinError('');

    if (nextPin.length === 4) {
      const matched = users.find((u) => u.pin === nextPin);
      if (matched) {
        triggerHapticFeedback('success');
        if (matched.id !== currentUser.id) {
          setCurrentUser(matched);
        }
        setIsStationLocked(false);
        setLockPinInput('');
      } else {
        triggerHapticFeedback('warning');
        setLockPinError('Invalid 4-digit PIN. Try again.');
        setLockPinInput('');
      }
    }
  };

  useEffect(() => {
    if (!isStationLocked) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleLockPinDigit(e.key);
      } else if (e.key === 'Backspace') {
        setLockPinInput((prev) => prev.slice(0, -1));
        setLockPinError('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStationLocked, lockPinInput, users, currentUser]);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === preselectedCustomerId) || null,
    [customers, preselectedCustomerId]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sellingPrice * item.qty, 0),
    [cart]
  );

  const totalCost = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.wholesaleCost * item.qty, 0),
    [cart]
  );

  const activeShift = shifts.find((s) => s.status === 'ACTIVE') || shifts[0];

  // Cart Handlers
  const handleAddProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const handleDecrementProduct = (productId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Deduct inventory and record transaction (<100ms local-first commit)
  const commitTransaction = (
    type: 'CASH' | 'PAUTANG',
    options?: {
      cashTendered?: number;
      changeGiven?: number;
      customer?: Customer;
      overrideApproved?: boolean;
    }
  ): TransactionRecord | null => {
    if (cart.length === 0) return null;

    const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = `Today, ${new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newTx: TransactionRecord = {
      id: txId,
      createdAt: nowStr,
      timestampMs: Date.now(),
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      type,
      totalAmount: subtotal,
      totalWholesaleCost: totalCost,
      cashTendered: options?.cashTendered,
      changeGiven: options?.changeGiven,
      customerId: options?.customer?.id,
      customerName: options?.customer?.name,
      overrideApproved: options?.overrideApproved,
      items: cart.map((c) => ({
        productId: c.product.id,
        name: c.product.shortName,
        icon: c.product.icon,
        qty: c.qty,
        unitPrice: c.product.sellingPrice,
        unitCost: c.product.wholesaleCost,
      })),
      syncStatus: isOfflineMode ? 'PENDING_SYNC' : 'SYNCED',
    };

    if (isOfflineMode) {
      setPendingSyncCount((c) => c + 1);
    }

    // Decrement local inventory
    setProducts((prev) =>
      prev.map((prod) => {
        const inCart = cart.find((c) => c.product.id === prod.id);
        if (!inCart) return prod;
        return {
          ...prod,
          stockQty: Math.max(0, prod.stockQty - inCart.qty),
          daysSinceLastSale: 0,
        };
      })
    );

    // Update shift drawer metrics
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id !== activeShift.id) return s;
        const addedCash = type === 'CASH' ? subtotal : 0;
        return {
          ...s,
          cashSalesTotal: s.cashSalesTotal + addedCash,
          pautangSalesTotal: s.pautangSalesTotal + (type === 'PAUTANG' ? subtotal : 0),
          expectedDrawerCash: s.expectedDrawerCash + addedCash,
        };
      })
    );

    setTransactions((prev) => [newTx, ...prev]);
    setCart([]);
    return newTx;
  };

  const handleCompleteCash = (cashTendered: number, changeGiven: number) => {
    const tx = commitTransaction('CASH', { cashTendered, changeGiven });
    setIsCashOpen(false);
    if (tx) {
      setCompletedSale({
        transaction: tx,
        shiftTag: activeShift.id.slice(-7),
        storeName: storeProfile.storeName,
      });
    }
  };

  const handleCompletePautang = (customer: Customer, overrideUsed: boolean) => {
    const newBalance = customer.currentBalance + subtotal;
    const tx = commitTransaction('PAUTANG', {
      customer,
      overrideApproved: overrideUsed,
    });

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              currentBalance: newBalance,
              status: computeCustomerStatus(newBalance, c.creditLimit, c.oldestDebtDays),
              oldestDebtAt: c.currentBalance === 0 ? 'Just now' : c.oldestDebtAt,
              lastTransactionNote: `${cart.map((i) => `${i.qty}x ${i.product.shortName}`).join(', ')} (Just now)`,
            }
          : c
      )
    );

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        eventType: 'PAUTANG_CREDIT',
        severity: overrideUsed ? 'CRITICAL' : 'WARN',
        summary: `${overrideUsed ? '[PIN OVERRIDE] ' : ''}Pautang ${formatPesoExact(subtotal)} → ${customer.name}`,
        detail: `New Balance: ${formatPesoExact(newBalance)} / Limit ${formatPesoExact(customer.creditLimit)}`,
      },
      ...prev,
    ]);

    setIsPautangOpen(false);
    if (tx) {
      setCompletedSale({
        transaction: tx,
        shiftTag: activeShift.id.slice(-7),
        storeName: storeProfile.storeName,
        customerPhone: customer.phone,
        customerNewBalance: newBalance,
        customerCreditLimit: customer.creditLimit,
      });
    }
  };

  const handleQuickAddCustomer = (
    name: string,
    phone: string,
    creditLimit: number
  ): Customer => {
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      alias: 'Neighborhood Regular',
      phone,
      creditLimit,
      currentBalance: 0,
      status: 'Good Standing',
      oldestDebtDays: 0,
      oldestDebtAt: 'New Account',
      lastTransactionNote: 'Account created today',
    };

    setCustomers((prev) => [newCust, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        eventType: 'NEW_CUSTOMER',
        severity: 'INFO',
        summary: `Added Pautang Customer: ${name}`,
        detail: `Credit Limit: ${formatPesoExact(creditLimit)} • Phone: ${phone}`,
      },
      ...prev,
    ]);
    showToast(`Added ${name} (Limit ${formatPesoExact(creditLimit)})`);
    return newCust;
  };

  const handleRecordRepayment = (
    customerId: string,
    amountPaid: number,
    note: string
  ) => {
    const target = customers.find((c) => c.id === customerId);
    if (!target || amountPaid <= 0) return;

    const newBalance = Math.max(0, target.currentBalance - amountPaid);
    const newDebtDays = newBalance === 0 ? 0 : target.oldestDebtDays;

    const paymentEntry: CreditPayment = {
      id: `PAY-${Math.floor(100 + Math.random() * 900)}`,
      customerId: target.id,
      customerName: target.name,
      amountPaid,
      balanceAfter: newBalance,
      receivedByUserId: currentUser.id,
      receivedByName: currentUser.name,
      createdAt: `Today, ${new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      timestampMs: Date.now(),
      note: note.trim() || undefined,
    };

    setCreditPayments((prev) => [paymentEntry, ...prev]);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              currentBalance: newBalance,
              oldestDebtDays: newDebtDays,
              oldestDebtAt: newBalance === 0 ? 'Cleared' : c.oldestDebtAt,
              status: computeCustomerStatus(newBalance, c.creditLimit, newDebtDays),
              lastTransactionNote: `Paid ${formatPesoExact(amountPaid)} cash (Just now)`,
            }
          : c
      )
    );

    // Add cash received to active shift drawer
    setShifts((prev) =>
      prev.map((s) =>
        s.id === activeShift.id
          ? {
              ...s,
              repaymentsCollectedTotal: s.repaymentsCollectedTotal + amountPaid,
              expectedDrawerCash: s.expectedDrawerCash + amountPaid,
            }
          : s
      )
    );

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        eventType: 'PAUTANG_REPAYMENT',
        severity: 'INFO',
        summary: `Repayment ${formatPesoExact(amountPaid)} from ${target.name}`,
        detail: `Remaining Balance: ${formatPesoExact(newBalance)}`,
      },
      ...prev,
    ]);

    showToast(
      `Recorded ${formatPesoExact(amountPaid)} repayment from ${target.name} • Bal: ${formatPesoExact(newBalance)}`
    );
  };

  const handleApplyVoiceCommand = (parsed: ParsedVoiceCommand) => {
    setCart(parsed.matchedItems);
    setIsVoiceOpen(false);

    const voiceSubtotal = parsed.matchedItems.reduce(
      (sum, item) => sum + item.product.sellingPrice * item.qty,
      0
    );

    if (parsed.suggestedPaymentMethod === 'PAUTANG') {
      setPreselectedCustomerId(parsed.customerQuery);
      setIsPautangOpen(true);
    } else if (parsed.tenderedCash && parsed.tenderedCash >= voiceSubtotal) {
      setCashModalPreset(parsed.tenderedCash);
      setIsCashOpen(true);
    } else {
      showToast(`Voice populated ${parsed.matchedItems.length} items into cart`);
    }
  };

  const handleSubmitBlindCount = (countedCash: number, notes: string) => {
    const expected = activeShift.expectedDrawerCash;
    const discrepancy = countedCash - expected;

    setShifts((prev) =>
      prev.map((s) =>
        s.id === activeShift.id
          ? {
              ...s,
              blindCountedCash: countedCash,
              discrepancy,
              status: discrepancy === 0 ? 'CLOSED_MATCH' : 'CLOSED_DISCREPANCY',
              notes: notes || s.notes,
            }
          : s
      )
    );

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        eventType:
          discrepancy === 0 ? 'BLIND_COUNT_MATCH' : 'BLIND_COUNT_MISMATCH',
        severity: discrepancy === 0 ? 'INFO' : 'CRITICAL',
        summary:
          discrepancy === 0
            ? `Blind Shift Count Matched (${formatPesoExact(countedCash)})`
            : `Blind Shift Discrepancy: ${formatPesoExact(discrepancy)}`,
        detail: `Counted: ${formatPesoExact(countedCash)} vs Expected: ${formatPesoExact(expected)}${notes ? ` • Note: ${notes}` : ''}`,
      },
      ...prev,
    ]);

    showToast(
      discrepancy === 0
        ? 'Blind Shift Handover Balanced (₱0.00 Variance)'
        : `Variance Flagged to Owner Log: ${formatPesoExact(discrepancy)}`
    );
  };

  const handleCommitOcrInvoice = (preset: OcrInvoicePreset) => {
    setProducts((prev) =>
      prev.map((p) => {
        const match = preset.items.find((i) => i.productId === p.id);
        if (!match) return p;
        return {
          ...p,
          stockQty: p.stockQty + match.detectedQty,
          wholesaleCost: match.wholesaleUnitCost,
          sellingPrice: match.suggestedRetailPrice,
        };
      })
    );

    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: 'Just now',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        eventType: 'OCR_STOCK_IN',
        severity: 'INFO',
        summary: `OCR Stock-In Committed (${preset.invoiceNo})`,
        detail: `${preset.supplierName} • Added ${preset.items.reduce((s, i) => s + i.detectedQty, 0)} total units`,
      },
      ...prev,
    ]);

    setIsOcrModalOpen(false);
    showToast(`OCR Stock-In Committed: ${preset.invoiceNo}`);
  };

  const cashierInitials = useMemo(() => {
    const parts = currentUser.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return currentUser.name.slice(0, 2).toUpperCase();
  }, [currentUser.name]);

  const isOwner = currentUser.role === 'OWNER';
  const roleDisplayName = isOwner
    ? currentUser.name === 'Bossing'
      ? 'Bossing (Admin)'
      : 'Owner'
    : 'Cashier';

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'REGISTER', label: 'Register', icon: ShoppingCart },
    { id: 'INVENTORY', label: 'Inventory', icon: Package },
    { id: 'PAUTANG_BOOK', label: 'Pautang', icon: Users },
    { id: 'OWNER', label: 'Dashboard', icon: BarChart3 },
  ];

  return (
    <div className="min-h-[100dvh] w-full pos-glass-canvas text-primary flex flex-col items-center justify-start relative transition-colors duration-200">
      {/* Main POS Shell — Full-bleed edge-to-edge by default; optional Phone Frame via Dev Controls */}
      <div
        className={`w-full pos-glass-canvas text-primary flex flex-col relative [transform:translateZ(0)] transition-colors duration-200 ${
          phoneFrameMode
            ? 'max-w-[430px] h-[100dvh] md:my-3 md:h-[844px] md:rounded-[34px] md:border md:border-theme md:shadow-2xl overflow-hidden'
            : 'h-[100dvh] overflow-hidden'
        }`}
      >
        {/* 1. Persistent Top Nav Bar (Clean, Minimalist Header matching Square layout) */}
        <header className="sticky top-0 z-40 h-[48px] px-3 md:px-4 bg-surface/90 backdrop-blur-md border-b border-theme flex items-center justify-between gap-2 shrink-0 transition-colors duration-200 shadow-sm">
          {/* Left: pesOS Branding + Slim Divider + Active Station/Cashier Label */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('tap');
                if (isOfflineMode && pendingSyncCount > 0) {
                  setIsOfflineMode(false);
                  setPendingSyncCount(0);
                  setTransactions((prev) =>
                    prev.map((tx) => ({ ...tx, syncStatus: 'SYNCED' }))
                  );
                  showToast(`Synced ${pendingSyncCount} offline transactions!`);
                } else {
                  setIsOfflineMode((prev) => !prev);
                  showToast(
                    !isOfflineMode
                      ? 'Offline Mode Active — Queueing locally'
                      : 'Online Mode — Synced'
                  );
                }
              }}
              className="flex items-center gap-1.5 text-left group cursor-pointer active:scale-95 transition"
              title={
                isOfflineMode
                  ? `Offline Mode (${pendingSyncCount} queued) — Tap to sync`
                  : 'pesOS Online & Synced — Tap to simulate offline'
              }
            >
              <PesOSLogo imageHeightClass="h-7 sm:h-8" />
              <span className="relative flex h-2 w-2 shrink-0 ml-0.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isOfflineMode ? 'bg-amber-badge' : 'bg-emerald-btn'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isOfflineMode ? 'bg-amber-badge' : 'bg-emerald-btn'
                  }`}
                />
              </span>
            </button>

            {/* Slim Vertical Divider */}
            <div className="h-4 w-px bg-theme shrink-0 hidden sm:block" />

            {/* Active Station / Cashier Label */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted truncate">
              <span className="truncate max-w-[120px] font-medium text-primary">
                {currentUser.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-muted border border-theme font-mono uppercase text-muted font-bold">
                {currentUser.role === 'OWNER' ? 'Owner' : 'Cashier'}
              </span>
            </div>
          </div>

          {/* Right: Subtle Floating Demo/Store Pill + Compact Theme Switcher [ ☀️ / 🌙 ] */}
          <div className="flex items-center gap-2 shrink-0">
            {environmentMode === 'DEMO' ? (
              <button
                type="button"
                onClick={handleExitDemoOrStore}
                title="Exit Demo Mode & return to App Entry Gateway"
                className="h-8 px-2.5 rounded-full bg-surface-muted border border-theme hover:border-amber-badge text-[10px] font-mono font-bold text-primary flex items-center gap-1.5 active:scale-95 transition shrink-0 shadow-sm cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-btn" />
                <span className="hidden sm:inline">Demo Mode •</span>
                <span className="text-amber-badge font-extrabold">Exit Demo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExitDemoOrStore}
                title="Switch Store or Exit Live Session"
                className="h-8 px-2.5 rounded-full bg-emerald-btn/20 border border-emerald-btn/60 text-emerald-btn text-[11px] font-mono font-extrabold flex items-center gap-1.5 active:scale-95 transition shrink-0 shadow-sm cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span className="truncate max-w-[110px]">
                  {storeProfile.storeName}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={
                theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
              }
              title={
                theme === 'dark'
                  ? 'Switch to Daylight Light Mode'
                  : 'Switch to Dark Mode'
              }
              className="w-8 h-8 rounded-lg bg-surface-muted border border-theme hover:border-[#006AFF] text-primary flex items-center justify-center active:scale-95 transition shrink-0 shadow-sm cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#006AFF]" />
              )}
            </button>
          </div>
        </header>

        {/* Floating Non-Disruptive Toast Notification (Fixed Overlay) */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none toast-floating-container">
            <div className="px-4 py-2 rounded-xl bg-surface/95 backdrop-blur-md border border-theme text-primary text-xs font-semibold shadow-lg flex items-center gap-2 max-w-sm text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006AFF] shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* 3. Central POS Work Area (Pinned Headers/Footers, Scroll Containment) */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col pb-16">
          {activeTab === 'REGISTER' && (
            <CashierRegister
              products={products}
              cart={cart}
              currentRole={currentUser.role}
              customerName={activeCustomer?.name}
              onAddProduct={handleAddProduct}
              onDecrementProduct={handleDecrementProduct}
              onRemoveProduct={handleRemoveProduct}
              onUpdateItemQty={handleUpdateItemQty}
              onClearCart={() => setCart([])}
              onOpenVoiceModal={() => setIsVoiceOpen(true)}
              onOpenCashModal={(preset) => {
                setCashModalPreset(preset ?? null);
                setIsCashOpen(true);
              }}
              onOpenPautangModal={() => {
                setIsPautangOpen(true);
              }}
              onInstantCashSale={handleCompleteCash}
              onOpenOcrModal={() => setIsOcrModalOpen(true)}
            />
          )}

          {activeTab === 'INVENTORY' && (
            <InventoryHub
              products={products}
              currentRole={currentUser.role}
              isOcrModalOpen={isOcrModalOpen}
              onOpenOcrModal={() => setIsOcrModalOpen(true)}
              onCloseOcrModal={() => setIsOcrModalOpen(false)}
              onRestockProduct={(productId, addedQty) => {
                const target = products.find((p) => p.id === productId);
                if (!target || addedQty <= 0) return;
                const newStock = target.stockQty + addedQty;

                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === productId ? { ...p, stockQty: newStock } : p
                  )
                );

                setAuditLogs((prev) => [
                  {
                    id: `aud-${Date.now()}`,
                    timestamp: 'Just now',
                    actorName: currentUser.name,
                    actorRole: currentUser.role,
                    eventType: 'OCR_STOCK_IN',
                    severity: 'INFO',
                    summary: `Restocked +${addedQty} ${target.shortName}`,
                    detail: `Stock updated: ${target.stockQty} → ${newStock} ${target.unit}s`,
                  },
                  ...prev,
                ]);
                showToast(
                  `Restocked +${addedQty} ${target.shortName} (${target.stockQty} → ${newStock})`
                );
              }}
              onUpdateProductDetails={(productId, updates) => {
                const target = products.find((p) => p.id === productId);
                if (!target) return;

                setProducts((prev) =>
                  prev.map((p) =>
                    p.id === productId
                      ? {
                          ...p,
                          name: updates.name,
                          sellingPrice: updates.sellingPrice,
                          wholesaleCost: updates.wholesaleCost,
                          lowStockThreshold: updates.lowStockThreshold,
                        }
                      : p
                  )
                );

                setAuditLogs((prev) => [
                  {
                    id: `aud-${Date.now()}`,
                    timestamp: 'Just now',
                    actorName: currentUser.name,
                    actorRole: currentUser.role,
                    eventType: 'PRICE_EDIT',
                    severity: 'INFO',
                    summary: `Updated details for ${updates.name}`,
                    detail: `Retail: ${formatPesoExact(updates.sellingPrice)} • Min Alert: ${updates.lowStockThreshold}`,
                  },
                  ...prev,
                ]);
                showToast(`Saved details for ${updates.name}`);
              }}
              onCommitOcrInvoice={handleCommitOcrInvoice}
              initialFilterLowOnly={inventoryFilterLowOnly}
            />
          )}

          {activeTab === 'PAUTANG_BOOK' && (
            <PautangHub
              customers={customers}
              transactions={transactions}
              creditPayments={creditPayments}
              currentRole={currentUser.role}
              initialSortBy={pautangSortBy}
              ownerPin={users.find((u) => u.role === 'OWNER')?.pin || '9999'}
              onRecordRepayment={handleRecordRepayment}
              onQuickAddCustomer={handleQuickAddCustomer}
            />
          )}

          {activeTab === 'OWNER' &&
            (currentUser.role === 'OWNER' ? (
              <OwnerDashboard
                currentRole={currentUser.role}
                products={products}
                customers={customers}
                shifts={shifts}
                transactions={transactions}
                auditLogs={auditLogs}
                onSwitchToOwnerPin={() => {
                  const owner =
                    users.find((u) => u.role === 'OWNER') ||
                    USERS.find((u) => u.role === 'OWNER')!;
                  setCurrentUser(owner);
                }}
                onOpenPautangBook={(sort = 'HIGHEST_BALANCE') => {
                  setPautangSortBy(sort);
                  setActiveTab('PAUTANG_BOOK');
                }}
                onOpenLowStockInventory={() => {
                  setInventoryFilterLowOnly(true);
                  setActiveTab('INVENTORY');
                }}
                onOpenBlindHandover={() => {
                  setShiftModalTab('BLIND_COUNT');
                  setIsShiftModalOpen(true);
                }}
                onTriggerOcrRestock={() => {
                  setInventoryFilterLowOnly(true);
                  setActiveTab('INVENTORY');
                  setIsOcrModalOpen(true);
                }}
                onApplyDeadStockPromo={(productId) => {
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === productId
                        ? {
                            ...p,
                            sellingPrice: Math.max(p.wholesaleCost + 1, p.sellingPrice - 2),
                            daysSinceLastSale: 0,
                          }
                        : p
                    )
                  );
                  showToast('Applied -₱2.00 bundle promo on Ligo Sardines!');
                }}
                onAddCashMovement={handleCashDrawerMovement}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4 bg-background">
                <div className="w-16 h-16 rounded-2xl bg-amber-badge/15 border border-amber-badge/40 flex items-center justify-center text-amber-badge shadow-sm">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h2 className="text-lg font-black text-primary uppercase tracking-wide">
                    Owner Overwatch Locked (RBAC)
                  </h2>
                  <p className="text-xs text-muted leading-relaxed">
                    Only the store owner can view financial analytics, wholesale supplier costs, and shift audit discrepancy reports.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('tap');
                    const owner =
                      users.find((u) => u.role === 'OWNER') ||
                      USERS.find((u) => u.role === 'OWNER')!;
                    setCurrentUser(owner);
                  }}
                  className="min-h-[50px] px-6 rounded-xl bg-[#006AFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Eye className="w-4 h-4 stroke-[2.5]" />
                  <span>Unlock with Owner PIN (9999)</span>
                </button>
              </div>
            ))}
        </main>

        {/* 2. Fixed Bottom Navigation Deck (Evenly Spaced 5-Column Grid matching Square POS) */}
        <nav
          aria-label="Primary Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 h-16 pb-safe bg-surface/90 backdrop-blur-md border-t border-theme grid grid-cols-5 items-center px-1 sm:px-4 md:px-8 transition-colors duration-200 shadow-lg"
        >
          {/* Column 1: Cashier/Owner Profile Pill with Role Indicator & Switch Action */}
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('tap');
              setIsUserMenuOpen(true);
            }}
            title="Switch User or Lock Station"
            className="relative h-full w-full flex flex-col items-center justify-center gap-0.5 transition active:scale-95 group cursor-pointer text-muted hover:text-primary px-1"
          >
            {/* Visual Role Indicator Ring + Dot */}
            <div className="relative">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-black text-[9px] shadow-sm transition-transform group-hover:scale-105 ${
                  isOwner
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 ring-2 ring-emerald-500/60'
                    : 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/50 ring-2 ring-blue-500/60'
                }`}
              >
                {cashierInitials}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface ${
                  isOwner ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
              />
            </div>

            {/* Line 1: Role Name with status badge */}
            <span className="text-[10px] font-extrabold text-primary truncate max-w-full leading-tight">
              {roleDisplayName}
            </span>

            {/* Line 2 (micro-text/sub-label): Switch User */}
            <span className="text-[9px] font-medium text-muted truncate max-w-full leading-none group-hover:text-[#006AFF] transition-colors">
              Switch User
            </span>
          </button>

          {/* Columns 2 - 5: Primary navigation tabs (Register, Inventory, Pautang, Dashboard) */}
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  if (id === 'INVENTORY') setInventoryFilterLowOnly(false);
                  setActiveTab(id);
                }}
                className={`relative h-full w-full flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-muted hover:text-primary'
                }`}
              >
                {/* Understated Blue Top Indicator Bar */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.5] text-blue-600 dark:text-blue-400' : 'stroke-[2]'
                  }`}
                />
                <span
                  className={`text-[11px] tracking-tight ${
                    isActive ? 'font-extrabold text-primary' : 'font-semibold text-muted'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick User Switch & Station Lock Popover Sheet */}
      {isUserMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsUserMenuOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end sm:justify-end sm:items-start p-3 sm:pb-20 sm:pl-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-80 bg-surface rounded-2xl border border-theme shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-sm ${
                    isOwner
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 ring-2 ring-emerald-500/60'
                      : 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/50 ring-2 ring-blue-500/60'
                  }`}
                >
                  {cashierInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-primary truncate flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isOwner
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isOwner ? 'Owner' : 'Cashier'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted">
                    Shift #1 Active • PIN: {currentUser.pin}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              {/* Option 1: [ 🔄 Switch User ] */}
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('tap');
                  setIsUserMenuOpen(false);
                  setShiftModalTab('PIN_SWITCH');
                  setIsShiftModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-theme flex items-center gap-3 transition active:scale-[0.99] text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-primary flex items-center justify-between">
                    <span>Switch User</span>
                    <span className="text-[10px] font-mono text-muted">PIN Clock-In</span>
                  </div>
                  <p className="text-[11px] text-muted truncate">
                    Switch between Owner ({users.find(u => u.role === 'OWNER')?.pin || '9999'}) &amp; Cashier
                  </p>
                </div>
              </button>

              {/* Option 2: [ 🔒 Lock Station ] */}
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback('warning');
                  setIsUserMenuOpen(false);
                  setIsStationLocked(true);
                  setLockPinInput('');
                  setLockPinError('');
                }}
                className="w-full p-2.5 rounded-xl bg-surface-muted hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-theme flex items-center gap-3 transition active:scale-[0.99] text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-badge/15 text-amber-badge flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-primary flex items-center justify-between">
                    <span>Lock Station</span>
                    <span className="text-[10px] font-mono text-amber-badge font-bold">Lock Terminal</span>
                  </div>
                  <p className="text-[11px] text-muted truncate">
                    Secure POS terminal; requires PIN to resume
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Station Locked Full-Screen Overlay */}
      {isStationLocked && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-surface rounded-3xl border border-theme shadow-2xl p-6 space-y-5 text-center">
            {/* Lock Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-badge/15 border border-amber-badge/40 flex items-center justify-center text-amber-badge mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-primary tracking-tight">
                POS Terminal Locked
              </h2>
              <p className="text-xs text-muted">
                Active Session: <strong className="text-primary">{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>

            {/* 4 PIN Dots */}
            <div className="py-1">
              <div className="flex items-center justify-center gap-3 my-1">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      lockPinInput.length > idx
                        ? 'bg-[#006AFF] border-[#006AFF] scale-110'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                ))}
              </div>

              {lockPinError ? (
                <p className="text-[11px] text-rose-500 font-bold mt-2 animate-bounce">
                  {lockPinError}
                </p>
              ) : (
                <p className="text-[11px] text-muted mt-2 font-mono">
                  Enter PIN to unlock ({users.map(u => `${u.name} ${u.pin}`).join(' • ')})
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
                    triggerHapticFeedback('tap');
                    if (key === 'C') {
                      setLockPinInput('');
                      setLockPinError('');
                    } else if (key === '⌫') {
                      setLockPinInput((prev) => prev.slice(0, -1));
                      setLockPinError('');
                    } else {
                      handleLockPinDigit(key);
                    }
                  }}
                  className={`min-h-[50px] rounded-xl font-black text-base border transition active:scale-95 cursor-pointer ${
                    key === 'C' || key === '⌫'
                      ? 'bg-surface-muted text-muted hover:text-primary border-theme text-xs'
                      : 'bg-surface border-theme text-primary hover:border-[#006AFF] hover:text-[#006AFF]'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top-Layer Modals */}
      <AuthOnboardingModal
        isOpen={isAuthSplashOpen}
        activeEnvironment={environmentMode}
        existingLiveStore={getExistingLiveStoreSnapshot()}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSelectDemoMode={handleSelectDemoMode}
        onResetDemoData={handleResetDemoData}
        onSignInLiveStore={handleSignInLiveStore}
        onCompleteOnboarding={handleCompleteOnboarding}
        onClose={hasActiveSession() ? () => setIsAuthSplashOpen(false) : undefined}
      />

      <CashCheckoutModal
        isOpen={isCashOpen}
        onClose={() => setIsCashOpen(false)}
        subtotal={subtotal}
        initialTendered={cashModalPreset}
        onCompleteCash={handleCompleteCash}
      />

      <PautangCheckoutModal
        isOpen={isPautangOpen}
        onClose={() => setIsPautangOpen(false)}
        subtotal={subtotal}
        customers={customers}
        currentRole={currentUser.role}
        ownerPin={users.find((u) => u.role === 'OWNER')?.pin || '9999'}
        preselectedCustomerId={preselectedCustomerId}
        onCompletePautang={handleCompletePautang}
        onQuickAddCustomer={handleQuickAddCustomer}
      />

      <VoiceDictationModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        catalog={products}
        onApplyVoiceCommand={handleApplyVoiceCommand}
      />

      <ShiftHandoverModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentUser={currentUser}
        users={users}
        activeShift={activeShift}
        initialTab={shiftModalTab}
        onSwitchUser={(user) => {
          setCurrentUser(user);
        }}
        onSubmitBlindCount={handleSubmitBlindCount}
      />

      <SaleCompletedModal
        sale={completedSale}
        onDismissNextSale={() => {
          setCompletedSale(null);
          setCart([]);
          setActiveTab('REGISTER');
        }}
      />
    </div>
  );
}

export default App;
