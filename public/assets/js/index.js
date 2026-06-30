/* ═══════════════════════════════════════════════════
   초등 교실 퀴즈 RPG — 선생님 컨트롤 페이지
════════════════════════════════════════════════════ */

// ── Local (teacher-side only) data ──
let localBanks = {};        // { unitIdx: { regular:[], boss:[] } }
let localFinalQs = [];
let localSel = { grade: null, sem: null, subject: null };
let localUnits = [];        // checked unit names
let teamNames = ['1팀', '2팀', '3팀'];

// ── Helpers ──
function $(id) { return document.getElementById(id); }

function showPhase(id) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
}

function toast(msg, dur = 2800) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), dur);
}

// ── State getters ──
function getState() { return EQ_STATE.get() || {}; }

function isInBattle() {
  const p = getState().phase;
  return p === 'battle' || p === 'boss_battle' || p === 'final_boss';
}

// ════════════════════════════════════
//   PHASE 1 — Curriculum setup
// ════════════════════════════════════
$('grade-grid').addEventListener('click', e => {
  const btn = e.target.closest('.grade-btn');
  if (!btn) return;
  localSel = { grade: btn.dataset.grade, sem: null, subject: null };
  localUnits = [];
  document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('sem-card').style.display = 'block';
  $('subject-card').style.display = 'none';
  $('unit-card').style.display = 'none';
  checkSetupDone();
});

document.querySelectorAll('.sem-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    localSel.sem = btn.dataset.sem;
    localSel.subject = null;
    localUnits = [];
    document.querySelectorAll('.sem-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    buildSubjects();
    $('subject-card').style.display = 'block';
    $('unit-card').style.display = 'none';
    checkSetupDone();
  });
});

function buildSubjects() {
  const subjects = Object.keys(CURRICULUM[localSel.grade]?.subjects || {});
  const wrap = $('subject-wrap');
  wrap.innerHTML = '';
  subjects.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'subject-chip';
    btn.textContent = sub;
    btn.addEventListener('click', () => {
      localSel.subject = sub;
      localUnits = [];
      document.querySelectorAll('.subject-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildUnitCheckboxes();
      $('unit-card').style.display = 'block';
      checkSetupDone();
    });
    wrap.appendChild(btn);
  });
}

function buildUnitCheckboxes() {
  const units = CURRICULUM[localSel.grade]?.subjects[localSel.subject]?.[localSel.sem] || [];
  const list = $('unit-check-list');
  list.innerHTML = '';
  units.forEach((unit, i) => {
    const item = document.createElement('div');
    item.className = 'unit-check-item';
    item.dataset.unit = unit;
    const box = document.createElement('div');
    box.className = 'unit-check-box';
    const label = document.createElement('span');
    label.className = 'unit-check-label';
    label.textContent = unit;
    item.appendChild(box);
    item.appendChild(label);
    item.addEventListener('click', () => toggleUnit(item, unit));
    list.appendChild(item);
  });
  localUnits = [];
  checkSetupDone();
}

function toggleUnit(item, unit) {
  if (item.classList.contains('checked')) {
    item.classList.remove('checked');
    item.querySelector('.unit-check-box').textContent = '';
    localUnits = localUnits.filter(u => u !== unit);
  } else {
    if (localUnits.length >= 5) { toast('최대 5개 단원까지 선택할 수 있어요'); return; }
    item.classList.add('checked');
    item.querySelector('.unit-check-box').textContent = '✓';
    localUnits.push(unit);
  }
  checkSetupDone();
}

$('btn-select-all').addEventListener('click', () => {
  const items = document.querySelectorAll('.unit-check-item');
  localUnits = [];
  items.forEach((item, i) => {
    if (i >= 5) { item.classList.remove('checked'); item.querySelector('.unit-check-box').textContent = ''; return; }
    item.classList.add('checked');
    item.querySelector('.unit-check-box').textContent = '✓';
    localUnits.push(item.dataset.unit);
  });
  if (items.length > 5) toast('최대 5개까지 선택되었습니다');
  checkSetupDone();
});

$('btn-deselect-all').addEventListener('click', () => {
  document.querySelectorAll('.unit-check-item').forEach(item => {
    item.classList.remove('checked');
    item.querySelector('.unit-check-box').textContent = '';
  });
  localUnits = [];
  checkSetupDone();
});

function checkSetupDone() {
  $('btn-to-team').disabled = !(localSel.grade && localSel.sem && localSel.subject && localUnits.length > 0);
}

$('btn-to-team').addEventListener('click', () => {
  buildTeamFields();
  buildSetupSummary();
  showPhase('phase-team');
});

function buildTeamFields() {
  const container = $('team-fields');
  container.innerHTML = '';
  teamNames = ['1팀', '2팀', '3팀'];
  teamNames.forEach((name, i) => {
    const field = document.createElement('div');
    field.className = 'team-field';
    const dot = document.createElement('div');
    dot.className = 'team-dot';
    dot.style.background = EQ_STATE.TEAM_COLORS[i];
    const inp = document.createElement('input');
    inp.className = 'team-input';
    inp.type = 'text'; inp.value = name; inp.maxLength = 12;
    inp.addEventListener('input', () => { teamNames[i] = inp.value.trim() || `${i+1}팀`; buildSetupSummary(); });
    field.appendChild(dot); field.appendChild(inp);
    container.appendChild(field);
  });
}

function buildSetupSummary() {
  const dungeons = localUnits.map((u, i) => `던전 ${i+1}: ${u}`).join('<br>');
  $('summary-text').innerHTML =
    `<b>${localSel.grade}학년 ${localSel.subject} (${localSel.sem}학기)</b><br>` +
    `${dungeons}<br>` +
    `최종 보스전: 전 단원 복습<br><br>` +
    `팀: ${teamNames.map((n,i) => `<span style="color:${EQ_STATE.TEAM_COLORS[i]};font-weight:700">${n}</span>`).join(' vs ')}`;
}

$('btn-back-setup').addEventListener('click', () => showPhase('phase-setup'));

// ════════════════════════════════════
//   PHASE 3 — Generate campaign
// ════════════════════════════════════
$('btn-start-generate').addEventListener('click', generateCampaign);

async function generateCampaign() {
  showPhase('phase-loading');
  $('loading-title').textContent = `${localSel.grade}학년 ${localSel.subject} 캠페인 생성 중…`;
  localBanks = {};
  localFinalQs = [];

  const jobs = [];
  localUnits.forEach((unit, i) => {
    jobs.push({ label: `${unit} 일반 문제`, type: 'regular', unitIdx: i, unit, mode: 'multiple', count: 4 });
    jobs.push({ label: `${unit} 보스 문제`, type: 'boss',    unitIdx: i, unit, mode: 'boss',     count: 1 });
  });
  jobs.push({ label: '최종 보스 복습 문제', type: 'final', mode: 'final', count: 6 });

  const total = jobs.length;
  let done = 0;

  function updateLoading(label) {
    $('loading-fill').style.width = Math.round((done / total) * 100) + '%';
    $('loading-status').textContent = `(${done}/${total}) ${label}`;
  }
  updateLoading('시작...');

  const failed = [];
  await Promise.all(jobs.map(async job => {
    try {
      const body = { grade: localSel.grade, subject: localSel.subject, mode: job.mode, count: job.count };
      if (job.type !== 'final') body.unit = job.unit;
      else body.units = localUnits;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);

      if (job.type === 'regular') {
        if (!localBanks[job.unitIdx]) localBanks[job.unitIdx] = {};
        localBanks[job.unitIdx].regular = data.questions;
      } else if (job.type === 'boss') {
        if (!localBanks[job.unitIdx]) localBanks[job.unitIdx] = {};
        localBanks[job.unitIdx].boss = data.questions;
      } else {
        localFinalQs = data.questions;
      }
    } catch (err) {
      failed.push(`${job.label}: ${err.message}`);
    } finally {
      done++;
      updateLoading(job.label);
    }
  }));

  if (failed.length > 0) {
    showPhase('phase-team');
    toast('일부 문제 생성에 실패했어요: ' + failed[0], 5000);
    return;
  }

  // Build initial state and enter control panel
  const teams = teamNames.map((n, i) => ({
    name: n,
    hp: RPG.TEAM_MAX_HP,
    maxHp: RPG.TEAM_MAX_HP,
    gold: 0,
    color: EQ_STATE.TEAM_COLORS[i],
    shieldActive: false,
  }));

  EQ_STATE.set({
    phase: 'world_map',
    grade: localSel.grade,
    subject: localSel.subject,
    semester: localSel.sem,
    selectedUnits: [...localUnits],
    completedUnitIndexes: [],
    currentUnitIndex: 0,
    teams,
    currentQuestions: [],
    currentQIndex: -1,
    isBoss: false,
    isFinalBoss: false,
    monster: null,
    revealed: false,
    totalCorrect: 0,
    unlockedSkills: [],
    activeSkill: null,
    lastAction: null,
    _ts: Date.now(),
  });

  buildControlPanel();
  showPhase('phase-ctrl');
}

// ════════════════════════════════════
//   PHASE 4 — Control panel
// ════════════════════════════════════
function buildControlPanel() {
  buildScoreList();
  buildSkillButtons();
  updateCampaignBar();
  updateUnitProgressBar();
  renderQPreview();
  updateCtrlVisibility();
}

function updateCampaignBar() {
  const s = getState();
  const phaseLabels = {
    world_map: '지도 보기', battle: '전투 중', boss_battle: '보스 전투',
    checkpoint: '체크포인트', final_boss: '최종 보스', victory: '캠페인 완료',
  };
  const icons = { world_map: '🗺️', battle: '⚔️', boss_battle: '🐉', checkpoint: '🏕️', final_boss: '😈', victory: '🏆' };
  $('ctrl-phase-icon').textContent = icons[s.phase] || '⚔️';
  $('ctrl-title').textContent = `${s.grade}학년 ${s.subject} 캠페인`;
  const unitLabel = s.isFinalBoss ? '최종 보스전' : (s.currentUnitIndex >= 0 ? `던전 ${s.currentUnitIndex+1}/${s.selectedUnits?.length || 1}: ${s.selectedUnits?.[s.currentUnitIndex] || ''}` : '');
  $('ctrl-sub').textContent = unitLabel;
  $('ctrl-phase-badge').textContent = phaseLabels[s.phase] || '대기';
}

function updateUnitProgressBar() {
  const s = getState();
  const row = $('unit-progress-row');
  row.innerHTML = '';
  (s.selectedUnits || []).forEach((u, i) => {
    const chip = document.createElement('div');
    chip.className = 'unit-chip';
    const done = (s.completedUnitIndexes || []).includes(i);
    const current = s.currentUnitIndex === i && s.phase !== 'world_map' && !s.isFinalBoss;
    chip.classList.add(done ? 'done' : current ? 'current' : 'locked');
    chip.textContent = (done ? '✅ ' : current ? '⚔️ ' : '🔒 ') + `던전 ${i+1}`;
    chip.title = u;
    row.appendChild(chip);
  });
  // Final boss chip
  const fb = document.createElement('div');
  fb.className = 'unit-chip final';
  fb.textContent = (s.isFinalBoss || s.phase === 'victory') ? '😈 최종 보스' : '🔒 최종 보스';
  row.appendChild(fb);
}

function buildScoreList() {
  const s = getState();
  const list = $('score-list');
  list.innerHTML = '';
  (s.teams || []).forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'score-team';
    row.id = `score-team-${i}`;
    row.innerHTML = `
      <div class="score-dot" style="background:${t.color}"></div>
      <div style="flex:1">
        <div class="score-name">${t.name}</div>
        <div class="score-hp">❤️ ${t.hp}/${t.maxHp}</div>
        <div class="score-gold">💰 ${t.gold}G</div>
      </div>
      <div class="score-adj">
        <button class="adj-btn" data-team="${i}" data-action="hp+">+HP</button>
        <button class="adj-btn" data-team="${i}" data-action="hp-">-HP</button>
      </div>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('.adj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.team);
      const action = btn.dataset.action;
      const s = getState();
      const teams = [...s.teams];
      if (action === 'hp+') teams[i] = { ...teams[i], hp: Math.min(teams[i].maxHp, teams[i].hp + 10) };
      if (action === 'hp-') teams[i] = { ...teams[i], hp: Math.max(0, teams[i].hp - 10) };
      EQ_STATE.update({ teams });
      updateScoreDisplay();
    });
  });
}

function updateScoreDisplay() {
  const s = getState();
  (s.teams || []).forEach((t, i) => {
    const row = $(`score-team-${i}`);
    if (!row) return;
    row.querySelector('.score-hp').textContent = `❤️ ${t.hp}/${t.maxHp}`;
    row.querySelector('.score-gold').textContent = `💰 ${t.gold}G`;
  });
}

function buildSkillButtons() {
  const s = getState();
  const container = $('skill-btns');
  container.innerHTML = '';
  Object.entries(RPG.SKILLS).forEach(([key, skill]) => {
    const unlocked = (s.unlockedSkills || []).includes(key);
    const isActive = s.activeSkill === key;
    const threshold = RPG.SKILL_THRESHOLDS[key];
    const btn = document.createElement('button');
    btn.className = 'skill-teacher-btn' + (unlocked ? ' unlocked' : '') + (isActive ? ' active-skill' : '');
    btn.disabled = !unlocked || isActive;
    btn.id = `skill-btn-${key}`;
    btn.innerHTML = `${skill.emoji} ${skill.name} <span style="margin-left:auto;font-size:.7rem">${isActive ? '⚡ 발동!' : (unlocked ? '사용 가능' : `${threshold}정답 후 해금`)}</span>`;
    btn.title = skill.desc;
    if (unlocked && !isActive) {
      btn.addEventListener('click', () => activateSkill(key));
    }
    container.appendChild(btn);
  });
}

function updateSkillButtons() {
  const s = getState();
  Object.entries(RPG.SKILLS).forEach(([key, skill]) => {
    const btn = $(`skill-btn-${key}`);
    if (!btn) return;
    const unlocked = (s.unlockedSkills || []).includes(key);
    const isActive = s.activeSkill === key;
    btn.className = 'skill-teacher-btn' + (unlocked ? ' unlocked' : '') + (isActive ? ' active-skill' : '');
    btn.disabled = !unlocked || isActive;
    btn.innerHTML = `${skill.emoji} ${skill.name} <span style="margin-left:auto;font-size:.7rem">${isActive ? '⚡ 발동!' : (unlocked ? '사용 가능' : `${RPG.SKILL_THRESHOLDS[key]}정답 후 해금`)}</span>`;
    btn.onclick = (unlocked && !isActive) ? () => activateSkill(key) : null;
  });
}

function activateSkill(key) {
  EQ_STATE.update({ activeSkill: key });
  updateSkillButtons();
  toast(`${RPG.SKILLS[key].emoji} ${RPG.SKILLS[key].name} 발동! — ${RPG.SKILLS[key].desc}`);
}

function updateCtrlVisibility() {
  const s = getState();
  const phase = s.phase || 'world_map';
  $('ctrl-idle').classList.toggle('hidden', phase !== 'world_map');
  $('ctrl-battle').classList.toggle('hidden', !isInBattle());
  $('ctrl-checkpoint').classList.toggle('hidden', phase !== 'checkpoint');
  $('ctrl-victory-prompt').classList.toggle('hidden', phase !== 'victory_pending');
  if (isInBattle()) buildCorrectTeamButtons();
}

function buildCorrectTeamButtons() {
  const s = getState();
  const row = $('correct-team-btns');
  // Remove old team buttons (keep the all-wrong btn)
  row.querySelectorAll('.team-correct-btn').forEach(b => b.remove());
  const allWrong = $('btn-all-wrong');
  (s.teams || []).forEach((t, i) => {
    const btn = document.createElement('button');
    btn.className = 'team-correct-btn';
    btn.style.borderColor = t.color;
    btn.style.color = t.color;
    btn.textContent = `✅ ${t.name}`;
    btn.dataset.teamIdx = i;
    btn.addEventListener('click', () => applyCorrect(i));
    row.insertBefore(btn, allWrong);
  });
}

// ── Campaign flow actions ──

$('btn-start-campaign').addEventListener('click', () => {
  enterDungeon(0);
});

function enterDungeon(unitIdx) {
  const s = getState();
  const units = s.selectedUnits || localUnits;
  const bank = localBanks[unitIdx];
  if (!bank || !bank.regular || bank.regular.length === 0) {
    toast('해당 던전 문제가 없습니다'); return;
  }
  const monster = RPG.getMonster(s.subject, unitIdx, false, false);
  EQ_STATE.update({
    phase: 'battle',
    currentUnitIndex: unitIdx,
    currentQuestions: bank.regular,
    currentQIndex: 0,
    isBoss: false,
    isFinalBoss: false,
    monster,
    revealed: false,
    lastAction: null,
  });
  renderQPreview();
  updateCtrlVisibility();
  updateCampaignBar();
  updateUnitProgressBar();
  $('ctrl-battle').classList.remove('hidden');
  $('btn-reveal').disabled = false;
  $('btn-next-q').disabled = true;
  $('correct-team-btns').classList.add('hidden');
}

function enterBoss(unitIdx) {
  const s = getState();
  const bank = localBanks[unitIdx];
  if (!bank || !bank.boss || bank.boss.length === 0) {
    enterCheckpoint(unitIdx); return;
  }
  const monster = RPG.getMonster(s.subject, unitIdx, true, false);
  EQ_STATE.update({
    phase: 'boss_battle',
    currentQuestions: bank.boss,
    currentQIndex: 0,
    isBoss: true,
    isFinalBoss: false,
    monster,
    revealed: false,
    lastAction: null,
  });
  renderQPreview();
  updateCampaignBar();
  $('btn-reveal').disabled = false;
  $('btn-next-q').disabled = true;
  $('correct-team-btns').classList.add('hidden');
  toast('🐉 보스 전투 시작!', 2000);
}

function enterCheckpoint(unitIdx) {
  const s = getState();
  const completed = [...(s.completedUnitIndexes || [])];
  if (!completed.includes(unitIdx)) completed.push(unitIdx);

  const teams = s.teams.map(t => ({
    ...t,
    hp: Math.min(t.maxHp, t.hp + RPG.CHECKPOINT_HEAL),
    shieldActive: false,
  }));

  EQ_STATE.update({
    phase: 'checkpoint',
    completedUnitIndexes: completed,
    teams,
    revealed: false,
    lastAction: null,
  });
  updateCampaignBar();
  updateUnitProgressBar();
  updateCtrlVisibility();
  updateScoreDisplay();
  buildScoreList();
}

$('btn-next-dungeon').addEventListener('click', () => {
  const s = getState();
  const nextIdx = s.currentUnitIndex + 1;
  const totalUnits = (s.selectedUnits || []).length;
  if (nextIdx >= totalUnits) {
    enterFinalBoss();
  } else {
    enterDungeon(nextIdx);
    $('ctrl-checkpoint').classList.add('hidden');
    $('ctrl-battle').classList.remove('hidden');
  }
});

function enterFinalBoss() {
  const s = getState();
  if (localFinalQs.length === 0) {
    toast('최종 보스 문제가 없습니다'); return;
  }
  const monster = RPG.getMonster(s.subject, 0, false, true);
  EQ_STATE.update({
    phase: 'final_boss',
    currentQuestions: localFinalQs,
    currentQIndex: 0,
    isBoss: false,
    isFinalBoss: true,
    monster,
    revealed: false,
    lastAction: null,
  });
  renderQPreview();
  updateCampaignBar();
  updateUnitProgressBar();
  updateCtrlVisibility();
  $('ctrl-battle').classList.remove('hidden');
  $('ctrl-checkpoint').classList.add('hidden');
  $('btn-reveal').disabled = false;
  $('btn-next-q').disabled = true;
  $('correct-team-btns').classList.add('hidden');
  toast('😈 최종 보스 등장! 전 단원 복습 시작!', 3000);
}

// ── Battle controls ──

$('btn-reveal').addEventListener('click', () => {
  EQ_STATE.update({ revealed: true });
  renderQPreview();
  $('btn-reveal').disabled = true;
  $('btn-next-q').disabled = false;
  $('correct-team-btns').classList.remove('hidden');
});

$('btn-next-q').addEventListener('click', advanceQuestion);

function advanceQuestion() {
  const s = getState();
  const nextIdx = s.currentQIndex + 1;
  const total = s.currentQuestions.length;

  if (nextIdx >= total) {
    // End of question set
    if (s.phase === 'battle') {
      enterBoss(s.currentUnitIndex);
    } else if (s.phase === 'boss_battle') {
      enterCheckpoint(s.currentUnitIndex);
      $('ctrl-battle').classList.add('hidden');
    } else if (s.phase === 'final_boss') {
      EQ_STATE.update({ phase: 'victory' });
      updateCampaignBar();
      updateCtrlVisibility();
      $('ctrl-battle').classList.add('hidden');
      $('ctrl-victory-prompt').classList.remove('hidden');
    }
    return;
  }

  EQ_STATE.update({ currentQIndex: nextIdx, revealed: false, lastAction: null });
  renderQPreview();
  $('btn-reveal').disabled = false;
  $('btn-next-q').disabled = true;
  $('correct-team-btns').classList.add('hidden');
}

function applyCorrect(teamIdx) {
  const s = getState();
  const { damage, gold } = RPG.calcReward(s.isBoss, s.isFinalBoss, s.activeSkill === 'double');

  const teams = s.teams.map((t, i) => i === teamIdx
    ? { ...t, gold: t.gold + gold }
    : t
  );

  const monster = { ...s.monster, hp: Math.max(0, s.monster.hp - damage) };
  const totalCorrect = (s.totalCorrect || 0) + 1;
  const unlockedSkills = checkSkillUnlocks(totalCorrect, s.unlockedSkills || []);
  const activeSkill = s.activeSkill === 'double' ? null : s.activeSkill;

  EQ_STATE.update({
    teams, monster, totalCorrect, unlockedSkills, activeSkill,
    lastAction: { type: 'correct', teamIdx, gold, monsterDamage: damage, ts: Date.now() },
  });

  updateScoreDisplay();
  updateSkillButtons();

  if (unlockedSkills.length > (s.unlockedSkills || []).length) {
    const newSkill = unlockedSkills.find(k => !(s.unlockedSkills || []).includes(k));
    if (newSkill) toast(`⭐ 스킬 해금: ${RPG.SKILLS[newSkill].emoji} ${RPG.SKILLS[newSkill].name}!`, 3000);
  }
}

$('btn-all-wrong').addEventListener('click', () => {
  const s = getState();
  const { damage, blocked } = RPG.calcPenalty(s.isBoss, s.isFinalBoss, s.activeSkill === 'shield');
  const teams = s.teams.map(t => ({ ...t, hp: Math.max(0, t.hp - damage), shieldActive: false }));
  const activeSkill = s.activeSkill === 'shield' ? null : s.activeSkill;
  EQ_STATE.update({
    teams, activeSkill,
    lastAction: { type: 'wrong', blocked, teamDamage: damage, ts: Date.now() },
  });
  updateScoreDisplay();
  if (blocked) toast('🛡️ 철벽 방어 발동! 피해 무효!', 2000);
  buildSkillButtons();
});

$('btn-show-victory').addEventListener('click', () => {
  EQ_STATE.update({ phase: 'victory_final' });
  $('ctrl-victory-prompt').classList.add('hidden');
  toast('🏆 결과 화면을 프로젝터에서 확인하세요!');
});

function checkSkillUnlocks(totalCorrect, current) {
  const unlocked = [...current];
  Object.entries(RPG.SKILL_THRESHOLDS).forEach(([key, threshold]) => {
    if (totalCorrect >= threshold && !unlocked.includes(key)) {
      unlocked.push(key);
    }
  });
  return unlocked;
}

// ── Question preview render ──
function renderQPreview() {
  const s = getState();
  const q = s.currentQuestions?.[s.currentQIndex];

  if (!q) {
    $('q-preview-num').textContent = s.phase === 'world_map' ? '지도 보기 중' : '준비 중';
    $('q-preview-text').textContent = s.phase === 'world_map'
      ? '▶ 캠페인 시작 버튼을 눌러 첫 번째 던전으로 이동하세요.'
      : '다음 단계를 진행하세요.';
    $('q-preview-opts').innerHTML = '';
    $('q-explain').classList.add('hidden');
    return;
  }

  const phaseLabel = s.isFinalBoss ? '최종 보스' : (s.isBoss ? '보스' : `던전 ${s.currentUnitIndex+1}`);
  $('q-preview-num').textContent = `[${phaseLabel}] 문제 ${s.currentQIndex+1} / ${s.currentQuestions.length}`;
  $('q-preview-text').textContent = q.question;
  $('q-explain').classList.toggle('hidden', !s.revealed);
  if (s.revealed) $('q-explain').textContent = '💡 ' + (q.explanation || '');

  const optsEl = $('q-preview-opts');
  optsEl.innerHTML = '';

  if (q.options) {
    q.options.forEach((opt, i) => {
      const row = document.createElement('div');
      row.className = 'q-preview-opt' + (s.revealed && i === q.answer ? ' correct' : '');
      const num = document.createElement('span');
      num.className = `opt-num c${i}`;
      num.textContent = ['①','②','③','④'][i];
      const txt = document.createElement('span');
      txt.textContent = opt;
      row.appendChild(num); row.appendChild(txt);
      optsEl.appendChild(row);
    });
  } else if (typeof q.answer === 'boolean') {
    const wrap = document.createElement('div');
    wrap.className = 'ox-preview';
    ['O','X'].forEach(ox => {
      const btn = document.createElement('div');
      btn.className = 'ox-big ' + ox;
      btn.textContent = ox;
      if (s.revealed) {
        const correctOX = q.answer ? 'O' : 'X';
        btn.classList.add(ox === correctOX ? 'correct' : 'dim');
      }
      wrap.appendChild(btn);
    });
    optsEl.appendChild(wrap);
  }
}

// ── Projector button ──
[$('btn-open-projector'), $('btn-open-projector-idle')].forEach(btn => {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const w = window.open('display.html', 'eq_display', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
    if (!w) toast('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.', 4000);
  });
});
