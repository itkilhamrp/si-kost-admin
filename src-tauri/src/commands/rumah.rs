// ================================================================
//  commands/rumah.rs — Manajemen rumah kos
// ================================================================

use rusqlite::params;
use tauri::State;
use crate::db::{AppState, proses_gambar};
use crate::models::{PayloadRumah, Rumah, RumahList};

#[tauri::command]
pub fn get_semua_rumah_list(state: State<AppState>) -> Result<Vec<RumahList>, String> {
    let conn = state.conn.lock().unwrap();
    let mut s = conn.prepare("
        SELECT r.id_rumah,r.nama_rumah,r.alamat,r.is_pinned,
               COUNT(k.id_kamar) AS jml,r.gambar
        FROM rumah r LEFT JOIN kamar k ON k.id_rumah=r.id_rumah
        GROUP BY r.id_rumah ORDER BY r.is_pinned DESC,r.id_rumah
    ").map_err(|e| e.to_string())?;
    // E0597 fix
    let rows = s.query_map([], |r| Ok(RumahList {
        id_rumah:     r.get(0)?,
        nama_rumah:   r.get(1)?,
        alamat:       r.get(2)?,
        is_pinned:    r.get::<_, i32>(3)? != 0,
        jumlah_kamar: r.get(4)?,
        gambar:       r.get(5)?,
    })).map_err(|e| e.to_string())?
       .collect::<Result<Vec<_>, _>>()
       .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_semua_rumah(state: State<AppState>) -> Result<Vec<Rumah>, String> {
    let list = get_semua_rumah_list(state)?;
    Ok(list.into_iter().map(|r| Rumah {
        id_rumah:     r.id_rumah,
        nama_rumah:   r.nama_rumah,
        alamat:       r.alamat,
        gambar:       r.gambar,
        is_pinned:    r.is_pinned,
        jumlah_kamar: r.jumlah_kamar,
    }).collect())
}

#[tauri::command]
pub fn tambah_rumah(state: State<AppState>, payload: PayloadRumah) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    let g = proses_gambar(payload.gambar_base64.as_deref()).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO rumah(nama_rumah,alamat,gambar) VALUES(?1,?2,?3)",
        params![payload.nama, payload.alamat, g],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn edit_rumah(
    state:    State<AppState>,
    id_rumah: i32,
    payload:  PayloadRumah,
) -> Result<(), String> {
    let conn  = state.conn.lock().unwrap();
    let hapus = payload.hapus_gambar.unwrap_or(false);
    let g = if hapus { None } else {
        proses_gambar(payload.gambar_base64.as_deref()).map_err(|e| e.to_string())?
    };
    if hapus {
        conn.execute(
            "UPDATE rumah SET nama_rumah=?1,alamat=?2,gambar=NULL WHERE id_rumah=?3",
            params![payload.nama, payload.alamat, id_rumah],
        )
    } else if let Some(gambar) = g {
        conn.execute(
            "UPDATE rumah SET nama_rumah=?1,alamat=?2,gambar=?3 WHERE id_rumah=?4",
            params![payload.nama, payload.alamat, gambar, id_rumah],
        )
    } else {
        conn.execute(
            "UPDATE rumah SET nama_rumah=?1,alamat=?2 WHERE id_rumah=?3",
            params![payload.nama, payload.alamat, id_rumah],
        )
    }.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn toggle_pin_rumah(state: State<AppState>, id_rumah: i32) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("UPDATE rumah SET is_pinned=NOT is_pinned WHERE id_rumah=?1", [id_rumah])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hapus_rumah(state: State<AppState>, id_rumah: i32) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM rumah WHERE id_rumah=?1", [id_rumah])
        .map_err(|e| e.to_string())?;
    Ok(())
}