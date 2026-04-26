/**
 * pages/edit-kamar.js — Edit kamar kos
 */
import { getKamarByRumah, editKamar, getSemualUnit } from "../core/api.js";
import { requireAuth }  from "../core/auth.js";
import { getParams, buildUrl, formatRupiah } from "../core/utils.js";
import { showToast }    from "../ui/toast.js";
import { initImagePicker, getImage, isImageProcessing, isImageRemoved } from "../ui/image-picker.js";

export async function initEditKamar() {
  if (!requireAuth()) return;

  const params    = getParams();
  const idKamar   = parseInt(params.get("id"));
  const idRumah   = parseInt(params.get("idRumah"));
  const namaKamar = params.get("nama")      ?? "";
  const namaRumah = params.get("namaRumah") ?? "";
  const backUrl   = buildUrl("/page/detail_kamar.html", { id: idKamar, idRumah, nama: namaKamar, namaRumah });

  document.getElementById("btn-back").href = backUrl;

  let kamar;
  try {
    const [list, units] = await Promise.all([getKamarByRumah(idRumah), getSemualUnit()]);
    kamar = list.find(k => k.id_kamar === idKamar);
    if (!kamar) { showToast("Data kamar tidak ditemukan.", "error"); return; }

    document.getElementById("no-kamar").value   = kamar.no_kamar;
    document.getElementById("lantai").value     = kamar.lantai ?? "";
    document.getElementById("harga").value      = kamar.harga;
    document.getElementById("kapasitas").value  = kamar.kapasitas ?? 1;
    document.getElementById("diskon-val").value = kamar.diskon ?? 0;

    initImagePicker("input-gambar", "preview-gambar", "picker-hint", kamar.gambar ?? null);
    initJKToggle(kamar.jenis_kelamin ?? "Bebas");
    initKapasitasStepper();
    initDiskon(kamar.diskon ?? 0);

    // Unit checkboxes
    const milik = new Set((kamar.unit ?? []).map(u => u.id_unit));
    const grid  = document.getElementById("unit-grid");
    if (grid) {
      grid.innerHTML = units.length
        ? units.map(u =>
            `<input type="checkbox" class="properti-check unit-check" id="u-${u.id_unit}"
               value="${u.id_unit}"${milik.has(u.id_unit) ? " checked" : ""}>
             <label class="properti-label" for="u-${u.id_unit}">${u.ikon} ${u.nama}</label>`
          ).join("")
        : `<p style="font-size:.8rem;color:var(--text-3)">Belum ada unit.</p>`;
    }
  } catch (err) {
    showToast("Gagal memuat data: " + err, "error"); return;
  }

  const btn = document.getElementById("btn-simpan-kamar");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    if (isImageProcessing()) { showToast("Gambar masih diproses...", "error"); return; }

    const noKamar      = document.getElementById("no-kamar")?.value.trim();
    const lantai       = document.getElementById("lantai")?.value.trim() ?? "";
    const harga        = parseFloat(document.getElementById("harga")?.value);
    const diskon       = parseFloat(document.getElementById("diskon-val")?.value) || 0;
    const jenisKelamin = document.querySelector(".jk-btn.active")?.dataset.val ?? "Bebas";
    const kapasitas    = parseInt(document.getElementById("kapasitas")?.value) || 1;
    const unitIds      = [...document.querySelectorAll(".properti-check:checked")].map(c => parseInt(c.value));
    const hapusGambar  = isImageRemoved();

    if (!noKamar)                    { showToast("Nomor kamar wajib diisi!", "error"); return; }
    if (isNaN(harga) || harga <= 0)  { showToast("Harga harus lebih dari 0!", "error"); return; }
    if (kapasitas < 1 || kapasitas > 20) { showToast("Kapasitas 1–20 orang.", "error"); return; }
    if (diskon < 0 || diskon > 90)   { showToast("Diskon harus antara 0–90%.", "error"); return; }

    btn.disabled = true; btn.textContent = "⏳ Menyimpan...";
    try {
      await editKamar(idKamar, noKamar, harga, diskon, lantai, jenisKelamin, kapasitas, getImage(), hapusGambar, unitIds);
      location.replace(buildUrl("/page/detail_kamar.html",
        { id: idKamar, idRumah, nama: noKamar, namaRumah, status: "edited" }));
    } catch (err) {
      showToast("Gagal: " + err, "error");
      btn.disabled = false; btn.textContent = "💾 Simpan Perubahan";
    }
  });
}

/* ── JK Toggle ── */
function initJKToggle(defaultVal = "Bebas") {
  document.querySelectorAll(".jk-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.val === defaultVal);
    btn.addEventListener("click", () => {
      document.querySelectorAll(".jk-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

/* ── Kapasitas Stepper ── */
function initKapasitasStepper() {
  const inp   = document.getElementById("kapasitas");
  const minus = document.getElementById("kap-minus");
  const plus  = document.getElementById("kap-plus");
  if (!inp) return;

  function clamp(v) { return Math.min(20, Math.max(1, v)); }

  minus?.addEventListener("click", () => {
    inp.value = clamp((parseInt(inp.value) || 1) - 1);
  });
  plus?.addEventListener("click", () => {
    inp.value = clamp((parseInt(inp.value) || 1) + 1);
  });
  inp.addEventListener("input", () => {
    const v = parseInt(inp.value);
    if (!isNaN(v)) inp.value = clamp(v);
  });
}

/* ── Diskon ── */
export function initDiskon(defaultDiskon = 0) {
  const inpDiskon = document.getElementById("diskon-val");
  const labelEl   = document.getElementById("diskon-label");
  const previewEl = document.getElementById("harga-preview");
  const inpHarga  = document.getElementById("harga");
  if (!inpDiskon) return;

  function updateLabel(pct) {
    if (labelEl) {
      labelEl.textContent = pct > 0 ? `— Diskon ${pct}%` : "— Tanpa diskon";
    }
    // Update active state preset
    document.querySelectorAll(".diskon-preset").forEach(b => {
      b.classList.toggle("active", parseInt(b.dataset.pct) === pct);
    });
    // Preview harga
    if (previewEl) {
      const harga = parseFloat(inpHarga?.value) || 0;
      if (pct > 0 && harga > 0) {
        const efektif = Math.round(harga * (1 - pct / 100));
        previewEl.innerHTML = `
          <span class="harga-preview-coret">Rp ${harga.toLocaleString("id")}</span>
          <span>→</span>
          <strong>Rp ${efektif.toLocaleString("id")}/bln</strong>
          <span style="font-size:.72rem;color:var(--danger);font-weight:700">(-${pct}%)</span>`;
      } else {
        previewEl.innerHTML = "";
      }
    }
  }

  // Preset buttons
  document.querySelectorAll(".diskon-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const pct = parseInt(btn.dataset.pct);
      inpDiskon.value = pct;
      updateLabel(pct);
    });
  });

  // Custom input
  inpDiskon.addEventListener("input", () => {
    const pct = Math.min(90, Math.max(0, parseInt(inpDiskon.value) || 0));
    updateLabel(pct);
  });

  // Harga change → update preview
  inpHarga?.addEventListener("input", () => {
    updateLabel(parseInt(inpDiskon.value) || 0);
  });

  // Init dengan nilai default
  updateLabel(defaultDiskon);
}