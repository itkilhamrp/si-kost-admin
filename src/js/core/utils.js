/**
 * core/utils.js
 */

export function getParams() {
  return new URLSearchParams(window.location.search);
}

export function formatRupiah(angka) {
  return "Rp\u00a0" + Number(angka).toLocaleString("id-ID");
}

export function formatTanggal(str) {
  if (!str) return "—";
  // Parse manual agar tidak terpengaruh timezone
  const [y, m, d] = str.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * Tanggal hari ini sesuai LOCAL timezone perangkat.
 * JANGAN pakai toISOString() — itu UTC dan salah saat UTC+7 jam 00:00–06:59.
 */
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildUrl(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return qs ? `${path}?${qs}` : path;
}