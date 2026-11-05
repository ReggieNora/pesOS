// Haptic & Audio tactile feedback engine + Local-First IndexedDB / LocalStorage store

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function triggerHapticFeedback(type: 'tap' | 'success' | 'warning' = 'tap') {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'tap') navigator.vibrate(12);
      else if (type === 'success') navigator.vibrate([20, 40, 35]);
      else if (type === 'warning') navigator.vibrate([45, 30, 45]);
    }
  } catch {
    // Ignore vibration errors on desktop browsers
  }

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.07); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.14); // D6
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.29);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.setValueAtTime(210, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
    }
  } catch {
    // AudioContext blocked or unsupported
  }
}

const DB_NAME = 'TingiPOS_WatermelonStore';
const STORE_NAME = 'pos_snapshots';

let dbPromise: Promise<IDBDatabase> | null = null;
const pendingWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getDbConnection(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

// Modern Web Guidance (performance - INP): Separate UI updates from heavy storage serialization
export function saveSnapshotToIndexedDB(key: string, payload: unknown): void {
  const existingTimer = pendingWriteTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    pendingWriteTimers.delete(key);

    // Yield to main thread if scheduler.yield is supported so input events never wait on serialization
    const globalScheduler = (
      globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }
    ).scheduler;
    if (globalScheduler && typeof globalScheduler.yield === 'function') {
      await globalScheduler.yield();
    }

    try {
      localStorage.setItem(`tingipos_${key}`, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }

    try {
      const connPromise = getDbConnection();
      if (!connPromise) return;
      const db = await connPromise;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload, key);
    } catch {
      // Ignore IndexedDB errors in restricted contexts
    }
  }, 180);

  pendingWriteTimers.set(key, timer);
}

export function loadSnapshotFromLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`tingipos_${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPesoExact(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
