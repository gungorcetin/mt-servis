// MT Servis - Bulut senkron katmanı (Supabase)
// Offline-first: her kayıt önce IndexedDB'ye yazılır, sonra buluta gönderilir.
// Bulut kapalıysa (config boşsa) tüm fonksiyonlar sessizce no-op olur.
window.Sync = (() => {
  const cfg = window.MT_CONFIG || {};
  const enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  let client = null;
  let ready = null;

  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function init() {
    if (!enabled) return null;
    if (client) return client;
    if (!ready) {
      ready = (async () => {
        if (!window.supabase) await loadScript(CDN);
        client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        return client;
      })();
    }
    return ready;
  }

  // Bir işi buluta gönder (upsert)
  async function push(job) {
    if (!enabled) return { ok: false, offline: true };
    try {
      const c = await init();
      const { error } = await c.from("jobs").upsert({
        id: job.id,
        data: job,
        updated_at: new Date(job.updatedAt || Date.now()).toISOString(),
      });
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.warn("Sync.push başarısız:", e.message || e);
      return { ok: false, error: e };
    }
  }

  async function remove(id) {
    if (!enabled) return { ok: false, offline: true };
    try {
      const c = await init();
      const { error } = await c.from("jobs").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.warn("Sync.remove başarısız:", e.message || e);
      return { ok: false, error: e };
    }
  }

  // Buluttan tüm kayıtları çek ve yerel DB ile birleştir (yeni olan kazanır)
  async function pull() {
    if (!enabled) return { ok: false, offline: true, merged: 0 };
    try {
      const c = await init();
      const { data, error } = await c.from("jobs").select("id,data,updated_at");
      if (error) throw error;

      const local = await DB.all();
      const localMap = new Map(local.map((j) => [j.id, j]));
      let merged = 0;

      // Bulut -> yerel (bulut daha yeniyse yerele yaz)
      for (const row of data || []) {
        const remote = row.data;
        const l = localMap.get(row.id);
        if (!l || (remote.updatedAt || 0) > (l.updatedAt || 0)) {
          await DB.put(remote);
          merged++;
        }
      }

      // Yerel -> bulut (yerelde olup bulutta olmayan / daha yeni olanları gönder)
      const remoteMap = new Map((data || []).map((r) => [r.id, r.data]));
      for (const j of local) {
        const r = remoteMap.get(j.id);
        if (!r || (j.updatedAt || 0) > (r.updatedAt || 0)) {
          await push(j);
        }
      }

      return { ok: true, merged };
    } catch (e) {
      console.warn("Sync.pull başarısız:", e.message || e);
      return { ok: false, error: e, merged: 0 };
    }
  }

  // --- Kimlik doğrulama (atölye ortak girişi) ---
  async function getSession() {
    if (!enabled) return null;
    const c = await init();
    const { data } = await c.auth.getSession();
    return data.session;
  }
  async function signIn(email, password) {
    const c = await init();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error };
    return { ok: true, session: data.session };
  }
  async function signOut() {
    const c = await init();
    await c.auth.signOut();
  }

  return { enabled, push, remove, pull, init, getSession, signIn, signOut };
})();
