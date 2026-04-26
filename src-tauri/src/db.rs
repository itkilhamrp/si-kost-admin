// ================================================================
//  db.rs — Infrastruktur database (Optimized for Android)
// ================================================================

use rusqlite::Connection;
use std::{fs, io::Cursor, path::PathBuf, sync::Mutex};
use tauri::Manager;
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use image::{codecs::jpeg::JpegEncoder, imageops::FilterType};
use crate::error::{AppError, AppResult};

// ── AppState ──────────────────────────────────────────────────

pub struct AppState {
    pub conn: Mutex<Connection>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        AppState { conn: Mutex::new(conn) }
    }
}

// ── Koneksi ───────────────────────────────────────────────────

pub fn db_path(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("sikost.db")
}

// ── Gambar ────────────────────────────────────────────────────

pub fn compress_image(data_url: &str) -> AppResult<String> {
    let comma = data_url
        .find(',')
        .ok_or_else(|| AppError::Gambar("Format data URL tidak valid".into()))?;
    let bytes = B64
        .decode(&data_url[comma + 1..])
        .map_err(|e| AppError::Gambar(e.to_string()))?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| AppError::Gambar(e.to_string()))?;
    let mut out = Vec::new();
    JpegEncoder::new_with_quality(Cursor::new(&mut out), 82)
        .encode_image(&img.resize(1200, 1200, FilterType::Lanczos3))
        .map_err(|e| AppError::Gambar(e.to_string()))?;
    Ok(format!("data:image/jpeg;base64,{}", B64.encode(&out)))
}

pub fn proses_gambar(raw: Option<&str>) -> AppResult<Option<String>> {
    raw.filter(|s| !s.is_empty()).map(compress_image).transpose()
}

// ── Kalkulasi ─────────────────────────────────────────────────

pub fn hitung_harga_efektif(harga: f64, diskon: f64) -> f64 {
    if diskon <= 0.0 { harga } else { (harga * (1.0 - diskon / 100.0)).round() }
}

// ── Init DB (Satu Koneksi Utama) ───────────────────────────────

pub fn init_db(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Pastikan folder data ada
    let data_dir = app.path().app_data_dir()?;
    fs::create_dir_all(&data_dir)?;
    
    let path = db_path(app);

    // 2. Buka koneksi tunggal
    let conn = Connection::open(&path)?;
    
    // 3. Set PRAGMA untuk stabilitas di Android
    conn.execute_batch("
        PRAGMA foreign_keys=ON; 
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
    ")?;

    // 4. Jalankan DDL (Pembuatan Tabel)
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS akun (
            id           INTEGER PRIMARY KEY CHECK(id=1),
            username     TEXT NOT NULL,
            display_name TEXT NOT NULL DEFAULT '',
            hash_pass    TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pengaturan (
            kunci TEXT PRIMARY KEY,
            nilai TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rumah (
            id_rumah   INTEGER PRIMARY KEY AUTOINCREMENT,
            nama_rumah TEXT NOT NULL,
            alamat     TEXT NOT NULL,
            gambar     TEXT,
            is_pinned  INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS unit (
            id_unit INTEGER PRIMARY KEY AUTOINCREMENT,
            nama    TEXT NOT NULL UNIQUE,
            ikon    TEXT NOT NULL DEFAULT '🏷️'
        );
        CREATE TABLE IF NOT EXISTS kamar (
            id_kamar      INTEGER PRIMARY KEY AUTOINCREMENT,
            id_rumah      INTEGER NOT NULL,
            no_kamar      TEXT    NOT NULL,
            harga         REAL    NOT NULL,
            diskon        REAL    NOT NULL DEFAULT 0,
            lantai        TEXT    NOT NULL DEFAULT '',
            jenis_kelamin TEXT    NOT NULL DEFAULT 'Bebas'
                          CHECK(jenis_kelamin IN ('Bebas','Pria','Wanita')),
            kapasitas     INTEGER NOT NULL DEFAULT 1,
            gambar        TEXT,
            FOREIGN KEY (id_rumah) REFERENCES rumah(id_rumah) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS kamar_unit (
            id_kamar INTEGER NOT NULL,
            id_unit  INTEGER NOT NULL,
            PRIMARY KEY (id_kamar, id_unit),
            FOREIGN KEY (id_kamar) REFERENCES kamar(id_kamar) ON DELETE CASCADE,
            FOREIGN KEY (id_unit)  REFERENCES unit(id_unit)   ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS kontak_penghuni (
            id_kontak     INTEGER PRIMARY KEY AUTOINCREMENT,
            nama          TEXT NOT NULL,
            jenis_kelamin TEXT NOT NULL DEFAULT 'Pria'
                          CHECK(jenis_kelamin IN ('Pria','Wanita')),
            no_hp         TEXT,
            foto_profil   TEXT,
            foto_ktp      TEXT,
            deskripsi     TEXT
        );
        CREATE TABLE IF NOT EXISTS penghuni (
            id_penghuni   INTEGER PRIMARY KEY AUTOINCREMENT,
            id_kamar      INTEGER NOT NULL,
            id_kontak     INTEGER,
            nama_penghuni TEXT    NOT NULL,
            jenis_kelamin TEXT    NOT NULL DEFAULT 'Pria',
            tgl_masuk     TEXT    NOT NULL,
            tgl_keluar    TEXT,
            status_huni   TEXT    NOT NULL DEFAULT 'Aktif'
                          CHECK(status_huni IN ('Aktif','Alumni')),
            FOREIGN KEY (id_kamar)  REFERENCES kamar(id_kamar)            ON DELETE CASCADE,
            FOREIGN KEY (id_kontak) REFERENCES kontak_penghuni(id_kontak)  ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS pembayaran (
            id_bayar      INTEGER PRIMARY KEY AUTOINCREMENT,
            id_penghuni   INTEGER NOT NULL,
            jumlah_bayar  REAL    NOT NULL,
            bulan_tahun   TEXT    NOT NULL,
            tgl_transaksi DATETIME DEFAULT CURRENT_TIMESTAMP,
            keterangan    TEXT,
            FOREIGN KEY (id_penghuni) REFERENCES penghuni(id_penghuni) ON DELETE CASCADE
        );
    ")?;

    // 5. Migrasi aman
    for sql in &[
        "ALTER TABLE akun      ADD COLUMN display_name TEXT NOT NULL DEFAULT '';",
        "ALTER TABLE pembayaran ADD COLUMN keterangan TEXT;",
        "ALTER TABLE kamar     ADD COLUMN diskon REAL NOT NULL DEFAULT 0;",
        "ALTER TABLE kamar     ADD COLUMN lantai TEXT NOT NULL DEFAULT '';",
        "ALTER TABLE kamar     ADD COLUMN jenis_kelamin TEXT NOT NULL DEFAULT 'Bebas';",
        "ALTER TABLE kamar     ADD COLUMN kapasitas INTEGER NOT NULL DEFAULT 1;",
        "ALTER TABLE penghuni  ADD COLUMN id_kontak INTEGER;",
        "ALTER TABLE penghuni  ADD COLUMN jenis_kelamin TEXT NOT NULL DEFAULT 'Pria';",
    ] { let _ = conn.execute_batch(sql); }

    // 6. Seed data default
    let n: i32 = conn.query_row("SELECT COUNT(*) FROM unit", [], |r| r.get(0)).unwrap_or(0);
    if n == 0 {
        conn.execute_batch("
            INSERT INTO unit(nama,ikon) VALUES
                ('Kamar Biasa','🛏️'),('AC','❄️'),('WiFi','📶'),
                ('Kamar Mandi Dalam','🚿'),('Dapur Bersama','🍳'),
                ('Parkir Motor','🏍️'),('Parkir Mobil','🚗');
        ")?;
    }
    conn.execute_batch("INSERT OR IGNORE INTO pengaturan(kunci,nilai) VALUES('theme','system');")?;

    // 7. Daftarkan koneksi yang sedang terbuka ke State Tauri
    app.manage(AppState::new(conn));
    
    Ok(())
}