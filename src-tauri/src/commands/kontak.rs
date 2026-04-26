// ================================================================
//  commands/kontak.rs — Master data kontak penghuni
// ================================================================

use rusqlite::params;
use tauri::State;
use crate::db::{AppState, proses_gambar};
use crate::models::{KontakPenghuni, PayloadKontak};

// ── Helper: bangun KontakPenghuni dari query ───────────────────

fn get_hunian_aktif(
    conn:      &rusqlite::Connection,
    id_kontak: i32,
) -> Option<(i32, i32, i32, String, String)> {
    // (id_penghuni, id_kamar, id_rumah, no_kamar, nama_rumah)
    conn.query_row(
        "SELECT p.id_penghuni,p.id_kamar,km.id_rumah,km.no_kamar,r.nama_rumah
         FROM penghuni p
         JOIN kamar km ON km.id_kamar=p.id_kamar
         JOIN rumah r  ON r.id_rumah=km.id_rumah
         WHERE p.id_kontak=?1 AND p.status_huni='Aktif' LIMIT 1",
        [id_kontak],
        |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?)),
    ).ok()
}

// ── Commands ──────────────────────────────────────────────────

#[tauri::command]
pub fn get_semua_kontak(state: State<AppState>) -> Result<Vec<KontakPenghuni>, String> {
    let conn = state.conn.lock().unwrap();
    let mut s = conn.prepare("
        SELECT k.id_kontak,k.nama,k.jenis_kelamin,k.no_hp,
               k.foto_profil,k.foto_ktp,k.deskripsi,
               p.id_penghuni,p.id_kamar,km.no_kamar,r.nama_rumah,r.id_rumah
        FROM kontak_penghuni k
        LEFT JOIN penghuni p ON p.id_kontak=k.id_kontak AND p.status_huni='Aktif'
        LEFT JOIN kamar km   ON km.id_kamar=p.id_kamar
        LEFT JOIN rumah r    ON r.id_rumah=km.id_rumah
        ORDER BY k.nama
    ").map_err(|e| e.to_string())?;

    // E0597 fix
    type Row = (i32,String,String,Option<String>,Option<String>,Option<String>,Option<String>,
                Option<i32>,Option<i32>,Option<String>,Option<String>,Option<i32>);
    let rows = s.query_map([], |r| Ok((
        r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?,
        r.get(7)?,r.get(8)?,r.get(9)?,r.get(10)?,r.get(11)?,
    ))).map_err(|e| e.to_string())?
       .collect::<Result<Vec<Row>, _>>()
       .map_err(|e| e.to_string())?;

    Ok(rows.into_iter().map(|(
        id,nama,jk,hp,fp,fk,desc,
        id_pen,id_km,no_km,nm_rumah,id_rm,
    )| {
        let kamar_aktif = match (&no_km, &nm_rumah) {
            (Some(k), Some(r)) => Some(format!("Kamar {} - {}", k, r)),
            _ => None,
        };
        KontakPenghuni {
            id_kontak: id, nama, jenis_kelamin: jk, no_hp: hp,
            foto_profil: fp, foto_ktp: fk, deskripsi: desc,
            kamar_aktif,
            id_penghuni_aktif: id_pen,
            id_kamar_aktif:    id_km,
            id_rumah_aktif:    id_rm,
            no_kamar_aktif:    no_km,
            nama_rumah_aktif:  nm_rumah,
        }
    }).collect())
}

#[tauri::command]
pub fn get_kontak_by_id(state: State<AppState>, id_kontak: i32) -> Result<KontakPenghuni, String> {
    let conn = state.conn.lock().unwrap();
    let (id,nama,jk,hp,fp,fk,desc): (i32,String,String,
        Option<String>,Option<String>,Option<String>,Option<String>) =
        conn.query_row(
            "SELECT id_kontak,nama,jenis_kelamin,no_hp,foto_profil,foto_ktp,deskripsi
             FROM kontak_penghuni WHERE id_kontak=?1",
            [id_kontak],
            |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?)),
        ).map_err(|e| e.to_string())?;

    let (kamar_aktif, id_penghuni_aktif, id_kamar_aktif, id_rumah_aktif, no_kamar_aktif, nama_rumah_aktif) =
        match get_hunian_aktif(&conn, id_kontak) {
            Some((ip,ikm,irm,nkm,nrm)) => (
                Some(format!("Kamar {} - {}", nkm, nrm)),
                Some(ip), Some(ikm), Some(irm), Some(nkm), Some(nrm),
            ),
            None => (None, None, None, None, None, None),
        };

    Ok(KontakPenghuni {
        id_kontak: id, nama, jenis_kelamin: jk, no_hp: hp,
        foto_profil: fp, foto_ktp: fk, deskripsi: desc,
        kamar_aktif, id_penghuni_aktif, id_kamar_aktif,
        id_rumah_aktif, no_kamar_aktif, nama_rumah_aktif,
    })
}

#[tauri::command]
pub fn tambah_kontak(state: State<AppState>, payload: PayloadKontak) -> Result<i64, String> {
    let conn = state.conn.lock().unwrap();
    let fp = proses_gambar(payload.foto_profil.as_deref()).map_err(|e| e.to_string())?;
    let fk = proses_gambar(payload.foto_ktp.as_deref()).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO kontak_penghuni(nama,jenis_kelamin,no_hp,foto_profil,foto_ktp,deskripsi)
         VALUES(?1,?2,?3,?4,?5,?6)",
        params![payload.nama, payload.jenis_kelamin, payload.no_hp, fp, fk, payload.deskripsi],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn edit_kontak(
    state:     State<AppState>,
    id_kontak: i32,
    payload:   PayloadKontak,
) -> Result<(), String> {
    let conn     = state.conn.lock().unwrap();
    let hapus_fp = payload.hapus_foto_profil.unwrap_or(false);
    let hapus_fk = payload.hapus_foto_ktp.unwrap_or(false);
    let fp_baru  = proses_gambar(payload.foto_profil.as_deref()).map_err(|e| e.to_string())?;
    let fk_baru  = proses_gambar(payload.foto_ktp.as_deref()).map_err(|e| e.to_string())?;

    let (final_fp, final_fk) = if hapus_fp || hapus_fk {
        (if hapus_fp { None } else { fp_baru },
         if hapus_fk { None } else { fk_baru })
    } else {
        // Pertahankan foto lama jika tidak ada foto baru
        let (cur_fp, cur_fk): (Option<String>, Option<String>) = conn.query_row(
            "SELECT foto_profil,foto_ktp FROM kontak_penghuni WHERE id_kontak=?1",
            [id_kontak], |r| Ok((r.get(0)?, r.get(1)?)),
        ).map_err(|e| e.to_string())?;
        (fp_baru.or(cur_fp), fk_baru.or(cur_fk))
    };

    conn.execute(
        "UPDATE kontak_penghuni
         SET nama=?1,jenis_kelamin=?2,no_hp=?3,foto_profil=?4,foto_ktp=?5,deskripsi=?6
         WHERE id_kontak=?7",
        params![payload.nama, payload.jenis_kelamin, payload.no_hp,
                final_fp, final_fk, payload.deskripsi, id_kontak],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hapus_kontak(state: State<AppState>, id_kontak: i32) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    // Guard: tolak jika masih aktif di kamar
    let aktif: i32 = conn.query_row(
        "SELECT COUNT(*) FROM penghuni WHERE id_kontak=?1 AND status_huni='Aktif'",
        [id_kontak], |r| r.get(0),
    ).unwrap_or(0);
    if aktif > 0 {
        return Err("Kontak masih aktif di kamar. Lakukan checkout terlebih dahulu.".into());
    }
    conn.execute("DELETE FROM kontak_penghuni WHERE id_kontak=?1", [id_kontak])
        .map_err(|e| e.to_string())?;
    Ok(())
}