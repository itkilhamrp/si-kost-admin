/**
 * pages/add-kontak.js — Tambah kontak penghuni baru
 */
import { tambahKontak }  from "../core/api.js";
import { requireAuth }   from "../core/auth.js";
import { buildUrl }      from "../core/utils.js";
import { showToast }     from "../ui/toast.js";

let _profilImg = null, _ktpImg = null;
let _profilProc = false, _ktpProc = false;

function setupPicker(inputId, previewId, hintId, onResult, onProc) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const hint    = document.getElementById(hintId);
  const area    = input?.closest(".image-picker-area");
  if (!input || !area) return;
  area.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { showToast("Gambar maks 5 MB.", "error"); return; }
    onProc(true);
    const canvas = document.createElement("canvas");
    const img    = new Image();
    const url    = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1200; let w = img.width, h = img.height;
      if (w > max || h > max) {
        if (w > h) { h = Math.round(h*max/w); w = max; }
        else       { w = Math.round(w*max/h); h = max; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = ev => {
          onResult(ev.target.result);
          if (preview) { preview.src = ev.target.result; preview.classList.remove("hidden"); }
          if (hint) hint.style.display = "none";
          onProc(false);
        };
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.82);
    };
    img.src = url;
  });
}

export async function initAddKontak() {
  if (!requireAuth()) return;

  const params   = new URLSearchParams(location.search);
  const returnTo = params.get("return");

  document.getElementById("btn-back").href = returnTo ?? "/page/kontak_penghuni.html";

  setupPicker("input-profil", "preview-profil", "picker-hint-profil",
    b => { _profilImg = b; }, p => { _profilProc = p; });
  setupPicker("input-ktp", "preview-ktp", "picker-hint-ktp",
    b => { _ktpImg = b; }, p => { _ktpProc = p; });

  document.querySelectorAll(".jk-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".jk-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const btn = document.getElementById("btn-simpan-kontak");
  btn?.addEventListener("click", async () => {
    if (btn.disabled) return;
    if (_profilProc || _ktpProc) { showToast("Gambar masih diproses...", "error"); return; }
    const nama = document.getElementById("nama-kontak")?.value.trim();
    const jk   = document.querySelector(".jk-btn.active")?.dataset.val ?? "Pria";
    const noHp = document.getElementById("no-hp")?.value.trim() || null;
    const desc = document.getElementById("deskripsi")?.value.trim() || null;
    if (!nama) { showToast("Nama wajib diisi!", "error"); return; }
    btn.disabled = true; btn.textContent = "⏳ Menyimpan...";
    try {
      const newId = await tambahKontak(nama, jk, noHp, _profilImg, _ktpImg, desc);
      if (returnTo) {
        location.replace(buildUrl(returnTo, { newKontakId: newId }));
      } else {
        location.replace("/page/kontak_penghuni.html?status=added");
      }
    } catch (e) {
      showToast("Gagal: " + e, "error");
      btn.disabled = false; btn.textContent = "Simpan Kontak";
    }
  });
}