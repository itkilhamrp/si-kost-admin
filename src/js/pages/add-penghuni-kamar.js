/**
 * pages/add-penghuni-kamar.js — Tambah penghuni ke kamar
 *
 * Flow A (dari detail_kamar.html): URL punya idKamar + idRumah
 * Flow B (dari detail_kontak.html): URL punya idKontak
 */
import {
  getSemualKontak, getKamarByRumah, getSemualRumah, tambahPenghuni
} from "../core/api.js";
import { requireAuth }   from "../core/auth.js";
import { Theme }         from "../core/theme.js";
import { buildUrl, formatRupiah, todayISO } from "../core/utils.js";
import { showToast }     from "../ui/toast.js";
import { showDatePicker, formatDateDisplay } from "../ui/date-picker.js";

export async function initAddPenghuniKamar() {
  if (!requireAuth()) return;
  Theme.init();

  const params      = new URLSearchParams(location.search);
  const idKamar     = +params.get("idKamar")    || null;
  const idRumah     = +params.get("idRumah")    || null;
  const namaKamar   = params.get("namaKamar")   ?? "";
  const namaRumah   = params.get("namaRumah")   ?? "";
  const idKontakPre = +params.get("idKontak")   || null;
  const namaKontak  = params.get("namaKontak")  ?? "";
  const newKontakId = +params.get("newKontakId") || null;

  const backUrl = idKamar
    ? buildUrl("/page/detail_kamar.html", { id: idKamar, idRumah, nama: namaKamar, namaRumah })
    : idKontakPre
      ? buildUrl("/page/detail_kontak_penghuni.html", { id: idKontakPre })
      : "/page/kontak_penghuni.html";

  document.getElementById("btn-back").href = backUrl;
  const sub = document.getElementById("sub-kamar");
  if (sub) sub.textContent = namaKamar ? `${namaRumah} — Kamar ${namaKamar}` : (namaKontak ? `Untuk: ${namaKontak}` : "");

  // State
  let selectedKontak = null, selectedKamar = null, kamarData = null;
  let tglMasuk = todayISO(), tglKeluar = "";
  let allKontak = [], allKamar = [];

  try { allKontak = await getSemualKontak(); } catch {}

  // Load kamar: Flow A tampilkan langsung, Flow B tampilkan picker
  if (idKamar && idRumah) {
    try {
      const list = await getKamarByRumah(idRumah);
      kamarData = list.find(k => k.id_kamar === idKamar) ?? null;
      if (kamarData) showKamarCard(kamarData, { showGanti: false });
    } catch {}
  } else {
    try {
      const allRumah = await getSemualRumah();
      const results = await Promise.all(allRumah.map(r =>
        getKamarByRumah(r.id_rumah).then(list => list.map(k => ({ ...k, _namaRumah: r.nama_rumah }))).catch(() => [])
      ));
      allKamar = results.flat();
    } catch {}
    showKamarPicker(allKamar);
  }

  // Auto-pilih kontak
  const autoId = newKontakId || idKontakPre;
  if (autoId) {
    const found = allKontak.find(k => k.id_kontak === autoId);
    if (found) selectKontak(found);
  }
  renderKontakList(allKontak);

  // Event: pick kontak
  document.getElementById("kontak-list-pick")?.addEventListener("click", e => {
    const item = e.target.closest(".kontak-pick-item[data-kontak-id]");
    if (!item) return;
    const k = allKontak.find(c => c.id_kontak === +item.dataset.kontakId);
    if (k) selectKontak(k);
  });

  // Event: pick kamar (dengan toggle/uncheck) & tombol Ganti
  document.getElementById("kamar-info-banner")?.addEventListener("click", e => {
    if (e.target.id === "btn-ganti-kamar" || e.target.closest("#btn-ganti-kamar")) {
      deselectKamar();
      return;
    }
    const item = e.target.closest(".kontak-pick-item[data-kamar-id]");
    if (!item) return;
    const id = +item.dataset.kamarId;
    if (selectedKamar?.id_kamar === id) {
      deselectKamar();
      return;
    }
    const k = allKamar.find(c => c.id_kamar === id);
    if (k) {
      selectedKamar = k;
      kamarData = k;
      showKamarCard(k, { showGanti: true });
      renderKontakList(allKontak);
      updateBtn();
    }
  });

  // Search kontak
  const qIn = document.getElementById("q-kontak"), qClr = document.getElementById("q-kontak-clear");
  qIn?.addEventListener("input", () => {
    const q = qIn.value.trim().toLowerCase();
    qClr?.classList.toggle("hidden", !q);
    filterKontak(q);
  });
  qClr?.addEventListener("click", () => {
    qIn.value = ""; qClr.classList.add("hidden"); filterKontak(""); qIn.focus();
  });

  // Buat kontak baru
  document.getElementById("btn-tambah-kontak-baru")?.addEventListener("click", () => {
    location.href = buildUrl("/page/add_kontak_penghuni.html", {
      return: buildUrl("/page/add_penghuni_kamar.html", {
        idKamar: idKamar ?? "", idRumah: idRumah ?? "", namaKamar, namaRumah,
        idKontak: idKontakPre ?? "", namaKontak
      })
    });
  });

  // Tanggal
  setDateBtn("tgl-masuk-btn", "tgl-masuk-val", tglMasuk);
  document.getElementById("tgl-masuk-btn")?.addEventListener("click", () => {
    showDatePicker({
      title: "Tanggal Masuk", value: tglMasuk,
      onSelect: v => {
        tglMasuk = v; setDateBtn("tgl-masuk-btn", "tgl-masuk-val", v);
        if (tglKeluar && tglKeluar <= v) { tglKeluar = ""; setDateBtn("tgl-keluar-btn", "tgl-keluar-val", ""); }
        updateBtn();
      }
    });
  });
  document.getElementById("tgl-keluar-btn")?.addEventListener("click", () => {
    showDatePicker({
      title: "Tanggal Keluar (Estimasi)", value: tglKeluar || addBulan(tglMasuk, 1), min: tglMasuk,
      onSelect: v => { tglKeluar = v; setDateBtn("tgl-keluar-btn", "tgl-keluar-val", v); }
    });
  });

  // Submit
  const btnSimpan = document.getElementById("btn-simpan-penghuni");
  btnSimpan?.addEventListener("click", async () => {
    if (btnSimpan.disabled) return;
    if (!selectedKontak) { showToast("Pilih kontak penghuni!", "error"); return; }
    const kamarId = idKamar ?? selectedKamar?.id_kamar;
    const rumahId = idRumah ?? selectedKamar?.id_rumah;
    if (!kamarId) { showToast("Pilih kamar terlebih dahulu!", "error"); return; }
    const jkKamar = kamarData?.jenis_kelamin ?? selectedKamar?.jenis_kelamin ?? "Bebas";
    if (jkKamar !== "Bebas" && jkKamar !== selectedKontak.jenis_kelamin) {
      showToast(`Kamar khusus ${jkKamar}. Kontak berjenis kelamin ${selectedKontak.jenis_kelamin}.`, "error");
      return;
    }
    if (selectedKontak.kamar_aktif) {
      showToast(`${selectedKontak.nama} masih aktif di: ${selectedKontak.kamar_aktif}`, "error");
      return;
    }
    btnSimpan.disabled = true; btnSimpan.textContent = "⏳ Menyimpan...";
    try {
      await tambahPenghuni(kamarId, selectedKontak.id_kontak, tglMasuk, tglKeluar || null);
      location.replace(buildUrl("/page/detail_kamar.html", {
        id: kamarId, idRumah: rumahId, nama: namaKamar || selectedKamar?.no_kamar || "",
        namaRumah: namaRumah || selectedKamar?._namaRumah || "", status: "penghuni_added"
      }));
    } catch (e) {
      showToast("Gagal: " + e, "error");
      btnSimpan.disabled = false; btnSimpan.textContent = "Tambah Penghuni";
    }
  });

  // ─────────── Render helpers ───────────

  function avatarHtml(foto, nama) {
    return foto
      ? `<img src="${foto}" class="kontak-pick-avatar" alt="${nama}">`
      : `<div class="kontak-pick-avatar-ph">${nama.charAt(0).toUpperCase()}</div>`;
  }

  // Tampilkan card kamar (banner terpilih), dengan/tanpa tombol Ganti
  function showKamarCard(k, { showGanti } = {}) {
    const el = document.getElementById("kamar-info-banner");
    if (!el || !k) return;
    const jk = k.jenis_kelamin;
    const jkBadge = jk === "Bebas" ? "badge-gray" : (jk === "Pria" ? "badge-amber" : "badge-green");
    const sisa = k.kapasitas - k.jumlah_penghuni;
    const thumb = k.gambar
      ? `<img src="${k.gambar}" class="kamar-banner-thumb" style="width:44px;height:44px;border-radius:var(--r-md);object-fit:cover;flex-shrink:0" alt="">`
      : `<div class="kamar-banner-thumb-ph" style="width:44px;height:44px;font-size:1.2rem;flex-shrink:0">🚪</div>`;
    el.innerHTML = `
      <div class="${showGanti ? 'selected-item-card' : ''}" style="margin-bottom:0">
        <div class="kamar-info-row" style="align-items:center">
          ${thumb}
          <div style="flex:1;min-width:0">
            <p style="font-weight:700;font-size:.9rem;margin-bottom:4px">
              Kamar ${k.no_kamar}${k.lantai ? ` · Lantai ${k.lantai}` : ""}
            </p>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              <span class="badge ${jkBadge}">${k.jenis_kelamin}</span>
              <span class="badge ${sisa > 0 ? "badge-green" : "badge-red"}">${sisa > 0 ? `${sisa} slot tersisa` : "Penuh"}</span>
              <span class="badge badge-gray">${formatRupiah(k.harga_efektif)}/bln</span>
            </div>
          </div>
          ${showGanti ? `<button type="button" id="btn-ganti-kamar" class="btn-secondary" style="font-size:.75rem;padding:6px 12px;flex-shrink:0">Ganti</button>` : ''}
        </div>
      </div>`;
  }

  // Tampilkan picker daftar kamar
  function showKamarPicker(list) {
    const el = document.getElementById("kamar-info-banner");
    if (!el) return;
    const tersedia = list.filter(k => k.status !== "Penuh");
    if (!tersedia.length) {
      el.innerHTML = `<p style="color:var(--text-3);font-size:.85rem;padding:var(--sp-3)">Tidak ada kamar tersedia.</p>`;
      return;
    }
    const items = tersedia.map(k => buildKamarItemHtml(k)).join("");
    el.innerHTML = `
      <p style="font-size:.75rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;padding:var(--sp-3) var(--sp-3) var(--sp-1)">Pilih Kamar</p>
      <div class="pick-list" style="border:none;border-radius:0;max-height:260px">${items}</div>`;
  }

  function buildKamarItemHtml(k) {
    const sisa = k.kapasitas - k.jumlah_penghuni;
    const isActive = selectedKamar?.id_kamar === k.id_kamar;
    const thumb = k.gambar
      ? `<img src="${k.gambar}" class="kamar-banner-thumb" style="width:40px;height:40px;border-radius:var(--r-md);object-fit:cover;flex-shrink:0" alt="">`
      : `<div class="kamar-banner-thumb-ph" style="width:40px;height:40px;font-size:1.1rem;flex-shrink:0">🚪</div>`;
    return `
      <div class="kontak-pick-item${isActive ? ' pick-item-active' : ''}" data-kamar-id="${k.id_kamar}">
        ${thumb}
        <div class="kontak-pick-info">
          <p class="kontak-pick-nama">Kamar ${k.no_kamar} · ${k._namaRumah}</p>
          <p class="kontak-pick-hp">${formatRupiah(k.harga_efektif)}/bln · ${sisa} slot tersisa</p>
        </div>
        ${isActive ? '<span style="color:var(--green);font-size:1.2rem;flex-shrink:0">✓</span>' : '<span class="kontak-pick-arrow">›</span>'}
      </div>`;
  }

  function deselectKamar() {
    selectedKamar = null;
    kamarData = null;
    showKamarPicker(allKamar);
    renderKontakList(allKontak);
    updateBtn();
  }

  function getJKKamar() {
    return kamarData?.jenis_kelamin ?? selectedKamar?.jenis_kelamin ?? "Bebas";
  }

  function buildKontakItemHtml(k) {
    const jkCls = k.jenis_kelamin === "Pria" ? "laki" : "perempuan";
    return `
      <div class="kontak-pick-item" data-kontak-id="${k.id_kontak}">
        ${avatarHtml(k.foto_profil, k.nama)}
        <div class="kontak-pick-info">
          <p class="kontak-pick-nama">${k.nama}</p>
          ${k.no_hp ? `<p class="kontak-pick-hp">📞 ${k.no_hp}</p>` : ""}
        </div>
        <span class="kontak-jk-badge ${jkCls}" style="font-size:.62rem;padding:2px 7px">${k.jenis_kelamin}</span>
      </div>`;
  }

  function renderKontakList(list) {
    const el = document.getElementById("kontak-list-pick");
    if (!el) return;
    const jkKamar = getJKKamar();
    const available = list.filter(k => !k.kamar_aktif && (jkKamar === "Bebas" || k.jenis_kelamin === jkKamar));
    if (!available.length) {
      el.innerHTML = `<p style="padding:var(--sp-4);text-align:center;font-size:.85rem;color:var(--text-3)">
        Tidak ada kontak tersedia${jkKamar !== "Bebas" ? ` untuk kamar ${jkKamar}` : ""}.
      </p>`;
      return;
    }
    el.innerHTML = available.map(buildKontakItemHtml).join("");
  }

  function filterKontak(q) {
    const el = document.getElementById("kontak-list-pick");
    if (!el) return;
    let list = allKontak.filter(k => !k.kamar_aktif && (getJKKamar() === "Bebas" || k.jenis_kelamin === getJKKamar()));
    if (q) list = list.filter(k => k.nama.toLowerCase().includes(q) || (k.no_hp ?? "").includes(q));
    if (!list.length) {
      el.innerHTML = `<p style="padding:var(--sp-4);text-align:center;font-size:.85rem;color:var(--text-3)">Tidak ditemukan.</p>`;
      return;
    }
    el.innerHTML = list.map(buildKontakItemHtml).join("");
  }

  function selectKontak(k) {
    selectedKontak = k;
    const selEl = document.getElementById("selected-kontak");
    const searchWrap = document.getElementById("kontak-search-wrap");
    if (selEl) {
      selEl.classList.remove("hidden");
      selEl.innerHTML = `
        <div class="selected-kontak-inner">
          ${avatarHtml(k.foto_profil, k.nama)}
          <div style="flex:1;min-width:0">
            <p style="font-weight:700;font-size:.9rem;line-height:1.2">${k.nama}</p>
            ${k.no_hp ? `<p style="font-size:.77rem;color:var(--text-2);margin-top:2px">📞 ${k.no_hp}</p>` : ""}
            <span class="kontak-jk-badge ${k.jenis_kelamin === 'Pria' ? 'laki' : 'perempuan'}"
              style="font-size:.62rem;padding:2px 7px;margin-top:4px;display:inline-flex">${k.jenis_kelamin}</span>
          </div>
          <button type="button" id="btn-ganti-kontak" class="btn-secondary" style="font-size:.75rem;padding:6px 12px;flex-shrink:0">Ganti</button>
        </div>`;
      document.getElementById("btn-ganti-kontak")?.addEventListener("click", () => {
        selectedKontak = null;
        selEl.innerHTML = ""; selEl.classList.add("hidden");
        searchWrap?.classList.remove("hidden");
        renderKontakList(allKontak);
        updateBtn();
      });
    }
    searchWrap?.classList.add("hidden");
    updateBtn();
  }

  function updateBtn() {
    const ok = !!selectedKontak && !!(idKamar || selectedKamar) && !!tglMasuk;
    const btn = document.getElementById("btn-simpan-penghuni");
    if (btn) btn.disabled = !ok;
  }
  updateBtn();
}

// Utility murni (di luar fungsi utama)
function setDateBtn(btnId, valId, iso) {
  const valEl = document.getElementById(valId);
  const btn   = document.getElementById(btnId);
  if (valEl) valEl.textContent = iso ? formatDateDisplay(iso) : "Pilih tanggal...";
  if (btn)   btn.classList.toggle("has-val", !!iso);
}

function addBulan(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}