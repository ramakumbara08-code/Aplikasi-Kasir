# Backend Google Apps Script + Spreadsheet

Backend perusahaan memakai Google Apps Script dan Google Spreadsheet. Owner/karyawan tidak perlu mengisi URL backend di halaman login.

## GAS Perusahaan

File: `gas/Code.gs`

1. Buat Spreadsheet perusahaan kosong, lalu buka `Extensions > Apps Script`.
2. Tempel isi `gas/Code.gs`.
3. Deploy sebagai Web App, lalu salin URL `/exec` yang muncul.
4. Buka Spreadsheet perusahaan, jalankan menu `Kasir SaaS > Setup / Perbaiki Sheet`.
5. Masukkan URL `/exec` GAS perusahaan ke Data Center pada kolom `URL Web App GAS Perusahaan`, lalu aktifkan status perusahaan.
6. Admin mengisi data awal sendiri di sheet perusahaan, terutama `users`, `categories`, dan `products`.

Tidak perlu mengisi:

- ID Spreadsheet
- ID Perusahaan
- Slug perusahaan
- URL Data Center di kode milik customer

URL Data Center milik penyedia SaaS sudah berada di template `gas/Code.gs`, mengikuti pola proyek referensi. Frontend membaca slug dari URL, Data Center mengembalikan `companyId`, `companySlug`, dan `companyApiUrl`, lalu GAS perusahaan memvalidasi aktivasi dari konteks itu.

`Setup / Perbaiki Sheet` hanya membuat sheet dan header. Fungsi ini tidak mengisi data contoh, akun owner, akun kasir, kategori, produk, pelanggan, transaksi, biaya, atau pengaturan toko.

Folder Drive yang dibuat:

   - `Invoices`
   - `Logos`

Jika menjalankan dari editor Apps Script dan menu Spreadsheet belum muncul, fungsi teknis yang bisa dipakai tetap:

```js
configureDataCenterUrl("URL_WEB_APP_GAS_DATA_CENTER")
```

Setelah fungsi ini dijalankan, `setup()` hanya mengecek/membuat header sheet. Registrasi ke Data Center tetap memakai menu `Daftarkan ke Data Center` atau pengisian manual di Data Center.

Password akun di sheet `users` disimpan sebagai teks biasa pada kolom `Password`, bukan hash. Ini memudahkan admin pusat mengisi password dasar untuk owner/kasir.

Sheet yang dibuat:

- `tenants`
- `users`
- `tokens`
- `customers`
- `categories`
- `products`
- `transactions`
- `expenses`
- `activityLogs`
- `settings`

Header sheet ditampilkan dengan label manusiawi, tetapi GAS tetap membacanya sebagai field teknis melalui alias header, mengikuti pola proyek referensi.

Minimal data manual agar login GAS bisa diuji:

- Sheet `users`: isi minimal `Username` atau `Email`, `Role`, `Password`, dan `Aktif`.
- Kolom `ID` boleh kosong untuk login pertama; GAS akan mengisi otomatis setelah password benar.
- Kolom `ID Tenant` boleh kosong untuk login pertama; GAS akan mengisi `tenant-demo` otomatis jika sheet `tenants` belum punya data.
- Role owner memakai `owner`; role kasir memakai `cashier`.
- Kolom `Aktif` isi `TRUE`.
- Untuk produk, kategori, pelanggan, transaksi, dan biaya yang dibuat dari aplikasi, ID akan dibuat otomatis oleh aplikasi/GAS.
- Jika admin mengisi data produk/kategori langsung di spreadsheet, sebaiknya tetap isi `ID` sendiri agar relasi seperti `ID Kategori` dan stok tetap konsisten.

## GAS Data Center

File: `gas/data-center/Code.gs`

Ini dipakai oleh Anda sebagai pusat SaaS untuk menyimpan daftar perusahaan dan slug.

1. Buat project GAS terpisah.
2. Tempel isi `gas/data-center/Code.gs`.
3. Jalankan `setupDataCenter()` sekali.
4. Untuk mengaktifkan proteksi update data center, isi Script Properties:

   - `DATA_CENTER_ADMIN_KEY`

5. Deploy sebagai Web App.
6. Di frontend, isi `dataCenterApiUrl` pada `js/config.js` dengan URL Web App Data Center. Setelah itu slug seperti `/Toko-Rama` otomatis dibaca dari Data Center tanpa menambahkan URL GAS di link.

Sheet Data Center:

- `Companies`

Kolom utama:

- `companyId`
- `companySlug`
- `companyName`
- `storeName`
- `companyApiUrl`
- `companySpreadsheetUrl`
- `companySpreadsheetId`
- `frontendUrl`
- `status`
- data owner dan kontak perusahaan

`frontendUrl` / `URL Web Frontend` adalah alamat aplikasi kasir yang dibuka oleh toko/customer di browser, misalnya `https://kasir-anda.vercel.app/toko-contoh` atau saat lokal `http://localhost:4174/demo`. Ini berbeda dari `companyApiUrl`, karena `companyApiUrl` adalah URL Web App GAS perusahaan untuk akses data.

Format response GAS mengikuti pola referensi:

```json
{
  "success": true,
  "data": {}
}
```

Action publik:

- `getCompanyConfig`
- `resolveCompany`
- `registerCompanyFromGas` untuk registrasi otomatis opsional dari GAS perusahaan. Status awal tetap `nonaktif`.

Action admin:

- `upsertCompany`
- `createOrUpdateCompany`
- `activateCompany`
- `deactivateCompany`

Contoh tambah perusahaan via request POST:

```json
{
  "action": "upsertCompany",
  "adminKey": "TOKEN_ADMIN_RAHASIA",
  "company": {
    "companyId": "tenant-toko-contoh",
    "companySlug": "toko-contoh",
    "companyName": "Toko Contoh",
    "frontendUrl": "https://domain-anda.com/toko-contoh",
    "companyApiUrl": "https://script.google.com/macros/s/xxx/exec",
    "companySpreadsheetId": "ID_SPREADSHEET_PERUSAHAAN",
    "companySpreadsheetUrl": "https://docs.google.com/spreadsheets/d/...",
    "status": "aktif"
  }
}
```

Slug demo:

- Buka `/demo`.
- Data demo lengkap bisa dicoba CRUD.
- Refresh halaman mengembalikan data ke kondisi awal.
