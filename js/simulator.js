/* ========================================
   RegularizaFGTS — Simulador Interativo
   SECURITY: No innerHTML with user data, race condition guard, input sanitization
   ======================================== */

const SIMULATOR_QUESTIONS = [
  {
    question: 'Sua empresa recolhe FGTS mensalmente em dia?',
    options: [
      { text: 'Sim, sempre em dia', points: 0 },
      { text: 'Às vezes atrasa', points: 2 },
      { text: 'Não recolhe regularmente', points: 4 },
      { text: 'Não sei informar', points: 3 }
    ]
  },
  {
    question: 'Já recebeu notificação da Caixa ou Receita Federal sobre FGTS?',
    options: [
      { text: 'Sim, já recebi', points: 4 },
      { text: 'Não', points: 0 },
      { text: 'Não sei informar', points: 2 }
    ]
  },
  {
    question: 'Sua empresa utiliza eSocial para envio de informações trabalhistas?',
    options: [
      { text: 'Sim, tudo atualizado', points: 0 },
      { text: 'Sim, mas pode ter inconsistências', points: 3 },
      { text: 'Não utiliza', points: 4 },
      { text: 'Não sei informar', points: 2 }
    ]
  },
  {
    question: 'Já tentou emitir CND ou CPEND e teve problemas?',
    options: [
      { text: 'Sim, tive problemas', points: 4 },
      { text: 'Não, sempre consegui', points: 0 },
      { text: 'Nunca tentei emitir', points: 2 }
    ]
  },
  {
    question: 'Quantos funcionários sua empresa possui?',
    options: [
      { text: '1 a 10 funcionários', points: 1 },
      { text: '11 a 50 funcionários', points: 2 },
      { text: '51 a 200 funcionários', points: 3 },
      { text: 'Mais de 200 funcionários', points: 4 }
    ]
  }
];

const SCORE_RANGES = [
  { max: 4, level: 'baixo', title: 'Risco Baixo', description: 'Sua empresa aparenta estar em situação regular, mas uma análise profissional pode identificar inconsistências ocultas que geram débitos futuros.' },
  { max: 9, level: 'medio', title: 'Risco Médio', description: 'Existem sinais de possíveis irregularidades. Recomendamos fortemente um diagnóstico completo para evitar surpresas com a fiscalização.' },
  { max: 14, level: 'alto', title: 'Risco Alto', description: 'Sua empresa apresenta indicadores sérios de irregularidade no FGTS. Ação imediata é recomendada para evitar execução fiscal e bloqueios.' },
  { max: 20, level: 'critico', title: 'Risco Crítico', description: 'A situação da sua empresa exige atenção urgente. O risco de bloqueio judicial, multas pesadas e inclusão na dívida ativa é iminente.' }
];

let currentStep = 0;
let answers = [];
let totalScore = 0;
let isTransitioning = false; // Race condition guard

function initSimulator() {
  currentStep = 0;
  answers = [];
  totalScore = 0;
  isTransitioning = false;
  renderQuestion();
}

/* ---- Render via DOM API (no innerHTML for security) ---- */
function renderQuestion() {
  const questionData = SIMULATOR_QUESTIONS[currentStep];
  const body = document.getElementById('simulator-body');
  if (!body) return;

  const progress = ((currentStep) / SIMULATOR_QUESTIONS.length) * 100;
  document.getElementById('simulator-progress-bar').style.width = progress + '%';

  body.textContent = '';

  const stepLabel = document.createElement('div');
  stepLabel.className = 'simulator-step-label';
  stepLabel.textContent = `Pergunta ${currentStep + 1} de ${SIMULATOR_QUESTIONS.length}`;

  const questionEl = document.createElement('div');
  questionEl.className = 'simulator-question';
  questionEl.textContent = questionData.question;

  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'simulator-options';

  questionData.options.forEach((opt, i) => {
    const optEl = document.createElement('div');
    optEl.className = 'simulator-option';
    optEl.setAttribute('role', 'button');
    optEl.setAttribute('tabindex', '0');

    const radio = document.createElement('div');
    radio.className = 'option-radio';

    const span = document.createElement('span');
    span.textContent = opt.text;

    optEl.appendChild(radio);
    optEl.appendChild(span);

    const handler = () => selectOption(i, opt.points);
    optEl.addEventListener('click', handler);
    optEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });

    optionsContainer.appendChild(optEl);
  });

  body.appendChild(stepLabel);
  body.appendChild(questionEl);
  body.appendChild(optionsContainer);
}

function selectOption(index, points) {
  if (isTransitioning) return; // Prevent double-click
  isTransitioning = true;

  document.querySelectorAll('.simulator-option').forEach((opt, i) => {
    opt.classList.toggle('selected', i === index);
  });

  answers.push({
    question: SIMULATOR_QUESTIONS[currentStep].question,
    answer: SIMULATOR_QUESTIONS[currentStep].options[index].text,
    points: points
  });

  totalScore += points;

  setTimeout(() => {
    currentStep++;
    isTransitioning = false;
    if (currentStep < SIMULATOR_QUESTIONS.length) {
      renderQuestion();
    } else {
      showLeadForm();
    }
  }, 400);
}

function getScoreResult() {
  for (const range of SCORE_RANGES) {
    if (totalScore <= range.max) return range;
  }
  return SCORE_RANGES[SCORE_RANGES.length - 1];
}

/* ---- Lead Form (DOM API) ---- */
function showLeadForm() {
  const body = document.getElementById('simulator-body');
  document.getElementById('simulator-progress-bar').style.width = '100%';
  body.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'simulator-lead-form active';

  const h3 = document.createElement('h3');
  h3.textContent = 'Seu resultado está pronto!';

  const p = document.createElement('p');
  p.textContent = 'Preencha seus dados para ver o diagnóstico completo da sua situação.';

  const form = document.createElement('form');
  form.id = 'simulator-lead-form';

  const fields = [
    { row: [
      { label: 'Nome completo', name: 'nome', type: 'text', required: true, placeholder: 'Seu nome', autocomplete: 'name', maxlength: 200 },
      { label: 'Email', name: 'email', type: 'email', required: true, placeholder: 'seu@email.com', autocomplete: 'email', inputmode: 'email', maxlength: 254 }
    ]},
    { row: [
      { label: 'Telefone', name: 'telefone', type: 'tel', required: false, placeholder: '(00) 00000-0000', autocomplete: 'tel', inputmode: 'tel', maxlength: 15 },
      { label: 'CNPJ', name: 'cnpj', type: 'text', required: false, placeholder: '00.000.000/0000-00', inputmode: 'numeric', maxlength: 18 }
    ]}
  ];

  fields.forEach(group => {
    const row = document.createElement('div');
    row.className = 'form-row';
    group.row.forEach(f => {
      const fg = document.createElement('div');
      fg.className = 'form-group';

      const label = document.createElement('label');
      label.setAttribute('for', `sim-${f.name}`);
      label.textContent = f.label;

      const input = document.createElement('input');
      input.type = f.type;
      input.name = f.name;
      input.id = `sim-${f.name}`;
      input.placeholder = f.placeholder;
      input.required = f.required;
      if (f.autocomplete) input.autocomplete = f.autocomplete;
      if (f.inputmode) input.inputMode = f.inputmode;
      if (f.maxlength) input.maxLength = f.maxlength;

      fg.appendChild(label);
      fg.appendChild(input);
      row.appendChild(fg);
    });
    form.appendChild(row);
  });

  // Honeypot
  const hp = document.createElement('input');
  hp.type = 'text';
  hp.name = 'website';
  hp.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;';
  hp.tabIndex = -1;
  hp.autocomplete = 'off';
  form.appendChild(hp);

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'btn btn-primary';
  btn.style.cssText = 'width:100%;margin-top:8px;';
  btn.textContent = 'Ver Meu Resultado';
  form.appendChild(btn);

  form.addEventListener('submit', submitSimulatorLead);

  wrapper.appendChild(h3);
  wrapper.appendChild(p);
  wrapper.appendChild(form);
  body.appendChild(wrapper);
}

async function submitSimulatorLead(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');

  // Honeypot
  if (form.querySelector('[name="website"]')?.value) return;

  // CNPJ validation
  const cnpjVal = form.querySelector('[name="cnpj"]').value;
  if (cnpjVal && typeof validateCNPJ === 'function' && !validateCNPJ(cnpjVal)) {
    if (typeof showFieldError === 'function') showFieldError(form.querySelector('[name="cnpj"]'), 'CNPJ inválido');
    return;
  }

  btn.textContent = 'Processando...';
  btn.disabled = true;

  const result = getScoreResult();

  const leadData = {
    nome: form.querySelector('[name="nome"]').value,
    email: form.querySelector('[name="email"]').value,
    telefone: form.querySelector('[name="telefone"]').value,
    cnpj: cnpjVal,
    website: form.querySelector('[name="website"]')?.value || '',
    origem: 'simulador'
  };

  const lead = await saveLead(leadData);

  if (lead && lead.error === 'rate_limited') {
    btn.textContent = 'Ver Meu Resultado';
    btn.disabled = false;
    if (typeof showFormMessage === 'function') showFormMessage(form, 'Aguarde alguns minutos.', 'warning');
    return;
  }

  if (lead && lead.id) {
    const respostas = {};
    answers.forEach((a, i) => {
      respostas[`pergunta_${i + 1}`] = { question: a.question, answer: a.answer, points: a.points };
    });
    await saveSimulatorResult(lead.id, respostas, result.level);

    // Disparo de e-mail com score (fire-and-forget)
    sendLeadNotification(lead, 'simulador', result.level);
  }

  showResult(result);
}

/* ---- Show Result (DOM API) ---- */
function showResult(result) {
  const body = document.getElementById('simulator-body');
  body.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'simulator-result active';

  const scoreEl = document.createElement('div');
  scoreEl.className = `result-score ${result.level}`;
  scoreEl.textContent = result.title;

  const title = document.createElement('h3');
  title.className = 'result-title';
  title.textContent = result.title;

  const desc = document.createElement('p');
  desc.className = 'result-description';
  desc.textContent = result.description;

  const ctaLink = document.createElement('a');
  ctaLink.href = '#diagnostico';
  ctaLink.className = 'btn btn-primary btn-lg';
  ctaLink.textContent = 'Quero o Diagnóstico Completo';

  const retryDiv = document.createElement('div');
  retryDiv.style.marginTop = '16px';

  const retryBtn = document.createElement('button');
  retryBtn.className = 'btn btn-outline btn-sm';
  retryBtn.textContent = 'Refazer Simulação';
  retryBtn.addEventListener('click', initSimulator);
  retryDiv.appendChild(retryBtn);

  wrapper.appendChild(scoreEl);
  wrapper.appendChild(title);
  wrapper.appendChild(desc);
  wrapper.appendChild(ctaLink);
  wrapper.appendChild(retryDiv);
  body.appendChild(wrapper);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('simulator-body')) {
    initSimulator();
  }
});
