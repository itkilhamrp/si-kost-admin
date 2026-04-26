// ================================================================
//  lib.rs — Entry point SI-KOST v2 (Modified for Android Release)
// ================================================================

pub mod error;
pub mod models;
pub mod db;
pub mod commands;

// Import Manager agar bisa menggunakan fungsi .path()
use tauri::Manager;

use commands::{
    auth::{
        cek_akun, daftar_akun, login, ganti_password,
        get_display_name, set_display_name,
        get_pengaturan, set_pengaturan,
    },
    unit::{get_semua_unit, tambah_unit, hapus_unit},
    rumah::{
        get_semua_rumah_list, get_semua_rumah,
        tambah_rumah, edit_rumah, toggle_pin_rumah, hapus_rumah,
    },
    kamar::{get_kamar_by_rumah, tambah_kamar, edit_kamar, hapus_kamar},
    kontak::{
        get_semua_kontak, get_kontak_by_id,
        tambah_kontak, edit_kontak, hapus_kontak,
    },
    penghuni::{
        get_penghuni_aktif, get_riwayat_kamar,
        tambah_penghuni, pindah_penghuni, checkout_penghuni,
        perpanjang_penghuni, hapus_alumni,
    },
    keuangan::{
        get_pembayaran_penghuni, tambah_pembayaran,
        hapus_pembayaran, get_ringkasan_keuangan,
    },
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Menggunakan path lengkap agar tidak bentrok dengan Builder lainnya
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            // 1. Ambil path folder data resmi untuk Android
            // Folder ini dijamin punya izin Baca & Tulis (R/W) di mode Release
            let app_data_dir = app.path().app_data_dir().expect("Gagal mendapatkan folder data");
            
            // 2. Buat foldernya secara otomatis jika belum ada
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("Gagal membuat folder data");
            }
            
            // 3. Jalankan inisialisasi database
            // Pastikan fungsi init_db di file db.rs Anda sudah menggunakan path yang benar
            db::init_db(app.handle())?;
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth & Pengaturan
            cek_akun, daftar_akun, login, ganti_password,
            get_display_name, set_display_name,
            get_pengaturan, set_pengaturan,
            // Unit / Fasilitas
            get_semua_unit, tambah_unit, hapus_unit,
            // Rumah Kos
            get_semua_rumah_list, get_semua_rumah,
            tambah_rumah, edit_rumah, toggle_pin_rumah, hapus_rumah,
            // Kamar
            get_kamar_by_rumah, tambah_kamar, edit_kamar, hapus_kamar,
            // Kontak Penghuni
            get_semua_kontak, get_kontak_by_id,
            tambah_kontak, edit_kontak, hapus_kontak,
            // Penghuni Kamar
            get_penghuni_aktif, get_riwayat_kamar,
            tambah_penghuni, pindah_penghuni, checkout_penghuni,
            perpanjang_penghuni, hapus_alumni,
            // Pembayaran & Keuangan
            get_pembayaran_penghuni, tambah_pembayaran,
            hapus_pembayaran, get_ringkasan_keuangan,
        ])
        .run(tauri::generate_context!())
        .expect("Error menjalankan SI-KOST")
}