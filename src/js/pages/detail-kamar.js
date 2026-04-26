/**
 * pages/detail-kamar.js  —  v5 multi-penghuni
 *
 * FIX: nama & foto penghuni kini selalu diambil dari data kontak terbaru
 * sehingga perubahan di edit-kontak langsung terlihat di sini.
 */
import {
  getPenghuniAktif, getRiwayatKamar, getKamarByRumah,
  checkoutPenghuni, perpanjangPenghuni, hapusAlumni, hapusKamar,
  tambahPembayaran, getPembayaranPenghuni, hapusPembayaran,
  getKontakById,
} from "../core/api.js";
import { requireAuth }      from "../core/auth.js";
import { Theme }            from "../core/theme.js";
import { getParams, buildUrl, formatRupiah, todayISO } from "../core/utils.js";
import { showToast }        from "../ui/toast.js";
import { showConfirmTyped } from "../ui/modal.js";
import { showDropdown }     from "../ui/dropdown.js";
import { startLiveClock }   from "../ui/clock.js";
import { showDatePicker, formatDateDisplay } from "../ui/date-picker.js";

/* ═══════════════════ KALKULASI ═══════════════════ */
const HARI_SEBULAN = 30;

function isoFromLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseISO(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d);
}
function diffBulanHari(isoA, isoB) {
  const [y1,m1,d1] = isoA.split("-").map(Number);
  const [y2,m2,d2] = isoB.split("-").map(Number);
  let totalBulan = (y2*12+m2)-(y1*12+m1);
  if (totalBulan < 0) return { bulan:0, hariSisa:0 };
  let nm = m1+totalBulan;
  let ny = y1+Math.floor((nm-1)/12); nm=((nm-1)%12)+1;
  const maxDay = new Date(ny,nm,0).getDate();
  const dm = Math.min(d1,maxDay);
  const tglTengah = new Date(ny,nm-1,dm);
  const tglKeluar = new Date(y2,m2-1,d2);
  let hariSisa = Math.round((tglKeluar-tglTengah)/86_400_000);
  if (hariSisa<0){totalBulan--;hariSisa+=31;}
  return { bulan:totalBulan, hariSisa:Math.max(0,hariSisa) };
}
function bulatkan(angka) {
  if (angka<=0) return 0;
  const step = angka<10_000?500:angka<100_000?1_000:angka<1_000_000?5_000:10_000;
  return Math.round(angka/step)*step;
}
function hitungTarget(harga, tglMasuk, tglKeluar) {
  if (!tglKeluar) return null;
  const {bulan,hariSisa} = diffBulanHari(tglMasuk,tglKeluar);
  return harga*bulan + (hariSisa>0?bulatkan((harga/HARI_SEBULAN)*hariSisa):0);
}
function hargaProrata(hargaBulan,hari){
  if(hari%HARI_SEBULAN===0) return hargaBulan*(hari/HARI_SEBULAN);
  return bulatkan((hargaBulan/HARI_SEBULAN)*hari);
}
function diffHari(a,b){return Math.max(0,Math.round((parseISO(b)-parseISO(a))/86_400_000));}
function addHari(isoBase,n){const[y,m,d]=isoBase.split("-").map(Number);return isoFromLocal(new Date(y,m-1,d+n));}
function addBulan(isoBase,n){const[y,m,d]=isoBase.split("-").map(Number);return isoFromLocal(new Date(y,m-1+n,d));}

/* ═══════════════════ FORMAT ═══════════════════ */
const BLN_PANJANG=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function fmtTgl(iso){if(!iso)return"—";const[y,m,d]=iso.slice(0,10).split("-").map(Number);return`${d} ${BLN_PANJANG[m-1]} ${y}`;}
function fmtBulan(ym){if(!ym)return"—";const[y,m]=ym.split("-").map(Number);return`${BLN_PANJANG[m-1]} ${y}`;}

/* ═══════════════════ DIALOG ═══════════════════ */
function openDialog(html){
  document.getElementById("dialog-content").innerHTML=html;
  document.getElementById("dialog-overlay").classList.add("active");
}
function closeDialog(){document.getElementById("dialog-overlay").classList.remove("active");}

/* ═══════════════════ INIT ═══════════════════ */
export async function initDetailKamar() {
  if (!requireAuth()) return;
  Theme.init();
  startLiveClock("live-time");

  const p         = getParams();
  const idKamar   = parseInt(p.get("id"));
  const idRumah   = parseInt(p.get("idRumah"));
  const namaKamar = p.get("nama")      ?? "";
  const namaRumah = p.get("namaRumah") ?? "";

  document.getElementById("judul-kamar").textContent = `Kamar ${namaKamar}`;
  const subEl = document.getElementById("sub-namarumah");
  if (subEl) subEl.textContent = namaRumah;
  document.getElementById("btn-back").href =
    buildUrl("/page/detail_kost.html", { id:idRumah, nama:namaRumah });

  const status = p.get("status");
  if (status==="edited")         showToast("Kamar berhasil diperbarui! ✅");
  if (status==="penghuni_added") showToast("Penghuni berhasil ditambahkan! 🎉");
  if (status) history.replaceState({},{},
    buildUrl("/page/detail_kamar.html",{id:idKamar,idRumah,nama:namaKamar,namaRumah}));

  document.getElementById("dialog-overlay").addEventListener("click", e=>{
    if(e.target===e.currentTarget) closeDialog();
  });

  let kamarData = null;
  try {
    const list = await getKamarByRumah(idRumah);
    kamarData  = list.find(x=>x.id_kamar===idKamar);
    if (kamarData) renderKamarHeader(kamarData);
  } catch {}

  document.getElementById("btn-opsi-kamar")?.addEventListener("click", (e) => {
    e.stopPropagation();
    showDropdown(e.currentTarget, [
      { label:"✏️ Edit Kamar",
        action: ()=>location.href=buildUrl("/page/edit_kamar_kost.html",
          {id:idKamar,idRumah,nama:namaKamar,namaRumah}) },
      { label:"🗑️ Hapus Kamar", danger:true,
        action: ()=>showConfirmTyped(
          `Hapus kamar "${namaKamar}" beserta semua riwayatnya?`,"HAPUS",
          async()=>{
            await hapusKamar(idKamar);
            location.replace(buildUrl("/page/detail_kost.html",{id:idRumah,nama:namaRumah}));
          }) },
    ]);
  });

  async function reload() {
    const [penghuniArr, riwayat] = await Promise.all([
      getPenghuniAktif(idKamar).catch(()=>[]),
      getRiwayatKamar(idKamar).catch(()=>[]),
    ]);

    // FIX: fetch data kontak terbaru untuk setiap penghuni
    // agar nama & foto selalu sinkron dengan hasil edit-kontak
    const penghuniDenganKontak = await Promise.all(
      penghuniArr.map(async pen => {
        if (!pen.id_kontak) return pen;
        try {
          const kontak = await getKontakById(pen.id_kontak);
          return {
            ...pen,
            nama_penghuni: kontak.nama ?? pen.nama_penghuni,
            foto_profil:   kontak.foto_profil ?? null,
            jenis_kelamin: kontak.jenis_kelamin ?? pen.jenis_kelamin,
          };
        } catch {
          return pen;
        }
      })
    );

    const hargaEfektif = kamarData?.harga_efektif ?? kamarData?.harga ?? 0;
    renderPenghuniList(penghuniDenganKontak, kamarData);
    await renderAllPembayaran(penghuniDenganKontak, hargaEfektif);
    renderRiwayat(riwayat);
  }

  /* ─────────────── KAMAR INFO HEADER ─────────────── */
  function renderKamarHeader(kamar) {
    const el = document.getElementById("kamar-info-header");
    if (!el) return;
    const chips     = (kamar.unit??[]).map(u=>`<span class="unit-chip">${u.ikon} ${u.nama}</span>`).join("");
    const adaDiskon = kamar.diskon > 0;
    const jkLabel   = {Bebas:"🌐 Bebas",Pria:"👨 Pria",Wanita:"👩 Wanita"}[kamar.jenis_kelamin]??kamar.jenis_kelamin;
    const jkBadge   = kamar.jenis_kelamin==="Bebas"?"badge-gray":kamar.jenis_kelamin==="Pria"?"badge-amber":"badge-green";
    const statusBadge = kamar.status==="Kosong"?"badge-green":kamar.status==="Penuh"?"badge-red":"badge-amber";
    el.innerHTML = `
      <div class="kamar-info-header"${kamar.gambar?` style="background-image:url('${kamar.gambar}');background-size:cover;background-position:center"`:""}>
        <div class="kih-left"${kamar.gambar?` style="background:rgba(0,0,0,.5);border-radius:var(--r-lg);padding:var(--sp-3);color:#fff"`:""}>
          <div class="kih-harga-wrap">
            ${adaDiskon?`<span class="kih-harga-coret">${formatRupiah(kamar.harga)}</span>`:""}
            <span class="kih-harga-efektif"${kamar.gambar?" style='color:#fff'":""}>${formatRupiah(kamar.harga_efektif)}</span>
            ${adaDiskon?`<span class="kih-diskon-badge">-${kamar.diskon}%</span>`:""}
          </div>
          <p class="${kamar.gambar?'':'kih-per-bulan'}" style="${kamar.gambar?'color:rgba(255,255,255,.8);font-size:.8rem':''}">per bulan</p>
          <div class="kih-meta" style="margin-top:var(--sp-1)">
            <span class="badge ${jkBadge}">${jkLabel}</span>
            <span class="badge badge-gray">${kamar.jumlah_penghuni}/${kamar.kapasitas} penghuni</span>
            ${kamar.lantai?`<span class="badge badge-gray">Lantai ${kamar.lantai}</span>`:""}
            <span class="badge ${statusBadge}">${kamar.status}</span>
          </div>
          ${chips?`<div class="kih-unit-wrap" style="margin-top:var(--sp-2)">${chips}</div>`:""}
        </div>
      </div>`;
  }

  /* ─────────────── PENGHUNI LIST ─────────────── */
  function renderPenghuniList(list, kamar) {
    const el = document.getElementById("section-penghuni");
    if (!el) return;
    const kapasitas   = kamar?.kapasitas ?? 1;
    const jumlahAktif = list.length;
    const bisaTambah  = jumlahAktif < kapasitas;
    const addUrl = buildUrl("/page/add_penghuni_kamar.html",{idKamar,idRumah,namaKamar,namaRumah});

    if (!list.length) {
      el.innerHTML = `
        <div class="kamar-kosong-card">
          <p>🚪 Kamar kosong — belum ada penghuni aktif</p>
          <a class="save-btn" style="display:inline-flex;text-decoration:none;padding:10px 24px"
             href="${addUrl}">＋ Tambah Penghuni</a>
        </div>`;
      return;
    }

    const hargaEfektif  = kamar?.harga_efektif ?? kamar?.harga ?? 0;
    const hargaPerOrang = jumlahAktif > 1 ? Math.round(hargaEfektif / jumlahAktif) : hargaEfektif;

    let html = `<div class="penghuni-list-header">
      <span class="penghuni-slot-info">${jumlahAktif} dari ${kapasitas} slot terisi</span>
      ${bisaTambah
        ? `<a class="btn-tambah-penghuni-mini" href="${addUrl}">＋ Tambah</a>`
        : `<span class="badge badge-red" style="padding:5px 10px">Penuh</span>`}
    </div>`;

    if (jumlahAktif > 1) {
      html += `
        <div class="info-card" style="margin-bottom:var(--sp-2);padding:var(--sp-2) var(--sp-3)">
          <p style="font-size:.78rem;color:var(--text-2)">
            💡 Estimasi patungan ${jumlahAktif} orang ≈ <strong>${formatRupiah(hargaPerOrang)}/orang/bln</strong>
            <span style="color:var(--text-3)"> · Pembayaran bisa fleksibel</span>
          </p>
        </div>`;
    }

    list.forEach(pen => {
      const sisaHari  = pen.tgl_keluar
        ? Math.ceil((parseISO(pen.tgl_keluar)-new Date())/86_400_000) : null;
      const sisaWarna = sisaHari!==null && sisaHari<=7 ? "var(--danger)" : "var(--amber)";
      const sisaTeks  = sisaHari===null ? ""
        : sisaHari>0  ? `⏳ Sisa ${sisaHari} hari`
        : sisaHari===0 ? "🔔 Berakhir hari ini!"
        : "⚠️ Kontrak sudah berakhir";
      const jkIcon = pen.jenis_kelamin==="Pria"?"👨":"👩";

      // Avatar: tampilkan foto jika ada, fallback ke inisial
      const avatarHtml = pen.foto_profil
        ? `<img src="${pen.foto_profil}" alt="${pen.nama_penghuni}"
               style="width:44px;height:44px;border-radius:50%;object-fit:cover;
                      border:2px solid var(--green-mid)">`
        : `<div class="penghuni-card-ava-ph">${pen.nama_penghuni.charAt(0)}</div>`;

      html += `
        <div class="penghuni-card" id="pen-card-${pen.id_penghuni}">
          <div class="penghuni-card-head">
            <div class="penghuni-card-avatar">${avatarHtml}</div>
            <div class="penghuni-card-info">
              <p class="penghuni-card-nama">${jkIcon} ${pen.nama_penghuni}</p>
              <p class="penghuni-card-dates">
                Masuk: <strong>${fmtTgl(pen.tgl_masuk)}</strong>
                ${pen.tgl_keluar?` → Keluar: <strong>${fmtTgl(pen.tgl_keluar)}</strong>`:""}
              </p>
              ${sisaTeks?`<p class="penghuni-card-sisa" style="color:${sisaWarna}">${sisaTeks}</p>`:""}
            </div>
            <span class="badge badge-green">Aktif</span>
          </div>
          <div class="penghuni-card-actions">
            <button class="btn-secondary btn-checkout" style="font-size:.78rem;padding:6px 12px"
              data-id="${pen.id_penghuni}"
              data-nama="${pen.nama_penghuni.replace(/"/g,'&quot;')}">🚪 Checkout</button>
            <button class="btn-secondary btn-perp" style="font-size:.78rem;padding:6px 12px"
              data-id="${pen.id_penghuni}">📅 Perpanjang</button>
          </div>
          <div id="perp-panel-${pen.id_penghuni}" class="hidden" style="margin-top:var(--sp-2)">
            ${buildPerpPanel(pen, hargaEfektif)}
          </div>
        </div>`;
    });

    el.innerHTML = html;

    el.addEventListener("click", (e) => {
      const btnCheckout = e.target.closest(".btn-checkout[data-id]");
      if (btnCheckout) {
        doCheckout(parseInt(btnCheckout.dataset.id), btnCheckout.dataset.nama);
        return;
      }
      const btnPerp = e.target.closest(".btn-perp[data-id]");
      if (btnPerp) {
        document.getElementById(`perp-panel-${btnPerp.dataset.id}`)?.classList.toggle("hidden");
      }
    });

    list.forEach(pen => bindPerpanjang(pen, hargaEfektif));
  }

  function buildPerpPanel(pen, harga) {
    return `<div class="perp-panel">
      <p class="perp-title">Pilih durasi perpanjangan:</p>
      <div class="perp-quick">
        <button class="perp-q-btn" data-pen="${pen.id_penghuni}" data-hari="7">+7 hari
          <span class="perp-q-sub">${formatRupiah(hargaProrata(harga,7))}</span></button>
        <button class="perp-q-btn" data-pen="${pen.id_penghuni}" data-hari="14">+14 hari
          <span class="perp-q-sub">${formatRupiah(hargaProrata(harga,14))}</span></button>
        <button class="perp-q-btn" data-pen="${pen.id_penghuni}" data-bulan="1">+1 bulan
          <span class="perp-q-sub">${formatRupiah(harga)}</span></button>
        <button class="perp-q-btn" data-pen="${pen.id_penghuni}" data-bulan="2">+2 bulan
          <span class="perp-q-sub">${formatRupiah(harga*2)}</span></button>
      </div>
      <div class="perp-manual">
        <button class="date-trigger has-val" id="tgl-perp-btn-${pen.id_penghuni}" type="button" style="flex:1">
          <span class="dt-icon">📅</span>
          <span class="dt-val" id="tgl-perp-val-${pen.id_penghuni}">${formatDateDisplay(pen.tgl_keluar??todayISO())}</span>
          <span class="dt-arrow">▼</span>
        </button>
        <button class="save-btn" style="margin-top:0;width:auto;padding:9px 16px;flex-shrink:0"
          id="btn-perp-ok-${pen.id_penghuni}">Simpan</button>
      </div>
      <div id="perp-hint-${pen.id_penghuni}" class="perp-hint"></div>
    </div>`;
  }

  function bindPerpanjang(pen, harga) {
    const base   = pen.tgl_keluar ?? todayISO();
    let _perpTgl = base;

    function setPerpTgl(mode) {
      const tgl = mode.type==="hari" ? addHari(base,mode.n) : addBulan(base,mode.n);
      _perpTgl  = tgl;
      const valEl = document.getElementById(`tgl-perp-val-${pen.id_penghuni}`);
      if (valEl) valEl.textContent = formatDateDisplay(tgl);
      document.querySelectorAll(`[data-pen="${pen.id_penghuni}"].perp-q-btn`).forEach(b=>{
        const isActive = (mode.type==="hari"&&b.dataset.hari===String(mode.n))||
                         (mode.type==="bulan"&&b.dataset.bulan===String(mode.n));
        b.classList.toggle("perp-q-active",isActive);
      });
      updatePerpHint(pen.id_penghuni,harga,pen.tgl_masuk,tgl);
    }

    document.querySelectorAll(`[data-pen="${pen.id_penghuni}"].perp-q-btn`).forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if (btn.dataset.hari) setPerpTgl({type:"hari",n:+btn.dataset.hari});
        else setPerpTgl({type:"bulan",n:+btn.dataset.bulan});
      });
    });

    document.getElementById(`tgl-perp-btn-${pen.id_penghuni}`)?.addEventListener("click",()=>{
      showDatePicker({title:"Tanggal Keluar Baru",value:_perpTgl,min:addHari(base,1),
        onSelect:(val)=>{
          _perpTgl=val;
          const valEl=document.getElementById(`tgl-perp-val-${pen.id_penghuni}`);
          if(valEl)valEl.textContent=formatDateDisplay(val);
          document.querySelectorAll(`[data-pen="${pen.id_penghuni}"].perp-q-btn`).forEach(b=>b.classList.remove("perp-q-active"));
          updatePerpHint(pen.id_penghuni,harga,pen.tgl_masuk,val);
        }
      });
    });

    document.getElementById(`btn-perp-ok-${pen.id_penghuni}`)?.addEventListener("click",async()=>{
      if (!_perpTgl||_perpTgl<=base){showToast("Tanggal harus lebih dari tanggal keluar sekarang.","error");return;}
      try {
        await perpanjangPenghuni(pen.id_penghuni,_perpTgl);
        showToast("Kontrak diperpanjang! ✅");
        document.getElementById(`perp-panel-${pen.id_penghuni}`)?.classList.add("hidden");
        await reload();
      } catch(e){showToast("Gagal: "+e,"error");}
    });
  }

  function updatePerpHint(penId,harga,tglMasuk,tglKeluar){
    const el=document.getElementById(`perp-hint-${penId}`);
    if(!el||!tglMasuk||!tglKeluar)return;
    const target=hitungTarget(harga,tglMasuk,tglKeluar);
    const hari=diffHari(tglMasuk,tglKeluar);
    el.innerHTML=`Durasi total: <strong>${hari} hari</strong> → Target bayar: <strong>${formatRupiah(target??0)}</strong>`;
    el.classList.add("show");
  }

  /* ─────────────── PEMBAYARAN ─────────────── */
  async function renderAllPembayaran(penghuniArr, hargaEfektif) {
    const el = document.getElementById("section-pembayaran");
    if (!el) return;
    if (!penghuniArr.length) {
      el.innerHTML=`<p style="font-size:.82rem;color:var(--text-3);padding:var(--sp-2) 0">Tidak ada penghuni aktif.</p>`;
      return;
    }

    const semuaBayar = await Promise.all(
      penghuniArr.map(pen => getPembayaranPenghuni(pen.id_penghuni).catch(()=>[]))
    );

    const totalSemuaPenghuni = semuaBayar.reduce(
      (sum, list) => sum + list.reduce((s,b) => s+b.jumlah_bayar, 0), 0
    );
    const sisaKamar = Math.max(0, hargaEfektif - totalSemuaPenghuni);

    el.innerHTML = "";

    if (penghuniArr.length > 1) {
      const pct = Math.min(Math.round(totalSemuaPenghuni / hargaEfektif * 100), 100);
      const isLunasKamar = totalSemuaPenghuni >= hargaEfektif;
      el.innerHTML = `
        <div class="bayar-kamar-summary">
          <div class="bks-head">
            <span class="bks-title">💰 Total Kamar</span>
            <span class="badge ${isLunasKamar?"badge-green":"badge-amber"}">
              ${isLunasKamar?"✅ Lunas":"🟡 Belum Lunas"}
            </span>
          </div>
          <div class="bayar-progress-wrap">
            <div class="bayar-progress-bar" style="width:${pct}%;background:${isLunasKamar?"var(--green)":"var(--amber)"}"></div>
          </div>
          <div class="bayar-summary">
            <span>Terbayar: <strong>${formatRupiah(totalSemuaPenghuni)}</strong></span>
            <span>Harga: <strong>${formatRupiah(hargaEfektif)}</strong></span>
          </div>
          ${sisaKamar > 0
            ? `<p class="bks-sisa">Sisa yang belum terbayar: <strong>${formatRupiah(sisaKamar)}</strong></p>`
            : ""}
        </div>`;
    }

    for (let i=0; i<penghuniArr.length; i++) {
      const pen      = penghuniArr[i];
      const bayarPen = semuaBayar[i];
      const section  = document.createElement("div");
      section.className = "bayar-penghuni-section";
      section.id = `bayar-section-${pen.id_penghuni}`;
      el.appendChild(section);
      await renderPembayaran(pen, hargaEfektif, bayarPen, sisaKamar, section);
    }
  }

  async function renderPembayaran(pen, hargaKamar, bayarList, sisaKamar, containerEl) {
    const totalBayarPen  = bayarList.reduce((s,b)=>s+b.jumlah_bayar, 0);
    const targetIndividu = hitungTarget(hargaKamar, pen.tgl_masuk, pen.tgl_keluar);
    const isLunas = targetIndividu !== null
      ? totalBayarPen >= targetIndividu
      : sisaKamar <= 0;
    const maxBolehBayar = Math.max(0, sisaKamar);
    const pct = targetIndividu
      ? Math.min(Math.round(totalBayarPen/targetIndividu*100), 100)
      : (hargaKamar > 0 ? Math.min(Math.round(totalBayarPen/hargaKamar*100), 100) : 0);

    let _bulanBayar = todayISO().slice(0,7);

    const targetTeks = targetIndividu !== null
      ? `<span style="font-size:.78rem;color:var(--text-2)">Target: ${formatRupiah(targetIndividu)}</span>`
      : `<span style="font-size:.78rem;color:var(--text-3)">Tanpa tgl keluar</span>`;

    containerEl.innerHTML = `
      <div class="bayar-penghuni-header">
        <p class="bayar-penghuni-nama">${pen.nama_penghuni}</p>
        <span class="badge ${isLunas?"badge-green":"badge-amber"}">${isLunas?"✅ Lunas":"🟡 Belum Lunas"}</span>
      </div>
      <div class="bayar-penghuni-body">
        <div class="bayar-progress-wrap">
          <div class="bayar-progress-bar" style="width:${pct}%;background:${isLunas?"var(--green)":"var(--amber)"}"></div>
        </div>
        <div class="bayar-summary">
          <span>Dibayar: <strong>${formatRupiah(totalBayarPen)}</strong></span>
          ${targetTeks}
        </div>

        ${!isLunas && maxBolehBayar > 0 ? `
        <div class="bayar-form-toggle" id="btn-bayar-toggle-${pen.id_penghuni}">
          <span class="bayar-form-label">＋ Catat Pembayaran</span>
          <span class="toggle-arrow">▼</span>
        </div>
        <div class="bayar-form-body" id="bayar-form-body-${pen.id_penghuni}">
          <div class="bayar-input-row">
            <div class="bayar-field grow">
              <label>Jumlah (Rp) — maks ${formatRupiah(maxBolehBayar)}</label>
              <input type="number" id="inp-jumlah-${pen.id_penghuni}"
                placeholder="${maxBolehBayar}" min="1" max="${maxBolehBayar}" step="1000">
            </div>
            <div class="bayar-field">
              <label>Bulan</label>
              <button class="date-trigger has-val" id="btn-bulan-${pen.id_penghuni}" type="button">
                <span class="dt-icon">📅</span>
                <span class="dt-val" id="lbl-bulan-${pen.id_penghuni}">${fmtBulan(_bulanBayar)}</span>
              </button>
            </div>
          </div>
          <div id="bayar-hint-${pen.id_penghuni}" class="bayar-hint-text hidden"></div>
          <button class="save-btn" id="btn-simpan-bayar-${pen.id_penghuni}">Simpan Pembayaran</button>
        </div>` : (!isLunas && maxBolehBayar <= 0 ? `
        <div class="bayar-hint-text" style="margin-top:var(--sp-2)">
          ✅ Sisa kamar sudah terbayar penuh oleh penghuni lain.
        </div>` : "")}

        <div id="list-bayar-${pen.id_penghuni}">
          ${bayarList.length
            ? bayarList.map(b=>renderBayarItem(b)).join("")
            : `<p style="font-size:.82rem;color:var(--text-3);padding:var(--sp-2) 0">Belum ada pembayaran.</p>`}
        </div>
      </div>`;

    containerEl.querySelector(`#list-bayar-${pen.id_penghuni}`)?.addEventListener("click", (e) => {
      const btn = e.target.closest(".bi-del[data-id]");
      if (!btn) return;
      doHapusBayar(parseInt(btn.dataset.id));
    });

    if (!isLunas && maxBolehBayar > 0) {
      document.getElementById(`btn-bayar-toggle-${pen.id_penghuni}`)?.addEventListener("click",function(){
        const body = document.getElementById(`bayar-form-body-${pen.id_penghuni}`);
        const open = body.classList.toggle("open");
        this.classList.toggle("open",open);
        if (open && !document.getElementById(`inp-jumlah-${pen.id_penghuni}`).value) {
          document.getElementById(`inp-jumlah-${pen.id_penghuni}`).value = maxBolehBayar;
          updateBayarHint(pen.id_penghuni, maxBolehBayar, totalBayarPen, targetIndividu);
        }
      });

      document.getElementById(`btn-bulan-${pen.id_penghuni}`)?.addEventListener("click",()=>{
        showDatePicker({title:"Pilih Bulan Pembayaran",value:_bulanBayar+"-01",
          onSelect:(iso)=>{
            _bulanBayar = iso.slice(0,7);
            const lbl = document.getElementById(`lbl-bulan-${pen.id_penghuni}`);
            if (lbl) lbl.textContent = fmtBulan(_bulanBayar);
          }
        });
      });

      document.getElementById(`inp-jumlah-${pen.id_penghuni}`)?.addEventListener("input",()=>{
        const raw = parseFloat(document.getElementById(`inp-jumlah-${pen.id_penghuni}`).value)||0;
        if (raw > maxBolehBayar) document.getElementById(`inp-jumlah-${pen.id_penghuni}`).value = maxBolehBayar;
        updateBayarHint(pen.id_penghuni, Math.min(raw,maxBolehBayar), totalBayarPen, targetIndividu);
      });

      let _saving = false;
      document.getElementById(`btn-simpan-bayar-${pen.id_penghuni}`)?.addEventListener("click",async()=>{
        if (_saving) return;
        const jumlah = parseFloat(document.getElementById(`inp-jumlah-${pen.id_penghuni}`).value);
        if (!jumlah||jumlah<=0) { showToast("Nominal harus lebih dari 0.","error"); return; }
        if (jumlah>maxBolehBayar) { showToast(`Maks: ${formatRupiah(maxBolehBayar)}`,"error"); return; }
        if (!_bulanBayar) { showToast("Pilih bulan.","error"); return; }
        _saving = true;
        const btnS = document.getElementById(`btn-simpan-bayar-${pen.id_penghuni}`);
        if (btnS) { btnS.disabled=true; btnS.textContent="⏳ Menyimpan..."; }
        try {
          await tambahPembayaran(pen.id_penghuni, jumlah, _bulanBayar);
          showToast("Pembayaran dicatat! 💰");
          await reload();
        } catch(e) {
          showToast("Gagal: "+e,"error");
          _saving=false;
          if (btnS) { btnS.disabled=false; btnS.textContent="Simpan Pembayaran"; }
        }
      });
    }
  }

  function updateBayarHint(penId, val, totalSudah, target) {
    const hint = document.getElementById(`bayar-hint-${penId}`);
    if (!hint) return;
    if (!val) { hint.classList.add("hidden"); return; }
    const setelah = totalSudah + val;
    if (target !== null) {
      const sisa = target - setelah;
      hint.innerHTML = sisa<=0
        ? `✅ Setelah ini → <strong>${formatRupiah(setelah)}</strong> → <strong>Lunas</strong>`
        : `Setelah bayar, sisa kontrak: <strong>${formatRupiah(sisa)}</strong>`;
    } else {
      hint.innerHTML = `Total bayar penghuni ini: <strong>${formatRupiah(setelah)}</strong>`;
    }
    hint.classList.remove("hidden");
  }

  function renderBayarItem(b) {
    const tglDisplay   = b.tgl_transaksi ? fmtTgl(b.tgl_transaksi.slice(0,10)) : "—";
    const bulanDisplay = fmtBulan(b.bulan_tahun);
    return `<div class="bayar-item">
      <div class="bi-body">
        <p class="bi-nominal">${formatRupiah(b.jumlah_bayar)}</p>
        <p class="bi-bulan">
          <span style="font-weight:600">${bulanDisplay}</span>
          <span style="color:var(--text-3)"> · ${tglDisplay}</span>
        </p>
      </div>
      <button class="bi-del" data-id="${b.id_bayar}">✕</button>
    </div>`;
  }

  /* ─────────────── RIWAYAT ─────────────── */
  function renderRiwayat(riwayat) {
    const el = document.getElementById("section-riwayat");
    if (!el) return;
    if (!riwayat.length) {
      el.innerHTML=`<p class="empty-state" style="padding:var(--sp-3) 0">Belum ada riwayat penghuni.</p>`;
      return;
    }
    el.innerHTML = riwayat.map(r => {
      const jkIcon = r.jenis_kelamin==="Pria"?"👨":"👩";
      return `<div class="riwayat-item">
        <div class="rw-body">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="rw-name">${jkIcon} ${r.nama_penghuni}</span>
            <span class="badge ${r.status_huni==="Aktif"?"badge-green":"badge-gray"}">${r.status_huni}</span>
          </div>
          <p class="rw-dates">${fmtTgl(r.tgl_masuk)} → ${r.tgl_keluar?fmtTgl(r.tgl_keluar):"sekarang"}</p>
          <p class="rw-total">💰 ${formatRupiah(r.total_bayar)}</p>
        </div>
        ${r.status_huni==="Alumni"
          ?`<button class="rw-del" data-id="${r.id_penghuni}">🗑️</button>`:""}
      </div>`;
    }).join("");

    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".rw-del[data-id]");
      if (!btn) return;
      doHapusAlumni(parseInt(btn.dataset.id));
    });
  }

  /* ─────────────── ACTION HANDLERS ─────────────── */
  function doCheckout(id, nama) {
    openDialog(`
      <div class="dialog-icon green">🚪</div>
      <p class="dialog-title">Konfirmasi Checkout</p>
      <p class="dialog-body"><strong>${nama}</strong> akan di-checkout hari ini (${fmtTgl(todayISO())}).</p>
      <div class="dialog-actions">
        <button class="dialog-btn btn-green" id="dlg-konfirm">✓ Ya, Checkout</button>
        <button class="dialog-btn btn-ghost" id="dlg-batal">Batal</button>
      </div>`);
    document.getElementById("dlg-batal").addEventListener("click", closeDialog);
    document.getElementById("dlg-konfirm").addEventListener("click", async () => {
      closeDialog();
      try {
        await checkoutPenghuni(id, todayISO());
        showToast(`${nama} berhasil checkout ✅`);
        await reload();
      } catch(e) { showToast("Gagal checkout: "+e,"error"); }
    });
  }

  function doHapusAlumni(id) {
    openDialog(`
      <div class="dialog-icon danger">🗑️</div>
      <p class="dialog-title">Hapus Riwayat?</p>
      <p class="dialog-body">Data riwayat penghuni ini akan dihapus permanen.</p>
      <div class="dialog-actions">
        <button class="dialog-btn btn-red" id="dlg-konfirm">Hapus</button>
        <button class="dialog-btn btn-ghost" id="dlg-batal">Batal</button>
      </div>`);
    document.getElementById("dlg-batal").addEventListener("click", closeDialog);
    document.getElementById("dlg-konfirm").addEventListener("click", async () => {
      closeDialog();
      try { await hapusAlumni(id); showToast("Riwayat dihapus."); await reload(); }
      catch(e) { showToast("Gagal: "+e,"error"); }
    });
  }

  function doHapusBayar(id) {
    openDialog(`
      <div class="dialog-icon danger">💸</div>
      <p class="dialog-title">Hapus Catatan Bayar?</p>
      <p class="dialog-body">Catatan ini akan dihapus. Status lunas bisa berubah.</p>
      <div class="dialog-actions">
        <button class="dialog-btn btn-red" id="dlg-konfirm">Hapus</button>
        <button class="dialog-btn btn-ghost" id="dlg-batal">Batal</button>
      </div>`);
    document.getElementById("dlg-batal").addEventListener("click", closeDialog);
    document.getElementById("dlg-konfirm").addEventListener("click", async () => {
      closeDialog();
      try {
        await hapusPembayaran(id);
        showToast("Pembayaran dihapus.");
        await reload();
      } catch(e) { showToast("Gagal: "+e,"error"); }
    });
  }

  await reload();
}