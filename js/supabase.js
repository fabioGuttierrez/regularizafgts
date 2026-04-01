/* ========================================
   RegularizaFGTS — Supabase Integration
   SECURITY: Input sanitization, rate limiting, error handling
   ======================================== */

const SUPABASE_URL = 'https://nxzmnyzvjidjvnhraanw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54em1ueXp2amlkanZuaHJhYW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjMwNTcsImV4cCI6MjA5MDYzOTA1N30.oj_H5-Z2n6y-5vYSK3fJXYKkzSmor8iAVk9_FGDJIhE';

const supabaseHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

/* ---- Sanitização contra XSS ---- */
function sanitize(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

function sanitizeForDB(str) {
  if (!str) return null;
  return String(str).replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

/* ---- Rate Limiting (client-side) ---- */
const rateLimitMap = {};
function isRateLimited(key, maxPerWindow, windowMs) {
  const now = Date.now();
  if (!rateLimitMap[key]) rateLimitMap[key] = [];
  rateLimitMap[key] = rateLimitMap[key].filter(t => now - t < windowMs);
  if (rateLimitMap[key].length >= maxPerWindow) return true;
  rateLimitMap[key].push(now);
  return false;
}

/* ---- UTM Capture ---- */
function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  const utms = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
    const val = params.get(key);
    if (val) utms[key] = sanitizeForDB(val);
  });
  return Object.keys(utms).length ? utms : null;
}

/* ---- Salvar Lead ---- */
async function saveLead(data) {
  if (isRateLimited('lead_submit', 3, 300000)) {
    return { error: 'rate_limited' };
  }

  // Honeypot check
  if (data.website) return null;

  try {
    const payload = {
      nome: sanitizeForDB(data.nome)?.slice(0, 200),
      email: sanitizeForDB(data.email)?.slice(0, 254),
      telefone: sanitizeForDB(data.telefone)?.slice(0, 20) || null,
      cnpj: sanitizeForDB(data.cnpj)?.slice(0, 18) || null,
      mensagem: sanitizeForDB(data.mensagem)?.slice(0, 2000) || null,
      origem: ['formulario', 'simulador'].includes(data.origem) ? data.origem : 'formulario'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Falha ao salvar');
    const result = await response.json();

    // Track conversion
    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', {
        event_category: 'conversion',
        event_label: data.origem,
        value: 1
      });
    }
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', { content_name: data.origem });
    }

    return result[0];
  } catch (err) {
    console.error('Erro no envio');
    return null;
  }
}

/* ---- Salvar Resultado Simulador ---- */
async function saveSimulatorResult(leadId, respostas, score) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/simulator_results`, {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        lead_id: leadId,
        respostas: respostas,
        score: score
      })
    });

    if (!response.ok) throw new Error('Falha ao salvar resultado');
    return true;
  } catch (err) {
    console.error('Erro no envio do resultado');
    return false;
  }
}
