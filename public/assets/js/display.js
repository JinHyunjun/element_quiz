/* ═══════════════════════════════════════════════════
   초등 교실 퀴즈 RPG — 프로젝터 Display 로직
════════════════════════════════════════════════════ */

let prevState = null;

// ── Canvas starfield ──
(function initStarfield() {
  const canvas = document.getElementById('rpg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 260; i++) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.2,
      o: Math.random(),
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.o += (Math.random() - 0.5) * 0.03;
      s.o = Math.max(0.05, Math.min(1, s.o));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.o})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Scene management ──
const SCENES = ['idle', 'map', 'battle', 'checkpoint', 'victory'];

function showScene(name) {
  SCENES.forEach(id => {
    const el = document.getElementById('scene-' + id);
    if (el) el.classList.toggle('active', id === name);
  });
}

// ── Floating numbers ──
function spawnFloat(text, cls, x, y) {
  const layer = document.getElementById('floaters');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'float-num ' + cls;
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function spawnRandomFloat(text, cls) {
  const el = document.getElementById('battle-center');
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = 80 + Math.random() * (rect.width - 160);
  const y = 60 + Math.random() * 140;
  spawnFloat(text, cls, x, y);
}

// ── Scene: Idle ──
function renderIdle() { showScene('idle'); }

// ── Scene: World Map ──
function renderMap(state) {
  showScene('map');
  const units = state.selectedUnits || [];
  const title = document.getElementById('map-title');
  title.textContent = `🗺️ ${state.grade}학년 ${state.subject} 캠페인`;

  const path = document.getElementById('map-path');
  path.innerHTML = '';

  units.forEach((unit, i) => {
    const done    = (state.completedUnitIndexes || []).includes(i);
    const current = state.currentUnitIndex === i && state.phase !== 'world_map';

    const node = document.createElement('div');
    node.className = 'map-node';

    const icon = document.createElement('div');
    icon.className = 'map-node-icon ' + (done ? 'done' : current ? 'current' : 'locked');
    icon.textContent = done ? '✅' : current ? '⚔️' : `${i+1}`;

    const name = document.createElement('div');
    name.className = 'map-node-name';
    name.textContent = unit.replace(/^\d+\.\s*/, '').substring(0, 12);

    const status = document.createElement('div');
    status.className = 'map-node-status';
    status.textContent = done ? '클리어' : current ? '진행 중' : '잠김';

    node.appendChild(icon);
    node.appendChild(name);
    node.appendChild(status);
    path.appendChild(node);

    // Connector (not after last unit)
    if (i < units.length - 1) {
      const conn = document.createElement('div');
      conn.className = 'map-connector' + (done ? ' done-line' : '');
      path.appendChild(conn);
    }
  });

  // Final boss node
  const fbConn = document.createElement('div');
  fbConn.className = 'map-connector';
  path.appendChild(fbConn);

  const fbNode = document.createElement('div');
  fbNode.className = 'map-node';
  const fbIcon = document.createElement('div');
  fbIcon.className = 'map-node-icon final-node';
  fbIcon.textContent = '😈';
  const fbName = document.createElement('div');
  fbName.className = 'map-node-name';
  fbName.textContent = '최종 보스';
  const fbStatus = document.createElement('div');
  fbStatus.className = 'map-node-status';
  fbStatus.textContent = state.phase === 'final_boss' ? '전투 중' : '잠김';
  fbNode.appendChild(fbIcon);
  fbNode.appendChild(fbName);
  fbNode.appendChild(fbStatus);
  path.appendChild(fbNode);

  // Team chips
  renderMapTeams(state);
}

function renderMapTeams(state) {
  const el = document.getElementById('map-teams');
  el.innerHTML = '';
  (state.teams || []).forEach(t => {
    const chip = document.createElement('div');
    chip.className = 'map-team-chip';
    chip.innerHTML = `
      <div class="map-team-name" style="color:${t.color}">${t.name}</div>
      <div class="map-team-hp">❤️ ${t.hp}/${t.maxHp}</div>
      <div class="map-team-gold">💰 ${t.gold}G</div>
    `;
    el.appendChild(chip);
  });
}

// ── Scene: Battle ──
function renderBattle(state) {
  showScene('battle');

  // Phase tag
  const tag = document.getElementById('battle-phase-tag');
  const stageTag = document.getElementById('battle-stage-tag');
  if (state.isFinalBoss) {
    tag.textContent = '⚡ 최종 보스전';
    tag.style.color = '#C084FC';
    stageTag.textContent = '전 단원 복습전';
  } else if (state.isBoss) {
    tag.textContent = '🐉 보스 전투';
    tag.style.color = '#F87171';
    stageTag.textContent = `던전 ${state.currentUnitIndex+1} 보스`;
  } else {
    tag.textContent = '⚔️ 전투 중';
    tag.style.color = 'rgba(255,255,255,.4)';
    stageTag.textContent = `던전 ${state.currentUnitIndex+1} / ${(state.selectedUnits||[]).length}`;
  }

  // Sidebar unit name
  const unitName = document.getElementById('sidebar-unit-name');
  unitName.textContent = state.isFinalBoss ? '최종 보스' : (state.selectedUnits?.[state.currentUnitIndex] || '—');

  // Monster
  const monster = state.monster;
  if (monster) {
    document.getElementById('monster-emoji').textContent = monster.emoji || '🐉';
    const nameEl = document.getElementById('monster-name');
    nameEl.textContent = monster.name || '?';
    nameEl.style.color = monster.color || '#F87171';
    const hpPct = monster.maxHp > 0 ? Math.round((monster.hp / monster.maxHp) * 100) : 0;
    document.getElementById('monster-hp-fill').style.width = hpPct + '%';
    document.getElementById('monster-hp-text').textContent = `${monster.hp} / ${monster.maxHp}`;
  }

  // Team panels
  renderBattleTeams(state);

  // Question
  renderQuestion(state);

  // Skills
  renderDisplaySkills(state);

  // Animations for last action
  if (state.lastAction && state.lastAction.ts !== prevState?.lastAction?.ts) {
    animateAction(state.lastAction);
  }
}

function renderBattleTeams(state) {
  const container = document.getElementById('battle-teams');
  const tagEl = container.querySelector('.battle-phase-tag');

  // Remove old team cards
  container.querySelectorAll('.team-card').forEach(e => e.remove());

  (state.teams || []).forEach(t => {
    const card = document.createElement('div');
    card.className = 'team-card';
    card.style.borderColor = t.color;
    card.style.color = t.color;

    const hpPct = t.maxHp > 0 ? (t.hp / t.maxHp) * 100 : 0;
    const hpClass = hpPct <= 30 ? 'low' : hpPct <= 60 ? 'mid' : '';

    card.innerHTML = `
      <div class="team-card-name">${t.name}</div>
      <div class="team-hp-label">HP</div>
      <div class="team-hp-bar-wrap">
        <div class="team-hp-fill ${hpClass}" style="width:${hpPct}%"></div>
      </div>
      <div class="team-hp-nums">${t.hp} / ${t.maxHp}</div>
      <div class="team-gold">💰 ${t.gold}G</div>
      ${t.shieldActive ? '<div class="team-shield-active">🛡️ 방어 중</div>' : ''}
    `;
    container.appendChild(card);
  });
}

function renderQuestion(state) {
  const q = state.currentQuestions?.[state.currentQIndex];

  if (!q) {
    document.getElementById('rpg-q-num').textContent  = '—';
    document.getElementById('rpg-q-text').textContent = '선생님이 문제를 표시합니다…';
    document.getElementById('rpg-opts').innerHTML     = '';
    document.getElementById('rpg-explain').classList.add('hidden');
    return;
  }

  const label = state.isFinalBoss ? '최종 보스' : (state.isBoss ? '보스' : `던전 ${state.currentUnitIndex+1}`);
  document.getElementById('rpg-q-num').textContent  = `[${label}] 문제 ${state.currentQIndex+1} / ${state.currentQuestions.length}`;
  document.getElementById('rpg-q-text').textContent = q.question;

  const optsEl = document.getElementById('rpg-opts');
  optsEl.innerHTML = '';

  if (q.options) {
    q.options.forEach((opt, i) => {
      const row = document.createElement('div');
      row.className = 'rpg-opt';

      // Hint skill: mark eliminated options
      if (state.activeSkill === 'hint' && i !== q.answer && !state.revealed) {
        const wrongOpts = q.options
          .map((_, idx) => idx)
          .filter(idx => idx !== q.answer);
        // Eliminate the first wrong one
        if (i === wrongOpts[0]) { row.classList.add('hint-off'); }
      }

      if (state.revealed) {
        row.classList.add(i === q.answer ? 'correct' : 'wrong');
      }
      const num = document.createElement('div');
      num.className = 'rpg-opt-num';
      num.textContent = ['①','②','③','④'][i];
      const txt = document.createElement('span');
      txt.textContent = opt;
      row.appendChild(num); row.appendChild(txt);
      optsEl.appendChild(row);
    });
  } else if (typeof q.answer === 'boolean') {
    const wrap = document.createElement('div');
    wrap.className = 'rpg-ox-wrap';
    ['O','X'].forEach(ox => {
      const btn = document.createElement('div');
      btn.className = 'rpg-ox-btn ' + ox;
      btn.textContent = ox;
      if (state.revealed) {
        const correct = q.answer ? 'O' : 'X';
        btn.classList.add(ox === correct ? 'correct' : 'dim');
      }
      wrap.appendChild(btn);
    });
    optsEl.appendChild(wrap);
  }

  const explainEl = document.getElementById('rpg-explain');
  if (state.revealed && q.explanation) {
    explainEl.textContent = '💡 ' + q.explanation;
    explainEl.classList.remove('hidden');
  } else {
    explainEl.classList.add('hidden');
  }
}

function renderDisplaySkills(state) {
  const el = document.getElementById('display-skills');
  el.innerHTML = '';
  Object.entries(RPG.SKILLS).forEach(([key, skill]) => {
    const unlocked = (state.unlockedSkills || []).includes(key);
    const isActive = state.activeSkill === key;
    const chip = document.createElement('div');
    chip.className = 'skill-chip ' + (isActive ? 'active' : (unlocked ? 'ready' : 'locked'));
    chip.innerHTML = `${skill.emoji} <span style="font-size:.72rem">${skill.name}</span>`;
    el.appendChild(chip);
  });
}

function animateAction(action) {
  if (!action) return;
  if (action.type === 'correct') {
    spawnRandomFloat(`+${action.gold}G`, 'float-gold');
    spawnRandomFloat(`-${action.monsterDamage}`, 'float-damage');
    // Monster hit shake
    const emoji = document.getElementById('monster-emoji');
    if (emoji) { emoji.classList.remove('hit'); void emoji.offsetWidth; emoji.classList.add('hit'); }
  } else if (action.type === 'wrong') {
    if (action.blocked) {
      spawnRandomFloat('🛡️ BLOCK!', 'float-shield');
    } else {
      spawnRandomFloat(`-${action.teamDamage} HP`, 'float-damage');
    }
  }
}

// ── Scene: Checkpoint ──
function renderCheckpoint(state) {
  showScene('checkpoint');
  const unitName = state.selectedUnits?.[state.currentUnitIndex] || '';
  document.getElementById('ckpt-title').textContent = `🏕️ 체크포인트 — 던전 ${state.currentUnitIndex+1} 클리어!`;
  document.getElementById('ckpt-unit').textContent  = unitName;

  const teamsEl = document.getElementById('ckpt-teams');
  teamsEl.innerHTML = '';
  (state.teams || []).forEach(t => {
    const card = document.createElement('div');
    card.className = 'checkpoint-team';
    card.style.borderColor = t.color;
    card.innerHTML = `
      <div class="ckpt-name" style="color:${t.color}">${t.name}</div>
      <div class="ckpt-hp">❤️ HP ${t.hp} / ${t.maxHp}</div>
      <div class="ckpt-gold">💰 ${t.gold}G</div>
      <div class="ckpt-heal-badge">+${RPG.CHECKPOINT_HEAL} HP 회복!</div>
    `;
    teamsEl.appendChild(card);
  });
}

// ── Scene: Victory ──
function renderVictory(state) {
  showScene('victory');
  const row = document.getElementById('podium-row');
  row.innerHTML = '';

  const sorted = [...(state.teams || [])].sort((a, b) => b.gold - a.gold);
  const medals = ['🥇','🥈','🥉'];
  const heights = [120, 90, 65];
  const order   = sorted.length >= 3 ? [1, 0, 2] : sorted.map((_, i) => i);

  order.forEach(rank => {
    const t = sorted[rank];
    if (!t) return;
    const item = document.createElement('div');
    item.className = 'podium-item';
    item.style.animation = `fadeSlide .6s ease ${rank*.18}s both`;
    item.innerHTML = `
      <div class="podium-medal">${medals[rank] || '🏅'}</div>
      <div class="podium-name">${t.name}</div>
      <div class="podium-score">${t.gold}G</div>
      <div class="podium-hp">❤️ ${t.hp}HP 남음</div>
      <div class="podium-block" style="height:${heights[rank]||50}px;background:${t.color}33;border:2px solid ${t.color}"></div>
    `;
    row.appendChild(item);
  });

  launchConfetti();
}

function launchConfetti() {
  const colors = ['#FFD700','#EF4444','#3B82F6','#10B981','#F59E0B','#8B5CF6','#F472B6'];
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const dot = document.createElement('div');
      dot.className = 'confetti-dot';
      dot.style.left = Math.random() * 100 + 'vw';
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      dot.style.animationDuration = (2.5 + Math.random() * 2) + 's';
      dot.style.animationDelay = Math.random() * 1.5 + 's';
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 5000);
    }, i * 30);
  }
}

// ── Main render ──
function render(state) {
  if (!state) { renderIdle(); return; }

  const phase = state.phase;

  if (!phase || phase === 'idle') { renderIdle(); return; }
  if (phase === 'world_map')      { renderMap(state); }
  else if (phase === 'battle' || phase === 'boss_battle' || phase === 'final_boss') {
    renderBattle(state);
  }
  else if (phase === 'checkpoint') { renderCheckpoint(state); }
  else if (phase === 'victory' || phase === 'victory_final') { renderVictory(state); }

  prevState = state;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  EQ_STATE.init(newState => render(newState));
  const cur = EQ_STATE.get();
  if (cur) render(cur);
  else renderIdle();
});
