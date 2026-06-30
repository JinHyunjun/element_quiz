const API = "";  // same origin

// ── State ──
let sel = { grade: null, semester: null, subject: null, unit: null, mode: null };
let curriculum = {};
let sessionId = null;
let gameState = null;
let pollTimer = null;

const TEAM_COLORS = ["#EF4444", "#3B82F6", "#F59E0B", "#10B981"];

// ── Init ──
(async () => {
  const res = await fetch(`${API}/api/curriculum`);
  curriculum = await res.json();
})();

// ── STEP 1: 학년 ──
document.getElementById("grade-grid").addEventListener("click", e => {
  const btn = e.target.closest(".grade-btn");
  if (!btn) return;
  sel.grade = btn.dataset.grade;
  sel.semester = null; sel.subject = null; sel.unit = null;
  document.querySelectorAll(".grade-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  show("step-semester");
  hide("step-subject"); hide("step-unit"); hide("step-game-config");
  document.querySelectorAll(".sem-btn").forEach(b => b.classList.remove("active"));
});

// ── STEP 2: 학기 ──
document.querySelectorAll(".sem-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    sel.semester = btn.dataset.sem;
    sel.subject = null; sel.unit = null;
    document.querySelectorAll(".sem-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderSubjects();
    hide("step-unit"); hide("step-game-config");
  });
});

async function renderSubjects() {
  const res = await fetch(`${API}/api/curriculum/${sel.grade}`);
  const data = await res.json();
  const grid = document.getElementById("subject-grid");
  grid.innerHTML = "";
  data.subjects.forEach(s => {
    const chip = document.createElement("button");
    chip.className = "subject-chip";
    chip.textContent = s;
    chip.addEventListener("click", () => {
      sel.subject = s; sel.unit = null;
      document.querySelectorAll(".subject-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderUnits();
      hide("step-game-config");
    });
    grid.appendChild(chip);
  });
  show("step-subject");
}

async function renderUnits() {
  const res = await fetch(`${API}/api/curriculum/${sel.grade}/${encodeURIComponent(sel.subject)}`);
  const data = await res.json();
  const units = data.semesters[sel.semester] || [];
  const list = document.getElementById("unit-list");
  list.innerHTML = "";
  if (units.length === 0) {
    list.innerHTML = `<p style="color:var(--muted);font-size:0.9rem">해당 학기의 단원 정보가 없습니다.</p>`;
  } else {
    units.forEach(u => {
      const btn = document.createElement("button");
      btn.className = "unit-item";
      btn.textContent = u;
      btn.addEventListener("click", () => {
        sel.unit = u;
        document.querySelectorAll(".unit-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        show("step-game-config");
      });
      list.appendChild(btn);
    });
  }
  show("step-unit");
}

// ── STEP 5: 게임 모드 ──
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    sel.mode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ── 문제 생성 ──
document.getElementById("btn-generate").addEventListener("click", async () => {
  if (!sel.grade || !sel.semester || !sel.subject || !sel.unit) {
    toast("학년, 학기, 과목, 단원을 모두 선택해주세요"); return;
  }
  if (!sel.mode) { toast("게임 유형을 선택해주세요"); return; }

  const count = parseInt(document.getElementById("q-count").value) || 5;
  const teams = [0,1,2,3].map(i => ({
    name: document.getElementById(`team${i}`).value.trim() || `모둠 ${i+1}`,
    score: 0
  }));

  document.getElementById("loading-subject").textContent = `${sel.grade}학년 ${sel.subject} [${sel.unit}]`;
  show("step-loading");
  hide("step-game-config");

  try {
    const res = await fetch(`${API}/api/quiz/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: sel.grade, subject: sel.subject, unit: sel.unit, mode: sel.mode, count })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "생성 실패");

    // 세션 생성
    const sRes = await fetch(`${API}/api/game/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: sel.mode,
        questions: data.questions,
        teams,
        grade: sel.grade,
        subject: sel.subject,
        unit: sel.unit
      })
    });
    const session = await sRes.json();
    sessionId = session.id;
    gameState = session;

    hide("step-loading");
    switchToGame();
  } catch (err) {
    hide("step-loading");
    show("step-game-config");
    toast("오류: " + err.message);
  }
});

// ── Switch to Game ──
function switchToGame() {
  document.getElementById("phase-setup").classList.remove("active");
  document.getElementById("phase-game").classList.add("active");

  document.getElementById("game-meta").innerHTML =
    `<strong>${sel.grade}학년</strong> ${sel.semester}학기 · <strong>${sel.subject}</strong> · ${sel.unit}`;

  renderScorePanel();
  updateQuestionCard();

  // Start polling
  pollTimer = setInterval(pollState, 1000);
}

function resetToSetup() {
  clearInterval(pollTimer);
  sessionId = null; gameState = null;
  document.getElementById("phase-game").classList.remove("active");
  document.getElementById("phase-setup").classList.add("active");
}

// ── Game controls ──
async function startGame() {
  if (!sessionId) return;
  const res = await fetch(`${API}/api/game/session/${sessionId}/start`, { method: "PUT" });
  gameState = await res.json();
  document.getElementById("btn-start").style.display = "none";
  document.getElementById("btn-reveal").style.display = "";
  document.getElementById("btn-prev").style.display = "";
  updateQuestionCard();
}

async function revealAnswer() {
  if (!sessionId) return;
  const res = await fetch(`${API}/api/game/session/${sessionId}/reveal`, { method: "PUT" });
  gameState = await res.json();
  document.getElementById("btn-reveal").style.display = "none";
  document.getElementById("btn-next").style.display = "";
  updateQuestionCard();
}

async function nextQ() {
  if (!sessionId) return;
  const res = await fetch(`${API}/api/game/session/${sessionId}/next`, { method: "PUT" });
  gameState = await res.json();
  document.getElementById("btn-reveal").style.display = gameState.status !== "finished" ? "" : "none";
  document.getElementById("btn-next").style.display = "none";
  updateQuestionCard();
}

async function prevQ() {
  if (!sessionId) return;
  const res = await fetch(`${API}/api/game/session/${sessionId}/prev`, { method: "PUT" });
  gameState = await res.json();
  document.getElementById("btn-reveal").style.display = "";
  document.getElementById("btn-next").style.display = "none";
  updateQuestionCard();
}

async function changeScore(teamIdx, delta) {
  const res = await fetch(`${API}/api/game/session/${sessionId}/score`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_index: teamIdx, delta })
  });
  gameState = await res.json();
  renderScorePanel();
}

// ── Poll ──
async function pollState() {
  if (!sessionId) return;
  try {
    const res = await fetch(`${API}/api/game/session/${sessionId}`);
    gameState = await res.json();
    renderScorePanel();
  } catch {}
}

// ── Render ──
function updateQuestionCard() {
  if (!gameState) return;
  const { questions, current_index, revealed, status, mode } = gameState;
  const total = questions.length;
  const pill = document.getElementById("progress-pill");
  pill.textContent = `${current_index + 1} / ${total}`;

  const card = document.getElementById("question-card");

  if (status === "waiting") {
    card.innerHTML = `<div class="q-meta">게임 준비 완료</div><div class="q-text" style="color:var(--muted)">▶ 게임 시작 버튼을 누르면 첫 문제가 나타납니다.</div>`;
    return;
  }

  if (status === "finished") {
    const winner = [...gameState.teams].sort((a,b) => b.score - a.score)[0];
    card.innerHTML = `
      <div class="q-meta">🎉 게임 종료</div>
      <div class="q-text" style="text-align:center;font-size:1.6rem">🏆 ${winner.name} 우승!</div>
      <div style="text-align:center;color:var(--muted);font-size:0.9rem">${total}문제 완료</div>`;
    clearInterval(pollTimer);
    return;
  }

  const q = questions[current_index];
  let html = `<div class="q-number">문제 ${current_index + 1}</div>`;
  html += `<div class="q-text">${q.question}</div>`;

  if (mode === "ox") {
    const revealO = revealed && q.answer === true;
    const revealX = revealed && q.answer === false;
    html += `<div class="ox-display">
      <div class="ox-badge O ${revealO ? "correct-reveal" : ""}">O</div>
      <div class="ox-badge X ${revealX ? "correct-reveal" : ""}">X</div>
    </div>`;
  } else {
    html += `<div class="q-options">`;
    const labels = ["①", "②", "③", "④"];
    const colors = ["c0","c1","c2","c3"];
    (q.options || []).forEach((opt, i) => {
      const isCorrect = revealed && i === q.answer;
      html += `<div class="q-option ${isCorrect ? "correct" : ""}">
        <span class="opt-label ${colors[i]}">${labels[i]}</span>
        <span>${opt}</span>
        ${isCorrect ? '<span style="margin-left:auto;font-size:1.2rem">✅</span>' : ""}
      </div>`;
    });
    html += `</div>`;
  }

  if (revealed && q.explanation) {
    html += `<div class="explanation-box"><strong>💬 해설</strong>${q.explanation}</div>`;
  }

  card.innerHTML = html;
}

function renderScorePanel() {
  if (!gameState) return;
  const list = document.getElementById("score-list");
  list.innerHTML = "";
  gameState.teams.forEach((team, i) => {
    const row = document.createElement("div");
    row.className = "team-score-row";
    row.innerHTML = `
      <span class="team-dot" style="background:${TEAM_COLORS[i]}"></span>
      <span class="team-score-name">${team.name}</span>
      <div class="score-btns">
        <button class="score-btn" onclick="changeScore(${i},-1)">−</button>
        <button class="score-btn" onclick="changeScore(${i},1)">+</button>
      </div>
      <span class="team-score-val">${team.score}</span>`;
    list.appendChild(row);
  });
}

function openProjector() {
  if (!sessionId) { toast("먼저 게임을 시작하세요"); return; }
  window.open(`/display.html?session=${sessionId}`, "_blank",
    "width=1280,height=720,menubar=no,toolbar=no");
}

// ── Helpers ──
function show(id) { const el = document.getElementById(id); if (el) el.style.display = ""; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = "none"; }

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}
