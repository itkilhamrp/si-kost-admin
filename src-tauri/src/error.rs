// ================================================================
//  error.rs — Tipe error terpusat
//
//  AppError::Db(_)               — error SQLite (auto-convert via From)
//  AppError::Gambar(_)           — gagal proses gambar
//  AppError::Validasi(_)         — input tidak valid, pesan langsung ke user
//  AppError::TidakDitemukan(_)   — resource tidak ditemukan
// ================================================================

use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Db(rusqlite::Error),
    Gambar(String),
    Validasi(String),
    TidakDitemukan(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Db(e)               => write!(f, "Database error: {e}"),
            AppError::Gambar(msg)         => write!(f, "Gagal memproses gambar: {msg}"),
            AppError::Validasi(msg)       => write!(f, "{msg}"),
            AppError::TidakDitemukan(msg) => write!(f, "{msg}"),
        }
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self { AppError::Db(e) }
}

impl From<AppError> for String {
    fn from(e: AppError) -> Self { e.to_string() }
}

pub type AppResult<T> = Result<T, AppError>;