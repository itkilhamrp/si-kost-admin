// ================================================================
//  commands/mod.rs — deklarasi semua modul commands
//
//  Setiap file adalah satu domain bisnis yang berisi:
//    - SQL queries (langsung ke Connection)
//    - Business logic & validasi
//    - #[tauri::command] functions
//
//  Semua menggunakan AppState via tauri::State
//  dan map_err(|e| e.to_string()) untuk error handling.
// ================================================================

pub mod auth;
pub mod unit;
pub mod rumah;
pub mod kamar;
pub mod kontak;
pub mod penghuni;
pub mod keuangan;