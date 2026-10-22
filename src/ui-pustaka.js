// Berkas pembungkus API Pustaka UI (Bootstrap 5)
export const UIPustaka = {
  // 1. Komponen Notifikasi Sederhana / Alert
  tampilkanPesan(pesan) {
    alert(`[Timer Belajar]: ${pesan}`);
  },

  // 2. Komponen Modal Bootstrap untuk notifikasi selesai
  bukaModal(idModal) {
    const el = document.getElementById(idModal);
    if (el && window.bootstrap) {
      const modal = new window.bootstrap.Modal(el);
      modal.show();
    }
  },

  // 3. Komponen Progress Bar
  aturProgress(idElement, nilaiPersen) {
    const el = document.getElementById(idElement);
    if (el) {
      el.style.width = `${nilaiPersen}%`;
      el.setAttribute('aria-valuenow', nilaiPersen);
    }
  }
};