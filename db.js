// Kleine IndexedDB-Hülle. Alles bleibt lokal am Gerät.
const DB = (() => {
  const NAME = 'wiesenbuch';
  const VERSION = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('wiesen')) db.createObjectStore('wiesen', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  async function tx(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  return {
    all: (store) => tx(store, 'readonly', (s) => s.getAll()),
    get: (store, id) => tx(store, 'readonly', (s) => s.get(id)),
    put: (store, obj) => tx(store, 'readwrite', (s) => s.put(obj)),
    del: (store, id) => tx(store, 'readwrite', (s) => s.delete(id)),
    async getMeta(key, fallback) {
      const r = await tx('meta', 'readonly', (s) => s.get(key));
      return r ? r.value : fallback;
    },
    setMeta: (key, value) => tx('meta', 'readwrite', (s) => s.put({ key, value })),
  };
})();
