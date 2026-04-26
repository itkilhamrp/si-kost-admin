/**
 * pages/pindah-kamar.js — Pindah penghuni ke kamar lain
 */
import { getSemualRumah, getKamarByRumah, pindahPenghuni } from "../core/api.js";
import { requireAuth }   from "../core/auth.js";
import { Theme }         from "../core/theme.js";
import { buildUrl, formatRupiah } from "../core/utils.js";
import { showToast }     from "../ui/toast.js";

export async function initPindahKamar() {
  if (!requireAuth()) return;
  Theme.init();

  const params        = new URLSearchParams(location.search);
  const idPenghuni    = parseInt(params.get("idPenghuni"));
  const idKontakAsal  = parseInt(params.get("idKontakAsal"));
  const namaKontak    = params.get("namaKontak") ?? "Penghuni";
  const idKamarAsal   = parseInt(params.get("idKamarAsal"));
  const namaKamarAsal = params.get("namaKamarAsal") ?? "";
  const namaRumahAsal = params.get("namaRumahAsal") ?? "";

  if (!idPenghuni) { location.replace("/page/kontak_penghuni.html"); return; }

  document.getElementById("btn-back").href =
    buildUrl("/page/detail_kontak_penghuni.html", { id: idKontakAsal });

  const subEl = document.getElementById("sub-nama-penghuni");
  if (subEl) subEl.textContent = namaKontak;

  const infoEl = document.getElementById("info-kamar-sekarang");
  if (infoEl) {
    infoEl.innerHTML = `<strong>${namaKontak}</strong> saat ini di
      <strong>Kamar ${namaKamarAsal}</strong> — ${namaRumahAsal}.
      Pilih kamar tujuan di bawah. Pembayaran &amp; tanggal kontrak tidak akan berubah.`;
  }

  document.getElementById("dialog-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeDialog();
  });

  let allRumah = [];
  let allKamar = [];
  try {
    allRumah = await getSemualRumah();
    const results = await Promise.all(
      allRumah.map(r =>
        getKamarByRumah(r.id_rumah).catch(() => []).then(list =>
          list.map(k => ({ ...k, _namaRumah: r.nama_rumah, _idRumah: r.id_rumah }))
        )
      )
    );
    allKamar = results.flat().filter(k =>
      k.id_kamar !== idKamarAsal && k.status !== "Penuh"
    );
  } catch (e) {
    showToast("Gagal memuat data: " + e, "error");
  }

  let selectedKamar   = null;
  let selectedRumahId = null;

  renderKostList(allRumah);

  // Event delegation — list kost
  document.getElementById("list-kost")?.addEventListener("click", (e) => {
    const item = e.target.closest(".kontak-pick-item[data-rumah-id]");
    if (!item) return;
    const id = parseInt(item.dataset.rumahId);
    if (selectedRumahId === id) {
      selectedRumahId = null;
      document.getElementById("kamar-submenu")?.classList.add("hidden");
      selectedKamar = null;
      updateSelectedCard();
    } else {
      selectedRumahId = id;
      selectedKamar   = null;
      updateSelectedCard();
      document.getElementById("kamar-submenu")?.classList.remove("hidden");
      renderKamarList(filterKamarList(""));
    }
    renderKostList(allRumah);
  });

  // Event delegation — list kamar tujuan
  document.getElementById("list-kamar-tujuan")?.addEventListener("click", (e) => {
    const item = e.target.closest(".kontak-pick-item[data-kamar-id]");
    if (!item) return;
    const id = parseInt(item.dataset.kamarId);
    if (selectedKamar?.id_kamar === id) {
      selectedKamar = null;
    } else {
      selectedKamar = allKamar.find(k => k.id_kamar === id) ?? null;
    }
    updateSelectedCard();
    renderKamarList(filterKamarList(qKamarIn?.value.trim().toLowerCase() ?? ""));
  });

  // Search kost
  const qKostIn  = document.getElementById("q-kost");
  const qKostClr = document.getElementById("q-kost-clear");
  qKostIn?.addEventListener("input", () => {
    const q = qKostIn.value.trim().toLowerCase();
    qKostClr?.classList.toggle("hidden", !q);
    renderKostList(filterKostList(q));
  });
  qKostClr?.addEventListener("click", () => {
    qKostIn.value = ""; qKostClr.classList.add("hidden");
    renderKostList(allRumah); qKostIn.focus();
  });

  // Search kamar
  const qKamarIn  = document.getElementById("q-kamar");
  const qKamarClr = document.getElementById("q-kamar-clear");
  qKamarIn?.addEventListener("input", () => {
    const q = qKamarIn.value.trim().toLowerCase();
    qKamarClr?.classList.toggle("hidden", !q);
    renderKamarList(filterKamarList(q));
  });
  qKamarClr?.addEventListener("click", () => {
    qKamarIn.value = ""; qKamarClr.classList.add("hidden");
    renderKamarList(filterKamarList("")); qKamarIn.focus();
  });

  // Tombol pindah
  document.getElementById("btn-pindah")?.addEventListener("click", () => {
    if (!selectedKamar) { showToast("Pilih kamar tujuan dulu!", "error"); return; }
    bukaKonfirmasi();
  });

  /* ══ HELPERS ══ */

  function filterKostList(q) {
    if (!q) return allRumah;
    return allRumah.filter(r => r.nama_rumah.toLowerCase().includes(q));
  }

  function filterKamarList(q) {
    if (!selectedRumahId) return [];
    const list = allKamar.filter(k => k._idRumah === selectedRumahId);
    if (!q) return list;
    return list.filter(k => k.no_kamar.toLowerCase().includes(q));
  }

  function renderKostList(list) {
    const el = document.getElementById("list-kost");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<p style="padding:var(--sp-4);text-align:center;font-size:.85rem;color:var(--text-3)">
        Tidak ada kost tersedia.</p>`;
      return;
    }
    // data-rumah-id menggantikan onclick inline
    el.innerHTML = list.map(r => {
      const kamarCount = allKamar.filter(k => k._idRumah === r.id_rumah).length;
      const isActive   = selectedRumahId === r.id_rumah;
      return `
        <div class="kontak-pick-item${isActive ? " pick-item-active" : ""}"
             data-rumah-id="${r.id_rumah}">
          <div class="kamar-banner-thumb-ph" style="width:44px;height:44px;font-size:1.1rem">🏠</div>
          <div class="kontak-pick-info">
            <p class="kontak-pick-nama">${r.nama_rumah}</p>
            <p class="kontak-pick-hp">${kamarCount} kamar tersedia</p>
          </div>
          ${isActive
            ? `<span style="color:var(--green);font-size:1.2rem;flex-shrink:0">✓</span>`
            : `<span class="kontak-pick-arrow">›</span>`}
        </div>`;
    }).join("");
  }

  function renderKamarList(list) {
    const el = document.getElementById("list-kamar-tujuan");
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<p style="padding:var(--sp-4);text-align:center;font-size:.85rem;color:var(--text-3)">
        Tidak ada kamar tersedia.</p>`;
      return;
    }
    // data-kamar-id menggantikan onclick inline
    el.innerHTML = list.map(k => {
      const sisa    = k.kapasitas - k.jumlah_penghuni;
      const sisCls  = sisa > 0 ? "badge-green" : "badge-red";
      const sisTeks = sisa > 0 ? `${sisa} slot` : "Penuh";
      const isActive = selectedKamar?.id_kamar === k.id_kamar;
      return `
        <div class="kontak-pick-item${isActive ? " pick-item-active" : ""}"
             data-kamar-id="${k.id_kamar}">
          ${k.gambar
            ? `<img src="${k.gambar}" class="kamar-banner-thumb" alt="" style="width:44px;height:44px">`
            : `<div class="kamar-banner-thumb-ph" style="width:44px;height:44px;font-size:1.1rem">🚪</div>`}
          <div class="kontak-pick-info">
            <p class="kontak-pick-nama">Kamar ${k.no_kamar} · ${k._namaRumah}</p>
            <p class="kontak-pick-hp">
              ${formatRupiah(k.harga_efektif)}/bln ·
              <span class="badge ${sisCls}" style="font-size:.58rem;padding:1px 6px">${sisTeks}</span>
              ${k.lantai ? ` · Lantai ${k.lantai}` : ""}
            </p>
          </div>
          ${isActive
            ? `<span style="color:var(--green);font-size:1.2rem;flex-shrink:0">✓</span>`
            : `<span class="kontak-pick-arrow">›</span>`}
        </div>`;
    }).join("");
  }

  function updateSelectedCard() {
    const selEl = document.getElementById("selected-kamar");
    const btn   = document.getElementById("btn-pindah");
    if (!selEl) return;

    if (!selectedKamar) {
      selEl.classList.add("hidden");
      selEl.innerHTML = "";
      if (btn) btn.disabled = true;
      return;
    }

    selEl.classList.remove("hidden");
    const sisa = selectedKamar.kapasitas - selectedKamar.jumlah_penghuni;
    selEl.innerHTML = `
      <div class="selected-kontak-inner">
        ${selectedKamar.gambar
          ? `<img src="${selectedKamar.gambar}" class="kamar-banner-thumb" style="width:44px;height:44px" alt="">`
          : `<div class="kamar-banner-thumb-ph" style="width:44px;height:44px;font-size:1.1rem">🚪</div>`}
        <div style="flex:1;min-width:0">
          <p style="font-weight:700;font-size:.9rem">
            Kamar ${selectedKamar.no_kamar} · ${selectedKamar._namaRumah}
          </p>
          <p style="font-size:.77rem;color:var(--text-2);margin-top:2px">
            ${formatRupiah(selectedKamar.harga_efektif)}/bln · ${sisa} slot tersisa
          </p>
        </div>
        <button type="button" id="btn-uncheck-kamar"
          style="flex-shrink:0;padding:5px 10px;border-radius:var(--r-sm);
                 border:1.5px solid var(--border);background:var(--bg);
                 font-size:.72rem;color:var(--text-3);cursor:pointer"
          title="Batalkan pilihan">✕ Batal</button>
      </div>`;

    document.getElementById("btn-uncheck-kamar")?.addEventListener("click", () => {
      selectedKamar = null;
      updateSelectedCard();
      renderKamarList(filterKamarList(qKamarIn?.value.trim().toLowerCase() ?? ""));
    });

    if (btn) btn.disabled = false;
  }

  /* ══ DIALOG KONFIRMASI ══ */

  function bukaKonfirmasi() {
    if (!selectedKamar) return;
    openDialog(`
      <div class="dialog-icon green">🔄</div>
      <p class="dialog-title">Konfirmasi Pindah Kamar</p>
      <p class="dialog-body">
        <strong>${namaKontak}</strong> akan dipindahkan dari<br>
        <strong>Kamar ${namaKamarAsal}</strong> (${namaRumahAsal})<br>
        ke<br>
        <strong>Kamar ${selectedKamar.no_kamar}</strong> (${selectedKamar._namaRumah})
      </p>
      <div class="dialog-note green">
        ✅ Pembayaran &amp; tanggal kontrak tetap tersimpan, tidak ada data yang hilang.
      </div>
      <div class="dialog-actions">
        <button class="dialog-btn btn-green" id="dlg-konfirm">🔄 Ya, Pindahkan</button>
        <button class="dialog-btn btn-ghost" id="dlg-batal">Batal</button>
      </div>`);

    document.getElementById("dlg-batal").addEventListener("click", closeDialog);
    document.getElementById("dlg-konfirm").addEventListener("click", async () => {
      closeDialog();
      const btn = document.getElementById("btn-pindah");
      if (btn) { btn.disabled = true; btn.textContent = "⏳ Memindahkan..."; }
      try {
        await pindahPenghuni(idPenghuni, selectedKamar.id_kamar);
        showToast(`${namaKontak} berhasil dipindah ke Kamar ${selectedKamar.no_kamar}! ✅`);
        setTimeout(() => {
          location.replace(buildUrl("/page/detail_kontak_penghuni.html", {
            id: idKontakAsal, status: "pindah"
          }));
        }, 800);
      } catch (e) {
        showToast("Gagal: " + e, "error");
        if (btn) { btn.disabled = false; btn.textContent = "🔄 Pindahkan Sekarang"; }
      }
    });
  }

  function openDialog(html) {
    const el = document.getElementById("dialog-content");
    const ov = document.getElementById("dialog-overlay");
    if (el) el.innerHTML = html;
    if (ov) ov.classList.add("active");
  }
  function closeDialog() {
    document.getElementById("dialog-overlay")?.classList.remove("active");
  }
}