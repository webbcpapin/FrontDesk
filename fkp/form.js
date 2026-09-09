'use strict';
const FKP_API = 'https://script.google.com/macros/s/AKfycbx4jwleT70GEw0VWCRCW2QkPw-bRH4qkkwwjcbjWpsfqLBs8Shbw1tm62rip3M25fOK/exec';
const form = document.getElementById('fkp-form');
const fields = document.getElementById('fields');
const statusBox = document.getElementById('status');
const retry = document.getElementById('retry');
const submitButton = document.getElementById('submit');
const submitStatus = document.getElementById('submit-status');
const serviceInputs = [...form.querySelectorAll('[name="jenis_layanan"]')];
let requestId = crypto.randomUUID();
let submitting = false;

async function api(params) {
  const response = await fetch(FKP_API, {
    method: 'POST',
    body: new URLSearchParams(params),
    redirect: 'follow',
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error('Layanan belum dapat dihubungi.');
  const result = await response.json();
  // The legacy API treats unknown POST actions as generic submissions.
  // Check capability via GET before using this POST endpoint.
  if (!result.success || result.module !== 'fkp-2026') {
    throw new Error(result.module === 'fkp-2026' ? result.message : 'Layanan FKP belum tersedia.');
  }
  return result;
}

function checkAvailability() {
  fields.disabled = true;
  retry.hidden = true;
  statusBox.hidden = false;
  statusBox.className = 'notice';
  statusBox.textContent = 'Memeriksa ketersediaan formulir…';
  // Apps Script supports JSONP for read-only status across GitHub Pages origins.
  const callback = 'fkpStatus_' + crypto.randomUUID().replaceAll('-', '');
  const script = document.createElement('script');
  let timeout;
  function cleanup() {
    clearTimeout(timeout);
    script.remove();
    delete window[callback];
  }
  function unavailable(message) {
    cleanup();
    statusBox.className = 'notice error';
    statusBox.textContent = message;
    retry.hidden = false;
  }
  window[callback] = result => {
    if (!result.success || result.module !== 'fkp-2026') {
      unavailable('Formulir belum dapat menerima masukan. Silakan periksa kembali beberapa saat lagi.');
      return;
    }
    cleanup();
    if (!result.open) {
      statusBox.textContent = 'Pengisian formulir FKP saat ini ditutup. Terima kasih atas perhatian Bapak/Ibu.';
      return;
    }
    fields.disabled = false;
    statusBox.hidden = true;
  };
  script.onerror = () => unavailable('Koneksi ke layanan formulir belum berhasil. Periksa koneksi internet dan coba kembali.');
  timeout = setTimeout(() => unavailable('Layanan formulir belum merespons. Silakan coba kembali.'), 20000);
  script.src = FKP_API + '?action=fkpStatus&callback=' + callback;
  document.head.appendChild(script);
}

function validateServices() {
  serviceInputs[0].setCustomValidity(serviceInputs.some(input => input.checked) ? '' : 'Pilih minimal satu jenis layanan.');
}
serviceInputs.forEach(input => input.addEventListener('change', validateServices));
form.addEventListener('input', event => {
  if (event.target.matches('input:not([type=checkbox]):not([type=radio]), textarea')) {
    event.target.setCustomValidity(event.target.required && !event.target.value.trim() ? 'Kolom ini wajib diisi.' : '');
  }
});
submitButton.addEventListener('click', validateServices);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  validateServices();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const payload = Object.fromEntries(data);
  payload.jenis_layanan = JSON.stringify(data.getAll('jenis_layanan'));
  payload.action = 'fkpSubmit';
  payload.request_id = requestId;
  submitting = true;
  fields.disabled = true;
  submitButton.textContent = 'Mengirim masukan…';
  submitStatus.textContent = '';
  try {
    const result = await api(payload);
    form.hidden = true;
    statusBox.hidden = true;
    const success = document.getElementById('success');
    document.getElementById('receipt').textContent = 'Nomor penerimaan: ' + result.id;
    success.hidden = false;
    success.focus();
    form.reset();
    requestId = crypto.randomUUID();
  } catch (error) {
    fields.disabled = false;
    submitStatus.textContent = (error.name === 'TimeoutError' || error.name === 'TypeError')
      ? 'Konfirmasi penerimaan belum berhasil diperoleh. Isian tetap tersedia; silakan tekan Kirim masukan kembali. Pengiriman ulang tidak menggandakan respons.'
      : error.message;
  } finally {
    submitting = false;
    submitButton.textContent = 'Kirim masukan';
  }
});
retry.addEventListener('click', checkAvailability);
checkAvailability();
