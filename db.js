// MT Servis - IndexedDB veri katmanı
// Tek 'jobs' store. Fotoğraflar dataURL olarak job içinde tutulur.
window.DB = (() => {
  const DB_NAME = "mtservis";
  const STORE = "jobs";
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: "id" });
          s.createIndex("createdAt", "createdAt");
          s.createIndex("status", "status");
        }
      };
      req.onsuccess = () => {
        _db = req.result;
        resolve(_db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(mode) {
    return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  async function put(job) {
    const store = await tx("readwrite");
    return new Promise((resolve, reject) => {
      const r = store.put(job);
      r.onsuccess = () => resolve(job);
      r.onerror = () => reject(r.error);
    });
  }

  async function get(id) {
    const store = await tx("readonly");
    return new Promise((resolve, reject) => {
      const r = store.get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function all() {
    const store = await tx("readonly");
    return new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => {
        const list = r.result || [];
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(list);
      };
      r.onerror = () => reject(r.error);
    });
  }

  async function remove(id) {
    const store = await tx("readwrite");
    return new Promise((resolve, reject) => {
      const r = store.delete(id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  return { put, get, all, remove };
})();
