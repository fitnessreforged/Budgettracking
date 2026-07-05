const STORAGE_KEY = 'budget-dash-state-v1';

const DEFAULT_STATE = {
  hourly: 1100,
  checks: 2,
  commGross: 1500,
  taxRate: 38,
  variable: 750,
  pctSave: 55,
  pctTrack: 30,
  pctFun: 15,
  scenario: 'lean',
  fixedCosts: [
    { name: 'Car payment', amount: 411 },
    { name: 'Motorcycle payment', amount: 271 },
    { name: 'Insurance', amount: 150 },
    { name: 'Gym membership', amount: 42 },
    { name: 'Game Pass', amount: 23 },
    { name: 'Spotify', amount: 14 },
  ],
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch (e) {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function fmt(n) {
  const rounded = Math.round(n);
  const neg = rounded < 0;
  const abs = Math.abs(rounded).toLocaleString('en-US');
  return neg ? `($${abs})` : `$${abs}`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function renderFixedList() {
  const list = document.getElementById('fixedList');
  list.innerHTML = '';
  state.fixedCosts.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'fixed-item';
    row.innerHTML = `
      <input type="text" value="${item.name}" data-idx="${i}" data-field="name">
      <div class="input-row"><span>$</span><input type="number" value="${item.amount}" data-idx="${i}" data-field="amount"></div>
      <button class="remove-btn" data-idx="${i}" title="Remove">✕</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = +e.target.dataset.idx;
      const field = e.target.dataset.field;
      state.fixedCosts[idx][field] = field === 'amount' ? (+e.target.value || 0) : e.target.value;
      compute();
    });
  });
  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = +e.target.dataset.idx;
      state.fixedCosts.splice(idx, 1);
      renderFixedList();
      compute();
    });
  });
}

function compute() {
  const hourly = +document.getElementById('hourly').value || 0;
  const checks = +document.getElementById('checks').value || 0;
  const commGross = +document.getElementById('commGross').value || 0;
  const taxRate = +document.getElementById('taxRate').value || 0;
  const variable = +document.getElementById('variable').value || 0;

  state.hourly = hourly;
  state.checks = checks;
  state.commGross = commGross;
  state.taxRate = taxRate;
  state.variable = variable;

  const commNet = commGross * (1 - taxRate / 100);
  const baseIncome = hourly * checks;
  const fullIncome = baseIncome + commNet;
  const fixedTotal = state.fixedCosts.reduce((sum, c) => sum + (+c.amount || 0), 0);

  const surplusLean = baseIncome - fixedTotal - variable;
  const surplusFull = fullIncome - fixedTotal - variable;

  document.getElementById('baseIncomeOut').textContent = fmt(baseIncome);
  document.getElementById('fullIncomeOut').textContent = fmt(fullIncome);
  document.getElementById('fixedTotalOut').textContent = fmt(fixedTotal);

  // Allocation percentages
  let pctSave = +document.getElementById('pctSave').value;
  let pctTrack = +document.getElementById('pctTrack').value;
  let pctFun = +document.getElementById('pctFun').value;
  document.getElementById('pctSaveOut').textContent = pctSave + '%';
  document.getElementById('pctTrackOut').textContent = pctTrack + '%';
  document.getElementById('pctFunOut').textContent = pctFun + '%';

  state.pctSave = pctSave;
  state.pctTrack = pctTrack;
  state.pctFun = pctFun;

  const total = pctSave + pctTrack + pctFun;
  const warningEl = document.getElementById('pctWarning');
  warningEl.textContent = total === 100 ? '' : `Splits total ${total}% — adjust so they add to 100%.`;

  const leanBase = Math.max(surplusLean, 0);
  const fullBase = Math.max(surplusFull, 0);

  document.getElementById('leanSave').textContent = fmt(leanBase * pctSave / 100);
  document.getElementById('leanTrack').textContent = fmt(leanBase * pctTrack / 100);
  document.getElementById('leanFun').textContent = fmt(leanBase * pctFun / 100);
  document.getElementById('fullSave').textContent = fmt(fullBase * pctSave / 100);
  document.getElementById('fullTrack').textContent = fmt(fullBase * pctTrack / 100);
  document.getElementById('fullFun').textContent = fmt(fullBase * pctFun / 100);

  // Gauge + headline readout depends on scenario
  const scenario = state.scenario;
  const income = scenario === 'lean' ? baseIncome : fullIncome;
  const surplus = scenario === 'lean' ? surplusLean : surplusFull;

  document.getElementById('scenarioLabel').textContent =
    scenario === 'lean' ? 'LEAN MONTH SURPLUS' : 'COMMISSION MONTH SURPLUS';

  const valueEl = document.getElementById('surplusValue');
  valueEl.textContent = fmt(surplus);
  valueEl.classList.remove('danger', 'warn');
  const ratio = income > 0 ? surplus / income : 0;
  if (surplus < 0) valueEl.classList.add('danger');
  else if (ratio < 0.1) valueEl.classList.add('warn');

  renderGauge(ratio);

  saveState();
}

function renderGauge(ratio) {
  const minRatio = -0.3, maxRatio = 0.6;
  const clamped = clamp(ratio, minRatio, maxRatio);
  const angle = -90 + ((clamped - minRatio) / (maxRatio - minRatio)) * 180;
  const breakevenAngle = -90 + ((0 - minRatio) / (maxRatio - minRatio)) * 180;

  document.getElementById('gaugeRedzone').setAttribute('d', describeArc(120, 120, 100, -90, breakevenAngle));
  document.getElementById('gaugeArc').setAttribute('d', describeArc(120, 120, 100, -90, angle));
  document.getElementById('gaugeNeedle').style.transform = `rotate(${angle}deg)`;
}

function bindScenarioToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.scenario = btn.dataset.scenario;
      compute();
    });
  });
}

function bindInputs() {
  ['hourly', 'checks', 'commGross', 'taxRate', 'variable', 'pctSave', 'pctTrack', 'pctFun']
    .forEach(id => document.getElementById(id).addEventListener('input', compute));
}

function init() {
  document.getElementById('hourly').value = state.hourly;
  document.getElementById('checks').value = state.checks;
  document.getElementById('commGross').value = state.commGross;
  document.getElementById('taxRate').value = state.taxRate;
  document.getElementById('variable').value = state.variable;
  document.getElementById('pctSave').value = state.pctSave;
  document.getElementById('pctTrack').value = state.pctTrack;
  document.getElementById('pctFun').value = state.pctFun;

  document.querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scenario === state.scenario);
  });

  renderFixedList();
  bindInputs();
  bindScenarioToggle();

  document.getElementById('addFixed').addEventListener('click', () => {
    state.fixedCosts.push({ name: 'New item', amount: 0 });
    renderFixedList();
    compute();
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Reset all values to defaults? This clears your saved changes.')) {
      state = structuredClone(DEFAULT_STATE);
      localStorage.removeItem(STORAGE_KEY);
      init();
    }
  });

  compute();
}

init();
