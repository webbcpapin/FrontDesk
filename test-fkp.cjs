const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const rows = [];
const props = { FKP_SPREADSHEET_ID: 'private-test-store', FKP_OPEN: 'true' };
let acquired = false;
const sheet = {
  getLastRow: () => rows.length + 1,
  getRange: () => ({ createTextFinder: id => ({ matchEntireCell: () => ({ findNext: () => rows.find(row => row[1] === id) || null }) }) }),
  appendRow: row => rows.push(row)
};
const ctx = vm.createContext({
  console,
  PropertiesService: { getScriptProperties: () => ({ getProperty: key => props[key] ?? null }) },
  LockService: { getScriptLock: () => ({ waitLock: () => { acquired = true; }, hasLock: () => acquired, releaseLock: () => { acquired = false; } }) },
  SpreadsheetApp: { openById: id => { assert.equal(id, 'private-test-store'); return { getSheetByName: name => { assert.equal(name, 'Respons FKP'); return sheet; } }; }, flush: () => {} }
});
vm.runInContext(fs.readFileSync('FKP.gs', 'utf8'), ctx);
const valid = {
  request_id: '12345678-1234-4123-8123-123456789abc',
  nama: 'RESPONS UJI OTOMATIS', instansi: 'DATA UJI', kapasitas: 'Penguji',
  unsur_masyarakat: 'Pengguna layanan', pengalaman_layanan: 'Ya',
  jenis_layanan: '["Ekspor","Impor"]', hal_positif: '', kendala: 'Uji kendala',
  rekomendasi: 'Uji saran', kesediaan_dihubungi: 'Tidak bersedia', kontak: '', persetujuan: 'Setuju'
};
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
check('server validates every required field', () => {
  for (const key of ['nama', 'instansi', 'kapasitas', 'unsur_masyarakat', 'pengalaman_layanan', 'jenis_layanan', 'kendala', 'rekomendasi', 'kesediaan_dihubungi', 'persetujuan', 'request_id']) {
    assert.equal(ctx.fkpSubmit({...valid, [key]: ''}).success, false, key);
  }
  assert.equal(rows.length, 0);
});
check('invalid choices, oversized text, empty services and honeypot rejected', () => {
  for (const patch of [{unsur_masyarakat:'invalid'}, {jenis_layanan:'[]'}, {jenis_layanan:'["invalid"]'}, {nama:' '.repeat(10)}, {kendala:'x'.repeat(3001)}, {website:'bot'}]) assert.equal(ctx.fkpSubmit({...valid,...patch}).success, false);
  assert.equal(rows.length, 0);
});
check('valid response stored privately with online mode and server time', () => {
  assert.equal(ctx.fkpSubmit(valid).success, true);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][6], 'Online');
  assert.equal(rows[0][8], 'Ekspor; Impor');
  assert.ok(rows[0][0].getTime() > 0);
  assert.equal(acquired, false);
});
check('retry does not duplicate response', () => { assert.equal(ctx.fkpSubmit(valid).success, true); assert.equal(rows.length, 1); });
check('closed form rejects new submission but acknowledges stored retry', () => {
  props.FKP_OPEN = 'false';
  assert.equal(ctx.fkpSubmit({...valid, request_id:'22345678-1234-4123-8123-123456789abc'}).success, false);
  assert.equal(ctx.fkpSubmit(valid).success, true);
  assert.equal(rows.length, 1);
  props.FKP_OPEN = 'true';
});
check('deadline and malformed deadline fail closed', () => {
  props.FKP_DEADLINE = '2020-01-01T00:00:00+07:00'; assert.equal(ctx.fkpStatus().open, false);
  props.FKP_DEADLINE = 'bad date'; assert.equal(ctx.fkpStatus().open, false);
  delete props.FKP_DEADLINE; assert.equal(ctx.fkpStatus().open, true);
});
check('formula injection escaped', () => { for(const value of ['=1+1','+123','-1','@SUM(A1)']) assert.ok(ctx.fkpSafeCell(value).startsWith("'")); });
check('storage failure does not report success or expose backend details', () => {
  const append = sheet.appendRow;
  sheet.appendRow = () => {throw new Error('SECRET_STORE_INFO');};
  const result = ctx.fkpSubmit({...valid, request_id:'32345678-1234-4123-8123-123456789abc'});
  assert.equal(result.success, false); assert.ok(!result.message.includes('SECRET')); assert.equal(acquired, false);
  sheet.appendRow = append;
});
const html = fs.readFileSync('fkp/index.html','utf8');
check('form description excludes apologies and rating questions', () => { assert.ok(!/maaf|miss komunikasi|type="range"|rating/i.test(html)); assert.ok(html.includes('Waktu pengisian sekitar 3–5 menit.')); });
check('all ten service options and consent are present', () => { assert.equal((html.match(/name="jenis_layanan"/g)||[]).length,10); assert.ok(/name="persetujuan"[^>]*required/.test(html)); });
console.log(`${checks} groups passed; no real data written.`);
