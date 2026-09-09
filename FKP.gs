// Add this file to the existing FrontDesk Apps Script project together with
// the two FKP routes in code (3).gs. Run setupFKP once, then update deployment.
// Responses use a separate PRIVATE spreadsheet, never the legacy public API.
const FKP_HEADERS = ['waktu_pengisian', 'id_respons', 'nama', 'instansi', 'kapasitas', 'unsur_masyarakat', 'moda_partisipasi', 'pengalaman_layanan', 'jenis_layanan', 'hal_positif', 'kendala', 'rekomendasi', 'kesediaan_dihubungi', 'kontak', 'persetujuan'];
const FKP_UNSUR = ['Stakeholder pelayanan publik', 'Organisasi masyarakat sipil/LSM', 'Pengguna layanan', 'Ahli/praktisi atau organisasi terkait', 'Media massa'];
const FKP_SERVICES = ['Informasi kepabeanan', 'Ekspor', 'Impor', 'Cukai', 'Barang kiriman', 'Barang bawaan penumpang', 'Registrasi IMEI', 'Fasilitas kepabeanan', 'UMKM berorientasi ekspor', 'Lainnya'];

function setupFKP() {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let id = props.getProperty('FKP_SPREADSHEET_ID');
    if (!id) {
      const ss = SpreadsheetApp.create('Respons FKP Bea Cukai Pangkalpinang 2026');
      id = ss.getId();
      // Save immediately, so rerunning setup never creates a duplicate.
      props.setProperty('FKP_SPREADSHEET_ID', id);
    }
    const ss = SpreadsheetApp.openById(id);
    ss.setSpreadsheetTimeZone('Asia/Jakarta');
    let sheet = ss.getSheetByName('Respons FKP');
    if (!sheet) sheet = ss.insertSheet('Respons FKP');
    sheet.getRange(1, 1, 1, FKP_HEADERS.length).setValues([FKP_HEADERS]).setFontWeight('bold').setBackground('#102c56').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), FKP_HEADERS.length).createFilter();
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange('B:O').setNumberFormat('@');
    let summary = ss.getSheetByName('Ringkasan');
    if (!summary) summary = ss.insertSheet('Ringkasan');
    summary.getRange('A1:B2').setValues([['Ringkasan FKP 2026', 'Jumlah'], ['Total respons', "=COUNTA('Respons FKP'!B2:B)"]]);
    FKP_UNSUR.forEach(function(value, i) {
      summary.getRange(i + 4, 1, 1, 2).setValues([[value, '=COUNTIF(\'Respons FKP\'!F2:F,A' + (i + 4) + ')']]);
    });
    FKP_SERVICES.forEach(function(value, i) {
      summary.getRange(i + 11, 1, 1, 2).setValues([[value, '=COUNTIF(\'Respons FKP\'!I2:I,"*"&A' + (i + 11) + '&"*")']]);
    });
    summary.setColumnWidth(1, 400);
    summary.getRange('A1:B1').setFontWeight('bold');
    if (props.getProperty('FKP_OPEN') === null) props.setProperty('FKP_OPEN', 'true');
    Logger.log('Dashboard admin (memerlukan akses Google): ' + ss.getUrl());
    return ss.getUrl();
  } finally { lock.releaseLock(); }
}

function fkpStatus() {
  const props = PropertiesService.getScriptProperties();
  const deadline = props.getProperty('FKP_DEADLINE');
  const deadlineTime = deadline ? Date.parse(deadline) : null;
  const open = !!props.getProperty('FKP_SPREADSHEET_ID') && props.getProperty('FKP_OPEN') === 'true' && (!deadline || (Number.isFinite(deadlineTime) && Date.now() < deadlineTime));
  // A Sheets URL is not a bearer credential: Google still enforces access.
  const id = props.getProperty('FKP_SPREADSHEET_ID');
  return { success: true, module: 'fkp-2026', open: open, admin_url: id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : '' };
}

function validateFKP(params) {
  const data = {};
  if (String(params.website || '').trim()) throw new Error('Pengiriman tidak dapat diproses.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(String(params.request_id || ''))) throw new Error('Identitas pengiriman tidak valid. Muat ulang formulir.');
  const required = { nama: 150, instansi: 200, kapasitas: 200, kendala: 3000, rekomendasi: 3000 };
  Object.keys(required).forEach(function(key) {
    data[key] = String(params[key] || '').trim();
    if (!data[key] || data[key].length > required[key]) throw new Error('Periksa isian ' + key + '.');
  });
  ['hal_positif', 'kontak'].forEach(function(key) {
    data[key] = String(params[key] || '').trim();
    if (data[key].length > (key === 'kontak' ? 200 : 3000)) throw new Error('Isian ' + key + ' terlalu panjang.');
  });
  const enums = {
    unsur_masyarakat: FKP_UNSUR,
    pengalaman_layanan: ['Ya', 'Belum, tetapi memiliki kebutuhan atau pengamatan terhadap layanan'],
    kesediaan_dihubungi: ['Bersedia', 'Tidak bersedia'],
    persetujuan: ['Setuju']
  };
  Object.keys(enums).forEach(function(key) {
    if (enums[key].indexOf(params[key]) < 0) throw new Error('Periksa pilihan ' + key + '.');
    data[key] = params[key];
  });
  let services;
  try { services = JSON.parse(params.jenis_layanan); } catch (error) { throw new Error('Pilih minimal satu jenis layanan.'); }
  if (!Array.isArray(services) || !services.length || services.length > FKP_SERVICES.length || services.some(function(value) { return FKP_SERVICES.indexOf(value) < 0; })) throw new Error('Pilihan layanan tidak valid.');
  data.jenis_layanan = Array.from(new Set(services)).join('; ');
  data.id_respons = 'FKP-' + params.request_id;
  data.moda_partisipasi = 'Online';
  return data;
}

function fkpSafeCell(value) {
  // Protect formulas both in Sheets and downstream spreadsheet exports.
  const text = String(value || '');
  return /^[=+@\-\t\r\n]/.test(text) ? "'" + text : text;
}

function fkpSubmit(params) {
  const lock = LockService.getScriptLock();
  try {
    const data = validateFKP(params);
    lock.waitLock(30000);
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('FKP_SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('Formulir belum dapat menerima masukan.');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Respons FKP');
    if (!sheet) throw new Error('Penyimpanan belum siap. Silakan coba kembali.');
    // Retrying a timed-out successful request must not append a second row.
    if (sheet.getLastRow() > 1) {
      const found = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(data.id_respons).matchEntireCell(true).findNext();
      if (found) return { success: true, module: 'fkp-2026', id: data.id_respons };
    }
    if (!fkpStatus().open) throw new Error('Pengisian formulir FKP saat ini ditutup.');
    const row = FKP_HEADERS.map(function(key) { return key === 'waktu_pengisian' ? new Date() : fkpSafeCell(data[key]); });
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return { success: true, module: 'fkp-2026', id: data.id_respons };
  } catch (error) {
    // Do not expose backend errors, spreadsheet IDs, or respondent data.
    const allowed = /^(Periksa |Pilih |Pilihan |Isian |Identitas |Pengisian |Formulir |Penyimpanan |Pengiriman )/;
    return { success: false, module: 'fkp-2026', message: allowed.test(error.message) ? error.message : 'Masukan belum dapat dikonfirmasi. Silakan coba kembali.' };
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
