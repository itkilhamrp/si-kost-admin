/**
 * pages/add-kost.js — Tambah rumah kos baru
 */
import { tambahRumah }    from "../core/api.js";
import { requireAuth }    from "../core/auth.js";
import { showToast }      from "../ui/toast.js";
import { initImagePicker, getImage, isImageProcessing } from "../ui/image-picker.js";

export async function initAddKost() {
  if (!requireAuth()) return;
  initImagePicker("input-gambar", "preview-gambar");

  const btn = document.getElementById("btn-simpan");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    if (isImageProcessing()) {
      showToast("Gambar masih diproses, tunggu sebentar...", "error"); return;
    }
    const nama   = document.getElementById("nama")?.value.trim();
    const alamat = document.getElementById("alamat")?.value.trim();
    if (!nama)   { showToast("Nama rumah kos wajib diisi!", "error"); return; }
    if (!alamat) { showToast("Alamat wajib diisi!", "error"); return; }

    btn.disabled = true; btn.textContent = "⏳ Menyimpan...";
    try {
      await tambahRumah(nama, alamat, getImage());
      location.replace("/index.html?status=added");
    } catch (err) {
      showToast("Gagal menyimpan: " + err, "error");
      btn.disabled = false; btn.textContent = "Simpan Rumah Kos";
    }
  });
}