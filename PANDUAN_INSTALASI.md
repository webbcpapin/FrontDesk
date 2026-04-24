# ============================================================
# PANDUAN INSTALASI FRONTDESK BEA CUKAI + GOOGLE APPS SCRIPT
# ============================================================

## LANGKAH 1: BUAT GOOGLE SHEET
1. Buka https://sheets.google.com
2. Klik "Blank" untuk membuat spreadsheet baru
3. Beri nama: "Frontdesk Bea Cukai Pangkalpinang 2026"
4. Copy ID spreadsheet dari URL:
   https://docs.google.com/spreadsheets/d/【ID_DISINI】/edit

   Contoh ID: 1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdef

## LANGKAH 2: SETUP GOOGLE APPS SCRIPT
1. Di Google Sheet, klik menu: Extensions → Apps Script
2. Hapus semua kode default (function myFunction(){})
3. Copy paste seluruh kode dari file Code.gs
4. Ganti CONFIG.SPREADSHEET_ID dengan ID Anda:

   Dari: SPREADSHEET_ID: 'GANTI_DENGAN_ID_SPREADSHEET_ANDA'
   Menjadi: SPREADSHEET_ID: '1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdef'

5. Klik tombol "Save" (disk icon) atau Ctrl+S
6. Beri nama project: "FrontdeskBC_Pangkalpinang"

## LANGKAH 3: JALANKAN SETUP (PENTING!)
1. Di Apps Script, pilih fungsi: setupSpreadsheet
2. Klik tombol "Run" (▶️)
3. Izinkan permission jika diminta:
   - Klik "Review Permissions"
   - Pilih akun Google Anda
   - Klik "Advanced" → "Go to FrontdeskBC_Pangkalpinang (unsafe)"
   - Klik "Allow"
4. Lihat log (View → Logs) untuk mendapatkan Spreadsheet ID
5. Copy ID tersebut dan paste ke CONFIG.SPREADSHEET_ID

## LANGKAH 4: IMPORT DATA HISTORY
1. Pilih fungsi: importAllHistoryData
2. Klik "Run" (▶️)
3. Data Januari-Maret 2026 akan otomatis masuk ke sheet
4. Cek Google Sheet Anda, seharusnya muncul 7 sheet:
   - BukuTamu
   - LayananInformasi
   - Pengaduan
   - KlinikEkspor
   - JanjiTemu
   - PPID
   - History

## LANGKAH 5: DEPLOY WEB APP
1. Di Apps Script, klik: Deploy → New deployment
2. Klik ikon gear (⚙️) di "Select type"
3. Pilih: "Web app"
4. Isi deskripsi: "Frontdesk BC Pangkalpinang v1.0"
5. "Execute as": Me
6. "Who has access": ANYONE (penting!)
7. Klik "Deploy"
8. Izinkan permission lagi jika diminta
9. Copy "Web app URL"

## LANGKAH 6: UPDATE FRONTEND
1. Buka file frontdesk_premium_bea_cukai.html
2. Cari baris: const GAS_URL = '...'
3. Ganti dengan URL deployment Anda:

   Dari: 'https://script.google.com/macros/s/AKfycbx.../exec'
   Menjadi: 'https://script.google.com/macros/s/【ID_ANDA】/exec'

## LANGKAH 7: TESTING
1. Buka file HTML di browser (double-click)
2. Coba isi form Buku Tamu
3. Cek Google Sheet → sheet BukuTamu
4. Seharusnya data muncul dalam beberapa detik

## LANGKAH 8: DEPLOY FRONTEND (PILIHAN)
### Opsi A: Google Sites (REKOMENDASI)
1. Buka https://sites.google.com
2. Buat site baru
3. Insert → Embed → paste kode HTML
4. Publish site

### Opsi B: GitHub Pages
1. Buat repository GitHub
2. Upload file HTML
3. Settings → Pages → Source: main branch

### Opsi C: Netlify
1. Buka https://netlify.com
2. Drag & drop file HTML
3. Dapat URL gratis

## TROUBLESHOOTING

### Error "Authorization required"
- Pastikan deployment Web App menggunakan "Execute as: Me"
- Pastikan "Who has access: ANYONE"

### Data tidak masuk ke Sheet
- Cek Spreadsheet ID sudah benar
- Cek nama sheet sesuai dengan konfigurasi
- Lihat Execution Log di Apps Script

### CORS Error
- Pastikan menggunakan doGet/doPost dengan return ContentService
- Jangan lupa setMimeType(ContentService.MimeType.JSON)

### QR Code tidak muncul
- Pastikan koneksi internet aktif (memuat library QR Code)
- Cek console browser untuk error

## STRUKTUR DATA GOOGLE SHEET

### Sheet: BukuTamu
| Timestamp | ID_Tiket | Nomor_HP | Nama | Instansi | Email | Alamat | Bertemu_Dengan | Keperluan | Jumlah_Rombongan | Tanggal_Kunjungan | Status |

### Sheet: LayananInformasi
| Timestamp | ID_Tiket | Nomor_HP | Nama | Email | Instansi | Alamat | Kategori | Detail | Cara_Peroleh | Cara_Kirim | Status | PIC | Keterangan |

### Sheet: Pengaduan
| Timestamp | ID_Tiket | Nomor_HP | Nama | Email | Pekerjaan | Alamat | Kategori | Cara_Penyampaian | Judul | Lokasi | Tanggal_Kejadian | Uraian | Status | PIC | Keterangan | Rahasia |

### Sheet: KlinikEkspor
| Timestamp | ID_Tiket | Nomor_HP | Nama | Nama_Usaha | Email | Domisili | Alamat | Tahap_UMKM | Jenis_Produk | Keperluan | Deskripsi | Status | PIC | Keterangan |

### Sheet: JanjiTemu
| Timestamp | ID_Tiket | Nomor_HP | Nama | Instansi | Email | Bertemu_Dengan | Keperluan | Tanggal | Waktu | Status | PIC | Keterangan |

### Sheet: PPID
| Timestamp | ID_Tiket | Nomor_HP | Nama | NIK | NPWP | Email | Pekerjaan | Alamat | Detail | Tujuan | Status | PIC | Keterangan |

### Sheet: History
| Timestamp | Nomor_HP | Nama | Email | Instansi | Alamat | Pekerjaan |

## KONTAK & BANTUAN
Jika ada kendala, cek:
1. Execution Log di Google Apps Script
2. Browser Console (F12 → Console)
3. Network tab untuk melihat request/response
