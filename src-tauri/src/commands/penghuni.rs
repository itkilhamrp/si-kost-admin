// ================================================================
//  commands/penghuni.rs — Penghuni kamar
// ================================================================

use rusqlite::params;
use tauri::State;
use crate::db::AppState;
use crate::models::{PayloadPenghuni, Penghuni, RiwayatKamar};

#[tauri::command]
pub fn get_penghuni_aktif(state: State<AppState>, id_kamar: i32) -> Result<Vec<Penghuni>, String> {
    let conn = state.conn.lock().unwrap();
    let mut s = conn.prepare(
        "SELECT id_penghuni,id_kamar,id_kontak,nama_penghuni,
                jenis_kelamin,tgl_masuk,tgl_keluar,status_huni
         FROM penghuni WHERE id_kamar=?1 AND status_huni='Aktif' ORDER BY tgl_masuk"
    ).map_err(|e| e.to_string())?;
    let rows = s.query_map([id_kamar], |r| Ok(Penghuni {
        id_penghuni:   r.get(0)?, id_kamar:      r.get(1)?, id_kontak:     r.get(2)?,
        nama_penghuni: r.get(3)?, jenis_kelamin: r.get(4)?,
        tgl_masuk:     r.get(5)?, tgl_keluar:    r.get(6)?, status_huni:   r.get(7)?,
    })).map_err(|e| e.to_string())?
       .collect::<Result<Vec<_>, _>>()
       .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn get_riwayat_kamar(state: State<AppState>, id_kamar: i32) -> Result<Vec<RiwayatKamar>, String> {
    let conn = state.conn.lock().unwrap();
    let mut s = conn.prepare("
        SELECT p.id_penghuni,p.id_kontak,p.nama_penghuni,
               p.tgl_masuk,p.tgl_keluar,p.status_huni,
               COALESCE(SUM(b.jumlah_bayar),0) AS total_bayar
        FROM penghuni p LEFT JOIN pembayaran b ON b.id_penghuni=p.id_penghuni
        WHERE p.id_kamar=?1 GROUP BY p.id_penghuni ORDER BY p.tgl_masuk DESC
    ").map_err(|e| e.to_string())?;
    let rows = s.query_map([id_kamar], |r| Ok(RiwayatKamar {
        id_penghuni:   r.get(0)?, id_kontak:     r.get(1)?, nama_penghuni: r.get(2)?,
        tgl_masuk:     r.get(3)?, tgl_keluar:    r.get(4)?,
        status_huni:   r.get(5)?, total_bayar:   r.get(6)?,
    })).map_err(|e| e.to_string())?
       .collect::<Result<Vec<_>, _>>()
       .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn tambah_penghuni(state: State<AppState>, payload: PayloadPenghuni) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();

    // 1. Kapasitas kamar
    let (kapasitas, jk_kamar): (i32, String) = conn.query_row(
        "SELECT kapasitas,jenis_kelamin FROM kamar WHERE id_kamar=?1",
        [payload.id_kamar], |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Kamar tidak ditemukan.".to_string())?;

    let jml_aktif: i32 = conn.query_row(
        "SELECT COUNT(*) FROM penghuni WHERE id_kamar=?1 AND status_huni='Aktif'",
        [payload.id_kamar], |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    if jml_aktif >= kapasitas {
        return Err(format!("Kamar sudah penuh ({}/{} penghuni).", jml_aktif, kapasitas));
    }

    // 2. Data kontak
    let (nama_kontak, jk_kontak): (String, String) = conn.query_row(
        "SELECT nama,jenis_kelamin FROM kontak_penghuni WHERE id_kontak=?1",
        [payload.id_kontak], |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Kontak tidak ditemukan.".to_string())?;

    // 3. Jenis kelamin
    if jk_kamar != "Bebas" && jk_kamar != jk_kontak {
        return Err(format!(
            "Kamar khusus {}. Kontak ini berjenis kelamin {}.",
            jk_kamar, jk_kontak
        ));
    }

    // 4. Tidak aktif di kamar lain
    let di_kamar_lain: i32 = conn.query_row(
        "SELECT COUNT(*) FROM penghuni WHERE id_kontak=?1 AND status_huni='Aktif' AND id_kamar!=?2",
        params![payload.id_kontak, payload.id_kamar], |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    if di_kamar_lain > 0 {
        return Err(format!("{} sudah aktif di kamar lain.", nama_kontak));
    }

    conn.execute(
        "INSERT INTO penghuni(id_kamar,id_kontak,nama_penghuni,jenis_kelamin,
          tgl_masuk,tgl_keluar,status_huni) VALUES(?1,?2,?3,?4,?5,?6,'Aktif')",
        params![payload.id_kamar, payload.id_kontak, nama_kontak, jk_kontak,
                payload.tgl_masuk, payload.tgl_keluar],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Pindah penghuni aktif ke kamar lain.
/// - id_penghuni : penghuni yang akan dipindah
/// - id_kamar_baru : kamar tujuan
///
/// Yang TETAP sama: tgl_masuk, tgl_keluar, nama_penghuni, id_kontak, semua pembayaran
/// Yang BERUBAH   : id_kamar → id_kamar_baru
#[tauri::command]
pub fn pindah_penghuni(
    state:         State<AppState>,
    id_penghuni:   i32,
    id_kamar_baru: i32,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();

    // 1. Ambil data penghuni yang akan dipindah
    let (id_kamar_lama, jk_penghuni): (i32, String) = conn.query_row(
        "SELECT id_kamar, jenis_kelamin FROM penghuni
         WHERE id_penghuni=?1 AND status_huni='Aktif'",
        [id_penghuni],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Penghuni aktif tidak ditemukan.".to_string())?;

    // Tidak perlu pindah jika kamar sama
    if id_kamar_lama == id_kamar_baru {
        return Err("Penghuni sudah berada di kamar ini.".to_string());
    }

    // 2. Validasi kamar tujuan
    let (kapasitas, jk_kamar): (i32, String) = conn.query_row(
        "SELECT kapasitas, jenis_kelamin FROM kamar WHERE id_kamar=?1",
        [id_kamar_baru],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Kamar tujuan tidak ditemukan.".to_string())?;

    // 3. Cek kapasitas kamar tujuan
    let jml_aktif: i32 = conn.query_row(
        "SELECT COUNT(*) FROM penghuni
         WHERE id_kamar=?1 AND status_huni='Aktif'",
        [id_kamar_baru], |r| r.get(0),
    ).map_err(|e| e.to_string())?;

    if jml_aktif >= kapasitas {
        return Err(format!(
            "Kamar tujuan sudah penuh ({}/{} penghuni).",
            jml_aktif, kapasitas
        ));
    }

    // 4. Validasi jenis kelamin
    if jk_kamar != "Bebas" && jk_kamar != jk_penghuni {
        return Err(format!(
            "Kamar tujuan khusus {}. Penghuni berjenis kelamin {}.",
            jk_kamar, jk_penghuni
        ));
    }

    // 5. Pindahkan — hanya update id_kamar, semua data lain tetap
    conn.execute(
        "UPDATE penghuni SET id_kamar=?1 WHERE id_penghuni=?2 AND status_huni='Aktif'",
        params![id_kamar_baru, id_penghuni],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn checkout_penghuni(
    state:       State<AppState>,
    id_penghuni: i32,
    tgl_keluar:  String,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE penghuni SET status_huni='Alumni',tgl_keluar=?1 WHERE id_penghuni=?2",
        params![tgl_keluar, id_penghuni],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn perpanjang_penghuni(
    state:           State<AppState>,
    id_penghuni:     i32,
    tgl_keluar_baru: String,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "UPDATE penghuni SET tgl_keluar=?1,status_huni='Aktif' WHERE id_penghuni=?2",
        params![tgl_keluar_baru, id_penghuni],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hapus_alumni(state: State<AppState>, id_penghuni: i32) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    let n = conn.execute(
        "DELETE FROM penghuni WHERE id_penghuni=?1 AND status_huni='Alumni'",
        [id_penghuni],
    ).map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Penghuni tidak ditemukan atau masih aktif.".into());
    }
    Ok(())
}