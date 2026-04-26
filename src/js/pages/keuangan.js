/**
 * pages/keuangan.js — Ringkasan keuangan per rumah kos
 */
import { getRingkasanKeuangan, getSemualRumah } from "../core/api.js";
import { requireAuth }    from "../core/auth.js";
import { Theme }          from "../core/theme.js";
import { buildUrl, formatRupiah } from "../core/utils.js";
import { startLiveClock } from "../ui/clock.js";

export async function initKeuangan() {
  if (!requireAuth()) return;
  Theme.init();
  startLiveClock("live-time");
  await render();
}

async function render() {
  const el = document.getElementById("keu-content");
  if (!el) return;
  try {
    const [ringkasan, rumahList] = await Promise.all([
      getRingkasanKeuangan(null),
      getSemualRumah(),
    ]);

    const tileHtml = (r) => `
      <div class="keu-tile green"><p class="kt-label">💰 Total</p><p class="kt-val">${formatRupiah(r.total_pendapatan)}</p></div>
      <div class="keu-tile green"><p class="kt-label">📅 Bulan Ini</p><p class="kt-val">${formatRupiah(r.bulan_ini)}</p></div>
      <div class="keu-tile"><p class="kt-label">✅ Terisi</p><p class="kt-val">${r.kamar_terisi} kamar</p></div>
      <div class="keu-tile"><p class="kt-label">🕳️ Kosong</p><p class="kt-val">${r.kamar_kosong} kamar</p></div>`;

    let perRumahHtml = `<p class="empty-state">Belum ada rumah kos.</p>`;
    if (rumahList.length) {
      const rows = await Promise.all(rumahList.map(async r => {
        const rk  = await getRingkasanKeuangan(r.id_rumah);
        const url = buildUrl("/page/detail_kost.html", { id: r.id_rumah, nama: r.nama_rumah });
        // Simpan url di data-url, hapus onclick inline
        return `
          <div class="info-card" style="cursor:pointer;margin-bottom:var(--sp-2)" data-url="${url}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2)">
              <p style="font-weight:600;font-size:0.9rem;margin:0">${r.nama_rumah}</p>
              <span style="font-size:0.75rem;color:var(--text-3)">Detail →</span>
            </div>
            <div class="keu-tiles" style="margin-bottom:0">${tileHtml(rk)}</div>
          </div>`;
      }));
      perRumahHtml = rows.join("");
    }

    el.innerHTML = `
      <div class="keu-tiles">${tileHtml(ringkasan)}</div>
      <p class="section-title">Per Rumah Kos</p>
      ${perRumahHtml}`;

    // Event delegation untuk info-card per rumah
    el.addEventListener("click", (e) => {
      const card = e.target.closest(".info-card[data-url]");
      if (!card) return;
      location.href = card.dataset.url;
    });

  } catch (err) {
    console.error(err);
    el.innerHTML = `<p class="empty-state">Gagal memuat data keuangan.<br><small style="font-size:0.75rem">${err}</small></p>`;
  }
}