const DB_NAME = "hyper_kiosk_db";
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;


export interface CachedItem {
  _id: string; 
  name: string;
  description?: string;
  status: boolean;
  defaultAmount: number;
  filters: string[]; 
  category: string; 
  imageUrl?: string;
  tenantId: string; 
  createdAt?: string;
  updatedAt?: string;
}

// Inventory-level update pushed by admin via SSE.
// Stores the latest price/quantity for an item; consumed at checkout.
export interface ChangedItem {
  _id: string; // itemId — same key as CachedItem.id
  price?: number; // outlet-level price override (falls back to CachedItem.defaultAmount if absent)
  quantity?: number; // current stock quantity
  status?: boolean; // outlet-level enable/disable for this item
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export default function initKioskDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log("Upgrading kioskDB...");

      // Items cache: cached menu items for offline access
      if (!db.objectStoreNames.contains("items_cache")) {
        const itemCacheStore = db.createObjectStore("items_cache", {
          keyPath: "_id", // shared key with appDB — no autoIncrement
        });
        itemCacheStore.createIndex("category", "category", { unique: false });
        itemCacheStore.createIndex("status", "status", { unique: false });
        itemCacheStore.createIndex("tenantId", "tenantId", { unique: false });
      }

      // Changed items: admin-pushed price/quantity updates, consumed at checkout
      if (!db.objectStoreNames.contains("changed_items")) {
        db.createObjectStore("changed_items", {
          keyPath: "_id", // shared key with appDB — no autoIncrement
        });
      }

      console.log("kioskDB schema ready");
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      dbInstance.onversionchange = () => {
        console.warn("kioskDB version change detected. Closing DB.");
        dbInstance?.close();
        dbInstance = null;
      };

      console.log("kioskDB connected");
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.error("Failed to open kioskDB");
      reject(request.error);
    };
  });
}

// ─── Instance ─────────────────────────────────────────────────────────────────

export function getKioskDB(): IDBDatabase {
  if (!dbInstance) {
    throw new Error("kioskDB not initialized. Call initKioskDB() first.");
  }
  return dbInstance;
}

// ─── items_cache ──────────────────────────────────────────────────────────────

export async function getAllItemsFromCache(): Promise<CachedItem[]> {
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction("items_cache", "readonly").objectStore("items_cache");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as CachedItem[]);
    request.onerror = () => reject(request.error);
  });
}

export async function getItemByIdFromCache(id: string): Promise<CachedItem | undefined> {
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction("items_cache", "readonly").objectStore("items_cache");
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as CachedItem | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function addItemsToCache(items: CachedItem[]): Promise<void> {
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("items_cache", "readwrite");
    const store = transaction.objectStore("items_cache");
    items.forEach((item) => store.put(item));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearItemsCache(): Promise<void> {
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("items_cache", "readwrite");
    transaction.objectStore("items_cache").clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Merge a list of ChangedItem updates back into items_cache.
// For each change, fetches the existing record and overwrites only the fields
// present in the change (price → defaultAmount, status).
// The transaction stays open across the nested get→put calls because IDB
// keeps it alive while there are pending requests.
export async function patchItemsInCache(changes: ChangedItem[]): Promise<void> {
  if (changes.length === 0) return;
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("items_cache", "readwrite");
    const store = transaction.objectStore("items_cache");

    changes.forEach((change) => {
      const getReq = store.get(change._id);
      getReq.onsuccess = () => {
        const existing = getReq.result as CachedItem | undefined;
        if (!existing) return;
        if (change.price !== undefined) existing.defaultAmount = change.price;
        if (change.status !== undefined) existing.status = change.status;
        store.put(existing);
      };
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ─── changed_items ────────────────────────────────────────────────────────────

export async function getChangedItems(): Promise<ChangedItem[]> {
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction("changed_items", "readonly").objectStore("changed_items");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as ChangedItem[]);
    request.onerror = () => reject(request.error);
  });
}

export async function upsertChangedItem(item: ChangedItem): Promise<void> {
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("changed_items", "readwrite");
    transaction.objectStore("changed_items").put(item);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearChangedItems(): Promise<void> {
  const db = getKioskDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("changed_items", "readwrite");
    transaction.objectStore("changed_items").clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
