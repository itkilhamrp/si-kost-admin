/**
 * pages/edit-penghuni-kamar.js
 * Edit tanggal masuk/keluar penghuni yang sudah ada di kamar
 * URL params: idPenghuni, idKamar, idRumah, namaKamar, namaRumah
 */
import { getPenghuniAktif, perpanjangPenghuni } from "../core/api.js";
import { requireAuth }  from "../core/auth.js";
import { buildUrl, formatTanggal, todayISO } from "../core/utils.js";
import { showToast }    from "../ui/toast.js";
import { showDatePicker, formatDateDisplay } from "../ui/date-picker.js";

export async function initEditPenghuniKamar() {
  if (!requireAuth()) return;

  const params       = new URLSearchParams(location.search);
  const idPenghuni   = parseInt(params.get("idPenghuni"));
  const idKamar      = parseInt(params.get("idKamar"));
  const idRumah      = parseInt(params.get("idRumah"));
  const namaKamar    = params.get("namaKamar")  ?? "";
  const namaRumah    = params.get("namaRumah")  ?? "";
  const backUrl      = buildUrl("/page/detail_kamar.html",{id:idKamar,idRumah,nama:namaKamar,namaRumah});

  document.getElementById("btn-back").href = backUrl;

  // Cari penghuni dari list aktif
  let pen = null;
  try {
    const list = await getPenghuniAktif(idKamar);
    pen = list.find(p => p.id_penghuni === idPenghuni);
  } catch {}

  if (!pen) {
    showToast("Penghuni tidak ditemukan.", "error");
    setTimeout(() => location.replace(backUrl), 1000);
    return;
  }

  // Tampilkan info kontak
  const infoEl = document.getElementById("kontak-info");
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:var(--sp-3)">
        <div class="penghuni-card-ava-ph" style="width:44px;height:44px;font-size:1.1rem">
          ${pen.nama_penghuni.charAt(0)}
        </div>
        <div>
          <p style="font-weight:700">${pen.jenis_kelamin==="Pria"?"👨":"👩"} ${pen.nama_penghuni}</p>
          <p style="font-size:.8rem;color:var(--text-2)">Masuk: ${formatTanggal(pen.tgl_masuk)}</p>
        </div>
      </div>`;
  }

  let tglMasuk  = pen.tgl_masuk;
  let tglKeluar = pen.tgl_keluar ?? "";

  setDateBtn("tgl-masuk-btn","tgl-masuk-val",tglMasuk);
  setDateBtn("tgl-keluar-btn","tgl-keluar-val",tglKeluar);

  document.getElementById("tgl-masuk-btn")?.addEventListener("click",()=>{
    showDatePicker({title:"Tanggal Masuk",value:tglMasuk,
      onSelect:v=>{tglMasuk=v;setDateBtn("tgl-masuk-btn","tgl-masuk-val",v);}
    });
  });
  document.getElementById("tgl-keluar-btn")?.addEventListener("click",()=>{
    const valAwal = tglKeluar||addBulan(tglMasuk,1);
    showDatePicker({title:"Tanggal Keluar (Estimasi)",value:valAwal,min:tglMasuk,
      onSelect:v=>{tglKeluar=v;setDateBtn("tgl-keluar-btn","tgl-keluar-val",v);}
    });
  });

  document.getElementById("btn-simpan")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-simpan");
    if (!tglKeluar) { showToast("Isi tanggal keluar untuk simpan.", "error"); return; }
    btn.disabled=true; btn.textContent="⏳ Menyimpan...";
    try {
      // Pakai perpanjang_penghuni untuk update tgl keluar
      await perpanjangPenghuni(idPenghuni, tglKeluar);
      location.replace(buildUrl("/page/detail_kamar.html",
        {id:idKamar,idRumah,nama:namaKamar,namaRumah,status:"edited"}));
    } catch(e){
      showToast("Gagal: "+e,"error");
      btn.disabled=false;btn.textContent="Simpan Perubahan";
    }
  });
}

function setDateBtn(btnId,valId,iso){
  const valEl=document.getElementById(valId);
  const btn=document.getElementById(btnId);
  if(valEl)valEl.textContent=iso?formatDateDisplay(iso):"Pilih tanggal...";
  if(btn)btn.classList.toggle("has-val",!!iso);
}
function addBulan(iso,n){
  const[y,m,d]=iso.split("-").map(Number);
  const dt=new Date(y,m-1+n,d);
  return`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}