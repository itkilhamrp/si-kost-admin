/**
 * pages/add-penghuni.js
 * DEPRECATED: dialihkan ke add-penghuni-kamar.js yang menggunakan sistem kontak baru.
 * File ini hanya untuk kompatibilitas redirect.
 */
import { requireAuth } from "../core/auth.js";
import { getParams, buildUrl } from "../core/utils.js";

export async function initAddPenghuni() {
  if (!requireAuth()) return;
  const params    = getParams();
  const idKamar   = params.get("id");
  const idRumah   = params.get("idRumah");
  const namaKamar = params.get("nama")      ?? "";
  const namaRumah = params.get("namaRumah") ?? "";
  // Redirect ke halaman baru
  location.replace(buildUrl("/page/add_penghuni_kamar.html", { idKamar, idRumah, namaKamar, namaRumah }));
}