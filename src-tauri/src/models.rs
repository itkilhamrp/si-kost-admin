// ================================================================
//  models.rs — Semua struct SI-KOST
//
//  PENTING — Tauri v2 + withGlobalTauri: true
//
//  Tauri convert parameter TOP-LEVEL camelCase → snake_case.
//  Tapi field di dalam payload object TIDAK diconvert Tauri —
//  langsung masuk serde apa adanya (camelCase dari JS).
//
//  Jadi Payload structs pakai:
//    #[serde(rename_all = "camelCase")]
//  Agar serde bisa match field camelCase dari JS.
//
//  Contoh alur tambah_penghuni:
//    JS kirim  : { payload: { idKamar: 1, idKontak: 2, tglMasuk: "..." } }
//    serde     : deserialize camelCase → field snake_case di struct ✅
//
//  Response Serialize: tetap snake_case, JS akses snake_case.
// ================================================================

use serde::{Deserialize, Serialize};

// ════════════════════════════════════════════════════════════
//  [A] RESPONSE STRUCTS — dikirim ke JS (Serialize)
// ════════════════════════════════════════════════════════════

#[derive(Serialize)]
pub struct AkunInfo {
    pub ada: bool,
}

#[derive(Serialize)]
pub struct LoginResult {
    pub sukses: bool,
    pub pesan:  String,
}

#[derive(Serialize)]
pub struct Unit {
    pub id_unit: i32,
    pub nama:    String,
    pub ikon:    String,
}

#[derive(Serialize)]
pub struct UnitKamar {
    pub id_unit: i32,
    pub nama:    String,
    pub ikon:    String,
}

#[derive(Serialize)]
pub struct RumahList {
    pub id_rumah:     i32,
    pub nama_rumah:   String,
    pub alamat:       String,
    pub is_pinned:    bool,
    pub jumlah_kamar: i32,
    pub gambar:       Option<String>,
}

#[derive(Serialize)]
pub struct Rumah {
    pub id_rumah:     i32,
    pub nama_rumah:   String,
    pub alamat:       String,
    pub gambar:       Option<String>,
    pub is_pinned:    bool,
    pub jumlah_kamar: i32,
}

#[derive(Serialize)]
pub struct Kamar {
    pub id_kamar:         i32,
    pub id_rumah:         i32,
    pub no_kamar:         String,
    pub harga:            f64,
    pub diskon:           f64,
    pub harga_efektif:    f64,
    pub lantai:           String,
    pub jenis_kelamin:    String,
    pub kapasitas:        i32,
    pub gambar:           Option<String>,
    pub status:           String,
    pub jumlah_penghuni:  i32,
    pub total_pendapatan: f64,
    pub unit:             Vec<UnitKamar>,
}

#[derive(Serialize)]
pub struct KontakPenghuni {
    pub id_kontak:         i32,
    pub nama:              String,
    pub jenis_kelamin:     String,
    pub no_hp:             Option<String>,
    pub foto_profil:       Option<String>,
    pub foto_ktp:          Option<String>,
    pub deskripsi:         Option<String>,
    pub kamar_aktif:       Option<String>,
    pub id_penghuni_aktif: Option<i32>,
    pub id_kamar_aktif:    Option<i32>,
    pub id_rumah_aktif:    Option<i32>,
    pub no_kamar_aktif:    Option<String>,
    pub nama_rumah_aktif:  Option<String>,
}

#[derive(Serialize)]
pub struct Penghuni {
    pub id_penghuni:   i32,
    pub id_kamar:      i32,
    pub id_kontak:     Option<i32>,
    pub nama_penghuni: String,
    pub jenis_kelamin: String,
    pub tgl_masuk:     String,
    pub tgl_keluar:    Option<String>,
    pub status_huni:   String,
}

#[derive(Serialize)]
pub struct RiwayatKamar {
    pub id_penghuni:   i32,
    pub id_kontak:     Option<i32>,
    pub nama_penghuni: String,
    pub tgl_masuk:     String,
    pub tgl_keluar:    Option<String>,
    pub status_huni:   String,
    pub total_bayar:   f64,
}

#[derive(Serialize)]
pub struct Pembayaran {
    pub id_bayar:      i32,
    pub id_penghuni:   i32,
    pub jumlah_bayar:  f64,
    pub bulan_tahun:   String,
    pub tgl_transaksi: String,
    pub keterangan:    Option<String>,
}

#[derive(Serialize)]
pub struct RingkasanKeuangan {
    pub total_pendapatan: f64,
    pub bulan_ini:        f64,
    pub kamar_terisi:     i32,
    pub kamar_kosong:     i32,
}

// ════════════════════════════════════════════════════════════
//  [B] PAYLOAD STRUCTS — input dari JS (Deserialize)
//
//  Pakai #[serde(rename_all = "camelCase")] karena:
//  - Field dalam payload{} tidak diconvert Tauri
//  - JS kirim camelCase langsung ke serde
//  - Field Rust tetap snake_case, serde yang handle mapping
// ════════════════════════════════════════════════════════════

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadRumah {
    pub nama:          String,
    pub alamat:        String,
    pub gambar_base64: Option<String>,
    pub hapus_gambar:  Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadKamar {
    pub id_rumah:      Option<i32>,
    pub no_kamar:      String,
    pub harga:         f64,
    pub diskon:        f64,
    pub lantai:        String,
    pub jenis_kelamin: String,
    pub kapasitas:     i32,
    pub gambar_base64: Option<String>,
    pub hapus_gambar:  Option<bool>,
    pub unit_ids:      Vec<i32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadKontak {
    pub nama:              String,
    pub jenis_kelamin:     String,
    pub no_hp:             Option<String>,
    pub foto_profil:       Option<String>,
    pub hapus_foto_profil: Option<bool>,
    pub foto_ktp:          Option<String>,
    pub hapus_foto_ktp:    Option<bool>,
    pub deskripsi:         Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadPenghuni {
    pub id_kamar:   i32,
    pub id_kontak:  i32,
    pub tgl_masuk:  String,
    pub tgl_keluar: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayloadPembayaran {
    pub id_penghuni:  i32,
    pub jumlah_bayar: f64,
    pub bulan_tahun:  String,
    pub keterangan:   Option<String>,
}