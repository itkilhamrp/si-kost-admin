// ================================================================
//  lib.rs — Entry point SI-KOST v2 (Modified for Android Release)
// ================================================================

pub mod error;
pub mod models;
pub mod db;
pub mod commands;

use tauri::Manager;

// --- Manajemen tema (anti flash putih via file) ---
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

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

struct AppState {
    theme: Mutex<String>,
    theme_file: PathBuf,
}

fn read_theme(path: &PathBuf) -> String {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.get("theme").and_then(|t| t.as_str()).map(String::from))
        .unwrap_or_else(|| "dark".into())
}

fn write_theme(path: &PathBuf, theme: &str) {
    let data = serde_json::json!({ "theme": theme });
    let _ = fs::write(path, data.to_string());
}

#[tauri::command]
fn set_theme(state: tauri::State<'_, AppState>, theme: String) {
    // Simpan ke file dulu (pakai referensi)
    write_theme(&state.theme_file, &theme);
    // Lalu masukkan ke state
    let mut stored = state.theme.lock().unwrap();
    *stored = theme;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Gagal mendapatkan folder data");
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("Gagal membuat folder data");
            }
            db::init_db(app.handle())?;

            let mut theme_file = app_data_dir.clone();
            theme_file.push("theme.json");
            let initial_theme = read_theme(&theme_file);

            app.manage(AppState {
                theme: Mutex::new(initial_theme),
                theme_file,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cek_akun, daftar_akun, login, ganti_password,
            get_display_name, set_display_name,
            get_pengaturan, set_pengaturan,
            get_semua_unit, tambah_unit, hapus_unit,
            get_semua_rumah_list, get_semua_rumah,
            tambah_rumah, edit_rumah, toggle_pin_rumah, hapus_rumah,
            get_kamar_by_rumah, tambah_kamar, edit_kamar, hapus_kamar,
            get_semua_kontak, get_kontak_by_id,
            tambah_kontak, edit_kontak, hapus_kontak,
            get_penghuni_aktif, get_riwayat_kamar,
            tambah_penghuni, pindah_penghuni, checkout_penghuni,
            perpanjang_penghuni, hapus_alumni,
            get_pembayaran_penghuni, tambah_pembayaran,
            hapus_pembayaran, get_ringkasan_keuangan,
            set_theme
        ])
        .run(tauri::generate_context!())
        .expect("Error menjalankan SI-KOST")
}