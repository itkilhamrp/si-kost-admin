/**
 * pages/unit.js — Kelola unit fasilitas kamar
 */
import { getSemualUnit, tambahUnit, hapusUnit } from "../core/api.js";
import { requireAuth }    from "../core/auth.js";
import { Theme }          from "../core/theme.js";
import { showToast }      from "../ui/toast.js";
import { startLiveClock } from "../ui/clock.js";

export async function initUnit() {
  if (!requireAuth()) return;
  Theme.init();
  startLiveClock("live-time");
  await loadUnit();

  document.getElementById("btn-tambah-unit").addEventListener("click", doTambah);
  document.getElementById("inp-unit-nama").addEventListener("keydown", e => {
    if (e.key === "Enter") doTambah();
  });

  // Event delegation untuk tombol hapus — menggantikan onclick inline & window._delUnit
  document.getElementById("daftar-unit")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".unit-hapus-btn[data-id]");
    if (!btn) return;
    const id   = parseInt(btn.dataset.id);
    const nama = btn.dataset.nama;
    if (!confirm(`Hapus unit "${nama}"?\nUnit ini akan otomatis dilepas dari semua kamar.`)) return;
    try {
      await hapusUnit(id);
      showToast(`"${nama}" dihapus.`);
      await loadUnit();
    } catch (err) { showToast("Gagal: " + err, "error"); }
  });
}

async function doTambah() {
  const nama = document.getElementById("inp-unit-nama").value.trim();
  const ikon = document.getElementById("inp-unit-ikon").value.trim() || "🏷️";
  if (!nama) { showToast("Nama unit wajib diisi.", "error"); return; }
  try {
    await tambahUnit(nama, ikon);
    document.getElementById("inp-unit-nama").value = "";
    document.getElementById("inp-unit-ikon").value = "";
    showToast(`Unit "${nama}" ditambahkan! ✅`);
    await loadUnit();
  } catch (err) { showToast("Gagal: " + err, "error"); }
}

async function loadUnit() {
  const el = document.getElementById("daftar-unit");
  if (!el) return;
  try {
    const units = await getSemualUnit();
    if (!units.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:var(--sp-5);color:var(--text-3)">
          <p style="font-size:2rem;margin-bottom:var(--sp-2)">🏷️</p>
          <p style="font-size:.85rem">Belum ada unit. Tambahkan di atas.</p>
        </div>`;
      return;
    }
    // data-id & data-nama menggantikan onclick inline & window._delUnit
    el.innerHTML = units.map(u => `
      <div class="unit-list-item">
        <div class="unit-ikon">${u.ikon}</div>
        <span class="unit-nama">${u.nama}</span>
        <button class="unit-hapus-btn"
                data-id="${u.id_unit}"
                data-nama="${u.nama.replace(/"/g, '&quot;')}">
          🗑️ Hapus
        </button>
      </div>`).join("");
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger);font-size:.85rem;padding:var(--sp-2) 0">Gagal memuat: ${e}</p>`;
  }
}