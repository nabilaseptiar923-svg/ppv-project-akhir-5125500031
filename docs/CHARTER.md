# Project Charter — Timer Belajar

## 1. Masalah
Mahasiswa sering mengalami penurunan fokus dan kejenuhan saat belajar mandiri karena tidak adanya alat pengatur waktu sesi belajar dan istirahat yang terstruktur.

## 2. Pengguna Sasaran (Persona)
- **Nama**: Nabila Septia
- **Peran**: Mahasiswa Multimedia Broadcasting PENS
- **Kebutuhan**: Alat pengatur waktu belajar Pomodoro sederhana, estetis, dan responsif di layar ponsel maupun laptop.

## 3. Fitur MVP (Prioritas MoSCoW)
- **Must Have**:
  1. Hitung mundur timer belajar (Work & Break).
  2. Tombol Start, Pause, dan Reset.
  3. Riwayat dan statistik sesi belajar harian.
- **Should Have**:
  1. Durasi kustom waktu belajar dan istirahat.
- **Could Have**:
  1. Badge level pencapaian berdasarkan total menit fokus.
- **Won't Have**:
  1. Login pengguna dan penyimpanan basis data cloud (sprint ini fokus pada `localStorage`).

## 4. Kriteria Sukses Terukur
1. Tampilan responsif penuh pada lebar layar 400px (mobile) hingga 1366px (laptop).
2. Fungsi timer berjalan akurat 100% tanpa lag.
3. Data sesi belajar tersimpan secara persisten di `localStorage`.

## 5. Analisis Risiko
1. **Penyimpangan Timer**: Timer melambat saat tab di-minimize -> *Mitigasi*: Gunakan patokan selisih `Date.now()`.
2. **Layout Pecah di Layar Kecil**: -> *Mitigasi*: Menerapkan CSS Media Query khusus batas 400px.
3. **Data Hilang**: -> *Mitigasi*: Validasi `JSON.parse` saat membaca `localStorage`.