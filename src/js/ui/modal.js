/**
 * ui/modal.js
 * Modal konfirmasi dengan ketik ulang keyword sebelum aksi destruktif.
 */

export function showConfirmTyped(message, keyword, onConfirm) {
  const overlay    = document.getElementById("modal-overlay");
  const elMsg      = document.getElementById("modal-message");
  const elInput    = document.getElementById("modal-input");
  const elKeyword  = document.getElementById("modal-keyword");
  const btnConfirm = document.getElementById("modal-confirm");
  const btnCancel  = document.getElementById("modal-cancel");

  if (!overlay) {
    console.warn("modal-overlay tidak ditemukan di halaman ini.");
    return;
  }

  elMsg.textContent     = message;
  elKeyword.textContent = keyword;
  elInput.value         = "";
  btnConfirm.disabled   = true;

  overlay.classList.add("active");

  // Handler — clone untuk hapus listener lama
  const newInput    = elInput.cloneNode(true);
  const newConfirm  = btnConfirm.cloneNode(true);
  const newCancel   = btnCancel.cloneNode(true);

  elInput.replaceWith(newInput);
  btnConfirm.replaceWith(newConfirm);
  btnCancel.replaceWith(newCancel);

  newInput.oninput = () => {
    newConfirm.disabled = newInput.value.trim() !== keyword;
  };

  newConfirm.onclick = () => {
    overlay.classList.remove("active");
    onConfirm();
  };

  newCancel.onclick = () => {
    overlay.classList.remove("active");
  };
}