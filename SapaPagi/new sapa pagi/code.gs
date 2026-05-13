// ==================== CONFIGURATION ====================
const CONFIG = {
  SHEET_ID: 'YOUR_SPREADSHEET_ID',
  SHEET_NAME: 'DailySpirit'
};

// ==================== WEB APP ====================
function doGet(e) {
  const action = e.parameter.action || 'default';
  
  try {
    switch(action) {
      case 'generate':
        return generateContent(e.parameter.category || 'doa');
      case 'getHistory':
        return getHistory(parseInt(e.parameter.limit) || 20);
      case 'getToday':
        return getTodayContent();
      case 'test':
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      default:
        return serveHTML();
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    switch(data.action) {
      case 'save':
        return saveContent(data.data);
      default:
        return jsonResponse({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

function serveHTML() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SAPA DJBC')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==================== CONTENT GENERATION ====================
function generateContent(category) {
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  // Check existing
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === today && data[i][1] === category) {
      return jsonResponse({
        title: data[i][2], text: data[i][3], source: data[i][4],
        arabic: data[i][5] || '', latin: data[i][6] || '',
        category: data[i][1], date: data[i][0], id: data[i][7]
      });
    }
  }
  
  const content = getFallbackContent(category);
  const id = Date.now();
  
  sheet.appendRow([
    today, category, content.title, content.text, 
    content.source || '', content.arabic || '', content.latin || '', id, new Date()
  ]);
  
  return jsonResponse({ ...content, category, date: today, id });
}

function getFallbackContent(category) {
  const contents = {
    doa: {
      title: "Doa Memulai Pagi",
      arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
      latin: "Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaikan-nusyur",
      text: "Ya Allah, dengan-Mu kami memasuki waktu pagi dan dengan-Mu kami memasuki waktu sore, dengan-Mu kami hidup dan dengan-Mu kami mati, dan kepada-Mu kami akan kembali (bangkit).",
      source: "HR. Tirmidzi No. 3391"
    },
    apresiasi: {
      title: "Apresiasi Kinerja",
      text: "Terima kasih atas dedikasi dan kerja keras Anda hari ini. Setiap tugas yang diselesaikan dengan penuh tanggung jawab adalah kontribusi berharga bagi organisasi dan masyarakat. Kinerja Anda tidak luput dari perhatian, dan setiap langkah kecil membawa kita menuju pelayanan yang lebih baik. Tetap semangat dan terus berkarya!",
      source: "Daily Spirit"
    },
    motivasi: {
      title: "Semangat Pelayanan",
      text: "Pelayanan yang tulus akan selalu diingat. Sebagai abdi negara, setiap senyum dan setiap bantuan yang kita berikan adalah investasi kepercayaan publik. Jangan pernah meremehkan dampak dari pekerjaan kita. Integritas, profesionalisme, dan dedikasi adalah tiga pilar yang menopang keberhasilan kita bersama.",
      source: "Daily Spirit"
    }
  };
  return contents[category] || contents.motivasi;
}

function dailyIndex_(category, length, offset) {
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const key = today + '-' + category + '-' + (offset || 0);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash * 31) + key.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function pickDaily_(category, items, offset) {
  return items[dailyIndex_(category, items.length, offset || 0)];
}

function getFallbackContent(category) {
  const doaItems = [
    {
      title: "Doa Memulai Pagi Hari",
      arabic: "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور",
      latin: "Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaikan-nusyur",
      text: "Ya Allah, dengan-Mu kami memasuki waktu pagi. Bimbinglah langkah kami agar bekerja dengan jujur, teliti, dan membawa manfaat. Lapangkan hati kami untuk melayani, kuatkan kami menjaga amanah, dan jadikan hari ini penuh keberkahan.",
      source: "Doa pagi dan nilai pelayanan"
    },
    {
      title: "Doa Kelancaran Tugas",
      arabic: "رب اشرح لي صدري ويسر لي أمري",
      latin: "Rabbi syrah li sadri wa yassir li amri",
      text: "Ya Allah, lapangkan dada kami dan mudahkan urusan kami. Jauhkan kami dari kelalaian, kuatkan kebersamaan, dan tuntun setiap keputusan agar selaras dengan integritas dan kebaikan.",
      source: "QS. Taha: 25-26"
    }
  ];

  const motivasiItems = [
    { title: "Tenang, Teliti, Tuntas", text: "Hari ini mari bekerja dengan tenang, teliti, dan tuntas. Ketelitian menjaga kualitas, ketenangan menjaga keputusan, dan ketuntasan menjaga kepercayaan. Setiap proses yang rapi adalah bagian dari pelayanan yang bermartabat.", source: "Daily Spirit" },
    { title: "Pelayanan yang Menguatkan", text: "Pelayanan bukan hanya menyelesaikan permintaan, tetapi menghadirkan rasa aman dan percaya. Saat kita ramah, tegas, dan konsisten, organisasi menjadi lebih kuat dan masyarakat merasa lebih dilayani.", source: "Daily Spirit" },
    { title: "Semangat Pangkalpinang", text: "Dari Pangkalpinang, kita menjaga pelayanan dengan hati yang hangat dan sikap yang teguh. Semoga setiap tugas hari ini menjadi bagian dari kontribusi nyata untuk negeri.", source: "Daily Spirit" }
  ];

  const apresiasiItems = [
    { title: "Apresiasi Kinerja Hari Ini", text: "Terima kasih atas dedikasi hari ini. Setiap dokumen yang diperiksa, setiap layanan yang diselesaikan, dan setiap koordinasi yang dijaga adalah kontribusi penting bagi organisasi dan masyarakat.", source: "Daily Spirit" },
    { title: "Terima Kasih untuk Ketekunan", text: "Apresiasi untuk rekan-rekan yang tetap tekun menjaga kualitas kerja. Ketekunan seperti ini sering sunyi, tetapi dampaknya besar: pekerjaan lebih tertib, layanan lebih lancar, dan kepercayaan terus tumbuh.", source: "Daily Spirit" },
    { title: "Penghargaan untuk Kebersamaan", text: "Hari ini kita kembali belajar bahwa pekerjaan yang baik lahir dari kebersamaan. Terima kasih untuk saling bantu, saling mengingatkan, dan saling menjaga agar tugas selesai dengan baik.", source: "Daily Spirit" }
  ];

  const songs = {
    'bell-pembuka': {
      title: "Bell Pembuka",
      text: "Bell pembuka siap diputar. Upload file bell pembuka pada kategori ini agar aplikasi memakai audio resmi.",
      source: "Mode lagu - upload MP3/WAV untuk audio resmi"
    },
    'mars-djbc': {
      title: "Mars DJBC",
      text: "Mars DJBC siap diputar. Upload file Mars DJBC pada kategori ini agar aplikasi memakai audio resmi.",
      source: "Mode lagu - upload MP3/WAV untuk audio resmi"
    },
    'lagu-tak-pernah-ku-ragu': {
      title: "Lagu Orisinal Tak Pernah Ku Ragu",
      text: "Lagu orisinal Tak Pernah Ku Ragu siap diputar. Upload satu atau beberapa file audio pada kategori ini untuk rotasi harian.",
      source: "Mode lagu - upload MP3/WAV untuk audio resmi"
    },
    'mars-kemenkeu': {
      title: "Mars Kementerian Keuangan",
      text: "Mars Kementerian Keuangan siap diputar. Upload file Mars Kementerian Keuangan pada kategori ini agar aplikasi memakai audio resmi.",
      source: "Mode lagu - upload MP3/WAV untuk audio resmi"
    },
    'lagu-karya-pegawai-bc': {
      title: "Lagu Karya Pegawai Bea Cukai",
      text: "Lagu karya pegawai Bea Cukai siap diputar. Upload beberapa file audio agar aplikasi dapat memilih dan merotasi lagu setiap hari.",
      source: "Mode lagu - upload MP3/WAV untuk audio resmi"
    },
    'indonesia-raya': {
      title: "Lagu Kebangsaan Indonesia Raya",
      text: "Silakan berdiri tegap. Pemutar akan memainkan lagu Indonesia Raya. Upload file audio resmi pada kategori Indonesia Raya agar aplikasi memakai lagu lengkap.",
      source: "Mode lagu - upload MP3/WAV untuk audio resmi"
    },
    'lagu-orisinal': {
      title: "Lagu Orisinal",
      text: "Lagu orisinal siap diputar. Gunakan kategori ini untuk Mars Direktorat Jenderal Bea dan Cukai, Mars Kementerian Keuangan, atau lagu orisinal satuan kerja.",
      source: "Mode lagu - upload MP3/WAV sesuai agenda"
    }
  };

  if (category === 'sapa-pagi') return { title: "Sapa Pagi", text: "Selamat pagi, rekan-rekan Direktorat Jenderal Bea dan Cukai. Mari membuka hari dengan niat baik, integritas, dan semangat pelayanan. Ke Pangkalbalam membawa bekal, singgah sebentar membeli roti. Mari bekerja dengan akal, jujur melayani sepenuh hati.", source: "SAPA DJBC" };
  if (category === 'pengantar-indonesia-raya') return { title: "Pengantar Indonesia Raya", text: "Bapak dan Ibu, sebentar lagi akan diperdengarkan Lagu Kebangsaan Indonesia Raya. Dimohon untuk berdiri dengan sikap sempurna.", source: "SAPA DJBC" };
  if (category === 'doa') return pickDaily_('doa', doaItems);
  if (category === 'motivasi') return pickDaily_('motivasi', motivasiItems);
  if (category === 'apresiasi') return pickDaily_('apresiasi', apresiasiItems);
  if (category === 'sapa-sore') return { title: "Sapa Sore", text: "Selamat sore, rekan-rekan. Terima kasih atas pengabdian hari ini. Senja turun di tepi dermaga, lampu menyala satu per satu. Tugas tuntas kita jaga, esok kembali dengan semangat baru.", source: "SAPA DJBC" };
  if (songs[category]) return songs[category];
  return pickDaily_('motivasi', motivasiItems);
}

// ==================== DATA ====================
function saveContent(data) {
  const sheet = getSheet();
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  
  sheet.appendRow([
    today, data.category, data.title || '', data.text,
    data.source || '', data.arabic || '', data.latin || '',
    data.id || Date.now(), new Date()
  ]);

  return jsonResponse({ success: true });
}

function getHistory(limit) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const results = [];
  
  for (let i = data.length - 1; i >= 1 && results.length < limit; i--) {
    results.push({
      date: data[i][0], category: data[i][1], title: data[i][2],
      text: data[i][3], source: data[i][4], arabic: data[i][5] || '',
      latin: data[i][6] || '', id: data[i][7]
    });
  }
  
  return jsonResponse({ data: results, total: results.length });
}

function getTodayContent() {
  const today = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === today) {
      results.push({
        date: data[i][0], category: data[i][1], title: data[i][2],
        text: data[i][3], source: data[i][4], arabic: data[i][5] || '',
        latin: data[i][6] || '', id: data[i][7]
      });
    }
  }
  
  return jsonResponse({ data: results, date: today });
}

function getSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'Tanggal', 'Kategori', 'Judul', 'Isi', 'Sumber',
      'Arab', 'Latin', 'ID', 'Timestamp'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold')
      .setBackground('#1a5f4a').setFontColor('white');
    sheet.autoResizeColumns(1, 9);
  }
  
  return sheet;
}

// ==================== TRIGGERS ====================
function createDailyTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  const managedHandlers = [
    'autoPlaySapaPagi',
    'autoPlayLaguOrisinal',
    'autoPlayDoa',
    'autoPlayIndonesiaRaya',
    'autoPlayMotivasi',
    'autoPlayApresiasi',
    'autoPlaySapaSore',
    'autoPlayMorningSequence',
    'autoPlayIndonesiaSequence',
    'autoPlayAfternoonSequence'
  ];
  triggers.forEach(t => {
    if (managedHandlers.includes(t.getHandlerFunction())) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('autoPlayMorningSequence').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayMorningSequence').timeBased().onWeekDay(ScriptApp.WeekDay.TUESDAY).atHour(8).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayMorningSequence').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(8).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayMorningSequence').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(8).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayMorningSequence').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(8).nearMinute(0).create();

  ScriptApp.newTrigger('autoPlayIndonesiaSequence').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(10).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayIndonesiaSequence').timeBased().onWeekDay(ScriptApp.WeekDay.TUESDAY).atHour(10).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayIndonesiaSequence').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(10).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayIndonesiaSequence').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(10).nearMinute(0).create();
  ScriptApp.newTrigger('autoPlayIndonesiaSequence').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(10).nearMinute(0).create();

  ScriptApp.newTrigger('autoPlayAfternoonSequence').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(16).nearMinute(45).create();
  ScriptApp.newTrigger('autoPlayAfternoonSequence').timeBased().onWeekDay(ScriptApp.WeekDay.TUESDAY).atHour(16).nearMinute(45).create();
  ScriptApp.newTrigger('autoPlayAfternoonSequence').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(16).nearMinute(45).create();
  ScriptApp.newTrigger('autoPlayAfternoonSequence').timeBased().onWeekDay(ScriptApp.WeekDay.THURSDAY).atHour(16).nearMinute(45).create();
  ScriptApp.newTrigger('autoPlayAfternoonSequence').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(16).nearMinute(45).create();
}

function autoPlaySapaPagi() { autoPlay('sapa-pagi'); }
function autoPlayLaguOrisinal() { autoPlay('lagu-orisinal'); }
function autoPlayDoa() { autoPlay('doa'); }
function autoPlayIndonesiaRaya() { autoPlay('indonesia-raya'); }
function autoPlayMotivasi() { autoPlay('motivasi'); }
function autoPlayApresiasi() { autoPlay('apresiasi'); }
function autoPlaySapaSore() { autoPlay('sapa-sore'); }

function autoPlayMorningSequence() {
  autoPlaySequence(['bell-pembuka', 'mars-djbc', 'sapa-pagi', 'doa', 'motivasi', 'lagu-tak-pernah-ku-ragu']);
}

function autoPlayIndonesiaSequence() {
  autoPlaySequence(['pengantar-indonesia-raya', 'indonesia-raya']);
}

function autoPlayAfternoonSequence() {
  autoPlaySequence(['bell-pembuka', 'sapa-sore', 'apresiasi', 'mars-kemenkeu', 'lagu-karya-pegawai-bc']);
}

function autoPlaySequence(categories) {
  categories.forEach(category => autoPlay(category));
}

function autoPlay(category) {
  try {
    generateContent(category);
  } catch (e) {
    console.error(`Auto-play ${category} failed:`, e);
  }
}

// ==================== UTILITIES ====================
function jsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHttpStatus(statusCode || 200);
}
