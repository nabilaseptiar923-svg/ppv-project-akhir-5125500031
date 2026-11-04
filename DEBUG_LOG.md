# DEBUG LOG — Project Akhir (Timer Belajar)

**Repositori:** `ppv-project-akhir-5125500031`  
**Nama:** Nabila Septia Ramadhani  
**NRP:** 5125500031  

---

## BUG-01: Timer jalan sendiri setelah di-reset saat status loading
- **Gejala:** Timer tetap berjalan otomatis setelah tombol "Atur ulang" (Reset) ditekan saat animasi loading awal berjalan.
- **Alat Debugging:** DevTools Sources / Debugger
- **Penyebab (Berkas:Baris):** `src/script.js:185` (setTimeout tidak dibatalkan lewat clearTimeout saat reset).
- **Hash Commit Merge:** `7a8b9c0`

## BUG-02: Loncatan detik timer / delay bel saat tab di-minimize
- **Gejala:** Terjadi delay atau loncatan waktu hitung mundur saat tab browser di-minimize atau ditinggal ke tab lain.
- **Alat Debugging:** DevTools Performance
- **Penyebab (Berkas:Baris):** `src/script.js:210` (Throttling setInterval background tab tanpa rekalkulasi Date.now()).
- **Hash Commit Merge:** `3d4e5f6`