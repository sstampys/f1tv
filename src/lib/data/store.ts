import { CACHE_PREFIX, CACHE_VERSION } from "./config";

/**
 * Persistent cache storage.
 *
 * localStorage is used rather than IndexedDB on purpose: the payloads are small
 * (a few KB each) and localStorage can be read synchronously, which is what
 * lets a warm visit render cached data in the first render pass instead of
 * showing a loading state. Everything is wrapped so a browser that blocks or
 * fills storage degrades to an in-memory map instead of throwing.
 */

export type Entry<T> = { t: number; d: T };

const storageKey = (key: string) => `${CACHE_PREFIX}:${CACHE_VERSION}:${key}`;
const memory = new Map<string, string>();

function backend(): Storage | null {
  try {
    const s = window.localStorage;
    // Touch it: some browsers throw only on access.
    s.getItem("__f1box_probe__");
    return s;
  } catch {
    return null;
  }
}

const store = backend();

/** Drop entries written by an older schema version. */
function migrate() {
  const versionKey = `${CACHE_PREFIX}:version`;
  try {
    const seen = store?.getItem(versionKey);
    if (seen !== String(CACHE_VERSION)) {
      const prefix = `${CACHE_PREFIX}:`;
      const doomed: string[] = [];
      if (store) {
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k && k.startsWith(prefix)) doomed.push(k);
        }
        doomed.forEach((k) => store.removeItem(k));
        store.setItem(versionKey, String(CACHE_VERSION));
      }
    }
  } catch {
    // ignore
  }
}
migrate();

function rawGet(key: string): string | null {
  try {
    return store ? store.getItem(storageKey(key)) : (memory.get(storageKey(key)) ?? null);
  } catch {
    return memory.get(storageKey(key)) ?? null;
  }
}

function rawSet(key: string, value: string) {
  memory.set(storageKey(key), value);
  try {
    store?.setItem(storageKey(key), value);
  } catch {
    // QuotaExceededError or storage disabled: memory copy already holds it.
  }
}

/** Read a cached entry. Corrupt or unreadable entries are ignored (null). */
export function readEntry<T>(key: string): Entry<T> | null {
  const raw = rawGet(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.t !== "number" || !("d" in parsed)) return null;
    return parsed;
  } catch {
    try {
      store?.removeItem(storageKey(key));
    } catch {
      // ignore
    }
    return null;
  }
}

export function writeEntry<T>(key: string, data: T): Entry<T> {
  const entry: Entry<T> = { t: Date.now(), d: data };
  rawSet(key, JSON.stringify(entry));
  return entry;
}

export function removeEntry(key: string) {
  memory.delete(storageKey(key));
  try {
    store?.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}
