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
  const idKamar     = params.get("idKamar")     ? parseInt(params.get("idKamar"))    : null;
  const idRumah     = params.get("idRumah")     ? parseInt(params.get("idRumah"))    : null;
  const namaKamar   = params.get("namaKamar")   ?? "";
  const namaRumah   = params.get("namaRumah")   ?? "";
  const idKontakPre = params.get("idKontak")    ? parseInt(params.get("idKontak"))   : null;
  const namaKontak  = params.get("namaKontak")  ?? "";
  const newKontakId = params.get("newKontakId") ? parseInt(params.get("newKontakId")): null;

  const backUrl = idKamar
    ? buildUrl("/page/detail_kamar.html", { id: idKamar, idRumah, nama: namaKamar, namaRumah })
    : idKontakPre
      ? buildUrl("/page/detail_kontak_penghuni.html", { id: idKontakPre })
      : "/page/kontak_penghuni.html";

  document.getElementById("btn-back").href = backUrl;

  const sub = document.getElementById("sub-kamar");
  if (sub) {
    if (namaKamar)       sub.textContent = `${namaRumah} — Kamar ${namaKamar}`;
    else if (namaKontak) sub.textContent = `Untuk: ${namaKontak}`;
  }

  /* ── State ── */
  let selectedKontak = null;
  let selectedKamar  = null;
  let kamarData      = null;
  let tglMasuk       = todayISO();
  let tglKeluar      = "";

  let allKontak = [];
  let allKamar  = [];

  try { allKontak = await getSemualKontak(); } catch {}

  /* ── Load kamar ── */
  if (idKamar && idRumah) {
    try {
      const list = await getKamarByRumah(idRumah);
      kamarData  = list.find(k => k.id_kamar === idKamar) ?? null;
      renderKamarBanner(kamarData);
    } catch {}
  } else {
    try {
      const allRumah = await getSemualRumah();
      const results  = await Promise.all(
        allRumah.map(r => getKamarByRumah(r.id_rumah).catch(() => []).then(list =>
          list.map(k => ({ ...k, _namaRumah: r.nama_rumah }))
        ))
      );
      allKamar = results.flat();
    } catch {}
    renderKamarPicker(allKamar);
  }

  /* ── Auto-pilih kontak ── */
  const autoId = newKontakId || idKontakPre;
  if (autoId) {
    const found = allKontak.find(k => k.id_kontak === autoId);
    if (found) selectKontak(found);
  }

  renderKontakList(allKontak);

  /* ── Event delegation: pick kontak ── */
  document.getElementById("kontak-list-pick")?.addEventListener("click", (e) => {
    const item = e.target.closest(".kontak-pick-item[data-kontak-id]");
    if (!item) return;
    const id = parseInt(item.dataset.kontakId);
    const k  = allKontak.find(c => c.id_kontak === id);
    if (k) selectKontak(k);
  });

  /* ── Event delegation: pick kamar ── */
  document.getElementById("kamar-info-banner")?.addEventListener("click", (e) => {
    const item = e.target.closest(".kontak-pick-item[data-kamar-id]");
    if (!item) return;
    const id = parseInt(item.dataset.kamarId);
    const k  = allKamar.find(c => c.id_kamar === id);
    if (k) {
      selectedKamar = k;
      kamarData     = k;
      renderKamarBanner(k);
      renderKontakList(allKontak);
      updateBtn();
    }
  });

  /* ── Search kontak ── */
  const qIn  = document.getElementById("q-kontak");
  const qClr = document.getElementById("q-kontak-clear");
  qIn?.addEventListener("input", () => {
    const q = qIn.value.trim().toLowerCase();
    qClr?.classList.toggle("hidden", !q);
    filterKontak(q);
  });
  qClr?.addEventListener("click", () => {
    qIn.value = ""; qClr.classList.add("hidden"); filterKontak(""); qIn.focus();
  });

  /* ── Buat kontak baru ── */
  document.getElementById("btn-tambah-kontak-baru")?.addEventListener("click", () => {
    const returnUrl = buildUrl("/page/add_penghuni_kamar.html", {
      idKamar: idKamar ?? "", idRumah: idRumah ?? "",
      namaKamar, namaRumah, idKontak: idKontakPre ?? "", namaKontak,
    });
    location.href = buildUrl("/page/add_kontak_penghuni.html", { return: returnUrl });
  });

  /* ── Tanggal masuk ── */
  setDateBtn("tgl-masuk-btn", "tgl-masuk-val", tglMasuk);
  document.getElementById("tgl-masuk-btn")?.addEventListener("click", () => {
    showDatePicker({ title: "Tanggal Masuk", value: tglMasuk, onSelect: v => {
      tglMasuk = v;
      setDateBtn("tgl-masuk-btn", "tgl-masuk-val", v);
      if (tglKeluar && tglKeluar <= v) { tglKeluar = ""; setDateBtn("tgl-keluar-btn", "tgl-keluar-val", ""); }
      updateBtn();
    }});
  });

  /* ── Tanggal keluar ── */
  document.getElementById("tgl-keluar-btn")?.addEventListener("click", () => {
    showDatePicker({
      title: "Tanggal Keluar (Estimasi)",
      value: tglKeluar || addBulan(tglMasuk, 1),
      min:   tglMasuk,
      onSelect: v => { tglKeluar = v; setDateBtn("tgl-keluar-btn", "tgl-keluar-val", v); }
    });
  });

  /* ── Submit ── */
  const btnSimpan = document.getElementById("btn-simpan-penghuni");
  btnSimpan?.addEventListener("click", async () => {
    if (btnSimpan.disabled) return;
    if (!selectedKontak) { showToast("Pilih kontak penghuni!", "error"); return; }
    const kamarId = idKamar ?? selectedKamar?.id_kamar;
    const rumahId = idRumah ?? selectedKamar?.id_rumah;
    const namaKmr = namaKamar || selectedKamar?.no_kamar || "";
    const namaRmh = namaRumah || selectedKamar?._namaRumah || "";
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
        id: kamarId, idRumah: rumahId, nama: namaKmr, namaRumah: namaRmh, status: "penghuni_added"
      }));
    } catch (e) {
      showToast("Gagal: " + e, "error");
      btnSimpan.disabled = false; btnSimpan.textContent = "Tambah Penghuni";
    }
  });

  /* ═══════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════ */

  function avatarHtml(foto, nama, cls = "kontak-pick-avatar", phCls = "kontak-pick-avatar-ph") {
    return foto
      ? `<img src="${foto}" class="${cls}" alt="${nama}">`
      : `<div class="${phCls}">${nama.charAt(0).toUpperCase()}</div>`;
  }

  function renderKamarBanner(k) {
    const el = document.getElementById("kamar-info-banner");
    if (!el || !k) return;
    const jkBadge = k.jenis_kelamin === "Bebas" ? "badge-gray"
                  : k.jenis_kelamin === "Pria"  ? "badge-amber" : "badge-green";
    const sisa = k.kapasitas - k.jumlah_penghuni;
    el.innerHTML = `
      <div class="kamar-info-row">
        ${k.gambar
          ? `<img src="${k.gambar}" class="kamar-banner-thumb" alt="Kamar ${k.no_kamar}">`
          : `<div class="kamar-banner-thumb-ph">🚪</div>`}
        <div style="flex:1;min-width:0">
          <p style="font-weight:700;font-size:.9rem;margin-bottom:4px">
            Kamar ${k.no_kamar}${k.lantai ? ` · Lantai ${k.lantai}` : ""}
          </p>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <span class="badge ${jkBadge}">${k.jenis_kelamin}</span>
            <span class="badge ${sisa > 0 ? "badge-green" : "badge-red"}">
              ${sisa > 0 ? `${sisa} slot tersisa` : "Penuh"}
            </span>
            <span class="badge badge-gray">${formatRupiah(k.harga_efektif)}/bln</span>
          </div>
        </div>
      </div>`;
  }

  function renderKamarPicker(list) {
    const el = document.getElementById("kamar-info-banner");
    if (!el) return;
    const tersedia = list.filter(k => k.status !== "Penuh");
    if (!tersedia.length) {
      el.innerHTML = `<p style="color:var(--text-3);font-size:.85rem;padding:var(--sp-3)">Tidak ada kamar tersedia.</p>`;
      return;
    }
    // data-kamar-id menggantikan onclick inline
    el.innerHTML = `
      <p style="font-size:.75rem;font-weight:700;color:var(--text-3);text-transform:uppercase;
                letter-spacing:.05em;padding:var(--sp-3) var(--sp-3) var(--sp-1)">Pilih Kamar</p>
      <div class="pick-list" style="border:none;border-radius:0;max-height:220px">
        ${tersedia.map(k => {
          const sisa = k.kapasitas - k.jumlah_penghuni;
          return `
            <div class="kontak-pick-item" data-kamar-id="${k.id_kamar}">
              ${k.gambar
                ? `<img src="${k.gambar}" class="kamar-banner-thumb" alt="">`
                : `<div class="kamar-banner-thumb-ph" style="width:40px;height:40px;font-size:1.1rem">🚪</div>`}
              <div class="kontak-pick-info">
                <p class="kontak-pick-nama">Kamar ${k.no_kamar} · ${k._namaRumah}</p>
                <p class="kontak-pick-hp">${formatRupiah(k.harga_efektif)}/bln · ${sisa} slot tersisa</p>
              </div>
              <span class="kontak-pick-arrow">›</span>
            </div>`;
        }).join("")}
      </div>`;
  }

  function getJKKamar() {
    return kamarData?.jenis_kelamin ?? selectedKamar?.jenis_kelamin ?? "Bebas";
  }

  function buildKontakItemHtml(k) {
    const jkCls   = k.jenis_kelamin === "Pria" ? "laki" : "perempuan";
    const jkLabel = k.jenis_kelamin === "Pria" ? "Pria" : "Wanita";
    // data-kontak-id menggantikan onclick inline & window._selectKontakById
    return `
      <div class="kontak-pick-item" data-kontak-id="${k.id_kontak}">
        ${avatarHtml(k.foto_profil, k.nama)}
        <div class="kontak-pick-info">
          <p class="kontak-pick-nama">${k.nama}</p>
          ${k.no_hp ? `<p class="kontak-pick-hp">📞 ${k.no_hp}</p>` : ""}
        </div>
        <span class="kontak-jk-badge ${jkCls}" style="font-size:.62rem;padding:2px 7px">${jkLabel}</span>
      </div>`;
  }

  function renderKontakList(list) {
    const el      = document.getElementById("kontak-list-pick");
    const jkKamar = getJKKamar();
    if (!el) return;
    const available = list.filter(k =>
      !k.kamar_aktif && (jkKamar === "Bebas" || k.jenis_kelamin === jkKamar)
    );
    if (!available.length) {
      el.innerHTML = `<p style="padding:var(--sp-4);text-align:center;font-size:.85rem;color:var(--text-3)">
        Tidak ada kontak tersedia${jkKamar !== "Bebas" ? ` untuk kamar ${jkKamar}` : ""}.
      </p>`;
      return;
    }
    el.innerHTML = available.map(buildKontakItemHtml).join("");
  }

  function filterKontak(q) {
    const el      = document.getElementById("kontak-list-pick");
    const jkKamar = getJKKamar();
    if (!el) return;
    let list = allKontak.filter(k =>
      !k.kamar_aktif && (jkKamar === "Bebas" || k.jenis_kelamin === jkKamar)
    );
    if (q) list = list.filter(k =>
      k.nama.toLowerCase().includes(q) || (k.no_hp ?? "").includes(q)
    );
    if (!list.length) {
      el.innerHTML = `<p style="padding:var(--sp-4);text-align:center;font-size:.85rem;color:var(--text-3)">Tidak ditemukan.</p>`;
      return;
    }
    el.innerHTML = list.map(buildKontakItemHtml).join("");
  }

  function selectKontak(k) {
    selectedKontak   = k;
    const selEl      = document.getElementById("selected-kontak");
    const searchWrap = document.getElementById("kontak-search-wrap");
    const jkCls      = k.jenis_kelamin === "Pria" ? "laki" : "perempuan";
    const jkLabel    = k.jenis_kelamin === "Pria" ? "Pria" : "Wanita";

    if (selEl) {
      selEl.classList.remove("hidden");
      selEl.innerHTML = `
        <div class="selected-kontak-inner">
          ${avatarHtml(k.foto_profil, k.nama)}
          <div style="flex:1;min-width:0">
            <p style="font-weight:700;font-size:.9rem;line-height:1.2">${k.nama}</p>
            ${k.no_hp ? `<p style="font-size:.77rem;color:var(--text-2);margin-top:2px">📞 ${k.no_hp}</p>` : ""}
            <span class="kontak-jk-badge ${jkCls}" style="font-size:.62rem;padding:2px 7px;margin-top:4px;display:inline-flex">${jkLabel}</span>
          </div>
          <button type="button" id="btn-ganti-kontak" class="btn-secondary"
            style="font-size:.75rem;padding:6px 12px;flex-shrink:0">Ganti</button>
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
    const ok  = !!selectedKontak && !!(idKamar || selectedKamar) && !!tglMasuk;
    const btn = document.getElementById("btn-simpan-penghuni");
    if (btn) btn.disabled = !ok;
  }
  updateBtn();
}

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