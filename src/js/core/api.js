/**
 * core/api.js — Tauri invoke + cache layer
 *
 * ATURAN PENTING — Tauri v2 dengan withGlobalTauri: true
 * otomatis convert camelCase → snake_case sebelum matching ke Rust.
 *
 * Jadi JS HARUS kirim camelCase:
 *   JS kirim  : { idUnit: 5 }
 *   Tauri ubah: { id_unit: 5 }
 *   Rust terima: id_unit: i32  ✅
 *
 * Commands yg punya Payload struct → payload fields juga camelCase:
 *   tambah_rumah  → { payload: { nama, alamat, gambarBase64, hapusGambar } }
 *   edit_rumah    → { idRumah, payload: { nama, alamat, gambarBase64, hapusGambar } }
 *   dst...
 *
 * CATATAN: nama command invoke() tetap snake_case (tidak diconvert).
 */

const { invoke } = window.__TAURI__.core;
import { get, bust, bustPrefix } from "./cache.js";

/* ══ AUTH ══ */
export const cekAkun = () => invoke("cek_akun");

export const daftarAkun = (username, password, displayName) =>
  invoke("daftar_akun", {
    username,
    password,
    displayName: displayName ?? null,
  });

export const login = (password) =>
  invoke("login", { password });

export const gantiPassword = (passwordLama, passwordBaru) =>
  invoke("ganti_password", {
    passwordLama,
    passwordBaru,
  });

/* ══ DISPLAY NAME ══ */
export const getDisplayName = () =>
  get("displayname", () => invoke("get_display_name"));

export async function setDisplayName(nama) {
  await invoke("set_display_name", { displayName: nama });
  bust("displayname");
}

/* ══ PENGATURAN ══ */
export const getPengaturan = (kunci) =>
  invoke("get_pengaturan", { kunci });

export const setPengaturan = (kunci, nilai) =>
  invoke("set_pengaturan", { kunci, nilai });

/* ══ UNIT ══ */
export const getSemualUnit = () =>
  get("unit", () => invoke("get_semua_unit"));

export async function tambahUnit(nama, ikon) {
  await invoke("tambah_unit", { nama, ikon });
  bust("unit");
}

export async function hapusUnit(idUnit) {
  await invoke("hapus_unit", { idUnit });
  bust("unit");
}

/* ══ RUMAH KOS ══ */
export const getSemualRumah = () =>
  get("rumah", () => invoke("get_semua_rumah"));

export const getSemualRumahList = () =>
  get("rumah", () => invoke("get_semua_rumah_list"));

export async function tambahRumah(nama, alamat, gambarBase64) {
  await invoke("tambah_rumah", {
    payload: {
      nama,
      alamat,
      gambarBase64: gambarBase64 ?? null,
      hapusGambar: null,
    },
  });
  bust("rumah", "keuangan:all");
}

export async function editRumah(idRumah, nama, alamat, gambarBase64, hapusGambar = false) {
  await invoke("edit_rumah", {
    idRumah,
    payload: {
      nama,
      alamat,
      gambarBase64: gambarBase64 ?? null,
      hapusGambar,
    },
  });
  bust("rumah", `keuangan:${idRumah}`, "keuangan:all");
}

export async function togglePinRumah(idRumah) {
  await invoke("toggle_pin_rumah", { idRumah });
  bust("rumah");
}

export async function hapusRumah(idRumah) {
  await invoke("hapus_rumah", { idRumah });
  bust("rumah", "keuangan:all", `keuangan:${idRumah}`);
  bustPrefix(`kamar:`);
}

/* ══ KAMAR ══ */
export const getKamarByRumah = (idRumah) =>
  get(`kamar:${idRumah}`, () =>
    invoke("get_kamar_by_rumah", { idRumah })
  );

export async function tambahKamar(
  idRumah, noKamar, harga, diskon, lantai,
  jenisKelamin, kapasitas, gambarBase64, unitIds = []
) {
  await invoke("tambah_kamar", {
    payload: {
      idRumah,
      noKamar,
      harga,
      diskon,
      lantai,
      jenisKelamin,
      kapasitas,
      gambarBase64: gambarBase64 ?? null,
      hapusGambar: null,
      unitIds,
    },
  });
  bust("rumah", `kamar:${idRumah}`, "keuangan:all", `keuangan:${idRumah}`);
}

export async function editKamar(
  idKamar, noKamar, harga, diskon, lantai,
  jenisKelamin, kapasitas, gambarBase64, hapusGambar = false, unitIds = []
) {
  await invoke("edit_kamar", {
    idKamar,
    payload: {
      idRumah: null,
      noKamar,
      harga,
      diskon,
      lantai,
      jenisKelamin,
      kapasitas,
      gambarBase64: gambarBase64 ?? null,
      hapusGambar,
      unitIds,
    },
  });
  bustPrefix("kamar:");
  bust("rumah", "keuangan:all");
}

export async function hapusKamar(idKamar) {
  await invoke("hapus_kamar", { idKamar });
  bustPrefix("kamar:");
  bustPrefix("penghuni:");
  bustPrefix("riwayat:");
  bust("rumah", "keuangan:all");
}

/* ══ KONTAK PENGHUNI ══ */
export const getSemualKontak = () =>
  get("kontak", () => invoke("get_semua_kontak"));

export const getKontakById = (idKontak) =>
  get(`kontak:${idKontak}`, () =>
    invoke("get_kontak_by_id", { idKontak })
  );

export async function tambahKontak(nama, jenisKelamin, noHp, fotoProfil, fotoKtp, deskripsi) {
  const id = await invoke("tambah_kontak", {
    payload: {
      nama,
      jenisKelamin,
      noHp: noHp ?? null,
      fotoProfil: fotoProfil ?? null,
      hapusFotoProfil: null,
      fotoKtp: fotoKtp ?? null,
      hapusFotoKtp: null,
      deskripsi: deskripsi ?? null,
    },
  });
  bust("kontak");
  bustPrefix("kontak:");
  return id;
}

export async function editKontak(
  idKontak, nama, jenisKelamin, noHp,
  fotoProfil, hapusFotoProfil,
  fotoKtp, hapusFotoKtp, deskripsi
) {
  await invoke("edit_kontak", {
    idKontak,
    payload: {
      nama,
      jenisKelamin,
      noHp: noHp ?? null,
      fotoProfil: fotoProfil ?? null,
      hapusFotoProfil: hapusFotoProfil ?? false,
      fotoKtp: fotoKtp ?? null,
      hapusFotoKtp: hapusFotoKtp ?? false,
      deskripsi: deskripsi ?? null,
    },
  });
  bust("kontak", `kontak:${idKontak}`);
}

export async function hapusKontak(idKontak) {
  await invoke("hapus_kontak", { idKontak });
  bust("kontak", `kontak:${idKontak}`);
  bustPrefix("penghuni:");
  bustPrefix("riwayat:");
}

/* ══ PENGHUNI KAMAR ══ */
export const getPenghuniAktif = (idKamar) =>
  get(`penghuni:${idKamar}`, () =>
    invoke("get_penghuni_aktif", { idKamar })
  );

export async function tambahPenghuni(idKamar, idKontak, tglMasuk, tglKeluar) {
  await invoke("tambah_penghuni", {
    payload: {
      idKamar,
      idKontak,
      tglMasuk,
      tglKeluar: tglKeluar ?? null,
    },
  });
  bustPrefix("penghuni:");
  bustPrefix("riwayat:");
  bustPrefix("kamar:");
  bust("rumah", "keuangan:all", "kontak", `kontak:${idKontak}`);
}

export async function checkoutPenghuni(idPenghuni, tglKeluar) {
  await invoke("checkout_penghuni", {
    idPenghuni,
    tglKeluar,
  });
  bustPrefix("penghuni:");
  bustPrefix("riwayat:");
  bustPrefix("kamar:");
  bust("rumah", "keuangan:all", "kontak");
}

export async function perpanjangPenghuni(idPenghuni, tglKeluarBaru) {
  await invoke("perpanjang_penghuni", {
    idPenghuni,
    tglKeluarBaru,
  });
  bustPrefix("penghuni:");
  bustPrefix("riwayat:");
}

export async function hapusAlumni(idPenghuni) {
  await invoke("hapus_alumni", { idPenghuni });
  bustPrefix("penghuni:");
  bustPrefix("riwayat:");
  bust("rumah", "keuangan:all");
}

export const getRiwayatKamar = (idKamar) =>
  get(`riwayat:${idKamar}`, () =>
    invoke("get_riwayat_kamar", { idKamar })
  );

  // Tambahkan ke api.js, di bagian ══ PENGHUNI KAMAR ══:

export async function pindahPenghuni(idPenghuni, idKamarBaru) {
  await invoke("pindah_penghuni", {
    idPenghuni,
    idKamarBaru,
  });
  bustPrefix("penghuni:");
  bustPrefix("kamar:");
  bust("rumah", "keuangan:all", "kontak");
  bustPrefix("kontak:");
}

/* ══ PEMBAYARAN ══ */
export const getPembayaranPenghuni = (idPenghuni) =>
  get(`bayar:${idPenghuni}`, () =>
    invoke("get_pembayaran_penghuni", { idPenghuni })
  );

export async function tambahPembayaran(idPenghuni, jumlahBayar, bulanTahun, keterangan) {
  await invoke("tambah_pembayaran", {
    payload: {
      idPenghuni,
      jumlahBayar,
      bulanTahun,
      keterangan: keterangan ?? null,
    },
  });
  bust(`bayar:${idPenghuni}`, "keuangan:all");
  bustPrefix("keuangan:");
}

export async function hapusPembayaran(idBayar) {
  await invoke("hapus_pembayaran", { idBayar });
  bustPrefix("bayar:");
  bustPrefix("keuangan:");
}

/* ══ KEUANGAN ══ */
export const getRingkasanKeuangan = (idRumah) => {
  const ns = idRumah != null ? `keuangan:${idRumah}` : "keuangan:all";
  return get(ns, () =>
    invoke("get_ringkasan_keuangan", { idRumah: idRumah ?? null })
  );
};