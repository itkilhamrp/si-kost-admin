/**
 * pages/edit-rumah.js — Edit rumah kos
 */
import { getSemualRumah, editRumah }  from "../core/api.js";
import { requireAuth }                from "../core/auth.js";
import { getParams, buildUrl }        from "../core/utils.js";
import { showToast }                  from "../ui/toast.js";
import { initImagePicker, getImage, isImageRemoved, isImageProcessing } from "../ui/image-picker.js";

export async function initEditRumah() {
  if (!requireAuth()) return;
  const params    = getParams();
  const idRumah   = parseInt(params.get("id"));
  const namaRumah = params.get("nama") ?? "";
  document.getElementById("btn-back").href =
    buildUrl("/page/detail_kost.html", { id: idRumah, nama: namaRumah });

  try {
    const list  = await getSemualRumah();
    const rumah = list.find(r => r.id_rumah === idRumah);
    if (!rumah) { showToast("Data tidak ditemukan.", "error"); return; }
    document.getElementById("nama").value   = rumah.nama_rumah;
    document.getElementById("alamat").value = rumah.alamat;
    initImagePicker("input-gambar", "preview-gambar", "picker-hint", rumah.gambar ?? null);
  } catch (e) { showToast("Gagal memuat: " + e, "error"); return; }

  const btn = document.getElementById("btn-simpan");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    if (isImageProcessing()) { showToast("Gambar masih diproses...", "error"); return; }
    const nama   = document.getElementById("nama")?.value.trim();
    const alamat = document.getElementById("alamat")?.value.trim();
    if (!nama || !alamat) { showToast("Nama dan alamat wajib diisi!", "error"); return; }
    btn.disabled = true; btn.textContent = "⏳ Menyimpan...";
    try {
      await editRumah(idRumah, nama, alamat, getImage(), isImageRemoved());
      location.replace(buildUrl("/page/detail_kost.html", { id: idRumah, nama, status: "edited" }));
    } catch (e) {
      showToast("Gagal: " + e, "error");
      btn.disabled = false; btn.textContent = "Simpan Perubahan";
    }
  });
}