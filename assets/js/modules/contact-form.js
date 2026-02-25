/* ================================================================
   CONTACT FORM — validation + Google Sheets submission

   After deploying the Apps Script (see google-apps-script/Code.gs),
   paste your Web App URL below.
================================================================ */

// ← Paste your Google Apps Script Web App URL here
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby4-W1hQevE3gXL4N_Th-MCO-r7WWa0JhaLqNpu9T0jUh3mcMTr8ShW7FP89BRsXV62/exec';

export function initContactForm() {
  const form      = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  if (!form || !submitBtn) return;

  const fields = {
    name:        { el: form.querySelector('#name'),         errId: 'name-error' },
    email:       { el: form.querySelector('#email'),        errId: 'email-error' },
    projectType: { el: form.querySelector('#project-type'), errId: 'project-type-error' },
    message:     { el: form.querySelector('#message'),      errId: 'message-error' },
  };

  Object.values(fields).forEach(({ el, errId }) => {
    if (!el) return;
    ['input', 'change'].forEach(evt => el.addEventListener(evt, () => clearError(el, errId)));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm(fields)) return;

    setFormLoading(form, submitBtn, true);

    const payload = {
      name:        fields.name.el.value.trim(),
      email:       fields.email.el.value.trim(),
      projectType: fields.projectType.el.value.trim(),
      message:     fields.message.el.value.trim(),
    };

    const ok = await submitToSheets(payload);

    setFormLoading(form, submitBtn, false);

    if (ok) {
      showToast("Your inquiry has been sent! We'll respond within one business day.", 'success');
      form.reset();
    } else {
      showToast('Something went wrong. Please try again or email us directly.', 'error');
    }
  });
}

// ── Google Sheets submission ──────────────────────────────────────
async function submitToSheets(payload) {
  if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
    // Development fallback: log to console and simulate success
    console.info('[Contact Form] Apps Script URL not set. Form data:', payload);
    await new Promise(r => setTimeout(r, 1000));
    return true;
  }

  try {
    // Use text/plain to avoid a CORS preflight — Apps Script reads
    // the raw body via e.postData.contents and parses it as JSON.
    await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',           // Google Apps Script requires this
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(payload),
    });

    // With no-cors the response is opaque; reaching here means the
    // network request completed without a connection-level error.
    return true;
  } catch (err) {
    console.error('[Contact Form] Submission failed:', err);
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function setFormLoading(form, btn, loading) {
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.disabled = loading;
  });
}

function validateForm(fields) {
  let ok = true;
  const { name, email, projectType, message } = fields;

  if (!name.el?.value.trim())
    { setError(name.el, name.errId, 'Please enter your name.'); ok = false; }

  if (!email.el?.value.trim())
    { setError(email.el, email.errId, 'Please enter your email address.'); ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.el.value.trim()))
    { setError(email.el, email.errId, 'Please enter a valid email address.'); ok = false; }

  if (!projectType.el?.value)
    { setError(projectType.el, projectType.errId, 'Please select a project type.'); ok = false; }

  if (!message.el?.value.trim())
    { setError(message.el, message.errId, 'Please describe your project.'); ok = false; }
  else if (message.el.value.trim().length < 20)
    { setError(message.el, message.errId, 'Please provide a bit more detail (20+ characters).'); ok = false; }

  return ok;
}

function setError(el, errId, msg) {
  if (!el) return;
  el.classList.add('invalid');
  const errEl = document.getElementById(errId);
  if (errEl) errEl.textContent = msg;
}

function clearError(el, errId) {
  el.classList.remove('invalid');
  const errEl = document.getElementById(errId);
  if (errEl) errEl.textContent = '';
}

export function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 5000);
}
