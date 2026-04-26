/**
 * ui/dropdown.js
 * Menu dropdown titik tiga yang posisinya mengikuti anchor element.
 *
 * FIX: Klik kedua pada anchor yang sama → tutup menu (toggle behavior)
 */

const ATTR = "data-dropdown-open";

export function showDropdown(anchorEl, items) {
  // Kalau menu milik anchor ini sudah terbuka → tutup (toggle)
  if (anchorEl.hasAttribute(ATTR)) {
    closeAll();
    return;
  }

  // Tutup semua dropdown lain yang mungkin masih terbuka
  closeAll();

  const menu = document.createElement("div");
  menu.className = "dropdown-menu";

  items.forEach(({ label, danger, action }) => {
    const btn       = document.createElement("button");
    btn.textContent = label;
    if (danger) btn.classList.add("danger");
    btn.onclick = () => { closeAll(); action(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  // Tandai anchor sebagai "sedang terbuka"
  anchorEl.setAttribute(ATTR, "1");

  // Posisi: di bawah anchor, rata kanan
  const rect     = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;

  // Pastikan tidak keluar dari layar kanan
  const menuWidth = 188;
  const rightEdge = window.innerWidth - rect.right;
  if (rightEdge + menuWidth > window.innerWidth) {
    menu.style.left  = `${Math.max(8, rect.left)}px`;
  } else {
    menu.style.right = `${rightEdge}px`;
  }

  // Klik di luar → tutup
  // Delay satu frame agar event klik tombol ini tidak ikut tertangkap
  requestAnimationFrame(() => {
    document.addEventListener("click", onOutsideClick, { capture: true });
  });

  function onOutsideClick(e) {
    // Klik pada anchor sendiri → biarkan handler toggle di atas yang handle
    if (anchorEl.contains(e.target)) return;
    closeAll();
    document.removeEventListener("click", onOutsideClick, { capture: true });
  }

  function closeAll() {
    document.querySelectorAll(".dropdown-menu").forEach(el => el.remove());
    anchorEl.removeAttribute(ATTR);
    document.removeEventListener("click", onOutsideClick, { capture: true });
  }
}