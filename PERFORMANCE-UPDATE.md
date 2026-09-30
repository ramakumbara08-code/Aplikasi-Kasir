# Pembaruan performa login

Perubahan ini mengurangi akses Spreadsheet berulang dalam satu eksekusi GAS, membaca header bersama data, dan mengambil satu baris sesi setelah mencari kolom ID token. Validasi token, kedaluwarsa, role, tenant, dan aktivasi tetap berjalan.

Frontend mengambil produk/pelanggan lebih dahulu, kemudian riwayat owner. Frontend baru tetap kompatibel dengan backend lama (respons lengkap tanpa bootstrapPhase). Backend baru tetap mendukung frontend lama.

## Penerapan

1. Gabungkan branch perbaikan ke main agar Vercel membangun frontend terbaru.
2. Di Apps Script **perusahaan Laundry**, ganti isi Code.gs dengan `gas/Code.gs` dari versi ini.
3. Simpan, lalu Deploy > Manage deployments > pilih deployment Laundry > Edit > New version > Deploy. Memperbarui deployment yang sama mempertahankan URL /exec. Jangan mengganti kode Data Center.
4. Muat ulang halaman Laundry dan uji login owner/kasir. Verifikasi produk/pelanggan tampil, lalu riwayat laporan selesai dimuat.

Perbaikan GAS tidak otomatis terpasang melalui Vercel. Tidak perlu setup ulang atau menghapus isi spreadsheet. Batas tunggu login/bootstrap menjadi 45 detik dan resolusi perusahaan 30 detik untuk cold start GAS; ini toleransi koneksi, bukan janji durasi login.

## Validasi lokal

- `npm run build`
- `node tools/performance.test.cjs`

Durasi produksi belum diukur. Uji lokal memakai mock layanan Spreadsheet; login akun produksi harus diuji setelah deployment GAS diperbarui.
