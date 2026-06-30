/* ───────────────────────────────────────────
   초등 교실 퀴즈 — 선생님 컨트롤 페이지
─────────────────────────────────────────── */

// ── State ──
let sel = { grade: null, sem: null, subject: null, unit: null };
let game = { type: null, mode: null };
let questions = [];
let teamNames = ['1팀', '2팀', '3팀'];
let scores = [0, 0, 0];
let currentIdx = 0;
let revealed = false;
let timerSeconds = 20;

// ── Helpers ──
function $(id) { return document.getElementById(id); }

function showPhase(id) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
}

function toast(msg, dur = 2500) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), dur);
}

function syncState() {
  EQ_STATE.set({
    game: game.type,
    mode: game.mode,
    grade: sel.grade,
    subject: sel.subject,
    unit: sel.unit,
    teams: teamNames.map((n, i) => ({ name: n, score: scores[i], color: EQ_STATE.TEAM_COLORS[i] })),
    questions,
    currentIndex: currentIdx,
    revealed,
    status: currentIdx < 0 ? 'waiting' : (revealed ? 'revealed' : 'question'),
    timerSeconds,
  });
}

// ── Phase 1: Curriculum ──
$('grade-grid').addEventListener('click', e => {
  const btn = e.target.closest('.grade-btn');
  if (!btn) return;
  sel = { grade: btn.dataset.grade, sem: null, subject: null, unit: null };
  document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('sem-card').style.display = 'block';
  $('subject-card').style.display = 'none';
  $('unit-card').style.display = 'none';
  document.querySelectorAll('.sem-btn').forEach(b => b.classList.remove('active'));
  checkSetupDone();
});

document.querySelectorAll('.sem-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sel.sem = btn.dataset.sem;
    sel.subject = null; sel.unit = null;
    document.querySelectorAll('.sem-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildSubjects();
    $('subject-card').style.display = 'block';
    $('unit-card').style.display = 'none';
    checkSetupDone();
  });
});

function buildSubjects() {
  const subjects = Object.keys(CURRICULUM[sel.grade]?.subjects || {});
  const wrap = $('subject-wrap');
  wrap.innerHTML = '';
  subjects.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'subject-chip';
    btn.textContent = sub;
    btn.addEventListener('click', () => {
      sel.subject = sub; sel.unit = null;
      document.querySelectorAll('.subject-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildUnits();
      $('unit-card').style.display = 'block';
      checkSetupDone();
    });
    wrap.appendChild(btn);
  });
}

function buildUnits() {
  const units = CURRICULUM[sel.grade]?.subjects[sel.subject]?.[sel.sem] || [];
  const list = $('unit-list');
  list.innerHTML = '';
  units.forEach(unit => {
    const btn = document.createElement('button');
    btn.className = 'unit-btn';
    btn.textContent = unit;
    btn.addEventListener('click', () => {
      sel.unit = unit;
      document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      checkSetupDone();
    });
    list.appendChild(btn);
  });
}

function checkSetupDone() {
  const ok = sel.grade && sel.sem && sel.subject && sel.unit;
  $('btn-to-game').disabled = !ok;
}

$('btn-to-game').addEventListener('click', () => {
  buildTeamFields();
  showPhase('phase-game');
});

// ── Phase 2: Game Selection ──
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.game-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    game.type = card.dataset.game;
    game.mode = card.dataset.mode;
    timerSeconds = (game.type === 'show') ? 15 : 30;
  });
});

function buildTeamFields() {
  const container = $('team-fields');
  container.innerHTML = '';
  teamNames = ['1팀', '2팀', '3팀'];
  scores = [0, 0, 0];
  teamNames.forEach((name, i) => {
    const field = document.createElement('div');
    field.className = 'team-field';
    const dot = document.createElement('div');
    dot.className = 'team-dot';
    dot.style.background = EQ_STATE.TEAM_COLORS[i];
    const inp = document.createElement('input');
    inp.className = 'team-input';
    inp.type = 'text';
    inp.value = name;
    inp.maxLength = 12;
    inp.addEventListener('input', () => { teamNames[i] = inp.value || `${i+1}팀`; });
    field.appendChild(dot);
    field.appendChild(inp);
    container.appendChild(field);
  });
}

$('btn-back-setup').addEventListener('click', () => showPhase('phase-setup'));

$('btn-generate').addEventListener('click', async () => {
  if (!game.type) { toast('게임을 먼저 선택해주세요!'); return; }
  const count = Math.max(3, Math.min(15, parseInt($('q-count').value) || 5));

  showPhase('phase-loading');
  $('loading-subject-name').textContent = `${sel.grade}학년 ${sel.subject} [${sel.unit}]`;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grade: sel.grade,
        subject: sel.subject,
        unit: sel.unit,
        mode: game.mode,
        count,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || '알 수 없는 오류');
    questions = data.questions;
    currentIdx = -1;
    revealed = false;
    scores = teamNames.map(() => 0);
    buildScoreList();
    updateStatusBanner();
    syncState();
    renderControlPanel();
    showPhase('phase-ctrl');
  } catch (err) {
    showPhase('phase-game');
    toast('문제 생성 실패: ' + err.message, 4000);
  }
});

// ── Phase 4: Control Panel ──
const GAME_META = {
  castle: { icon: '🏰', name: '퀴즈 왕국 (O/X)' },
  space:  { icon: '🚀', name: '우주 탐험대 (4지선다)' },
  show:   { icon: '⚡', name: '번개 퀴즈쇼 (4지선다)' },
};

function updateStatusBanner() {
  const meta = GAME_META[game.type] || {};
  $('status-game-icon').textContent = meta.icon || '';
  $('status-curriculum').textContent =
    `${sel.grade}학년 ${sel.subject} — ${sel.unit}`;
  $('status-game-name').textContent = meta.name || '';
}

function renderControlPanel() {
  updateProgress();
  renderQuestion();
  updateCtrlButtons();
}

function updateProgress() {
  const shown = currentIdx + 1;
  $('status-progress').textContent =
    `${Math.max(0, shown)} / ${questions.length}`;
}

function renderQuestion() {
  const q = questions[currentIdx];
  if (!q) {
    $('q-preview-num').textContent = '시작 전';
    $('q-preview-text').textContent = '▶ 문제 표시 버튼을 눌러 첫 문제를 화면에 표시합니다.';
    $('q-preview-opts').innerHTML = '';
    $('q-explain').classList.add('hidden');
    return;
  }

  $('q-preview-num').textContent = `문제 ${currentIdx + 1} / ${questions.length}`;
  $('q-preview-text').textContent = q.question;
  $('q-explain').classList.toggle('hidden', !revealed);
  if (revealed) $('q-explain').textContent = '💡 ' + (q.explanation || '');

  const optsEl = $('q-preview-opts');
  optsEl.innerHTML = '';

  if (game.mode === 'ox') {
    const wrap = document.createElement('div');
    wrap.className = 'ox-preview';
    ['O', 'X'].forEach(ox => {
      const btn = document.createElement('div');
      btn.className = 'ox-big ' + ox;
      btn.textContent = ox;
      if (revealed) {
        const correct = (q.answer === true) ? 'O' : 'X';
        btn.classList.add(ox === correct ? 'correct' : 'dim');
      }
      wrap.appendChild(btn);
    });
    optsEl.appendChild(wrap);
  } else if (q.options) {
    q.options.forEach((opt, i) => {
      const row = document.createElement('div');
      row.className = 'q-preview-opt' + (revealed && i === q.answer ? ' correct' : '');
      const num = document.createElement('span');
      num.className = `opt-num c${i}`;
      num.textContent = ['①','②','③','④'][i];
      const txt = document.createElement('span');
      txt.textContent = opt;
      row.appendChild(num);
      row.appendChild(txt);
      optsEl.appendChild(row);
    });
  }
}

function updateCtrlButtons() {
  const hasQ = currentIdx >= 0;
  $('btn-prev').disabled = currentIdx <= 0;
  $('btn-show').disabled = currentIdx >= questions.length - 1;
  $('btn-reveal').disabled = !hasQ || revealed;
  $('btn-next').disabled = !hasQ || !revealed || currentIdx >= questions.length - 1;
  $('btn-finish').disabled = false;
}

$('btn-show').addEventListener('click', () => {
  currentIdx++;
  revealed = false;
  updateProgress();
  renderQuestion();
  updateCtrlButtons();
  syncState();
});

$('btn-reveal').addEventListener('click', () => {
  if (currentIdx < 0) return;
  revealed = true;
  renderQuestion();
  updateCtrlButtons();
  syncState();
});

$('btn-next').addEventListener('click', () => {
  if (currentIdx < questions.length - 1) {
    currentIdx++;
    revealed = false;
    updateProgress();
    renderQuestion();
    updateCtrlButtons();
    syncState();
  }
});

$('btn-prev').addEventListener('click', () => {
  if (currentIdx > 0) {
    currentIdx--;
    revealed = false;
    updateProgress();
    renderQuestion();
    updateCtrlButtons();
    syncState();
  }
});

$('btn-finish').addEventListener('click', () => {
  if (!confirm('게임을 종료하고 결과를 표시할까요?')) return;
  EQ_STATE.update({ status: 'finished' });
  toast('게임이 종료되었습니다. 프로젝터에 순위가 표시됩니다.');
  $('btn-show').disabled = true;
  $('btn-reveal').disabled = true;
  $('btn-next').disabled = true;
  $('btn-prev').disabled = true;
});

// ── Score management ──
function buildScoreList() {
  const list = $('score-list');
  list.innerHTML = '';
  teamNames.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'score-team';
    row.id = `score-team-${i}`;
    const dot = document.createElement('div');
    dot.className = 'score-dot';
    dot.style.background = EQ_STATE.TEAM_COLORS[i];
    const nameEl = document.createElement('div');
    nameEl.className = 'score-name';
    nameEl.textContent = name;
    nameEl.id = `score-name-${i}`;
    const valEl = document.createElement('div');
    valEl.className = 'score-val';
    valEl.id = `score-val-${i}`;
    valEl.textContent = scores[i];
    const adj = document.createElement('div');
    adj.className = 'score-adj';
    const plus = document.createElement('button');
    plus.className = 'adj-btn';
    plus.textContent = '+';
    plus.addEventListener('click', () => { scores[i]++; updateScore(i); syncState(); });
    const minus = document.createElement('button');
    minus.className = 'adj-btn';
    minus.textContent = '−';
    minus.addEventListener('click', () => { scores[i] = Math.max(0, scores[i] - 1); updateScore(i); syncState(); });
    adj.appendChild(plus);
    adj.appendChild(minus);
    row.appendChild(dot);
    row.appendChild(nameEl);
    row.appendChild(valEl);
    row.appendChild(adj);
    list.appendChild(row);
  });
}

function updateScore(i) {
  const el = $(`score-val-${i}`);
  if (el) el.textContent = scores[i];
}

// ── Projector window ──
$('btn-projector').addEventListener('click', () => {
  syncState();
  const w = window.open(
    'display.html',
    'eq_display',
    'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
  );
  if (!w) toast('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.', 4000);
});
