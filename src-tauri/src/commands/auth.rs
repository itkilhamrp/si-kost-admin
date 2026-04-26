// ================================================================
//  commands/auth.rs — Akun, login, pengaturan
//
//  KRITIS Tauri v2:
//  Parameter command yang multi-kata (snake_case) dikirim dari JS
//  sebagai snake_case juga karena api.js kita sudah pakai snake_case.
//  Tidak perlu #[serde(rename)] karena Tauri v2 menerima args
//  berdasarkan nama parameter Rust secara literal (case-sensitive).
//
//  JADI: JS kirim { display_name: "..." }
//        Rust terima display_name: String  ← match!
// ================================================================

use bcrypt::{hash, verify};
use rusqlite::params;
use tauri::State;
use crate::db::AppState;
use crate::models::{AkunInfo, LoginResult};

// ── Helpers internal ──────────────────────────────────────

fn akun_ada(conn: &rusqlite::Connection) -> bool {
    conn.query_row("SELECT COUNT(*) FROM akun", [], |r| r.get::<_, i32>(0))
        .map(|c| c > 0)
        .unwrap_or(false)
}

fn get_hash(conn: &rusqlite::Connection) -> Result<String, String> {
    conn.query_row("SELECT hash_pass FROM akun WHERE id=1", [], |r| r.get(0))
        .map_err(|e| e.to_string())
}

// ── Commands ──────────────────────────────────────────────

#[tauri::command]
pub fn cek_akun(state: State<AppState>) -> Result<AkunInfo, String> {
    let conn = state.conn.lock().unwrap();
    Ok(AkunInfo { ada: akun_ada(&conn) })
}

// JS kirim: { username, password, display_name }
// Tauri v2: parameter names EXACT match → display_name diterima sebagai display_name
#[tauri::command]
pub fn daftar_akun(
    state:        State<AppState>,
    username:     String,
    password:     String,
    display_name: Option<String>,
) -> Result<LoginResult, String> {
    let conn = state.conn.lock().unwrap();
    let h  = hash(&password, 8).map_err(|e| e.to_string())?;
    let dn = display_name.unwrap_or_default();
    conn.execute(
        "INSERT OR REPLACE INTO akun(id,username,display_name,hash_pass) VALUES(1,?1,?2,?3)",
        params![username, dn, h],
    ).map_err(|e| e.to_string())?;
    Ok(LoginResult { sukses: true, pesan: "Akun berhasil dibuat.".into() })
}

#[tauri::command]
pub fn login(state: State<AppState>, password: String) -> Result<LoginResult, String> {
    let conn = state.conn.lock().unwrap();
    match get_hash(&conn) {
        Err(_) => Ok(LoginResult { sukses: false, pesan: "Akun belum dibuat.".into() }),
        Ok(h) => {
            let ok = verify(&password, &h).unwrap_or(false);
            Ok(LoginResult {
                sukses: ok,
                pesan:  if ok { "Login berhasil.".into() } else { "Password salah.".into() },
            })
        }
    }
}

// JS kirim: { password_lama, password_baru }
#[tauri::command]
pub fn ganti_password(
    state:         State<AppState>,
    password_lama: String,
    password_baru: String,
) -> Result<LoginResult, String> {
    let conn = state.conn.lock().unwrap();
    let h = get_hash(&conn).map_err(|_| "Akun tidak ditemukan.".to_string())?;
    if !verify(&password_lama, &h).unwrap_or(false) {
        return Ok(LoginResult { sukses: false, pesan: "Password lama salah.".into() });
    }
    if password_baru.len() < 6 {
        return Ok(LoginResult { sukses: false, pesan: "Password baru minimal 6 karakter.".into() });
    }
    let nh = hash(&password_baru, 8).map_err(|e| e.to_string())?;
    conn.execute("UPDATE akun SET hash_pass=?1 WHERE id=1", [nh])
        .map_err(|e| e.to_string())?;
    Ok(LoginResult { sukses: true, pesan: "Password berhasil diubah.".into() })
}

#[tauri::command]
pub fn get_display_name(state: State<AppState>) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    conn.query_row("SELECT display_name FROM akun WHERE id=1", [], |r| r.get(0))
        .map_err(|e| e.to_string())
}

// JS kirim: { display_name: "nama" }
#[tauri::command]
pub fn set_display_name(
    state:        State<AppState>,
    display_name: String,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("UPDATE akun SET display_name=?1 WHERE id=1", [&display_name])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_pengaturan(state: State<AppState>, kunci: String) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
    conn.query_row("SELECT nilai FROM pengaturan WHERE kunci=?1", [&kunci], |r| r.get(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_pengaturan(
    state: State<AppState>,
    kunci: String,
    nilai: String,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO pengaturan(kunci,nilai) VALUES(?1,?2)",
        params![kunci, nilai],
    ).map_err(|e| e.to_string())?;
    Ok(())
}