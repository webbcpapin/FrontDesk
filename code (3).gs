// ============================================
// CONFIGURATION
// ============================================
const SPREADSHEET_ID = 'ISI_DENGAN_ID_SPREADSHEET_ANDA'; // Ganti dengan ID spreadsheet
const SHEET_NAMES = {
  'buku': 'BukuTamu',
  'informasi': 'LayananInformasi', 
  'pengaduan': 'Pengaduan',
  'klinik': 'KlinikEkspor',
  'janji': 'JanjiTemu',
  'ppid': 'PPID'
};

// ============================================
// DOGET - Untuk mengambil data
// ============================================
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    // Cek Status Tiket
    if (action === 'cekTiket') {
      const tiket = e.parameter.tiket;
      const result = cekStatusTiket(tiket);
      return jsonResponse(result);
    }
    
    // Get Data untuk Dashboard
    if (action === 'getData') {
      const sheetName = e.parameter.sheet;
      const data = getSheetData(sheetName);
      return jsonResponse({ success: true, data: data });
    }
    
    // Get Semua Data Dashboard
    if (action === 'getDashboard') {
      const dashboard = getDashboardData();
      return jsonResponse({ success: true, ...dashboard });
    }
    
    // Check History by HP
    if (action === 'checkHistory') {
      const hp = e.parameter.hp;
      const history = checkHistoryByHP(hp);
      return jsonResponse({ success: true, data: history });
    }
    
    // Default
    return jsonResponse({ success: false, message: 'Action tidak dikenal' });
    
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() });
  }
}

// ============================================
// DOPOST - Untuk menerima data form
// ============================================
function doPost(e) {
  try {
    // Parse form data
    const params = e.parameter;
    const layanan = params.layanan;
    
    if (!layanan || !SHEET_NAMES[layanan]) {
      return jsonResponse({ success: false, message: 'Layanan tidak valid: ' + layanan });
    }
    
    // Generate ID jika belum ada
    const idTiket = params.id_tiket || generateTicketNumber();
    const timestamp = params.timestamp || new Date().toISOString();
    
    // Siapkan data berdasarkan jenis layanan
    let rowData = [];
    let sheetName = SHEET_NAMES[layanan];
    
    switch(layanan) {
      case 'buku':
        rowData = [
          idTiket,
          timestamp,
          params.nama || '',
          params.hp || '',
          params.email || '',
          params.instansi || '',
          params.alamat || '',
          params.bertemu_dengan || '',
          params.keperluan || '',
          params.jumlah_rombongan || '1',
          params.tanggal || '',
          'Hadir', // status default
          '' // waktu pulang
        ];
        break;
        
      case 'informasi':
        rowData = [
          idTiket,
          timestamp,
          params.nama || '',
          params.hp || '',
          params.email || '',
          params.instansi || '',
          params.alamat || '',
          params.kategori || '',
          params.detail || '',
          params.cara_peroleh || 'Langsung',
          params.cara_kirim || 'Ambil Langsung',
          'Diterima', // status
          '' // file url
        ];
        break;
        
      case 'pengaduan':
        rowData = [
          idTiket,
          timestamp,
          params.nama || '',
          params.hp || '',
          params.email || '',
          params.pekerjaan || '',
          params.alamat || '',
          params.kategori || '',
          params.cara_penyampaian || 'Langsung',
          params.judul || '',
          params.lokasi || '',
          params.tanggal_kejadian || '',
          params.uraian || '',
          'Diterima', // status
          '' // file url
        ];
        break;
        
      case 'klinik':
        rowData = [
          idTiket,
          timestamp,
          params.nama || '',
          params.hp || '',
          params.email || '',
          params.nama_usaha || '',
          params.domisili || '',
          params.alamat || '',
          params.tahap_umkm || '',
          params.jenis_produk || '',
          params.keperluan || '',
          params.deskripsi || '',
          'Diproses', // status
          '' // file url
        ];
        break;
        
      case 'janji':
        rowData = [
          idTiket,
          timestamp,
          params.nama || '',
          params.hp || '',
          params.email || '',
          params.instansi || '',
          params.bertemu_dengan || '',
          params.keperluan || '',
          params.tanggal || '',
          params.waktu || '',
          'Dijadwalkan', // status
          '' // file url
        ];
        break;
        
      case 'ppid':
        rowData = [
          idTiket,
          timestamp,
          params.nama || '',
          params.hp || '',
          params.nik || '',
          params.npwp || '',
          params.email || '',
          params.pekerjaan || '',
          params.alamat || '',
          params.detail || '',
          params.tujuan || '',
          'Diproses', // status
          '' // file url
        ];
        break;
    }
    
    // Simpan ke spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    // Buat sheet jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Tambah header
      const headers = getHeaders(layanan);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#4285f4')
        .setFontColor('white');
    }
    
    // Tambah row data
    sheet.appendRow(rowData);
    
    // Format timestamp
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    
    // Return sukses
    return jsonResponse({ 
      success: true, 
      message: 'Data berhasil disimpan',
      id_tiket: idTiket,
      layanan: layanan
    });
    
  } catch (error) {
    return jsonResponse({ success: false, message: error.toString() });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateTicketNumber() {
  const date = new Date();
  const dateStr = Utilities.formatDate(date, 'Asia/Jakarta', 'yyyyMMdd');
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return 'BC-' + dateStr + '-' + random;
}

function getHeaders(layanan) {
  const headers = {
    'buku': ['ID Tiket', 'Timestamp', 'Nama', 'No HP', 'Email', 'Instansi', 'Alamat', 'Bertemu Dengan', 'Keperluan', 'Jumlah Rombongan', 'Tanggal Kunjungan', 'Status', 'Waktu Pulang'],
    'informasi': ['ID Tiket', 'Timestamp', 'Nama', 'No HP', 'Email', 'Instansi', 'Alamat', 'Kategori', 'Detail', 'Cara Peroleh', 'Cara Kirim', 'Status', 'File URL'],
    'pengaduan': ['ID Tiket', 'Timestamp', 'Nama', 'No HP', 'Email', 'Pekerjaan', 'Alamat', 'Kategori', 'Cara Penyampaian', 'Judul', 'Lokasi', 'Tanggal Kejadian', 'Uraian', 'Status', 'File URL'],
    'klinik': ['ID Tiket', 'Timestamp', 'Nama', 'No HP', 'Email', 'Nama Usaha', 'Domisili', 'Alamat', 'Tahap UMKM', 'Jenis Produk', 'Keperluan', 'Deskripsi', 'Status', 'File URL'],
    'janji': ['ID Tiket', 'Timestamp', 'Nama', 'No HP', 'Email', 'Instansi', 'Bertemu Dengan', 'Keperluan', 'Tanggal', 'Waktu', 'Status', 'File URL'],
    'ppid': ['ID Tiket', 'Timestamp', 'Nama', 'No HP', 'NIK', 'NPWP', 'Email', 'Pekerjaan', 'Alamat', 'Detail', 'Tujuan', 'Status', 'File URL']
  };
  return headers[layanan] || [];
}

function cekStatusTiket(tiket) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  
  for (let sheet of sheets) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === tiket) {
        return {
          found: true,
          layanan: sheet.getName(),
          data: data[i],
          headers: data[0]
        };
      }
    }
  }
  
  return { found: false, message: 'Tiket tidak ditemukan' };
}

function checkHistoryByHP(hp) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  let results = [];
  
  for (let sheet of sheets) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    for (let i = 1; i < data.length; i++) {
      // Cek kolom HP (biasa kolom ke-4 atau ke-3)
      if (data[i][3] === hp || data[i][2] === hp) {
        let record = {};
        headers.forEach((h, idx) => record[h] = data[i][idx]);
        record._sheet = sheet.getName();
        results.push(record);
      }
    }
  }
  
  return results;
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let result = [];
  
  for (let i = 1; i < data.length; i++) {
    let row = {};
    headers.forEach((h, idx) => row[h] = data[i][idx]);
    result.push(row);
  }
  
  return result;
}

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  
  let summary = {
    totalTamuHariIni: 0,
    totalLayanan: 0,
    bukuTamu: [],
    layananInformasi: [],
    pengaduan: [],
    klinik: [],
    janji: [],
    ppid: []
  };
  
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  
  for (let sheet of sheets) {
    const name = sheet.getName();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) continue;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const timestamp = row[1] ? Utilities.formatDate(new Date(row[1]), 'Asia/Jakarta', 'yyyy-MM-dd') : '';
      
      // Hitung hari ini
      if (timestamp === today) {
        summary.totalTamuHariIni++;
      }
      
      summary.totalLayanan++;
      
      // Kategorikan
      if (name === 'BukuTamu') {
        summary.bukuTamu.push({
          id: row[0],
          nama: row[2],
          instansi: row[5],
          keperluan: row[8],
          status: row[11],
          waktu: timestamp
        });
      } else if (name === 'LayananInformasi') {
        summary.layananInformasi.push({
          id: row[0],
          nama: row[2],
          kategori: row[7],
          status: row[11]
        });
      }
    }
  }
  
  return summary;
}