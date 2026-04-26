/**
 * pages/edit-kontak.js — Edit kontak penghuni
 * Tidak ada inline onclick — file ini sudah CSP-safe
 */
import { getKontakById, editKontak } from "../core/api.js";
import { requireAuth }  from "../core/auth.js";
import { buildUrl }     from "../core/utils.js";
import { showToast }    from "../ui/toast.js";

let _profilImg = null, _ktpImg = null;
let _hapusProfil = false, _hapusKtp = false;
let _profilProc  = false, _ktpProc  = false;

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

export async function initEditKontak() {
  if (!requireAuth()) return;
  const params   = new URLSearchParams(location.search);
  const idKontak = parseInt(params.get("id"));
  if (!idKontak) { location.replace("/page/kontak_penghuni.html"); return; }

  const backUrl = buildUrl("/page/detail_kontak_penghuni.html", { id: idKontak });
  document.getElementById("btn-back").href = backUrl;

  let kontak;
  try { kontak = await getKontakById(idKontak); }
  catch (e) { showToast("Gagal memuat: " + e, "error"); return; }

  document.getElementById("nama-kontak").value = kontak.nama;
  document.getElementById("no-hp").value       = kontak.no_hp ?? "";
  document.getElementById("deskripsi").value   = kontak.deskripsi ?? "";

  document.querySelectorAll(".jk-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.val === kontak.jenis_kelamin);
    btn.addEventListener("click", () => {
      document.querySelectorAll(".jk-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const prevProfil  = document.getElementById("preview-profil");
  const hintProfil  = document.getElementById("picker-hint-profil");
  const btnHpProfil = document.getElementById("btn-hapus-profil");
  if (kontak.foto_profil && prevProfil) {
    prevProfil.src = kontak.foto_profil; prevProfil.classList.remove("hidden");
    if (hintProfil) hintProfil.style.display = "none";
    btnHpProfil?.classList.remove("hidden");
  }
  btnHpProfil?.addEventListener("click", () => {
    _hapusProfil = true; _profilImg = null;
    if (prevProfil) { prevProfil.src = ""; prevProfil.classList.add("hidden"); }
    if (hintProfil) hintProfil.style.display = "";
    btnHpProfil.classList.add("hidden");
  });

  const prevKtp  = document.getElementById("preview-ktp");
  const hintKtp  = document.getElementById("picker-hint-ktp");
  const btnHpKtp = document.getElementById("btn-hapus-ktp");
  if (kontak.foto_ktp && prevKtp) {
    prevKtp.src = kontak.foto_ktp; prevKtp.classList.remove("hidden");
    if (hintKtp) hintKtp.style.display = "none";
    btnHpKtp?.classList.remove("hidden");
  }
  btnHpKtp?.addEventListener("click", () => {
    _hapusKtp = true; _ktpImg = null;
    if (prevKtp) { prevKtp.src = ""; prevKtp.classList.add("hidden"); }
    if (hintKtp) hintKtp.style.display = "";
    btnHpKtp.classList.add("hidden");
  });

  setupPicker("input-profil", "preview-profil", "picker-hint-profil",
    b => { _profilImg = b; _hapusProfil = false; btnHpProfil?.classList.remove("hidden"); },
    p => { _profilProc = p; });
  setupPicker("input-ktp", "preview-ktp", "picker-hint-ktp",
    b => { _ktpImg = b; _hapusKtp = false; btnHpKtp?.classList.remove("hidden"); },
    p => { _ktpProc = p; });

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
      await editKontak(idKontak, nama, jk, noHp, _profilImg, _hapusProfil, _ktpImg, _hapusKtp, desc);
      location.replace(buildUrl("/page/detail_kontak_penghuni.html", { id: idKontak, status: "edited" }));
    } catch (e) {
      showToast("Gagal: " + e, "error");
      btn.disabled = false; btn.textContent = "Simpan Perubahan";
    }
  });
}