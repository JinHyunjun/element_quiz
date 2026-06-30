/* ───────────────────────────────────────────
   초등 교실 퀴즈 — 프로젝터 Display 로직
─────────────────────────────────────────── */

let prevState = null;
let timerInterval = null;
let timerLeft = 0;
let timerTotal = 30;

// ── Canvas Star Helpers ──
function initStarfield(canvasId, count, speed) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stars = [];
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.2,
      s: (Math.random() + 0.3) * speed,
      o: Math.random(),
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
      star.o += (Math.random() - 0.5) * 0.04;
      star.o = Math.max(0.1, Math.min(1, star.o));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${star.o})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Show / Hide game panels ──
function showGame(type) {
  ['castle','space','show'].forEach(g => {
    document.getElementById('g-' + g).classList.toggle('hidden', g !== type);
  });
}

// ── Score chips (castle / space) ──
function buildScoreChips(containerId, teams, theme) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  (teams || []).forEach(t => {
    const chip = document.createElement('div');
    chip.style.cssText = `
      background:rgba(0,0,0,.5); border:2px solid ${t.color};
      border-radius:12px; padding:6px 16px; text-align:center;
      color:#fff; font-weight:700; font-size:.9rem; min-width:80px;
    `;
    chip.innerHTML = `<div style="color:${t.color};font-size:.75rem">${t.name}</div><div style="font-size:1.3rem">${t.score}</div>`;
    el.appendChild(chip);
  });
}

// ── Show score bars (show theme) ──
function buildShowScores(teams) {
  const el = document.getElementById('show-scores');
  if (!el) return;
  el.innerHTML = '';
  const maxScore = Math.max(1, ...teams.map(t => t.score));
  teams.forEach(t => {
    const item = document.createElement('div');
    item.className = 'show-score-item';
    const bar = document.createElement('div');
    bar.className = 'show-score-bar';
    bar.style.height = Math.round((t.score / maxScore) * 60) + '%';
    const name = document.createElement('div');
    name.className = 'show-score-name';
    name.textContent = t.name;
    name.style.color = t.color;
    const val = document.createElement('div');
    val.className = 'show-score-val';
    val.textContent = t.score;
    item.appendChild(bar);
    item.appendChild(name);
    item.appendChild(val);
    el.appendChild(item);
  });
}

// ── Timer (show game) ──
const CIRC = 2 * Math.PI * 35; // ≈ 220
function startTimer(secs) {
  stopTimer();
  timerTotal = secs;
  timerLeft = secs;
  const ring = document.getElementById('timer-ring');
  const num = document.getElementById('timer-num');
  if (!ring || !num) return;
  ring.style.strokeDasharray = CIRC;
  ring.classList.remove('urgent');
  num.classList.remove('urgent');
  function tick() {
    const ratio = timerLeft / timerTotal;
    ring.style.strokeDashoffset = CIRC * (1 - ratio);
    num.textContent = timerLeft;
    const urgent = timerLeft <= 5;
    ring.classList.toggle('urgent', urgent);
    num.classList.toggle('urgent', urgent);
    if (timerLeft <= 0) { stopTimer(); return; }
    timerLeft--;
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
function pauseTimer() { stopTimer(); }

// ── Confetti ──
function launchConfetti() {
  const colors = ['#FFD700','#FF4444','#00BFFF','#10B981','#F59E0B','#8B5CF6','#FF69B4'];
  for (let i = 0; i < 90; i++) {
    setTimeout(() => {
      const dot = document.createElement('div');
      dot.className = 'confetti-dot';
      dot.style.left = Math.random() * 100 + 'vw';
      dot.style.top = '-20px';
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      dot.style.animationDuration = (2.5 + Math.random() * 2) + 's';
      dot.style.animationDelay = (Math.random() * 1.5) + 's';
      dot.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 5000);
    }, i * 30);
  }
}

// ── Podium ──
function buildPodium(teams) {
  const row = document.getElementById('podium-row');
  if (!row) return;
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const order = sorted.length >= 3 ? [1, 0, 2] : sorted.map((_, i) => i);
  const medals = ['🥇','🥈','🥉'];
  const heights = [110, 80, 60];
  row.innerHTML = '';
  order.forEach(rank => {
    const t = sorted[rank];
    if (!t) return;
    const item = document.createElement('div');
    item.className = 'podium-item';
    item.style.animation = `fadeIn .6s ease ${rank * .2}s both`;
    const rankEl = document.createElement('div');
    rankEl.className = 'podium-rank';
    rankEl.textContent = medals[rank] || '🏅';
    const nameEl = document.createElement('div');
    nameEl.className = 'podium-name';
    nameEl.textContent = t.name;
    const scoreEl = document.createElement('div');
    scoreEl.className = 'podium-score';
    scoreEl.textContent = t.score + '점';
    const block = document.createElement('div');
    block.className = 'podium-block';
    block.style.cssText = `height:${heights[rank] || 50}px; background:${t.color}33; border: 2px solid ${t.color};`;
    item.appendChild(rankEl);
    item.appendChild(nameEl);
    item.appendChild(scoreEl);
    item.appendChild(block);
    row.appendChild(item);
  });
}

// ── Castle renderer ──
function renderCastle(state) {
  buildScoreChips('castle-scores', state.teams, 'castle');
  const q = state.questions?.[state.currentIndex];

  if (!q) {
    document.getElementById('castle-q-num').textContent = '게임 시작 전';
    document.getElementById('castle-q-text').textContent = '선생님이 문제를 표시하면 여기에 나타납니다.';
    document.getElementById('castle-ox').innerHTML =
      `<div class="castle-ox-btn O">O</div><div style="font-size:2.5rem;color:rgba(212,175,55,.4)">VS</div><div class="castle-ox-btn X">X</div>`;
    document.getElementById('castle-explain').classList.add('hidden');
    return;
  }

  document.getElementById('castle-q-num').textContent =
    `📜 문제 ${state.currentIndex + 1} / ${state.questions.length}`;
  document.getElementById('castle-q-text').textContent = q.question;

  const oxWrap = document.getElementById('castle-ox');
  const correctOX = q.answer === true ? 'O' : 'X';
  oxWrap.innerHTML = '';
  ['O','X'].forEach(ox => {
    const btn = document.createElement('div');
    btn.className = 'castle-ox-btn ' + ox;
    btn.textContent = ox;
    if (state.revealed) {
      btn.classList.add(ox === correctOX ? 'correct' : 'wrong');
    }
    oxWrap.appendChild(btn);
    if (ox === 'O') {
      const vs = document.createElement('div');
      vs.style.cssText = 'font-size:2.5rem;color:rgba(212,175,55,.4)';
      vs.textContent = 'VS';
      oxWrap.appendChild(vs);
    }
  });

  const explainEl = document.getElementById('castle-explain');
  if (state.revealed && q.explanation) {
    explainEl.textContent = '💡 ' + q.explanation;
    explainEl.classList.remove('hidden');
  } else {
    explainEl.classList.add('hidden');
  }
}

// ── Space renderer ──
function renderSpace(state) {
  buildScoreChips('space-scores', state.teams, 'space');
  const total = state.questions?.length || 1;
  const idx = state.currentIndex >= 0 ? state.currentIndex : -1;
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / total) * 92);
  document.getElementById('space-fill').style.width = pct + '%';
  document.getElementById('space-ship').style.left = pct + '%';

  const q = state.questions?.[state.currentIndex];
  if (!q) {
    document.getElementById('space-q-num').textContent = '🛸 출발 준비 중…';
    document.getElementById('space-q-text').textContent = '선생님이 문제를 표시하면 나타납니다.';
    document.getElementById('space-opts').innerHTML = '';
    document.getElementById('space-explain').classList.add('hidden');
    return;
  }

  document.getElementById('space-q-num').textContent =
    `🛸 문제 ${state.currentIndex + 1} / ${state.questions.length}`;
  document.getElementById('space-q-text').textContent = q.question;

  const opts = document.getElementById('space-opts');
  opts.innerHTML = '';
  (q.options || []).forEach((opt, i) => {
    const row = document.createElement('div');
    row.className = 'space-opt';
    if (state.revealed) {
      row.classList.add(i === q.answer ? 'correct' : 'wrong');
    }
    const num = document.createElement('div');
    num.className = 'space-opt-num';
    num.textContent = ['①','②','③','④'][i];
    const txt = document.createElement('span');
    txt.textContent = opt;
    row.appendChild(num);
    row.appendChild(txt);
    opts.appendChild(row);
  });

  const explainEl = document.getElementById('space-explain');
  if (state.revealed && q.explanation) {
    explainEl.textContent = '💡 ' + q.explanation;
    explainEl.classList.remove('hidden');
  } else {
    explainEl.classList.add('hidden');
  }
}

// ── Show renderer ──
function renderShow(state) {
  buildShowScores(state.teams || []);
  const q = state.questions?.[state.currentIndex];

  if (!q) {
    document.getElementById('show-q-num').textContent = '⚡ 대기 중…';
    document.getElementById('show-q-text').textContent = '선생님이 문제를 표시하면 나타납니다.';
    document.getElementById('show-opts').innerHTML = '';
    document.getElementById('show-explain').classList.add('hidden');
    stopTimer();
    document.getElementById('timer-num').textContent = '—';
    return;
  }

  document.getElementById('show-q-num').textContent =
    `⚡ 문제 ${state.currentIndex + 1} / ${state.questions.length}`;
  document.getElementById('show-q-text').textContent = q.question;

  const opts = document.getElementById('show-opts');
  opts.innerHTML = '';
  (q.options || []).forEach((opt, i) => {
    const row = document.createElement('div');
    row.className = 'space-opt';
    if (state.revealed) row.classList.add(i === q.answer ? 'correct' : 'wrong');
    const num = document.createElement('div');
    num.className = 'space-opt-num';
    num.textContent = ['①','②','③','④'][i];
    const txt = document.createElement('span');
    txt.textContent = opt;
    row.appendChild(num);
    row.appendChild(txt);
    opts.appendChild(row);
  });

  const explainEl = document.getElementById('show-explain');
  if (state.revealed && q.explanation) {
    explainEl.textContent = '💡 ' + q.explanation;
    explainEl.classList.remove('hidden');
  } else {
    explainEl.classList.add('hidden');
  }
}

// ── Lightning flash effect ──
function fireLightning() {
  const el = document.getElementById('show-lightning');
  if (!el) return;
  el.classList.remove('fire');
  void el.offsetWidth;
  el.classList.add('fire');
  setTimeout(() => el.classList.remove('fire'), 650);
}

// ── Main render dispatch ──
function render(state) {
  if (!state) return;

  const waiting = document.getElementById('waiting-screen');
  const finish  = document.getElementById('finish-screen');

  // Finish
  if (state.status === 'finished') {
    waiting.style.display = 'none';
    finish.classList.add('show');
    buildPodium(state.teams || []);
    launchConfetti();
    stopTimer();
    return;
  }

  finish.classList.remove('show');

  // Show the right game
  const gameType = state.game || 'castle';
  showGame(gameType);
  document.body.className = 'display-body game-' + gameType;

  // Waiting (no question shown yet)
  if (state.currentIndex < 0 || state.status === 'waiting') {
    waiting.style.display = 'flex';
  } else {
    waiting.style.display = 'none';
  }

  // Detect question change to start timer
  const qChanged = prevState?.currentIndex !== state.currentIndex;
  const revealChanged = !prevState?.revealed && state.revealed;

  if (gameType === 'castle') renderCastle(state);
  if (gameType === 'space')  renderSpace(state);
  if (gameType === 'show') {
    renderShow(state);
    if (qChanged && state.currentIndex >= 0 && !state.revealed) {
      startTimer(state.timerSeconds || 15);
    }
    if (revealChanged) {
      pauseTimer();
      fireLightning();
    }
  }

  prevState = state;
}

// ── Init ──
function init() {
  // Start star animations
  initStarfield('castle-canvas', 200, 0.3);
  initStarfield('space-canvas', 280, 0.5);

  EQ_STATE.init(newState => render(newState));

  // Load current state immediately
  const current = EQ_STATE.get();
  if (current) render(current);
}

document.addEventListener('DOMContentLoaded', init);
