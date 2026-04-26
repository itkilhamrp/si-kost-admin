// ================================================================
//  commands/unit.rs — Unit / Fasilitas kamar
// ================================================================

use rusqlite::params;
use tauri::State;
use crate::db::AppState;
use crate::models::Unit;

#[tauri::command]
pub fn get_semua_unit(state: State<AppState>) -> Result<Vec<Unit>, String> {
    let conn = state.conn.lock().unwrap();
    let mut s = conn.prepare("SELECT id_unit,nama,ikon FROM unit ORDER BY id_unit")
        .map_err(|e| e.to_string())?;
    // E0597 fix: collect ke variabel dulu sebelum Ok()
    let rows = s.query_map([], |r| Ok(Unit {
        id_unit: r.get(0)?, nama: r.get(1)?, ikon: r.get(2)?,
    })).map_err(|e| e.to_string())?
       .collect::<Result<Vec<_>, _>>()
       .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn tambah_unit(state: State<AppState>, nama: String, ikon: String) -> Result<i64, String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("INSERT INTO unit(nama,ikon) VALUES(?1,?2)", params![nama, ikon])
        .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn hapus_unit(state: State<AppState>, id_unit: i32) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM unit WHERE id_unit=?1", [id_unit])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Internal helper: unit untuk satu kamar (dipakai oleh kamar.rs) ──

pub fn get_unit_kamar(conn: &rusqlite::Connection, id_kamar: i32) -> Vec<crate::models::UnitKamar> {
    let Ok(mut s) = conn.prepare(
        "SELECT u.id_unit,u.nama,u.ikon
         FROM unit u JOIN kamar_unit ku ON u.id_unit=ku.id_unit
         WHERE ku.id_kamar=?1 ORDER BY u.id_unit"
    ) else { return vec![] };
    s.query_map([id_kamar], |r| Ok(crate::models::UnitKamar {
        id_unit: r.get(0)?, nama: r.get(1)?, ikon: r.get(2)?,
    }))
    .map(|rows| rows.filter_map(|r| r.ok()).collect())
    .unwrap_or_default()
}

/// Sync unit kamar: hapus semua lama → insert ulang
pub fn sync_unit_kamar(
    conn:     &rusqlite::Connection,
    id_kamar: i64,
    unit_ids: &[i32],
) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM kamar_unit WHERE id_kamar=?1", [id_kamar])?;
    for uid in unit_ids {
        conn.execute(
            "INSERT OR IGNORE INTO kamar_unit(id_kamar,id_unit) VALUES(?1,?2)",
            params![id_kamar, uid],
        )?;
    }
    Ok(())
}