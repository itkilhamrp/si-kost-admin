/**
 * ui/image-picker.js — Upload gambar → base64 (WebP compressed, async)
 *
 * FIX: isProcessing() → cegah submit saat gambar masih diproses canvas
 *      toBlob async → tidak block UI thread (tidak freeze di Android)
 *      Compress ke WebP max 1200px, quality 0.82
 */
import { showToast } from "./toast.js";

const MAX_SIZE_MB = 5;
let _base64      = null;
let _removed     = false;
let _processing  = false;   // ← guard kunci freeze

export function getImage()        { return _base64; }
export function isImageRemoved()  { return _removed; }
export function isImageProcessing() { return _processing; }
export function resetImage()      { _base64 = null; _removed = false; _processing = false; }

/**
 * @param {string}      inputId   - id <input type="file">
 * @param {string}      previewId - id <img> preview
 * @param {string}      [hintId]  - id element teks hint
 * @param {string|null} [initial] - base64 gambar existing
 */
export function initImagePicker(
  inputId   = "input-gambar",
  previewId = "preview-gambar",
  hintId    = "picker-hint",
  initial   = null
) {
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const area    = document.getElementById("image-picker-area");
  let   hintEl  = document.getElementById(hintId);

  _processing = false;
  _removed    = false;

  function setHint(txt) {
    // hint bisa berupa id atau elemen yang ditemukan dari area
    if (!hintEl) hintEl = area?.querySelector("p");
    if (hintEl) hintEl.textContent = txt;
  }

  // Tampilkan gambar awal
  if (initial) {
    _base64 = initial;
    if (preview) { preview.src = initial; preview.classList.remove("hidden"); }
    setHint("Tap untuk ganti foto");
  } else {
    _base64 = null;
    setHint("Tap untuk pilih foto");
  }

  if (!input) return;

  // Klik area buka file picker
  area?.addEventListener("click", (e) => {
    if (e.target === input) return;
    input.click();
  });
  area?.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
  });

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`Gambar maksimal ${MAX_SIZE_MB}MB.`, "error");
      input.value = "";
      return;
    }

    // Set flag processing — blokir submit
    _processing = true;
    setHint("⏳ Memproses gambar...");
    if (area) area.style.opacity = "0.55";

    const objUrl = URL.createObjectURL(file);
    const img    = new Image();

    img.onload = () => {
      // Resize agar tidak terlalu besar (max 1200px sisi terpanjang)
      const MAX_PX = 1200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_PX || h > MAX_PX) {
        if (w >= h) { h = Math.round(h * MAX_PX / w); w = MAX_PX; }
        else         { w = Math.round(w * MAX_PX / h); h = MAX_PX; }
      }

      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      // toBlob = async, tidak block main thread
      canvas.toBlob(blob => {
        URL.revokeObjectURL(objUrl);
        if (!blob) {
          _processing = false;
          showToast("Gagal mengkompresi gambar.", "error");
          if (area) area.style.opacity = "";
          setHint(initial ? "Tap untuk ganti foto" : "Tap untuk pilih foto");
          return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
          _base64     = ev.target.result;
          _removed    = false;
          _processing = false;                          // ← selesai, unlock
          if (preview) {
            preview.src = _base64;
            preview.classList.remove("hidden");
          }
          setHint("Tap untuk ganti foto");
          if (area) area.style.opacity = "";
          // Dispatch event agar halaman bisa tahu gambar siap
          area?.dispatchEvent(new CustomEvent("image-ready"));
        };
        reader.readAsDataURL(blob);
      }, "image/webp", 0.82);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      _processing = false;
      showToast("Gagal membaca gambar.", "error");
      setHint(initial ? "Tap untuk ganti foto" : "Tap untuk pilih foto");
      if (area) area.style.opacity = "";
      input.value = "";
    };

    img.src = objUrl;
  });
}