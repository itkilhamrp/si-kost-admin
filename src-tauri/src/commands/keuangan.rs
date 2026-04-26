// ================================================================
//  commands/keuangan.rs — Pembayaran & Ringkasan Keuangan
// ================================================================

use rusqlite::params;
use tauri::State;
use crate::db::AppState;
use crate::models::{PayloadPembayaran, Pembayaran, RingkasanKeuangan};

#[tauri::command]
pub fn get_pembayaran_penghuni(
    state:       State<AppState>,
    id_penghuni: i32,
) -> Result<Vec<Pembayaran>, String> {
    let conn = state.conn.lock().unwrap();
    let mut s = conn.prepare(
        "SELECT id_bayar,id_penghuni,jumlah_bayar,bulan_tahun,tgl_transaksi,keterangan
         FROM pembayaran WHERE id_penghuni=?1 ORDER BY tgl_transaksi DESC"
    ).map_err(|e| e.to_string())?;
    // E0597 fix
    let rows = s.query_map([id_penghuni], |r| Ok(Pembayaran {
        id_bayar:      r.get(0)?, id_penghuni:   r.get(1)?, jumlah_bayar:  r.get(2)?,
        bulan_tahun:   r.get(3)?, tgl_transaksi: r.get(4)?, keterangan:    r.get(5)?,
    })).map_err(|e| e.to_string())?
       .collect::<Result<Vec<_>, _>>()
       .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn tambah_pembayaran(state: State<AppState>, payload: PayloadPembayaran) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO pembayaran(id_penghuni,jumlah_bayar,bulan_tahun,keterangan)
         VALUES(?1,?2,?3,?4)",
        params![payload.id_penghuni, payload.jumlah_bayar,
                payload.bulan_tahun, payload.keterangan],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hapus_pembayaran(state: State<AppState>, id_bayar: i32) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM pembayaran WHERE id_bayar=?1", [id_bayar])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_ringkasan_keuangan(
    state:    State<AppState>,
    id_rumah: Option<i32>,
) -> Result<RingkasanKeuangan, String> {
    let conn          = state.conn.lock().unwrap();
    let bulan_pattern = format!("{}%", chrono::Local::now().format("%Y-%m"));

    let (total_pendapatan, bulan_ini): (f64, f64) = if let Some(ir) = id_rumah {
        conn.query_row(
            "SELECT COALESCE(SUM(b.jumlah_bayar),0),
                    COALESCE(SUM(CASE WHEN b.bulan_tahun LIKE ?2 THEN b.jumlah_bayar ELSE 0 END),0)
             FROM pembayaran b
             JOIN penghuni ph ON b.id_penghuni=ph.id_penghuni
             JOIN kamar k     ON ph.id_kamar=k.id_kamar
             WHERE k.id_rumah=?1",
            params![ir, bulan_pattern], |r| Ok((r.get(0)?, r.get(1)?)),
        )
    } else {
        conn.query_row(
            "SELECT COALESCE(SUM(jumlah_bayar),0),
                    COALESCE(SUM(CASE WHEN bulan_tahun LIKE ?1 THEN jumlah_bayar ELSE 0 END),0)
             FROM pembayaran",
            params![bulan_pattern], |r| Ok((r.get(0)?, r.get(1)?)),
        )
    }.map_err(|e| e.to_string())?;

    let (kamar_terisi, kamar_kosong): (i32, i32) = if let Some(ir) = id_rumah {
        conn.query_row(
            "SELECT
                COUNT(CASE WHEN EXISTS(
                    SELECT 1 FROM penghuni p WHERE p.id_kamar=k.id_kamar AND p.status_huni='Aktif'
                ) THEN 1 END),
                COUNT(CASE WHEN NOT EXISTS(
                    SELECT 1 FROM penghuni p WHERE p.id_kamar=k.id_kamar AND p.status_huni='Aktif'
                ) THEN 1 END)
             FROM kamar k WHERE k.id_rumah=?1",
            [ir], |r| Ok((r.get(0)?, r.get(1)?)),
        )
    } else {
        conn.query_row(
            "SELECT
                COUNT(CASE WHEN EXISTS(
                    SELECT 1 FROM penghuni p WHERE p.id_kamar=k.id_kamar AND p.status_huni='Aktif'
                ) THEN 1 END),
                COUNT(CASE WHEN NOT EXISTS(
                    SELECT 1 FROM penghuni p WHERE p.id_kamar=k.id_kamar AND p.status_huni='Aktif'
                ) THEN 1 END)
             FROM kamar k",
            [], |r| Ok((r.get(0)?, r.get(1)?)),
        )
    }.map_err(|e| e.to_string())?;

    Ok(RingkasanKeuangan { total_pendapatan, bulan_ini, kamar_terisi, kamar_kosong })
}