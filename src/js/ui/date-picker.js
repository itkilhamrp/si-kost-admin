/**
 * ui/date-picker.js — Custom date picker modal
 * Tampil sebagai bottom-sheet di mobile, centered modal di desktop
 * TIDAK pakai <input type="date"> native yang jelek di desktop
 */

const BLN = ["Januari","Februari","Maret","April","Mei","Juni",
             "Juli","Agustus","September","Oktober","November","Desember"];
const BLN_S = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const HARI  = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

let _overlayEl = null;

/**
 * Tampilkan date picker custom
 * @param {object} opts
 * @param {string}   opts.title    - Judul picker
 * @param {string}   [opts.value]  - ISO date awal (yyyy-mm-dd)
 * @param {string}   [opts.min]    - ISO date minimum
 * @param {string}   [opts.max]    - ISO date maksimum
 * @param {function} opts.onSelect - Callback (isoDate: string) => void
 */
export function showDatePicker({ title = "Pilih Tanggal", value, min, max, onSelect }) {
  // Hapus picker lama jika ada
  _overlayEl?.remove();

  const today   = todayISO();
  const initVal = value || today;
  const [iy, im, id] = initVal.split("-").map(Number);

  // State
  let curYear  = iy;
  let curMonth = im - 1;  // 0-based
  let selDate  = initVal;

  // Buat overlay
  const overlay = document.createElement("div");
  overlay.id        = "dp-overlay";
  overlay.className = "dp-overlay";
  overlay.innerHTML = `
    <div class="dp-sheet" id="dp-sheet">
      <div class="dp-handle"></div>
      <div class="dp-head">
        <p class="dp-title">${title}</p>
        <button class="dp-close" id="dp-close" aria-label="Tutup">✕</button>
      </div>
      <div class="dp-nav">
        <button class="dp-nav-btn" id="dp-prev">‹</button>
        <div class="dp-month-year" id="dp-month-year"></div>
        <button class="dp-nav-btn" id="dp-next">›</button>
      </div>
      <div class="dp-weekdays">
        ${HARI.map(h => `<span>${h}</span>`).join("")}
      </div>
      <div class="dp-days" id="dp-days"></div>
      <div class="dp-quick" id="dp-quick"></div>
      <div class="dp-footer">
        <button class="dp-btn-cancel" id="dp-cancel">Batal</button>
        <button class="dp-btn-ok" id="dp-ok">Pilih</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  _overlayEl = overlay;

  function render() {
    document.getElementById("dp-month-year").textContent =
      `${BLN[curMonth]} ${curYear}`;
    renderDays();
    renderQuick();
  }

  function renderDays() {
    const grid  = document.getElementById("dp-days");
    const first = new Date(curYear, curMonth, 1).getDay(); // 0=Sun
    const total = new Date(curYear, curMonth + 1, 0).getDate();
    let html = "";
    // Blank cells sebelum hari pertama
    for (let i = 0; i < first; i++) html += `<span></span>`;
    for (let d = 1; d <= total; d++) {
      const iso    = `${curYear}-${String(curMonth + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const isSel  = iso === selDate;
      const isToday = iso === today;
      const isMin  = min  && iso < min;
      const isMax  = max  && iso > max;
      const disabled = isMin || isMax;
      html += `<button
        class="dp-day${isSel ? " dp-sel" : ""}${isToday && !isSel ? " dp-today" : ""}${disabled ? " dp-disabled" : ""}"
        data-iso="${iso}"
        ${disabled ? "disabled" : ""}
        aria-label="${d} ${BLN_S[curMonth]} ${curYear}"
        aria-pressed="${isSel}"
      >${d}</button>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll(".dp-day:not(.dp-disabled)").forEach(btn => {
      btn.addEventListener("click", () => {
        selDate = btn.dataset.iso;
        renderDays();
      });
    });
  }

  function renderQuick() {
    const q   = document.getElementById("dp-quick");
    const base = selDate || today;
    const opts = [
      { label: "Hari ini",  iso: today },
      { label: "+7 hari",   iso: addHari(base, 7) },
      { label: "+1 bulan",  iso: addBulan(base, 1) },
      { label: "+3 bulan",  iso: addBulan(base, 3) },
    ].filter(o => (!min || o.iso >= min) && (!max || o.iso <= max));
    q.innerHTML = opts.map(o =>
      `<button class="dp-quick-btn${selDate === o.iso ? " active" : ""}" data-iso="${o.iso}">${o.label}</button>`
    ).join("");
    q.querySelectorAll(".dp-quick-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const iso = btn.dataset.iso;
        const [y, m] = iso.split("-").map(Number);
        curYear  = y;
        curMonth = m - 1;
        selDate  = iso;
        render();
      });
    });
  }

  // Nav bulan
  document.getElementById("dp-prev").addEventListener("click", () => {
    curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; }
    render();
  });
  document.getElementById("dp-next").addEventListener("click", () => {
    curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; }
    render();
  });

  // Konfirmasi
  document.getElementById("dp-ok").addEventListener("click", () => {
    if (selDate) { onSelect(selDate); close(); }
  });

  // Tutup
  function close() { overlay.classList.remove("dp-active"); setTimeout(() => overlay.remove(), 220); _overlayEl = null; }
  document.getElementById("dp-close").addEventListener("click",  close);
  document.getElementById("dp-cancel").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  }, { once: true });

  render();
  requestAnimationFrame(() => overlay.classList.add("dp-active"));
}

/* ── Helpers ── */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isoFromLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addHari(iso, n) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y, m-1, d+n);
  return isoFromLocal(dt);
}
function addBulan(iso, n) {
  const [y,m,d] = iso.split("-").map(Number);
  const dt = new Date(y, m-1+n, d);
  return isoFromLocal(dt);
}

/** Format ISO → "1 Jan 2025" */
export function formatDateDisplay(iso) {
  if (!iso) return "Pilih tanggal...";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${BLN_S[parseInt(m) - 1]} ${y}`;
}