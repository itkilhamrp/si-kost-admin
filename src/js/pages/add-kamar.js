/**
 * pages/add-kamar.js — Tambah kamar baru
 */
import { tambahKamar, getSemualUnit }  from "../core/api.js";
import { requireAuth }                 from "../core/auth.js";
import { getParams, buildUrl, formatRupiah } from "../core/utils.js";
import { showToast }                   from "../ui/toast.js";
import { initImagePicker, getImage, isImageProcessing } from "../ui/image-picker.js";

export async function initAddKamar() {
  if (!requireAuth()) return;

  const params    = getParams();
  const idRumah   = parseInt(params.get("id"));
  const namaRumah = params.get("nama") ?? "";
  const backUrl   = buildUrl("/page/detail_kost.html", { id: idRumah, nama: namaRumah });

  document.getElementById("btn-back").href = backUrl;
  initImagePicker("input-gambar", "preview-gambar");
  initJKToggle("Bebas");
  initDiskon();

  /* Unit/Fasilitas */
  try {
    const units = await getSemualUnit();
    const grid  = document.getElementById("unit-grid");
    if (grid) {
      grid.innerHTML = units.length
        ? units.map(u =>
            `<input type="checkbox" class="properti-check" id="u-${u.id_unit}" value="${u.id_unit}">
             <label class="properti-label" for="u-${u.id_unit}">${u.ikon} ${u.nama}</label>`
          ).join("")
        : `<p style="font-size:.8rem;color:var(--text-3)">Belum ada unit.
             <a href="/page/unit.html" style="color:var(--green)">Tambah di Unit</a>.</p>`;
    }
  } catch (e) { console.error(e); }

  /* Simpan */
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

    if (!noKamar)               { showToast("Nomor kamar wajib diisi!", "error"); return; }
    if (isNaN(harga) || harga <= 0) { showToast("Harga harus lebih dari 0!", "error"); return; }
    if (kapasitas < 1 || kapasitas > 20) { showToast("Kapasitas 1–20 orang.", "error"); return; }
    if (diskon < 0 || diskon > 90) { showToast("Diskon harus antara 0–90%.", "error"); return; }

    btn.disabled = true; btn.textContent = "⏳ Menyimpan...";
    try {
      await tambahKamar(idRumah, noKamar, harga, diskon, lantai, jenisKelamin, kapasitas, getImage(), unitIds);
      location.replace(buildUrl("/page/detail_kost.html", { id: idRumah, nama: namaRumah, status: "kamar_added" }));
    } catch (err) {
      showToast("Gagal: " + err, "error");
      btn.disabled = false; btn.textContent = "Simpan Kamar";
    }
  });
}

/* ── Diskon logic (diekspor agar bisa dipakai edit-kamar.js) ── */
export function initDiskon(initialDiskon = 0) {
  const hargaInp = document.getElementById("harga");
  const valInp   = document.getElementById("diskon-val");
  const label    = document.getElementById("diskon-label");
  const prev     = document.getElementById("harga-preview");
  if (valInp && initialDiskon > 0) valInp.value = initialDiskon;

  function updatePreview() {
    const h = parseFloat(hargaInp?.value) || 0;
    const d = parseFloat(valInp?.value) || 0;
    if (!prev) return;
    if (d > 0 && h > 0) {
      const efektif = Math.round(h * (1 - d / 100));
      prev.innerHTML = `<span class="harga-coret">${formatRupiah(h)}</span> <span class="harga-efektif">${formatRupiah(efektif)}</span> <span class="diskon-badge">-${d}%</span>`;
    } else {
      prev.innerHTML = h > 0 ? `<span class="harga-efektif">${formatRupiah(h)}</span>` : "";
    }
    if (label) label.textContent = d > 0 ? `Diskon ${d}%` : "Tanpa diskon";
    document.querySelectorAll(".diskon-preset").forEach(b => {
      b.classList.toggle("active", parseInt(b.dataset.pct) === Math.round(d));
    });
  }

  document.querySelectorAll(".diskon-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const pct = parseInt(btn.dataset.pct);
      valInp.value = parseFloat(valInp.value) === pct ? 0 : pct;
      updatePreview();
    });
  });
  valInp?.addEventListener("input", updatePreview);
  hargaInp?.addEventListener("input", updatePreview);
  updatePreview();
}

/* ── JK toggle (diekspor) ── */
export function initJKToggle(initial = "Bebas") {
  document.querySelectorAll(".jk-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.val === initial);
    btn.addEventListener("click", () => {
      document.querySelectorAll(".jk-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}