// ============================================
// GOOGLE APPS SCRIPT - FRONTDESK BEA CUKAI
// Backend untuk aplikasi Frontdesk Premium
// ============================================

const SPREADSHEET_ID = '1_TINczIJ6GNcHk5aeBYdG3bj2praCEZMowuiVf4xAnY'; // ID Spreadsheet Frontdesk Bea Cukai Pangkalpinang
const APP_VERSION = '2026-06-23-agenda-admin-fix';

// ============================================
// CORS HELPERS
// ============================================
function createJSONResponse(obj, callback) {
  const json = JSON.stringify(obj);
  const safeCallback = callback && /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback) ? callback : '';
  const output = ContentService.createTextOutput(safeCallback ? safeCallback + '(' + json + ')' : json);
  output.setMimeType(safeCallback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  return output;
}

function createCORSResponse(obj, callback) {
  // Untuk deployment Web App, Access-Control-Allow-Origin sudah diatur
  // melalui header di appsscript.json atau deployment setting.
  // Namun kita tetap gunakan JSON output standar.
  return createJSONResponse(obj, callback);
}

function normalizeHeaderName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getCanonicalKey(header) {
  const key = normalizeHeaderName(header);
  const aliases = {
    idtiket: 'id_tiket',
    idticket: 'id_tiket',
    nomortiket: 'id_tiket',
    notiket: 'id_tiket',
    nomor: 'id_tiket',
    tiket: 'id_tiket',
    ticketnumber: 'id_tiket',
    timestamp: 'timestamp',
    nama: 'nama',
    nohp: 'hp',
    nomorhp: 'hp',
    hp: 'hp',
    email: 'email',
    instansi: 'instansi',
    alamat: 'alamat',
    bertemudengan: 'bertemu_dengan',
    bertemudenga: 'bertemu_dengan',
    keperluan: 'keperluan',
    jumlahrombongan: 'jumlah_rombongan',
    jumlahrombo: 'jumlah_rombongan',
    tanggalkunjungan: 'tanggal',
    tanggalkunjun: 'tanggal',
    tanggal: 'tanggal',
    status: 'status',
    waktupulang: 'waktu_pulang',
    kategori: 'kategori',
    detail: 'detail',
    rincianinformasi: 'detail',
    rincianinformasiyangdibutuhkan: 'detail',
    informasiyangdibutuhkan: 'detail',
    pertanyaan: 'pertanyaan',
    jawaban: 'jawaban',
    nomorformulir: 'nomor_formulir',
    nomorform: 'nomor_formulir',
    formulir: 'nomor_formulir',
    caraperoleh: 'cara_peroleh',
    carakirim: 'cara_kirim',
    lampiran: 'lampiran',
    pekerjaan: 'pekerjaan',
    carapenyampaian: 'cara_penyampaian',
    judul: 'judul',
    lokasi: 'lokasi',
    tanggalkejadian: 'tanggal_kejadian',
    uraian: 'uraian',
    namausaha: 'nama_usaha',
    domisili: 'domisili',
    tahapumkm: 'tahap_umkm',
    jenisproduk: 'jenis_produk',
    deskripsi: 'deskripsi',
    nik: 'nik',
    npwp: 'npwp',
    tujuan: 'tujuan',
    waktu: 'waktu',
    agenda: 'agenda',
    tempat: 'tempat',
    penyelenggara: 'penyelenggara_tamu_undangan',
    tamu: 'penyelenggara_tamu_undangan',
    undangan: 'penyelenggara_tamu_undangan',
    penyelenggaratamuundangan: 'penyelenggara_tamu_undangan',
    penyelenggaratamu: 'penyelenggara_tamu_undangan',
    penyelenggaraundangan: 'penyelenggara_tamu_undangan',
    pic: 'pic',
    unsur: 'unsur',
    nilai: 'nilai',
    bulan: 'bulan',
    total: 'total',
    feed: 'feed',
    reels: 'reels',
    jenis: 'jenis',
    keterangan: 'keterangan'
  };
  return aliases[key] || String(header || '').trim().replace(/\s+/g, '_').toLowerCase();
}

function normalizeParams(params) {
  const normalized = {};
  Object.keys(params || {}).forEach(function(key) {
    normalized[getCanonicalKey(key)] = params[key];
  });
  return Object.assign({}, params || {}, normalized);
}

function buildRowObject(headers, row) {
  const obj = {};
  headers.forEach(function(header, index) {
    const canonical = getCanonicalKey(header);
    obj[canonical] = row[index];
    obj[header] = row[index];
  });
  return obj;
}

function findColumnIndex(headers, canonicalKey) {
  for (let i = 0; i < headers.length; i++) {
    if (getCanonicalKey(headers[i]) === canonicalKey) return i;
  }
  return -1;
}

function ensureTicketHeader(sheet, headers) {
  if (findColumnIndex(headers, 'id_tiket') >= 0) return headers;
  if (!sheet || !headers || headers.length === 0) return headers;

  const firstHeader = String(headers[0] || '').trim();
  const shouldUseFirstColumn = !firstHeader || /^no(\.|mor)?(\s*)?(tiket|ticket)?$/i.test(firstHeader);
  if (!shouldUseFirstColumn) return headers;

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const sampleSize = Math.min(lastRow - 1, 20);
    const firstColumn = sheet.getRange(2, 1, sampleSize, 1).getValues();
    const hasTicketValues = firstColumn.some(function(row) {
      return /^BC-\d{8}-\d{1,4}$/i.test(String(row[0] || '').trim());
    });
    const hasOnlyBlankOrTicketValues = firstColumn.every(function(row) {
      const value = String(row[0] || '').trim();
      return !value || /^BC-\d{8}-\d{1,4}$/i.test(value);
    });
    if (!hasTicketValues && !hasOnlyBlankOrTicketValues) return headers;
  }

  sheet.getRange(1, 1).setValue('id_tiket');
  headers[0] = 'id_tiket';
  return headers;
}

function looksLikeHeaderRow(headers) {
  if (!headers || headers.length === 0) return false;
  const canonicalHeaders = headers.map(function(header) {
    return getCanonicalKey(header);
  });
  const knownHeaders = canonicalHeaders.filter(function(header) {
    return ['timestamp', 'id_tiket', 'hp', 'nama', 'email', 'instansi', 'alamat', 'kategori', 'detail', 'status'].indexOf(header) >= 0;
  });
  return knownHeaders.length >= 2 || canonicalHeaders.indexOf('timestamp') >= 0 || canonicalHeaders.indexOf('id_tiket') >= 0;
}

function ensureRequiredHeaders(sheet, headers, headerRow, layanan) {
  const requiredHeaders = getHeaders(layanan || '');
  if (!sheet || !layanan || requiredHeaders.length === 0) return headers;

  let lastHeaderIndex = headers.length - 1;
  while (lastHeaderIndex >= 0 && !String(headers[lastHeaderIndex] || '').trim()) {
    lastHeaderIndex--;
  }
  const effectiveHeaders = headers.slice(0, lastHeaderIndex + 1);
  const canonicalHeaders = effectiveHeaders.map(function(header) {
    return getCanonicalKey(header);
  });
  const missingHeaders = requiredHeaders.filter(function(header) {
    return canonicalHeaders.indexOf(getCanonicalKey(header)) < 0;
  });

  if (missingHeaders.length === 0) return effectiveHeaders;

  const startCol = effectiveHeaders.length + 1;
  sheet.getRange(headerRow, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
  sheet.getRange(headerRow, startCol, 1, missingHeaders.length)
    .setFontWeight('bold')
    .setBackground('#1e3a8a')
    .setFontColor('white');

  return effectiveHeaders.concat(missingHeaders);
}

function getHeaderInfo(sheet, layanan) {
  const fallbackHeaders = getHeaders(layanan || '');
  if (!sheet || sheet.getLastRow() < 1) {
    return {row: 1, startRow: 2, headers: fallbackHeaders};
  }

  const maxRows = Math.min(sheet.getLastRow(), 10);
  const maxCols = Math.max(sheet.getLastColumn(), fallbackHeaders.length);
  const headerCandidates = sheet.getRange(1, 1, maxRows, maxCols).getValues();

  for (let i = 0; i < headerCandidates.length; i++) {
    const rowHeaders = headerCandidates[i];
    if (looksLikeHeaderRow(rowHeaders)) {
      return {
        row: i + 1,
        startRow: i + 2,
        headers: ensureRequiredHeaders(sheet, ensureTicketHeader(sheet, rowHeaders), i + 1, layanan)
      };
    }
  }

  return {
    row: 1,
    startRow: 2,
    headers: ensureRequiredHeaders(sheet, ensureTicketHeader(sheet, sheet.getRange(1, 1, 1, maxCols).getValues()[0]), 1, layanan)
  };
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').replace(/^62/, '0');
}

// ============================================
// DO GET - Handle GET requests
// ============================================
function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  try {
    switch(action) {
      case 'getData':
        return createCORSResponse(getSheetData(e.parameter.sheet), callback);
      case 'getDashboard':
        return createCORSResponse(getDashboardData(), callback);
      case 'getAgenda':
        return createCORSResponse(getAgendaData(), callback);
      case 'cekTiket':
        return createCORSResponse(cekTiket(e.parameter.tiket), callback);
      case 'getHistory':
        return createCORSResponse(getHistory(e.parameter.hp), callback);
      case 'updateStatus':
        return createCORSResponse(updateStatus(e.parameter.sheet, e.parameter.row, e.parameter.status, e.parameter.tiket), callback);
      case 'deleteRow':
        return createCORSResponse(deleteRow(e.parameter.sheet, e.parameter.row, e.parameter.tiket), callback);
      case 'test':
        return createCORSResponse({success: true, message: 'API is running', version: APP_VERSION, timestamp: new Date().toISOString()}, callback);
      default:
        return createCORSResponse({success: false, message: 'Invalid action'}, callback);
    }
  } catch(error) {
    return createCORSResponse({success: false, message: error.toString()}, callback);
  }
}

// ============================================
// DO POST - Handle POST requests
// ============================================
function doPost(e) {
  try {
    // Parse JSON body if present
    let params = e.parameter || {};
    if (e.postData && e.postData.type && e.postData.type.includes('application/json') && e.postData.contents) {
      try {
        const jsonParams = JSON.parse(e.postData.contents);
        params = Object.assign({}, e.parameter, jsonParams);
      } catch(err) {}
    }
    
    const action = params.action || 'submit';

    switch(action) {
      case 'submit':
        return createCORSResponse(submitData(params));
      case 'updateStatus':
        return createCORSResponse(updateStatus(params.sheet, params.row, params.status, params.tiket));
      case 'editRow':
        return createCORSResponse(editRow(params.sheet, params.row, params));
      case 'deleteRow':
        return createCORSResponse(deleteRow(params.sheet, params.row, params.tiket));
      default:
        // Default: treat as form submission
        return createCORSResponse(submitData(params));
    }
  } catch(error) {
    return createCORSResponse({success: false, message: error.toString()});
  }
}

// ============================================
// SUBMIT DATA - Save form data to sheet
// ============================================
function submitData(params) {
  try {
    params = normalizeParams(params);
    const layanan = params.layanan;
    const sheetName = getSheetName(layanan);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);

    // Create sheet if not exists
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = getHeaders(layanan);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('white');
    }

    // Prepare data row
    const headerInfo = getHeaderInfo(sheet, layanan);
    const headers = headerInfo.headers;
    const rowData = headers.map(function(header) {
      const canonical = getCanonicalKey(header);
      return params[canonical] || params[header] || '';
    });

    // Append row
    sheet.appendRow(rowData);

    return {
      success: true,
      message: 'Data berhasil disimpan',
      id_tiket: params.id_tiket,
      sheet: sheetName,
      timestamp: new Date().toISOString()
    };
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// GET SHEET DATA - Retrieve all data from sheet
// ============================================
function getSheetData(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet || sheet.getLastRow() < 2) {
      return {success: true, data: [], message: 'No data'};
    }

    const headerInfo = getHeaderInfo(sheet, getLayananBySheetName(sheetName));
    if (sheet.getLastRow() < headerInfo.startRow) {
      return {success: true, data: [], message: 'No data'};
    }

    const headers = headerInfo.headers;
    const dataRange = sheet.getRange(headerInfo.startRow, 1, sheet.getLastRow() - headerInfo.startRow + 1, sheet.getLastColumn());
    const values = dataRange.getValues();

    const data = values.map(function(row, index) {
      const obj = buildRowObject(headers, row);
      obj._sheet_row = headerInfo.startRow + index;
      return obj;
    });

    return {success: true, data: data, count: data.length};
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// GET DASHBOARD DATA - Summary for dashboard
// ============================================
function getDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const today = new Date();
    today.setHours(0,0,0,0);

    // Get Buku Tamu data
    const bukuSheet = ss.getSheetByName('BukuTamu');
    let bukuTamu = [];
    let totalTamuHariIni = 0;
    let tamuHadir = 0;
    let tamuPulang = 0;

    if (bukuSheet && bukuSheet.getLastRow() > 1) {
      const headerInfo = getHeaderInfo(bukuSheet, 'buku');
      const headers = headerInfo.headers;
      const values = bukuSheet.getLastRow() >= headerInfo.startRow
        ? bukuSheet.getRange(headerInfo.startRow, 1, bukuSheet.getLastRow() - headerInfo.startRow + 1, bukuSheet.getLastColumn()).getValues()
        : [];

      values.forEach(function(row) {
        const obj = buildRowObject(headers, row);
        bukuTamu.push(obj);

        // Check if today
        const rowDate = new Date(obj.timestamp || obj.tanggal || '');
        rowDate.setHours(0,0,0,0);
        if (rowDate.getTime() === today.getTime()) {
          totalTamuHariIni++;
          if ((obj.status || 'Hadir') === 'Hadir') tamuHadir++;
          if (obj.status === 'Pulang') tamuPulang++;
        }
      });
    }

    // Count total layanan
    const sheets = ['BukuTamu', 'LayananInformasi', 'Pengaduan', 'KlinikEkspor', 'JanjiTemu', 'PPID'];
    let totalLayanan = 0;
    sheets.forEach(function(sheetName) {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet && sheet.getLastRow() > 1) {
        totalLayanan += sheet.getLastRow() - 1;
      }
    });

    // Get SKM data
    let skmData = [];
    const skmSheet = ss.getSheetByName('SKM');
    if (skmSheet && skmSheet.getLastRow() > 1) {
      const headers = skmSheet.getRange(1, 1, 1, skmSheet.getLastColumn()).getValues()[0];
      const values = skmSheet.getRange(2, 1, skmSheet.getLastRow() - 1, skmSheet.getLastColumn()).getValues();
      values.forEach(function(row) {
        const obj = buildRowObject(headers, row);
        skmData.push(obj);
      });
    }

    // Get Media Sosial data
    let mediaData = [];
    const mediaSheet = ss.getSheetByName('MediaSosial');
    if (mediaSheet && mediaSheet.getLastRow() > 1) {
      const headers = mediaSheet.getRange(1, 1, 1, mediaSheet.getLastColumn()).getValues()[0];
      const values = mediaSheet.getRange(2, 1, mediaSheet.getLastRow() - 1, mediaSheet.getLastColumn()).getValues();
      values.forEach(function(row) {
        const obj = buildRowObject(headers, row);
        mediaData.push(obj);
      });
    }

    return {
      success: true,
      totalTamuHariIni: totalTamuHariIni,
      tamuHadir: tamuHadir,
      tamuPulang: tamuPulang,
      totalLayanan: totalLayanan,
      bukuTamu: bukuTamu,
      skm: skmData,
      mediaSosial: mediaData
    };
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// GET AGENDA DATA - Retrieve agenda
// ============================================
function getAgendaData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Agenda');
    
    // Create sheet if not exists
    if (!sheet) {
      sheet = ss.insertSheet('Agenda');
      const headers = ['timestamp', 'id_tiket', 'tanggal', 'waktu', 'agenda', 'tempat', 'pic', 'status'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('white');
    }

    if (sheet.getLastRow() < 2) {
      return {success: true, data: [], message: 'No data'};
    }

    const headerInfo = getHeaderInfo(sheet, 'agenda');
    const headers = headerInfo.headers;
    const values = sheet.getLastRow() >= headerInfo.startRow
      ? sheet.getRange(headerInfo.startRow, 1, sheet.getLastRow() - headerInfo.startRow + 1, sheet.getLastColumn()).getValues()
      : [];
    
    const data = values.map(function(row, index) {
      const obj = buildRowObject(headers, row);
      obj._sheet_row = headerInfo.startRow + index;
      return obj;
    });

    return {success: true, data: data};
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// CEK TIKET - Search ticket by number or HP
// ============================================
function cekTiket(searchTerm) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ['BukuTamu', 'LayananInformasi', 'Pengaduan', 'KlinikEkspor', 'JanjiTemu', 'PPID'];
    const layananNames = { 'BukuTamu': 'buku', 'LayananInformasi': 'informasi', 'Pengaduan': 'pengaduan', 'KlinikEkspor': 'klinik', 'JanjiTemu': 'janji', 'PPID': 'ppid' };

    for (const sheetName of sheets) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) continue;

      const headerInfo = getHeaderInfo(sheet, getLayananBySheetName(sheetName));
      const headers = headerInfo.headers;
      const values = sheet.getLastRow() >= headerInfo.startRow
        ? sheet.getRange(headerInfo.startRow, 1, sheet.getLastRow() - headerInfo.startRow + 1, sheet.getLastColumn()).getValues()
        : [];

      for (const row of values) {
        const obj = buildRowObject(headers, row);

        if (String(obj.id_tiket || '') === String(searchTerm) || String(obj.hp || '') === String(searchTerm)) {
          return {
            success: true,
            found: true,
            layanan: layananNames[sheetName],
            data: obj
          };
        }
      }
    }

    return {success: true, found: false, message: 'Tiket tidak ditemukan'};
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// GET HISTORY - Reuse visitor identity data by phone number
// ============================================
function getHistory(hp) {
  try {
    const targetHp = normalizePhone(hp);
    if (!targetHp || targetHp.length < 10) {
      return {success: true, found: false, message: 'Nomor HP belum lengkap'};
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ['BukuTamu', 'LayananInformasi', 'Pengaduan', 'KlinikEkspor', 'JanjiTemu', 'PPID'];
    const layananNames = { 'BukuTamu': 'buku', 'LayananInformasi': 'informasi', 'Pengaduan': 'pengaduan', 'KlinikEkspor': 'klinik', 'JanjiTemu': 'janji', 'PPID': 'ppid' };
    const reusableFields = ['hp', 'nama', 'email', 'instansi', 'alamat', 'pekerjaan', 'nik', 'npwp', 'nama_usaha'];
    const matches = [];

    sheets.forEach(function(sheetName) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) return;

      const headerInfo = getHeaderInfo(sheet, getLayananBySheetName(sheetName));
      const headers = headerInfo.headers;
      const hpCol = findColumnIndex(headers, 'hp');
      if (hpCol < 0) return;

      const values = sheet.getLastRow() >= headerInfo.startRow
        ? sheet.getRange(headerInfo.startRow, 1, sheet.getLastRow() - headerInfo.startRow + 1, sheet.getLastColumn()).getValues()
        : [];
      for (let i = values.length - 1; i >= 0; i--) {
        if (normalizePhone(values[i][hpCol]) !== targetHp) continue;
        const obj = buildRowObject(headers, values[i]);
        matches.push({
          layanan: layananNames[sheetName],
          sheet: sheetName,
          row: i + headerInfo.startRow,
          timestamp: obj.timestamp || obj.tanggal || '',
          data: obj
        });
      }
    });

    if (matches.length === 0) {
      return {success: true, found: false, message: 'Riwayat tidak ditemukan'};
    }

    const merged = {};
    matches.forEach(function(match) {
      reusableFields.forEach(function(field) {
        if (!merged[field] && match.data[field]) merged[field] = match.data[field];
      });
    });

    return {
      success: true,
      found: true,
      layanan: matches[0].layanan,
      data: merged,
      source: matches[0],
      count: matches.length
    };
  } catch(error) {
    return {success: false, found: false, message: error.toString()};
  }
}

// ============================================
// UPDATE STATUS - Update row status
// ============================================
function updateStatus(sheetName, rowIndex, newStatus, tiketId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return {success: false, message: 'Sheet not found'};
    }

    const headerInfo = getHeaderInfo(sheet, getLayananBySheetName(sheetName));
    const headers = headerInfo.headers;
    let targetRow = parseInt(rowIndex);

    // If row not provided but tiketId provided, find the row
    if ((!targetRow || isNaN(targetRow)) && tiketId) {
      const values = sheet.getLastRow() >= headerInfo.startRow
        ? sheet.getRange(headerInfo.startRow, 1, sheet.getLastRow() - headerInfo.startRow + 1, sheet.getLastColumn()).getValues()
        : [];
      const idCol = findColumnIndex(headers, 'id_tiket');
      if (idCol >= 0) {
        for (let i = 0; i < values.length; i++) {
          if (String(values[i][idCol]) === String(tiketId)) {
            targetRow = i + headerInfo.startRow;
            break;
          }
        }
      }
    }

    if (!targetRow || isNaN(targetRow)) {
      return {success: false, message: 'Row not found'};
    }

    const statusCol = findColumnIndex(headers, 'status') + 1;

    if (statusCol > 0) {
      sheet.getRange(targetRow, statusCol).setValue(newStatus);
      return {success: true, message: 'Status updated'};
    }

    return {success: false, message: 'Status column not found'};
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// EDIT ROW - Update specific row data
// ============================================
function editRow(sheetName, rowIndex, params) {
  try {
    params = normalizeParams(params);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return {success: false, message: 'Sheet not found'};
    }

    const headerInfo = getHeaderInfo(sheet, getLayananBySheetName(sheetName));
    const headers = headerInfo.headers;
    let targetRow = parseInt(rowIndex);
    const tiketId = params.tiket || params.id_tiket;

    if ((!targetRow || isNaN(targetRow)) && tiketId) {
      const values = sheet.getLastRow() >= headerInfo.startRow
        ? sheet.getRange(headerInfo.startRow, 1, sheet.getLastRow() - headerInfo.startRow + 1, sheet.getLastColumn()).getValues()
        : [];
      const idCol = findColumnIndex(headers, 'id_tiket');
      if (idCol >= 0) {
        for (let i = 0; i < values.length; i++) {
          if (String(values[i][idCol]) === String(tiketId)) {
            targetRow = i + headerInfo.startRow;
            break;
          }
        }
      }
    }

    if (!targetRow || isNaN(targetRow)) {
      return {success: false, message: 'Row not found'};
    }

    Object.keys(params).forEach(function(key) {
      if (key === 'action' || key === 'sheet' || key === 'row' || key === 'tiket' || key.startsWith('_')) return;
      const canonical = getCanonicalKey(key);
      const colIndex = findColumnIndex(headers, canonical) + 1;
      if (colIndex > 0) {
        sheet.getRange(targetRow, colIndex).setValue(params[key]);
      }
    });

    return {success: true, message: 'Row updated'};
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// DELETE ROW - Remove row from sheet
// ============================================
function deleteRow(sheetName, rowIndex, tiketId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return {success: false, message: 'Sheet not found'};
    }

    let targetRow = parseInt(rowIndex);

    if ((!targetRow || isNaN(targetRow)) && tiketId) {
      const headerInfo = getHeaderInfo(sheet, getLayananBySheetName(sheetName));
      const headers = headerInfo.headers;
      const values = sheet.getLastRow() >= headerInfo.startRow
        ? sheet.getRange(headerInfo.startRow, 1, sheet.getLastRow() - headerInfo.startRow + 1, sheet.getLastColumn()).getValues()
        : [];
      const idCol = findColumnIndex(headers, 'id_tiket');
      if (idCol >= 0) {
        for (let i = 0; i < values.length; i++) {
          if (String(values[i][idCol]) === String(tiketId)) {
            targetRow = i + headerInfo.startRow;
            break;
          }
        }
      }
    }

    if (!targetRow || isNaN(targetRow)) {
      return {success: false, message: 'Row not found'};
    }

    sheet.deleteRow(targetRow);
    return {success: true, message: 'Row deleted'};
  } catch(error) {
    return {success: false, message: error.toString()};
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getSheetName(layanan) {
  const map = {
    'buku': 'BukuTamu',
    'informasi': 'LayananInformasi',
    'pengaduan': 'Pengaduan',
    'klinik': 'KlinikEkspor',
    'janji': 'JanjiTemu',
    'ppid': 'PPID',
    'agenda': 'Agenda',
    'skm': 'SKM',
    'mediasosial': 'MediaSosial'
  };
  return map[layanan] || 'DataLainnya';
}

function getLayananBySheetName(sheetName) {
  const map = {
    'BukuTamu': 'buku',
    'LayananInformasi': 'informasi',
    'Pengaduan': 'pengaduan',
    'KlinikEkspor': 'klinik',
    'JanjiTemu': 'janji',
    'PPID': 'ppid',
    'Agenda': 'agenda',
    'SKM': 'skm',
    'MediaSosial': 'mediasosial'
  };
  return map[sheetName] || '';
}

function getHeaders(layanan) {
  const headers = {
    'buku': ['id_tiket', 'timestamp', 'nama', 'hp', 'email', 'instansi', 'alamat', 'bertemu_dengan', 'keperluan', 'jumlah_rombongan', 'tanggal', 'status'],
    'informasi': ['timestamp', 'id_tiket', 'nama', 'hp', 'email', 'instansi', 'alamat', 'kategori', 'detail', 'cara_peroleh', 'cara_kirim', 'lampiran', 'status'],
    'pengaduan': ['timestamp', 'id_tiket', 'nama', 'hp', 'email', 'pekerjaan', 'alamat', 'kategori', 'cara_penyampaian', 'judul', 'lokasi', 'tanggal_kejadian', 'uraian', 'lampiran', 'status'],
    'klinik': ['timestamp', 'id_tiket', 'nama', 'hp', 'nama_usaha', 'email', 'domisili', 'alamat', 'tahap_umkm', 'jenis_produk', 'keperluan', 'deskripsi', 'status'],
    'janji': ['timestamp', 'id_tiket', 'nama', 'hp', 'instansi', 'email', 'bertemu_dengan', 'keperluan', 'tanggal', 'waktu', 'status'],
    'ppid': ['timestamp', 'id_tiket', 'nama', 'hp', 'nik', 'npwp', 'email', 'pekerjaan', 'alamat', 'detail', 'tujuan', 'lampiran', 'status'],
    'agenda': ['timestamp', 'id_tiket', 'tanggal', 'waktu', 'agenda', 'tempat', 'penyelenggara_tamu_undangan', 'pic', 'status'],
    'skm': ['timestamp', 'id_tiket', 'unsur', 'nilai', 'kategori'],
    'mediasosial': ['timestamp', 'id_tiket', 'bulan', 'total', 'feed', 'reels', 'jenis', 'keterangan']
  };
  return headers[layanan] || ['timestamp', 'id_tiket', 'nama', 'hp', 'data', 'status'];
}

// ============================================
// INITIAL SETUP - Run once to create sheets
// ============================================
function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ['BukuTamu', 'LayananInformasi', 'Pengaduan', 'KlinikEkspor', 'JanjiTemu', 'PPID', 'Agenda', 'SKM', 'MediaSosial'];
  const layananMap = { 'BukuTamu': 'buku', 'LayananInformasi': 'informasi', 'Pengaduan': 'pengaduan', 'KlinikEkspor': 'klinik', 'JanjiTemu': 'janji', 'PPID': 'ppid', 'Agenda': 'agenda', 'SKM': 'skm', 'MediaSosial': 'mediasosial' };

  sheets.forEach(function(sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = getHeaders(layananMap[sheetName]);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('white');
    }
  });

  Logger.log('Setup complete!');
}
