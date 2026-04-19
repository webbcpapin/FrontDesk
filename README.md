# PANDUAN IMPLEMENTASI FRONTDESK BEA CUKAI PANGKALPINANG

## 📋 Daftar Isi
1. [Struktur File](#struktur-file)
2. [Setup Google Sheets](#setup-google-sheets)
3. [Setup Google Apps Script](#setup-google-apps-script)
4. [Deploy Frontend](#deploy-frontend)
5. [Konfigurasi Fitur](#konfigurasi-fitur)
6. [Panduan Penggunaan](#panduan-penggunaan)
7. [Troubleshooting](#troubleshooting)

---

## 📁 Struktur File

```
frontdesk_bea_cukai/
├── frontend/
│   ├── index.html          # Aplikasi utama (Kiosk Mode)
│   └── dashboard.html      # Dashboard monitoring petugas
├── gas_backend/
│   └── Code.gs             # Google Apps Script backend
└── docs/
    └── README.md           # Dokumentasi ini
```

---

## 📝 Setup Google Sheets

### 1. Buat Spreadsheet Baru
- Buka [Google Sheets](https://sheets.google.com)
- Buat spreadsheet baru dengan nama: **"Frontdesk Bea Cukai"**
- Copy Spreadsheet ID dari URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

### 2. Buat Sheet (Tab)
Buat sheet dengan nama berikut (urutan tidak penting):

| No | Nama Sheet | Keterangan |
|----|-----------|------------|
| 1 | `MASTER_DATA` | Data utama semua layanan |
| 2 | `DATA_INFORMASI` | Detail layanan informasi |
| 3 | `DATA_PPID` | Detail permohonan PPID |
| 4 | `DATA_PENGADUAN` | Detail pengaduan masyarakat |
| 5 | `DATA_JANJI` | Detail janji temu |
| 6 | `DATA_KLINIK` | Detail klinik ekspor |
| 7 | `DATA_TAMU` | Detail buku tamu |
| 8 | `USER_PETUGAS` | Data akun petugas |
| 9 | `LOG_AKTIVITAS` | Log sistem |

### 3. Struktur MASTER_DATA
Kolom yang harus ada di sheet MASTER_DATA:

```
A: ID Tiket
B: Timestamp
C: Jenis Layanan
D: Nama
E: HP
F: Email
G: Instansi
H: Detail
I: Status
J: PIC
K: Waktu Proses
L: Waktu Selesai
M: SLA (Jam)
N: Overdue
O: Feedback
```

---

## ⚙️ Setup Google Apps Script

### 1. Buka GAS
- Dari Google Sheets: **Extensions → Apps Script**
- Atau buka [script.google.com](https://script.google.com)

### 2. Copy Code
1. Hapus semua code default (function myFunction)
2. Copy isi file `gas_backend/Code.gs`
3. Paste ke editor GAS

### 3. Update Konfigurasi
Cari baris ini dan ganti dengan Spreadsheet ID Anda:
```javascript
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
```

### 4. Deploy sebagai Web App
1. Klik **Deploy → New deployment**
2. Klik ikon gear (⚙️) pilih **Web app**
3. Isi deskripsi: "Frontdesk BC API"
4. **Execute as**: Me
5. **Who has access**: Anyone (atau sesuaikan kebutuhan)
6. Klik **Deploy**
7. Copy **Web App URL**

### 5. Update Frontend
Buka file `frontend/index.html` dan `frontend/dashboard.html`, cari:
```javascript
const GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```
Ganti dengan URL deployment Anda.

### 6. Setup Trigger (Opsional tapi direkomendasikan)
Di GAS editor:
1. Pilih fungsi `setupTrigger` di dropdown
2. Klik **Run** (▶️)
3. Beri izin jika diminta
4. Trigger akan memeriksa overdue setiap jam

---

## 🚀 Deploy Frontend

### Opsi 1: GitHub Pages (Gratis)
1. Buat repository GitHub baru
2. Upload `index.html` dan `dashboard.html`
3. Settings → Pages → Source: Deploy from branch → main
4. Akses via `https://username.github.io/repo-name`

### Opsi 2: Netlify (Gratis)
1. Daftar di [netlify.com](https://netlify.com)
2. Drag & drop folder `frontend`
3. Dapatkan URL gratis

### Opsi 3: Hosting Internal
- Upload ke server internal BC
- Pastikan HTTPS aktif (wajib untuk geolocation)

### Opsi 4: Google Sites (Mudah)
1. Buka [sites.google.com](https://sites.google.com)
2. Insert → Embed → Masukkan URL frontend
3. Atau embed langsung HTML (terbatas)

---

## 🔧 Konfigurasi Fitur

### A. History Tamu (Auto-fill)
Fitur ini sudah aktif otomatis. Saat tamu mengisi nomor HP:
- Sistem cek database
- Jika ditemukan: auto-fill nama, email, instansi, alamat
- Jika baru: input manual

### B. Nomor Tiket Otomatis
Format: `BC-YYYYMMDD-XXX`
- BC: Kode Bea Cukai
- YYYYMMDD: Tanggal
- XXX: Nomor urut random

### C. SLA (Service Level Agreement)
Konfigurasi di `Code.gs`:
```javascript
const SLA_CONFIG = {
  'informasi': 24,      // 24 jam
  'ppid': 168,          // 7 hari
  'pengaduan': 72,      // 3 hari
  'janji': 24,
  'klinik': 48,
  'buku': 1
};
```

### D. Notifikasi WhatsApp
Template sudah dibuat. Untuk mengaktifkan:
1. Pilih provider: Twilio, Wablas, Fonnte, dll
2. Dapatkan API Key
3. Update fungsi `sendWhatsAppNotification()` di Code.gs

Contoh dengan Wablas:
```javascript
function sendWhatsAppNotification(hp, idTiket, type) {
  const token = 'YOUR_WABLAS_TOKEN';
  const url = 'https://solo.wablas.com/api/send-message';

  const messages = {
    'diterima': 'Halo, tiket ' + idTiket + ' telah diterima...',
    'diproses': 'Halo, tiket ' + idTiket + ' sedang diproses...',
    'selesai': 'Halo, tiket ' + idTiket + ' telah selesai...'
  };

  UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      phone: hp,
      message: messages[type]
    })
  });
}
```

### E. SKM (Survei Kepuasan Masyarakat)
Link SKM sudah terintegrasi:
```
https://forms.office.com/Pages/ResponsePage.aspx?id=ZrNv7SKD80aRXsTQN6RUqUHW-Z1OdaZHlGb3jAd0e1VUOVo1S1E3R0VVSTZJU0ZYSEk5TUdJMUJHMSQlQCNjPTEkJUAjdD1n
```
- Klik card "Survey Kepuasan" akan membuka link di tab baru
- Data SKM tidak masuk database lokal (sesuai arahan)

---

## 👥 Panduan Penggunaan

### Untuk Tamu:
1. Pilih layanan yang diinginkan di layar utama
2. Isi form yang muncul
3. Jika pernah datang, masukkan HP → data auto-fill
4. Klik Submit
5. Screenshot nomor tiket yang muncul
6. Cek status kapan saja dengan nomor tiket/HP

### Untuk Petugas Frontdesk:
1. Buka Dashboard (tombol di pojok kanan atas)
2. Login dengan akun yang sudah didaftarkan
3. Monitor antrian yang masuk
4. Klik "Proses" untuk melayani
5. Klik "Selesai" jika layanan selesai
6. Keterangan opsional bisa ditambahkan

### Untuk Admin:
1. Akses Google Sheets untuk melihat semua data
2. Filter dan sort sesuai kebutuhan
3. Export ke Excel jika diperlukan
4. Kelola akun petugas di sheet USER_PETUGAS

---

## 🔍 Troubleshooting

### Masalah: Data tidak masuk ke Google Sheet
**Solusi:**
1. Cek Spreadsheet ID sudah benar
2. Cek nama sheet sesuai (case-sensitive)
3. Cek permission GAS: "Anyone" atau "Anyone with Google account"
4. Buka Console Browser (F12) → lihat error

### Masalah: CORS Error
**Solusi:**
- Pastikan GAS deployed sebagai Web App (bukan API Exec)
- Cek header response sudah JSON

### Masalah: Auto-fill tidak berfungsi
**Solusi:**
- Pastikan nomor HP sama persis (termasuk format)
- Cek sheet MASTER_DATA punya data sebelumnya
- Periksa koneksi internet

### Masalah: File upload gagal
**Solusi:**
- Maksimal file size: 5MB
- Format yang diizinkan: PDF, JPG, PNG
- Untuk file besar, gunakan Google Drive integration (advanced)

### Masalah: WhatsApp tidak terkirim
**Solusi:**
- Cek saldo/paket provider WhatsApp
- Cek nomor HP valid (format Indonesia: 08xxx)
- Cek API Key masih aktif
- Lihat log di sheet LOG_AKTIVITAS

---

## 🔐 Keamanan

1. **Jangan commit Spreadsheet ID ke repository publik**
2. **Ganti URL GAS secara berkala** (re-deploy)
3. **Batasi akses Dashboard** dengan sistem login
4. **Backup data secara rutin** (Google Sheets otomatis tersimpan di cloud)
5. **Hapus data sensitif** sesuai kebijakan retensi

---

## 📞 Kontak & Dukungan

Jika ada kendala teknis:
1. Cek LOG_AKTIVITAS di Google Sheets
2. Buka Console Browser (F12 → Console)
3. Hubungi tim IT BC Pangkalpinang

---

## 🔄 Update & Maintenance

### Update Frontend:
1. Edit file HTML/CSS/JS
2. Re-upload ke hosting
3. Hard refresh browser (Ctrl+F5)

### Update Backend:
1. Edit Code.gs
2. Save
3. Re-deploy (Deploy → Manage deployments → Edit → New version)
4. Update URL di frontend jika berubah

### Backup Database:
1. File → Download → Microsoft Excel (.xlsx)
2. Atau copy spreadsheet: File → Make a copy

---

**Versi:** 1.0  
**Tanggal:** April 2024  
**Dibuat untuk:** Bea Cukai Pangkalpinang
