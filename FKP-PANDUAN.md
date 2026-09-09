# Modul FKP 2026

Halaman pengisian: https://webbcpapin.github.io/FrontDesk/fkp/

Halaman administrator: https://webbcpapin.github.io/FrontDesk/fkp/admin.html

QR Code: https://webbcpapin.github.io/FrontDesk/fkp/qr.svg

Pesan WhatsApp: https://webbcpapin.github.io/FrontDesk/fkp/pesan-whatsapp.txt

## Aktivasi backend (wajib sebelum membagikan tautan)

1. Buka proyek Apps Script yang melayani FrontDesk. Perbarui sumber utama menggunakan `code (3).gs` dan tambahkan berkas `FKP.gs`. Dua rute baru adalah GET `fkpStatus` dan POST `fkpSubmit`.
2. Jalankan `setupFKP`. Fungsi ini membuat satu spreadsheet khusus FKP dan menyimpan ID dalam Script Properties. Menjalankan ulang tidak membuat berkas duplikat. Tautan dashboard Google Sheets muncul pada execution log. Pastikan General access berkas adalah Restricted.
3. Perbarui deployment web app yang sudah digunakan FrontDesk: Deploy → Manage deployments → Edit → New version → Deploy. Pertahankan deployment ID, akun pelaksana, dan pengaturan akses yang sudah ada.
4. Buka halaman formulir. Kolom hanya aktif jika `fkpStatus` mengenali modul serta menyatakan pengisian terbuka. Jangan membagikan tautan jika halaman masih menyatakan belum dapat menerima masukan.
5. Lakukan satu pengiriman uji yang ditandai jelas sebagai data uji dan periksa baris di dashboard. Hapus data uji melalui Google Sheets sebelum rekap nyata.

## Data dan administrator

Respons FKP disimpan pada spreadsheet terpisah dari database layanan lama. Endpoint publik hanya menerima masukan dan memberikan status; tidak menyediakan daftar respons. Akses dashboard dan ekspor menggunakan autentikasi serta izin Google Sheets, bukan kata sandi di JavaScript.

Tab **Ringkasan** memuat jumlah respons total, per lima unsur, dan per layanan. Tab **Respons FKP** memiliki filter pada unsur masyarakat dan jenis layanan serta kolom kendala dan rekomendasi. Moda Online dan waktu pengisian ditetapkan server. Kontak tidak wajib, termasuk ketika responden bersedia dihubungi.

Ekspor: File → Download → Microsoft Excel (.xlsx) atau CSV untuk tab aktif. Filter tidak menjamin data tersembunyi dikeluarkan dari unduhan; jika perlu hasil filter saja, salin hasil yang diizinkan ke berkas rekap baru sebelum mengunduh. Untuk berbagi publik, buat rekap tanpa identitas/kontak dan tinjau teks bebas untuk data sensitif. Jangan mengubah akses berkas respons mentah menjadi publik.

## Menutup atau membatasi pengisian

Di Apps Script → Project Settings → Script Properties:

- `FKP_OPEN`: `true` untuk menerima masukan atau `false` untuk menutup.
- `FKP_DEADLINE`: opsional, tanggal ISO dengan zona waktu, misalnya `2026-09-30T23:59:59+07:00`. Hapus properti untuk tanpa batas tanggal. Tanggal tidak valid menutup formulir agar tidak menerima kiriman tanpa kepastian.
- `FKP_SPREADSHEET_ID`: diisi otomatis oleh setup; jangan diubah untuk penggunaan rutin.

Perubahan properti berlaku langsung tanpa menerbitkan versi ulang. Server memeriksa status saat kiriman diterima, sehingga halaman yang sudah terbuka pun tidak dapat melewati batas waktu.

## Pengujian lokal

Jalankan `node test-fkp.cjs` dan `node --check fkp/form.js`. Pengujian mencakup seluruh isian wajib, enum, layanan kosong/tidak valid, panjang isian, penyimpanan, pengiriman ulang, penutupan, tanggal batas, proteksi formula, kegagalan server, dan redaksi formulir. Pengujian memakai penyimpanan tiruan di memori; tidak menulis data nyata dan tidak menggantikan pengujian kiriman pada deployment.

Permohonan maaf hanya berada pada `fkp/pesan-whatsapp.txt`. Deskripsi formulir tidak memuat permohonan maaf atau rating SKM.
