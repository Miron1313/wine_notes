// IndexedDB 래퍼: 폰 안에 테이스팅 기록 저장
const DB_NAME = 'wine-log';
const STORE = 'tastings';
let dbPromise;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const db = {
  all: () => tx('readonly', (s) => s.getAll()).then((rows) =>
    (rows || []).sort((a, b) => (b.info?.date || '').localeCompare(a.info?.date || '') || b.createdAt - a.createdAt)),
  get: (id) => tx('readonly', (s) => s.get(id)),
  put: (row) => tx('readwrite', (s) => s.put(row)),
  remove: (id) => tx('readwrite', (s) => s.delete(id)),
  clear: () => tx('readwrite', (s) => s.clear()),
};

// 브라우저가 저장소를 임의로 비우지 않도록 요청
export async function requestPersist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* 지원하지 않는 브라우저는 무시 */ }
}

export function newId() {
  return (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}
