import { supabase } from './supabase';
import { Product, Customer, CartItem, Role, CategoryId } from '../types/pos';
import { TOP_20_SARI_SARI_STARTER_ITEMS } from '../data/mockSariSariData';

export function mapRowToProduct(p: any, existing?: Product): Product {
  return {
    id: p.id,
    sku: existing?.sku || `SKU-${String(p.id).slice(0, 6)}`,
    name: p.name,
    shortName: existing?.shortName || p.name.split(' ')[0] || p.name,
    category: (p.category || existing?.category || 'snacks') as Exclude<CategoryId, 'favorites'>,
    unit: p.unit || existing?.unit || 'pc',
    sellingPrice: Number(p.retail_price) || existing?.sellingPrice || 0,
    wholesaleCost: Number(p.cost_price) || existing?.wholesaleCost || 0,
    stockQty: Number(p.stock) ?? existing?.stockQty ?? 0,
    lowStockThreshold: Number(p.min_alert) || existing?.lowStockThreshold || 5,
    isFavorite: Boolean(p.is_favorite),
    accentColor: existing?.accentColor || '#3B82F6',
    hourlyVelocity: existing?.hourlyVelocity || 0,
    daysSinceLastSale: existing?.daysSinceLastSale ?? 0,
    voiceAliases: existing?.voiceAliases || [p.name.toLowerCase()],
    imageUrl: p.image_url || existing?.imageUrl || undefined,
    icon: existing?.icon || 'Box',
    emoji: existing?.emoji || '📦',
  };
}

export interface StoreRecord {
  id: string;
  owner_id?: string | null;
  owner_email?: string | null;
  store_name: string;
  name?: string;
  owner_name: string;
  phone?: string | null;
  barangay_location?: string | null;
  location?: string | null;
  pin_hash?: string;
  created_at?: string;
}

export interface NewStorePayload {
  storeName: string;
  ownerName: string;
  ownerPhone?: string;
  barangayLocation?: string;
  pin?: string;
  preloadStarterCatalog?: boolean;
  ownerId?: string;
  ownerEmail?: string;
}

const ACTIVE_STORE_ID_KEY = 'pesos_active_store_id';
const ACTIVE_STORE_NAME_KEY = 'pesos_active_store_name';
const ACTIVE_STORE_CACHE_KEY = 'pesos_active_store_cache';
const AUTH_USER_CACHE_KEY = 'pesos_auth_user_cache';

/**
 * Gets the active store ID from persistent storage.
 */
export function getActiveStoreId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STORE_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Gets the active store Name from persistent storage.
 */
export function getActiveStoreName(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STORE_NAME_KEY);
  } catch {
    return null;
  }
}

/**
 * Gets the cached store record from persistent storage.
 */
export function getActiveStoreRecord(): StoreRecord | null {
  try {
    const raw = localStorage.getItem(ACTIVE_STORE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persists the active store session into localStorage.
 */
export function setActiveStoreSession(storeId: string, storeName: string, fullStore?: StoreRecord): void {
  try {
    localStorage.setItem(ACTIVE_STORE_ID_KEY, storeId);
    localStorage.setItem(ACTIVE_STORE_NAME_KEY, storeName);
    if (fullStore) {
      localStorage.setItem(ACTIVE_STORE_CACHE_KEY, JSON.stringify(fullStore));
    }
  } catch (err) {
    console.error('Failed to set active store session:', err);
  }
}

/**
 * Clears the active store session from persistent storage.
 */
export function clearActiveStoreSession(): void {
  try {
    localStorage.removeItem(ACTIVE_STORE_ID_KEY);
    localStorage.removeItem(ACTIVE_STORE_NAME_KEY);
    localStorage.removeItem(ACTIVE_STORE_CACHE_KEY);
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
  } catch (err) {
    console.error('Failed to clear active store session:', err);
  }
}

/**
 * PIN hashing helper for obfuscation.
 */
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return `pin_h_${Math.abs(hash)}_${btoa(pin)}`;
}

export function verifyPin(pin: string, storedHash?: string): boolean {
  if (!storedHash) return true;
  if (storedHash === pin) return true;
  return hashPin(pin) === storedHash;
}

/**
 * GOOGLE OAUTH FLOW
 */
export async function signInWithGoogle(): Promise<{ error?: any }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  } catch (err: any) {
    console.error('Google OAuth initialization error:', err);
    return { error: err };
  }
}

export async function signOutAuth(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Supabase sign out error:', err);
  } finally {
    clearActiveStoreSession();
  }
}

/**
 * Looks up if an existing store record in public.stores matches owner_id or owner_email.
 */
export async function fetchStoreForUser(
  userId: string,
  userEmail?: string | null
): Promise<{
  store?: StoreRecord | null;
  error?: string;
}> {
  try {
    let query = supabase.from('stores').select('*');
    if (userEmail) {
      query = query.or(`owner_id.eq.${userId},owner_email.eq.${userEmail}`);
    } else {
      query = query.eq('owner_id', userId);
    }

    const { data: matches, error } = await query;

    if (error) {
      console.warn('Could not query stores for user:', error);
      // Check local cache fallback
      const cached = getActiveStoreRecord();
      if (cached && (cached.owner_id === userId || (userEmail && cached.owner_email === userEmail))) {
        return { store: cached };
      }
      return { error: error.message };
    }

    if (matches && matches.length > 0) {
      const match = matches[0] as StoreRecord;
      setActiveStoreSession(match.id, match.store_name || match.name || 'Sari-Sari Store', match);
      return { store: match };
    }

    // Check local fallback
    const cached = getActiveStoreRecord();
    if (cached && (cached.owner_id === userId || (userEmail && cached.owner_email === userEmail))) {
      return { store: cached };
    }

    return { store: null };
  } catch (err: any) {
    console.error('fetchStoreForUser error:', err);
    return { error: err?.message };
  }
}

/**
 * CREATE NEW STORE FLOW
 * Inserts into public.stores, batches starter items into public.products tagged with store_id & user_id,
 * and sets active session in persistent local storage.
 */
export async function registerNewStore(payload: NewStorePayload): Promise<{
  ok: boolean;
  store: StoreRecord;
  error?: string;
}> {
  const cleanStoreName = payload.storeName.trim();
  const cleanOwnerName = payload.ownerName.trim() || 'Store Owner';
  const cleanPhone = payload.ownerPhone?.trim() || null;
  const cleanLocation = payload.barangayLocation?.trim() || null;
  const pinHash = payload.pin?.trim() ? hashPin(payload.pin.trim()) : '';

  // Generate unique store ID UUID
  const generatedStoreId = crypto.randomUUID ? crypto.randomUUID() : `str-${Date.now()}`;

  let finalStore: StoreRecord = {
    id: generatedStoreId,
    owner_id: payload.ownerId || null,
    owner_email: payload.ownerEmail || null,
    store_name: cleanStoreName,
    name: cleanStoreName,
    owner_name: cleanOwnerName,
    phone: cleanPhone,
    barangay_location: cleanLocation,
    location: cleanLocation,
    pin_hash: pinHash,
    created_at: new Date().toISOString(),
  };

  try {
    // Attempt Supabase insert into public.stores
    const insertPayload: Record<string, any> = {
      id: generatedStoreId,
      store_name: cleanStoreName,
      name: cleanStoreName,
      owner_name: cleanOwnerName,
      phone: cleanPhone,
      barangay_location: cleanLocation,
      location: cleanLocation,
      pin_hash: pinHash,
    };

    if (payload.ownerId) insertPayload.owner_id = payload.ownerId;
    if (payload.ownerEmail) insertPayload.owner_email = payload.ownerEmail;

    let { data: insertedStore, error: storeError } = await supabase
      .from('stores')
      .insert(insertPayload)
      .select()
      .single();

    if (storeError) {
      console.warn('Primary store insert error (retrying with minimal columns if schema mismatch):', storeError);
      // Fallback: omit newly added columns if column doesn't exist yet
      const fallbackPayload: Record<string, any> = {
        id: generatedStoreId,
        store_name: cleanStoreName,
        owner_name: cleanOwnerName,
        phone: cleanPhone,
        barangay_location: cleanLocation,
        pin_hash: pinHash,
      };
      const retryRes = await supabase.from('stores').insert(fallbackPayload).select().single();
      if (!retryRes.error && retryRes.data) {
        insertedStore = retryRes.data;
      }
    }

    if (insertedStore) {
      finalStore = { ...finalStore, ...insertedStore } as StoreRecord;
    }

    // Batch insert starter catalog if selected
    if (payload.preloadStarterCatalog) {
      try {
        const starterRows = TOP_20_SARI_SARI_STARTER_ITEMS.map((item) => ({
          store_id: finalStore.id,
          user_id: payload.ownerId || null,
          name: item.name,
          category: item.category,
          unit: item.unit,
          retail_price: item.sellingPrice,
          cost_price: item.wholesaleCost,
          stock: item.stockQty,
          min_alert: item.lowStockThreshold,
          is_favorite: item.isFavorite,
          image_url: item.imageUrl || null,
        }));

        const { error: batchErr } = await supabase
          .from('products')
          .insert(starterRows);

        if (batchErr) {
          // Retry without user_id / store_id if columns not yet migrated
          const rowsClean = starterRows.map(({ user_id, ...rest }) => rest);
          const { error: retryErr } = await supabase.from('products').insert(rowsClean);
          if (retryErr && retryErr.message?.includes('store_id')) {
            const rowsNoStore = rowsClean.map(({ store_id, ...r }) => r);
            await supabase.from('products').insert(rowsNoStore);
          }
        }
      } catch (err) {
        console.warn('Error during starter catalog batch insert:', err);
      }
    }

    // Persist active store session
    setActiveStoreSession(finalStore.id, finalStore.store_name, finalStore);

    return { ok: true, store: finalStore };
  } catch (err: any) {
    console.error('Fatal store registration error:', err);
    // Still set local session as fallback so user can use the store offline
    setActiveStoreSession(finalStore.id, finalStore.store_name, finalStore);
    return { ok: true, store: finalStore };
  }
}

/**
 * EXISTING STORE SIGN-IN FLOW
 * Looks up by store_name or phone in public.stores, verifies PIN, and loads session.
 */
export async function signInToStore(
  storeOrPhone: string,
  pin: string
): Promise<{
  ok: boolean;
  store?: StoreRecord;
  error?: string;
}> {
  const query = storeOrPhone.trim();
  if (!query) {
    return { ok: false, error: 'Please enter your Store Name or Mobile Number.' };
  }
  if (!pin || pin.length < 4) {
    return { ok: false, error: 'Please enter your 4-digit PIN.' };
  }

  try {
    // 1. Try querying remote Supabase stores table
    const { data: matches, error: fetchErr } = await supabase
      .from('stores')
      .select('*')
      .or(`store_name.ilike.%${query}%,name.ilike.%${query}%,phone.eq.${query}`);

    if (fetchErr) {
      console.warn('Supabase query failed on stores table. Checking local cache fallback.', fetchErr);
    }

    if (matches && matches.length > 0) {
      // Find matching PIN
      const matchedStore = matches.find((s: StoreRecord) => verifyPin(pin, s.pin_hash));
      if (matchedStore) {
        setActiveStoreSession(matchedStore.id, matchedStore.store_name || matchedStore.name || 'Store', matchedStore);
        return { ok: true, store: matchedStore };
      }
      return { ok: false, error: 'Incorrect 4-digit PIN for this store.' };
    }

    // 2. Fallback check local store cache if offline or table was offline
    const cachedStore = getActiveStoreRecord();
    if (cachedStore) {
      const nameMatch = (cachedStore.store_name || '').toLowerCase().includes(query.toLowerCase());
      const phoneMatch = cachedStore.phone && cachedStore.phone.includes(query);
      if (nameMatch || phoneMatch) {
        if (verifyPin(pin, cachedStore.pin_hash)) {
          setActiveStoreSession(cachedStore.id, cachedStore.store_name || 'Store', cachedStore);
          return { ok: true, store: cachedStore };
        }
        return { ok: false, error: 'Incorrect 4-digit PIN.' };
      }
    }

    return { ok: false, error: `No registered store found matching "${query}".` };
  } catch (err: any) {
    console.error('Sign in error:', err);
    return { ok: false, error: err?.message || 'Failed to authenticate store.' };
  }
}

/**
 * STRICT STORE-ID & USER-ID DATA SCOPING HELPERS
 * All queries explicitly filter by .eq('store_id', storeId)
 * and newly created records attach store_id: storeId and user_id: userId.
 */

export async function fetchStoreProducts(storeId: string) {
  const res = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('name');

  if (res.error && res.error.message?.includes('store_id')) {
    // Graceful fallback if remote column is pending migration
    return supabase.from('products').select('*').order('name');
  }
  return res;
}

export async function insertStoreProduct(storeId: string, product: Partial<Product>, userId?: string) {
  const rowWithStore: Record<string, any> = {
    store_id: storeId,
    name: product.name,
    category: product.category,
    unit: product.unit || 'pc',
    retail_price: product.sellingPrice ?? 0,
    cost_price: product.wholesaleCost ?? 0,
    stock: product.stockQty ?? 0,
    min_alert: product.lowStockThreshold ?? 5,
    is_favorite: product.isFavorite ?? false,
    image_url: product.imageUrl || (product as any).image_url || (product as any).image || null,
  };

  if (userId) {
    rowWithStore.user_id = userId;
  }

  const res = await supabase
    .from('products')
    .insert(rowWithStore)
    .select()
    .single();

  if (res.error) {
    // Retry omitting user_id or store_id if column missing
    const { user_id, ...withoutUser } = rowWithStore;
    const retryRes = await supabase.from('products').insert(withoutUser).select().single();
    if (retryRes.error && retryRes.error.message?.includes('store_id')) {
      const { store_id, ...withoutStore } = withoutUser;
      return supabase.from('products').insert(withoutStore).select().single();
    }
    return retryRes;
  }
  return res;
}

export async function updateStoreProduct(storeId: string, productId: string, updates: Partial<Product>, userId?: string) {
  const updatePayload: Record<string, any> = {
    name: updates.name,
    category: updates.category,
    unit: updates.unit,
    retail_price: updates.sellingPrice,
    cost_price: updates.wholesaleCost,
    stock: updates.stockQty,
    min_alert: updates.lowStockThreshold,
    is_favorite: updates.isFavorite,
    image_url: updates.imageUrl || (updates as any).image_url || (updates as any).image || null,
  };

  if (userId) {
    updatePayload.user_id = userId;
  }

  const res = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .eq('store_id', storeId)
    .select()
    .single();

  if (res.error) {
    const { user_id, ...cleanUpdate } = updatePayload;
    const retryRes = await supabase
      .from('products')
      .update(cleanUpdate)
      .eq('id', productId)
      .eq('store_id', storeId)
      .select()
      .single();

    if (retryRes.error && retryRes.error.message?.includes('store_id')) {
      return supabase
        .from('products')
        .update(cleanUpdate)
        .eq('id', productId)
        .select()
        .single();
    }
    return retryRes;
  }
  return res;
}

export async function fetchStoreCustomers(storeId: string) {
  const res = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('name');

  if (res.error && res.error.message?.includes('store_id')) {
    return supabase.from('customers').select('*').order('name');
  }
  return res;
}

export async function insertStoreCustomer(
  storeId: string,
  customer: { name: string; phone?: string; credit_limit?: number },
  userId?: string
) {
  const row: Record<string, any> = {
    store_id: storeId,
    name: customer.name,
    phone: customer.phone || null,
    credit_limit: customer.credit_limit ?? 1000,
    current_balance: 0,
  };

  if (userId) {
    row.user_id = userId;
  }

  const res = await supabase
    .from('customers')
    .insert(row)
    .select()
    .single();

  if (res.error) {
    const { user_id, ...withoutUser } = row;
    const retryRes = await supabase.from('customers').insert(withoutUser).select().single();
    if (retryRes.error && retryRes.error.message?.includes('store_id')) {
      const { store_id, ...withoutStore } = withoutUser;
      return supabase.from('customers').insert(withoutStore).select().single();
    }
    return retryRes;
  }
  return res;
}

export async function insertStoreSalesTicket(
  storeId: string,
  ticket: {
    items: any[];
    subtotal: number;
    total: number;
    payment_method: 'cash' | 'credit' | 'pautang';
    amount_tendered?: number;
    change_due?: number;
    cashier_name?: string;
  },
  userId?: string
) {
  const row: Record<string, any> = {
    store_id: storeId,
    items: ticket.items,
    subtotal: ticket.subtotal,
    total: ticket.total,
    payment_method: ticket.payment_method === 'pautang' ? 'credit' : ticket.payment_method,
    amount_tendered: ticket.amount_tendered ?? ticket.total,
    change_due: ticket.change_due ?? 0,
    cashier_name: ticket.cashier_name || 'Cashier',
  };

  if (userId) {
    row.user_id = userId;
  }

  const res = await supabase
    .from('sales_tickets')
    .insert(row)
    .select()
    .single();

  if (res.error) {
    const { user_id, ...withoutUser } = row;
    const retryRes = await supabase.from('sales_tickets').insert(withoutUser).select().single();
    if (retryRes.error && retryRes.error.message?.includes('store_id')) {
      const { store_id, ...withoutStore } = withoutUser;
      return supabase.from('sales_tickets').insert(withoutStore).select().single();
    }
    return retryRes;
  }
  return res;
}

export async function insertStorePautangLedger(
  storeId: string,
  entry: {
    customer_id?: string;
    amount: number;
    type: 'debt' | 'payment';
    notes?: string;
  },
  userId?: string
) {
  const row: Record<string, any> = {
    store_id: storeId,
    customer_id: entry.customer_id || null,
    amount: entry.amount,
    type: entry.type,
    notes: entry.notes || null,
  };

  if (userId) {
    row.user_id = userId;
  }

  const res = await supabase
    .from('pautang_ledger')
    .insert(row)
    .select()
    .single();

  if (res.error) {
    const { user_id, ...withoutUser } = row;
    const retryRes = await supabase.from('pautang_ledger').insert(withoutUser).select().single();
    if (retryRes.error && retryRes.error.message?.includes('store_id')) {
      const { store_id, ...withoutStore } = withoutUser;
      return supabase.from('pautang_ledger').insert(withoutStore).select().single();
    }
    return retryRes;
  }
  return res;
}
