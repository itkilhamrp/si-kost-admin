// ================================================================
//  commands/kamar.rs — Manajemen kamar kos
// ================================================================

use rusqlite::params;
use tauri::State;
use crate::db::{AppState, hitung_harga_efektif, proses_gambar};
use crate::models::{Kamar, PayloadKamar};
use crate::commands::unit::{get_unit_kamar, sync_unit_kamar};

#[tauri::command]
pub fn get_kamar_by_rumah(state: State<AppState>, id_rumah: i32) -> Result<Vec<Kamar>, String> {
    let conn = state.conn.lock().unwrap();
    let mut s = conn.prepare("
        SELECT k.id_kamar,k.id_rumah,k.no_kamar,k.harga,k.diskon,
               k.lantai,k.jenis_kelamin,k.kapasitas,k.gambar,
               (SELECT COUNT(*) FROM penghuni p
                WHERE p.id_kamar=k.id_kamar AND p.status_huni='Aktif') AS jml_aktif,
               (SELECT COALESCE(SUM(b.jumlah_bayar),0)
                FROM pembayaran b JOIN penghuni p ON b.id_penghuni=p.id_penghuni
                WHERE p.id_kamar=k.id_kamar) AS total
        FROM kamar k WHERE k.id_rumah=?1 ORDER BY k.lantai,k.no_kamar
    ").map_err(|e| e.to_string())?;

    // E0597 fix: collect ke variabel dulu
    type Row = (i32,i32,String,f64,f64,String,String,i32,Option<String>,i32,f64);
    let rows = s.query_map([id_rumah], |r| Ok((
        r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,
        r.get(5)?,r.get(6)?,r.get(7)?,r.get(8)?,r.get(9)?,r.get(10)?,
    ))).map_err(|e| e.to_string())?
       .collect::<Result<Vec<Row>, _>>()
       .map_err(|e| e.to_string())?;

    let mut result = Vec::with_capacity(rows.len());
    for (id_kamar,id_rumah,no_kamar,harga,diskon,lantai,jenis_kelamin,kapasitas,gambar,jml_aktif,total) in rows {
        let status = match jml_aktif {
            0                      => "Kosong",
            n if n >= kapasitas    => "Penuh",
            _                      => "Terisi",
        }.to_string();
        result.push(Kamar {
            id_kamar,
            id_rumah,
            no_kamar,
            harga,
            diskon,
            harga_efektif: hitung_harga_efektif(harga, diskon),
            lantai,
            jenis_kelamin,
            kapasitas,
            gambar,
            status,
            jumlah_penghuni:  jml_aktif,
            total_pendapatan: total,
            unit: get_unit_kamar(&conn, id_kamar),
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn tambah_kamar(state: State<AppState>, payload: PayloadKamar) -> Result<(), String> {
    validasi_kamar(payload.diskon, payload.kapasitas)?;
    let id_rumah = payload.id_rumah
        .ok_or_else(|| "id_rumah wajib diisi.".to_string())?;
    let conn = state.conn.lock().unwrap();
    let g = proses_gambar(payload.gambar_base64.as_deref()).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO kamar(id_rumah,no_kamar,harga,diskon,lantai,jenis_kelamin,kapasitas,gambar)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
        params![id_rumah, payload.no_kamar, payload.harga, payload.diskon,
                payload.lantai, payload.jenis_kelamin, payload.kapasitas, g],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    sync_unit_kamar(&conn, id, &payload.unit_ids).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn edit_kamar(
    state:    State<AppState>,
    id_kamar: i32,
    payload:  PayloadKamar,
) -> Result<(), String> {
    validasi_kamar(payload.diskon, payload.kapasitas)?;
    let conn  = state.conn.lock().unwrap();
    let hapus = payload.hapus_gambar.unwrap_or(false);
    let g = if hapus { None } else {
        proses_gambar(payload.gambar_base64.as_deref()).map_err(|e| e.to_string())?
    };
    if hapus {
        conn.execute(
            "UPDATE kamar SET no_kamar=?1,harga=?2,diskon=?3,lantai=?4,
             jenis_kelamin=?5,kapasitas=?6,gambar=NULL WHERE id_kamar=?7",
            params![payload.no_kamar,payload.harga,payload.diskon,payload.lantai,
                    payload.jenis_kelamin,payload.kapasitas,id_kamar],
        )
    } else if let Some(gambar) = g {
        conn.execute(
            "UPDATE kamar SET no_kamar=?1,harga=?2,diskon=?3,lantai=?4,
             jenis_kelamin=?5,kapasitas=?6,gambar=?7 WHERE id_kamar=?8",
            params![payload.no_kamar,payload.harga,payload.diskon,payload.lantai,
                    payload.jenis_kelamin,payload.kapasitas,gambar,id_kamar],
        )
    } else {
        conn.execute(
            "UPDATE kamar SET no_kamar=?1,harga=?2,diskon=?3,lantai=?4,
             jenis_kelamin=?5,kapasitas=?6 WHERE id_kamar=?7",
            params![payload.no_kamar,payload.harga,payload.diskon,payload.lantai,
                    payload.jenis_kelamin,payload.kapasitas,id_kamar],
        )
    }.map_err(|e| e.to_string())?;

    sync_unit_kamar(&conn, id_kamar as i64, &payload.unit_ids).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn hapus_kamar(state: State<AppState>, id_kamar: i32) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM kamar WHERE id_kamar=?1", [id_kamar])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Validasi input ─────────────────────────────────────────────

fn validasi_kamar(diskon: f64, kapasitas: i32) -> Result<(), String> {
    if !(0.0..=90.0).contains(&diskon) {
        return Err("Diskon harus antara 0-90%.".into());
    }
    if !(1..=20).contains(&kapasitas) {
        return Err("Kapasitas harus antara 1-20 orang.".into());
    }
    Ok(())
}