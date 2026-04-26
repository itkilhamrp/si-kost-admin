/**
 * core/cache.js — Simple in-memory + localStorage cache
 *
 * DESAIN (sederhana, zero-dependency, zero-bloat di halaman):
 *
 *   PENYIMPANAN:
 *     - In-memory Map  → akses instan, tidak ada parse overhead
 *     - localStorage   → warm cache, survive navigasi halaman di Tauri WebView
 *       (hanya data ringan: list rumah, unit, dll — gambar base64 TIDAK di-cache persist)
 *
 *   TTL:
 *     - FRESH  : 0–3 menit   → pakai cache langsung
 *     - STALE  : 3–10 menit  → pakai cache, fetch baru di background (tidak block UI)
 *     - EXPIRED: > 10 menit  → fetch ulang, tunggu hasilnya
 *
 *   INVALIDASI:
 *     - Setiap write op di api.js panggil Cache.bust(key) atau Cache.bustPrefix(prefix)
 *     - Halaman TIDAK perlu tahu cache sama sekali
 *
 *   BERSIH:
 *     - Cache.clear() → hapus semua (dipanggil dari settings & saat logout tidak perlu,
 *       karena auth di localStorage terpisah)
 */

const MEM   = new Map();          // in-memory store: key → { data, ts }
const LS_NS = "skc2_";           // prefix localStorage
const FRESH  = 3  * 60 * 1000;   // 3 menit
const STALE  = 10 * 60 * 1000;   // 10 menit

/* ── private ── */
function now() { return Date.now(); }

/** Cek apakah value aman disimpan ke localStorage (tidak ada gambar besar) */
function isSafeToStore(data) {
  if (!data) return true;
  try {
    const s = JSON.stringify(data);
    // Skip jika > 200KB atau ada field gambar base64
    if (s.length > 200_000) return false;
    if (s.includes('"gambar":"data:')) return false;
    return true;
  } catch { return false; }
}

function lsRead(key) {
  try {
    const raw = localStorage.getItem(LS_NS + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function lsWrite(key, entry) {
  try { localStorage.setItem(LS_NS + key, JSON.stringify(entry)); } catch {}
}

function lsDel(key) {
  try { localStorage.removeItem(LS_NS + key); } catch {}
}

function memSet(key, data) {
  const entry = { data, ts: now() };
  MEM.set(key, entry);
  if (isSafeToStore(data)) lsWrite(key, entry);
}

function memGet(key) {
  // Prioritas: in-memory dulu (lebih fresh), fallback ke localStorage
  if (MEM.has(key)) return MEM.get(key);
  const ls = lsRead(key);
  if (ls) { MEM.set(key, ls); return ls; }  // warm-up memory dari LS
  return null;
}

function memDel(key) {
  MEM.delete(key);
  lsDel(key);
}

/* ── public API ── */

/**
 * get(key, fetcher)
 * Ambil data — otomatis pakai cache jika segar, fetch di background jika stale.
 * Halaman cukup await get(key, () => invoke(...)) dan tidak perlu callback apapun.
 */
export async function get(key, fetcher) {
  const entry = memGet(key);
  if (entry) {
    const age = now() - entry.ts;
    if (age < FRESH)  return entry.data;                         // ✅ cache segar
    if (age < STALE) {
      // ⏳ stale: kembalikan sekarang, perbarui di background tanpa mengganggu UI
      fetcher().then(fresh => memSet(key, fresh)).catch(() => {});
      return entry.data;
    }
  }
  // ❌ tidak ada / expired → fetch + simpan
  const data = await fetcher();
  memSet(key, data);
  return data;
}

/**
 * bust(...keys) — hapus satu atau beberapa key
 * Dipanggil setelah write operation di api.js
 */
export function bust(...keys) {
  keys.forEach(k => memDel(k));
}

/**
 * bustPrefix(prefix) — hapus semua key yang mulai dengan prefix
 * Contoh: bustPrefix("kamar:") hapus semua kamar
 */
export function bustPrefix(prefix) {
  // Memory
  for (const k of MEM.keys()) {
    if (k.startsWith(prefix)) MEM.delete(k);
  }
  // localStorage
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LS_NS + prefix)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

/**
 * clear() — hapus semua cache (dari Settings atau saat perlu resync)
 * TIDAK menghapus auth key
 */
export function clear() {
  MEM.clear();
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LS_NS)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

/** Info jumlah dan ukuran cache (untuk Settings) */
export function info() {
  let count = MEM.size;
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LS_NS)) {
      bytes += (localStorage.getItem(k) ?? "").length * 2;
    }
  }
  // Sync count dengan LS juga
  let lsCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i)?.startsWith(LS_NS)) lsCount++;
  }
  return { count: Math.max(count, lsCount), bytes };
}