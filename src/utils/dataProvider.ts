import {
  DEMO_STORE_PROFILE,
  INITIAL_AUDIT_LOGS,
  INITIAL_CREDIT_PAYMENTS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_SHIFTS,
  INITIAL_TRANSACTIONS,
  TOP_20_SARI_SARI_STARTER_ITEMS,
  USERS,
} from '../data/mockSariSariData';
import {
  AuditLogEntry,
  EnvironmentMode,
  LiveOnboardingPayload,
  ShiftRecord,
  StoreProfile,
  StoreStateSnapshot,
  UserProfile,
} from '../types/pos';
import { formatPesoExact, loadSnapshotFromLocal, saveSnapshotToIndexedDB } from './localDb';
import { registerNewStore, setActiveStoreSession } from './supabaseStoreService';

const ENV_MODE_KEY = 'tingipos_env_mode';
const ACTIVE_SESSION_KEY = 'tingipos_active_session';
const LIVE_STORE_KEY = 'live_store_snapshot_v1';
const DEMO_PREFIX = 'demo_';
const LIVE_PREFIX = 'live_';

// Optional Supabase REST configuration (automatically falls back to local IndexedDB/SQLite-like offline store)
const metaEnv = (
  import.meta as unknown as { env?: Record<string, string | undefined> }
).env;
const SUPABASE_URL = metaEnv?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = metaEnv?.VITE_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSavedEnvironmentMode(): EnvironmentMode {
  try {
    const raw = localStorage.getItem(ENV_MODE_KEY);
    if (raw === 'LIVE' || raw === 'DEMO') return raw;
  } catch {
    // Ignore storage read errors
  }
  return 'DEMO';
}

export function saveEnvironmentMode(mode: EnvironmentMode): void {
  try {
    localStorage.setItem(ENV_MODE_KEY, mode);
  } catch {
    // Ignore storage write errors
  }
}

export function hasActiveSession(): boolean {
  try {
    const val = sessionStorage.getItem(ACTIVE_SESSION_KEY);
    return val === 'DEMO' || val === 'LIVE';
  } catch {
    return false;
  }
}

export function setActiveSession(mode: EnvironmentMode): void {
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, mode);
  } catch {
    // Ignore sessionStorage errors
  }
}

export function clearActiveSession(): void {
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // Ignore sessionStorage errors
  }
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

export function buildInitialDemoSnapshot(): StoreStateSnapshot {
  return {
    profile: DEMO_STORE_PROFILE,
    users: USERS,
    products: INITIAL_PRODUCTS,
    customers: INITIAL_CUSTOMERS,
    shifts: INITIAL_SHIFTS,
    transactions: INITIAL_TRANSACTIONS,
    creditPayments: INITIAL_CREDIT_PAYMENTS,
    auditLogs: INITIAL_AUDIT_LOGS,
  };
}

export function loadEnvironmentSnapshot(mode: EnvironmentMode): StoreStateSnapshot {
  if (mode === 'LIVE') {
    const liveSaved = loadSnapshotFromLocal<StoreStateSnapshot | null>(LIVE_STORE_KEY, null);
    if (liveSaved && liveSaved.profile) {
      return liveSaved;
    }
  }

  // DEMO Mode: Load from demo_ namespace (or fallback to initial mock state)
  return {
    profile: loadSnapshotFromLocal(`${DEMO_PREFIX}profile_v2`, DEMO_STORE_PROFILE),
    users: loadSnapshotFromLocal(`${DEMO_PREFIX}users_v2`, USERS),
    products: loadSnapshotFromLocal(
      `${DEMO_PREFIX}products_v2`,
      loadSnapshotFromLocal('products_v2', INITIAL_PRODUCTS)
    ),
    customers: loadSnapshotFromLocal(
      `${DEMO_PREFIX}customers_v2`,
      loadSnapshotFromLocal('customers_v2', INITIAL_CUSTOMERS)
    ),
    shifts: loadSnapshotFromLocal(
      `${DEMO_PREFIX}shifts_v2`,
      loadSnapshotFromLocal('shifts_v2', INITIAL_SHIFTS)
    ),
    transactions: loadSnapshotFromLocal(
      `${DEMO_PREFIX}transactions_v2`,
      loadSnapshotFromLocal('transactions_v2', INITIAL_TRANSACTIONS)
    ),
    creditPayments: loadSnapshotFromLocal(
      `${DEMO_PREFIX}credit_payments_v2`,
      loadSnapshotFromLocal('credit_payments_v2', INITIAL_CREDIT_PAYMENTS)
    ),
    auditLogs: loadSnapshotFromLocal(
      `${DEMO_PREFIX}audit_v2`,
      loadSnapshotFromLocal('audit_v2', INITIAL_AUDIT_LOGS)
    ),
  };
}

export function persistEnvironmentSnapshot(
  mode: EnvironmentMode,
  snapshot: StoreStateSnapshot
): void {
  if (mode === 'LIVE') {
    saveSnapshotToIndexedDB(LIVE_STORE_KEY, snapshot);
    saveSnapshotToIndexedDB(`${LIVE_PREFIX}products_v2`, snapshot.products);
    saveSnapshotToIndexedDB(`${LIVE_PREFIX}customers_v2`, snapshot.customers);
    saveSnapshotToIndexedDB(`${LIVE_PREFIX}shifts_v2`, snapshot.shifts);
    saveSnapshotToIndexedDB(`${LIVE_PREFIX}transactions_v2`, snapshot.transactions);
    saveSnapshotToIndexedDB(`${LIVE_PREFIX}credit_payments_v2`, snapshot.creditPayments);
    saveSnapshotToIndexedDB(`${LIVE_PREFIX}audit_v2`, snapshot.auditLogs);

    if (isSupabaseConfigured() && SUPABASE_URL && SUPABASE_ANON_KEY) {
      // Non-blocking background sync to Supabase REST endpoint if configured
      fetch(`${SUPABASE_URL}/rest/v1/pos_store_snapshots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          store_id: snapshot.profile.id,
          store_name: snapshot.profile.storeName,
          owner_phone: snapshot.profile.ownerPhone,
          payload: snapshot,
          updated_at: new Date().toISOString(),
        }),
      }).catch(() => {
        // Offline-first fallback: IndexedDB snapshot is already safely committed
      });
    }
    return;
  }

  // DEMO Mode persistence
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}profile_v2`, snapshot.profile);
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}users_v2`, snapshot.users);
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}products_v2`, snapshot.products);
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}customers_v2`, snapshot.customers);
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}shifts_v2`, snapshot.shifts);
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}transactions_v2`, snapshot.transactions);
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}credit_payments_v2`, snapshot.creditPayments);
  saveSnapshotToIndexedDB(`${DEMO_PREFIX}audit_v2`, snapshot.auditLogs);
}

export function resetDemoEnvironment(): StoreStateSnapshot {
  const freshDemo = buildInitialDemoSnapshot();
  try {
    const keysToRemove = [
      'products_v2',
      'customers_v2',
      'shifts_v2',
      'transactions_v2',
      'credit_payments_v2',
      'audit_v2',
      `${DEMO_PREFIX}profile_v2`,
      `${DEMO_PREFIX}users_v2`,
      `${DEMO_PREFIX}products_v2`,
      `${DEMO_PREFIX}customers_v2`,
      `${DEMO_PREFIX}shifts_v2`,
      `${DEMO_PREFIX}transactions_v2`,
      `${DEMO_PREFIX}credit_payments_v2`,
      `${DEMO_PREFIX}audit_v2`,
    ];
    for (const k of keysToRemove) {
      localStorage.removeItem(`tingipos_${k}`);
    }
  } catch {
    // Ignore storage removal errors
  }
  persistEnvironmentSnapshot('DEMO', freshDemo);
  return freshDemo;
}

export function getExistingLiveStoreSnapshot(): StoreStateSnapshot | null {
  return loadSnapshotFromLocal<StoreStateSnapshot | null>(LIVE_STORE_KEY, null);
}

export function authenticateLiveStore(
  lookupInput: string,
  pinInput: string
):
  | { ok: true; snapshot: StoreStateSnapshot; matchedUser: UserProfile }
  | { ok: false; error: string } {
  const liveSnapshot = getExistingLiveStoreSnapshot();
  if (!liveSnapshot) {
    return {
      ok: false,
      error: 'No Live Store found on this device yet. Tap "+ Create New Store" to set up your store.',
    };
  }

  const trimmedLookup = lookupInput.trim().toLowerCase();
  const storedName = liveSnapshot.profile.storeName.trim().toLowerCase();
  const cleanInputPhone = normalizePhone(lookupInput);
  const cleanStoredPhone = normalizePhone(liveSnapshot.profile.ownerPhone);

  const nameMatches =
    !trimmedLookup ||
    storedName.includes(trimmedLookup) ||
    trimmedLookup.includes(storedName);

  const phoneMatches =
    cleanInputPhone.length >= 4 &&
    cleanStoredPhone.length >= 4 &&
    (cleanInputPhone === cleanStoredPhone ||
      cleanStoredPhone.endsWith(cleanInputPhone.slice(-9)));

  if (trimmedLookup && !nameMatches && !phoneMatches) {
    return {
      ok: false,
      error: `Store "${lookupInput.trim()}" not found. Registered store on this device: "${liveSnapshot.profile.storeName}".`,
    };
  }

  const matchedUser = liveSnapshot.users.find((u) => u.pin === pinInput.trim());
  if (!matchedUser) {
    return {
      ok: false,
      error: 'Incorrect 4-digit PIN. Please try again.',
    };
  }

  return {
    ok: true,
    snapshot: liveSnapshot,
    matchedUser,
  };
}

export async function provisionLiveStoreAccount(payload: LiveOnboardingPayload): Promise<{
  snapshot: StoreStateSnapshot;
  activeUser: UserProfile;
}> {
  const nowTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const nowDateStr = `Today, ${nowTime}`;

  const cleanStoreName = payload.storeName.trim() || "Aling Nena's Sari-Sari";
  const inferredOwnerName =
    payload.ownerName?.trim() ||
    (cleanStoreName.includes("'")
      ? cleanStoreName.split("'")[0].trim()
      : 'Store Owner');

  // Register in Supabase stores table & batch starter products tagged with store_id
  const regResult = await registerNewStore({
    storeName: cleanStoreName,
    ownerName: inferredOwnerName,
    ownerPhone: payload.ownerPhone?.trim(),
    barangayLocation: payload.barangayCity?.trim(),
    pin: payload.ownerPin.trim() || '9999',
    preloadStarterCatalog: Boolean(payload.preloadStarterCatalog),
    ownerId: payload.ownerId,
    ownerEmail: payload.ownerEmail,
  });

  const storeId = regResult.store.id;

  const storeProfile: StoreProfile = {
    id: storeId,
    storeName: cleanStoreName,
    barangayCity: payload.barangayCity?.trim() || 'Local Barangay Store',
    ownerPhone: payload.ownerPhone?.trim() || '',
    ownerName: inferredOwnerName,
    createdAt: nowDateStr,
    environment: 'LIVE',
    ownerId: payload.ownerId,
    ownerEmail: payload.ownerEmail,
  };

  const ownerUser: UserProfile = {
    id: `usr-${storeId}-owner`,
    name: storeProfile.ownerName,
    role: 'OWNER',
    pin: payload.ownerPin.trim() || '9999',
    badge: `${storeProfile.storeName} • Owner`,
  };

  const users: UserProfile[] = [ownerUser];
  const initialOperator: UserProfile = ownerUser;

  if (payload.createCashierProfile && payload.cashierName?.trim()) {
    const cashierPin =
      payload.cashierPin && /^\d{4}$/.test(payload.cashierPin.trim())
        ? payload.cashierPin.trim()
        : '1234';
    const cashierUser: UserProfile = {
      id: `usr-${storeId}-cashier-1`,
      name: payload.cashierName.trim(),
      role: 'CASHIER',
      pin: cashierPin,
      badge: 'Counter Cashier / Bantay',
    };
    users.unshift(cashierUser);
  }

  const seededProducts = payload.preloadStarterCatalog
    ? TOP_20_SARI_SARI_STARTER_ITEMS.map((item) => ({ ...item }))
    : [];

  const openingCash = Math.max(0, Number(payload.openingDrawerCash) || 1000);

  const shiftOne: ShiftRecord = {
    id: `shf-${storeId}-001`,
    cashierId: initialOperator.id,
    cashierName: initialOperator.name,
    pin: initialOperator.pin,
    startedAt: `${nowTime} Today (Shift #1)`,
    openingCash,
    cashSalesTotal: 0,
    pautangSalesTotal: 0,
    repaymentsCollectedTotal: 0,
    expectedDrawerCash: openingCash,
    status: 'ACTIVE',
    notes: `Shift #1 automatically initialized for ${storeProfile.storeName}`,
  };

  const initialAuditLogs: AuditLogEntry[] = [
    {
      id: `aud-${storeId}-init-1`,
      timestamp: nowDateStr,
      actorName: ownerUser.name,
      actorRole: 'OWNER',
      eventType: 'SHIFT_OPEN',
      severity: 'INFO',
      summary: `Initialized Shift #1 • ${storeProfile.storeName}`,
      detail: `Opening Cash Float: ${formatPesoExact(openingCash)}`,
    },
  ];

  if (payload.preloadStarterCatalog) {
    initialAuditLogs.unshift({
      id: `aud-${storeId}-init-2`,
      timestamp: nowDateStr,
      actorName: ownerUser.name,
      actorRole: 'OWNER',
      eventType: 'OCR_STOCK_IN',
      severity: 'INFO',
      summary: `Seeded 20 Popular Sari-Sari Starter Items`,
      detail: `Pre-loaded ${seededProducts.length} items with standard retail prices into ${storeProfile.storeName}`,
    });
  }

  const snapshot: StoreStateSnapshot = {
    profile: storeProfile,
    users,
    products: seededProducts,
    customers: [],
    shifts: [shiftOne],
    transactions: [],
    creditPayments: [],
    auditLogs: initialAuditLogs,
  };

  persistEnvironmentSnapshot('LIVE', snapshot);
  saveEnvironmentMode('LIVE');
  setActiveStoreSession(storeId, storeProfile.storeName, regResult.store);

  return {
    snapshot,
    activeUser: initialOperator,
  };
}
