/* ========================================
   RegularizaFGTS — Main JS
   Menu, contadores, masks, cookie consent, exit-intent, social proof, UTM
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initScrollHeader();
  initScrollAnimations();
  initCounters();
  initInputMasks();
  initCookieConsent();
  initExitIntent();
  initSocialProofToasts();
  initFAQAccordion();
  captureUTMs();
});

/* ---- Mobile Menu ---- */
function initMobileMenu() {
  const toggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.nav-links');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    nav.classList.toggle('active');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      nav.classList.remove('active');
    });
  });
}

/* ---- Header scroll effect ---- */
function initScrollHeader() {
  const header = document.querySelector('.header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });
}

/* ---- Scroll Fade-in Animations ---- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  elements.forEach(el => observer.observe(el));
}

/* ---- Contadores animados ---- */
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.counter);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
  const duration = 2000;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = target * ease;

    if (decimals > 0) {
      el.textContent = prefix + current.toFixed(decimals).replace('.', ',') + suffix;
    } else {
      el.textContent = prefix + Math.floor(current).toLocaleString('pt-BR') + suffix;
    }
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ---- Input Masks (CNPJ + Telefone) ---- */
function initInputMasks() {
  document.addEventListener('input', (e) => {
    if (e.target.name === 'cnpj') maskCNPJ(e.target);
    if (e.target.name === 'telefone') maskPhone(e.target);
  });
}

function maskCNPJ(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, '$1.$2');
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  el.value = v;
}

function maskPhone(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/^(\d{2})(\d)/, '($1) $2');
  v = v.replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
}

function validateCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  let sum = 0, pos = 5;
  for (let i = 0; i < 12; i++) { sum += parseInt(cnpj[i]) * pos--; if (pos < 2) pos = 9; }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(cnpj[12])) return false;
  sum = 0; pos = 6;
  for (let i = 0; i < 13; i++) { sum += parseInt(cnpj[i]) * pos--; if (pos < 2) pos = 9; }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(cnpj[13]);
}

/* ---- Form Validation + Submission ---- */
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'diagnostico-form') return;
  e.preventDefault();

  const form = e.target;

  // Honeypot check
  if (form.querySelector('[name="website"]')?.value) return;

  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;

  // Validate CNPJ if provided
  const cnpjVal = form.querySelector('[name="cnpj"]').value;
  if (cnpjVal && !validateCNPJ(cnpjVal)) {
    showFieldError(form.querySelector('[name="cnpj"]'), 'CNPJ inválido');
    return;
  }

  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const data = {
    nome: form.querySelector('[name="nome"]').value,
    email: form.querySelector('[name="email"]').value,
    telefone: form.querySelector('[name="telefone"]').value,
    cnpj: cnpjVal,
    mensagem: form.querySelector('[name="mensagem"]')?.value || '',
    website: form.querySelector('[name="website"]')?.value || '',
    origem: 'formulario'
  };

  const result = await saveLead(data);

  if (result && result.error === 'rate_limited') {
    btn.textContent = originalText;
    btn.disabled = false;
    showFormMessage(form, 'Aguarde alguns minutos antes de enviar novamente.', 'warning');
    return;
  }

  if (result) {
    form.style.display = 'none';
    const success = document.getElementById('form-success');
    success.classList.add('active');
    success.setAttribute('aria-live', 'polite');

    // Disparo de e-mail (fire-and-forget)
    sendLeadNotification(result, 'formulario');

    if (typeof gtag === 'function') {
      gtag('event', 'conversion', { send_to: 'AW-XXXXX/XXXXX' });
    }
  } else {
    btn.textContent = originalText;
    btn.disabled = false;
    showFormMessage(form, 'Erro ao enviar. Tente novamente.', 'error');
  }
});

function showFieldError(input, message) {
  input.style.borderColor = '#EF4444';
  let err = input.parentElement.querySelector('.field-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    input.parentElement.appendChild(err);
  }
  err.textContent = message;
  input.addEventListener('input', () => {
    input.style.borderColor = '';
    if (err) err.remove();
  }, { once: true });
}

function showFormMessage(form, message, type) {
  let msg = form.querySelector('.form-message');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'form-message';
    msg.setAttribute('role', 'alert');
    form.appendChild(msg);
  }
  msg.textContent = message;
  msg.className = `form-message form-message-${type}`;
  setTimeout(() => msg.remove(), 5000);
}

/* ---- Cookie Consent ---- */
function initCookieConsent() {
  if (localStorage.getItem('cookie_consent')) return;
  const banner = document.getElementById('cookie-consent');
  if (!banner) return;

  banner.style.display = 'flex';

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'accepted');
    banner.style.display = 'none';
    loadAnalytics();
  });

  document.getElementById('cookie-reject')?.addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'rejected');
    banner.style.display = 'none';
  });
}

function loadAnalytics() {
  // GA4 — substitua G-XXXXXXXXXX pelo seu ID
  // const gaScript = document.createElement('script');
  // gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
  // gaScript.async = true;
  // document.head.appendChild(gaScript);
  // gaScript.onload = () => {
  //   window.dataLayer = window.dataLayer || [];
  //   function gtag(){dataLayer.push(arguments);}
  //   window.gtag = gtag;
  //   gtag('js', new Date());
  //   gtag('config', 'G-XXXXXXXXXX');
  // };

  // Meta Pixel — substitua XXXXXXXX pelo seu Pixel ID
  // !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  // n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  // n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  // t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  // document,'script','https://connect.facebook.net/en_US/fbevents.js');
  // fbq('init', 'XXXXXXXX');
  // fbq('track', 'PageView');
}

// Se já aceitou antes, carrega analytics direto
if (localStorage.getItem('cookie_consent') === 'accepted') {
  loadAnalytics();
}

/* ---- Exit Intent Popup ---- */
function initExitIntent() {
  let shown = false;
  if (sessionStorage.getItem('exit_shown')) return;

  document.addEventListener('mouseout', (e) => {
    if (shown) return;
    if (e.clientY <= 0 && e.relatedTarget === null) {
      shown = true;
      sessionStorage.setItem('exit_shown', '1');
      const popup = document.getElementById('exit-popup');
      if (popup) popup.classList.add('active');
    }
  });

  document.getElementById('exit-popup-close')?.addEventListener('click', () => {
    document.getElementById('exit-popup')?.classList.remove('active');
  });

  document.getElementById('exit-popup')?.addEventListener('click', (e) => {
    if (e.target.id === 'exit-popup') {
      e.target.classList.remove('active');
    }
  });
}

/* ---- Social Proof Toasts ---- */
function initSocialProofToasts() {
  const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Brasília', 'Recife', 'Fortaleza', 'Goiânia', 'Campinas', 'Manaus'];
  const actions = ['solicitou diagnóstico', 'fez simulação de risco', 'solicitou análise do FGTS'];
  const times = ['agora', 'há 2 minutos', 'há 5 minutos', 'há 12 minutos', 'há 23 minutos'];

  let toastTimeout;

  function showToast() {
    const toast = document.getElementById('social-proof-toast');
    if (!toast) return;

    const city = cities[Math.floor(Math.random() * cities.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const time = times[Math.floor(Math.random() * times.length)];

    toast.querySelector('.toast-text').textContent = `Empresa em ${city} ${action}`;
    toast.querySelector('.toast-time').textContent = time;
    toast.classList.add('active');

    setTimeout(() => toast.classList.remove('active'), 5000);
    toastTimeout = setTimeout(showToast, 25000 + Math.random() * 35000);
  }

  // Primeiro toast depois de 15s
  toastTimeout = setTimeout(showToast, 15000);
}

/* ---- FAQ Accordion ---- */
function initFAQAccordion() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('active');

      // Fecha todos
      document.querySelectorAll('.faq-item.active').forEach(el => el.classList.remove('active'));

      if (!isOpen) item.classList.add('active');
    });
  });
}

/* ---- UTM Capture ---- */
function captureUTMs() {
  const params = new URLSearchParams(window.location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
    const val = params.get(key);
    if (val) sessionStorage.setItem(key, val);
  });
}
