const $ = (id) => document.getElementById(id);
let currentState = null;
let previousBossHp = null;
let ticker = null;

function showScene(id) {
  document.querySelectorAll(".display-scene").forEach((scene) => scene.classList.toggle("active", scene.id === id));
}

function stats(state) {
  const present = (state.roster || []).filter((student) => student.present);
  const participated = present.filter((student) => Number(state.participation?.[student.id] || 0) > 0);
  return { present, participated, percentage: present.length ? Math.round((participated.length / present.length) * 100) : 0 };
}

function renderPath(state, stageIndex) {
  const path = $("display-path");
  path.replaceChildren();
  state.world.stages.forEach((stage, index) => {
    const node = document.createElement("div");
    node.className = `display-path-node${index < stageIndex ? " done" : index === stageIndex ? " current" : ""}`;
    const marker = document.createElement("span");
    marker.textContent = index < stageIndex ? "✓" : index === 3 ? state.world.bossEmoji : String(index + 1);
    const label = document.createElement("small");
    label.textContent = stage.name;
    node.append(marker, label);
    path.append(node);
  });
}

function renderBoss(state) {
  $("display-boss-emoji").textContent = state.boss.emoji;
  $("display-boss-name").textContent = state.boss.name;
  const hpPercent = state.boss.maxHp ? Math.max(0, (state.boss.hp / state.boss.maxHp) * 100) : 0;
  $("display-boss-bar").style.width = `${hpPercent}%`;
  $("display-boss-bar").classList.toggle("danger", hpPercent <= 30);
  $("display-boss-hp").textContent = state.boss.defeated ? "결계 파괴 완료!" : `${state.boss.hp} / ${state.boss.maxHp} HP`;
  if (previousBossHp !== null && state.boss.hp < previousBossHp) {
    const avatar = $("display-boss-emoji");
    avatar.classList.remove("hit");
    void avatar.offsetWidth;
    avatar.classList.add("hit");
  }
  previousBossHp = state.boss.hp;
}

function renderOptions(state, question) {
  const container = $("display-options");
  container.replaceChildren();
  const hintOff = question.type === "multiple"
    ? question.options.map((_, index) => index).filter((index) => index !== question.answer).slice(0, 2)
    : [];
  if (question.type === "multiple") {
    question.options.forEach((option, index) => {
      const row = document.createElement("div");
      row.className = "display-option";
      if (state.revealed) row.classList.add(index === question.answer ? "correct" : "dim");
      else if (state.hintActive && hintOff.includes(index)) row.classList.add("hint-off");
      const label = document.createElement("b");
      label.textContent = QuizKit.optionLabels[index];
      const text = document.createElement("span");
      text.textContent = option;
      row.append(label, text);
      container.append(row);
    });
  } else if (question.type === "ox") {
    [true, false].forEach((value) => {
      const row = document.createElement("div");
      row.className = "display-option";
      if (state.revealed) row.classList.add(value === question.answer ? "correct" : "dim");
      const label = document.createElement("b");
      label.textContent = value ? "O" : "X";
      const text = document.createElement("span");
      text.textContent = value ? "그렇다" : "아니다";
      row.append(label, text);
      container.append(row);
    });
  } else {
    const prompt = document.createElement("div");
    prompt.className = "display-talk";
    const icon = document.createElement("span");
    icon.textContent = "🗣️";
    const text = document.createElement("b");
    text.textContent = "짝과 먼저 작전을 세운 뒤 길드의 생각을 모아 발표하세요.";
    prompt.append(icon, text);
    container.append(prompt);
  }

  const explanation = $("display-explanation");
  explanation.classList.toggle("hidden", !state.revealed);
  if (state.revealed) {
    const answer = question.type === "multiple"
      ? `${QuizKit.optionLabels[question.answer]} ${question.options[question.answer]}`
      : question.type === "ox" ? (question.answer ? "O · 그렇다" : "X · 아니다") : question.answer;
    explanation.textContent = `${question.type === "talk" ? "미션 성공 조건" : "정답 룬"}: ${answer}${question.explanation ? ` · ${question.explanation}` : ""}`;
  }
}

function renderTeams(state) {
  const container = $("display-team-list");
  container.replaceChildren();
  state.teams.forEach((team) => {
    const row = document.createElement("div");
    row.className = "display-team";
    const copy = document.createElement("div");
    const dot = document.createElement("i");
    dot.style.backgroundColor = team.color;
    const labels = document.createElement("span");
    const name = document.createElement("b");
    name.textContent = team.name;
    const role = document.createElement("small");
    role.textContent = team.role;
    labels.append(name, role);
    copy.append(dot, labels);
    const score = document.createElement("strong");
    score.textContent = `★ ${team.stars} · ⚔ ${team.damage}`;
    row.append(copy, score);
    container.append(row);
  });
}

function updateTimer() {
  const element = $("display-timer");
  if (!currentState?.timerEndsAt) {
    element.textContent = currentState?.revealed ? "정답 확인" : "작전 중";
    element.classList.remove("urgent");
    return;
  }
  const remaining = Math.max(0, Math.ceil((currentState.timerEndsAt - Date.now()) / 1000));
  element.textContent = remaining > 0 ? `${remaining}초` : "작전 마무리";
  element.classList.toggle("urgent", remaining <= 10);
}

function renderQuestion(state) {
  showScene("display-question");
  const question = state.questions?.[state.currentIndex];
  if (!question) return;
  const stageIndex = QuizKit.stageIndex(state.currentIndex, state.questions.length);
  const stage = state.world.stages[stageIndex];
  $("display-class-name").textContent = state.className;
  $("display-meta").textContent = `${state.grade}학년 · ${state.subject} · ${state.topic}`;
  $("display-question-number").textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
  $("display-world-emblem").textContent = state.world.emblem;
  $("display-world-name").textContent = state.world.name;
  $("display-story").textContent = stage.story;
  $("display-stage-name").textContent = `제${stageIndex + 1}구역 · ${stage.name}`;
  $("display-enemy-emoji").textContent = stage.emoji;
  $("display-enemy-name").textContent = stage.enemy;
  $("display-kind").textContent = QuizKit.typeLabels[question.type] || "지식 임무";
  $("display-battle-message").textContent = state.battleMessage || "도전하면 결계가 약해져요";
  $("display-question-text").textContent = question.question;
  renderPath(state, stageIndex);
  renderBoss(state);
  renderOptions(state, question);
  renderTeams(state);

  const student = state.roster.find((item) => item.id === state.pickedStudentId);
  const picker = document.querySelector(".display-picker");
  picker.classList.toggle("highlight", Boolean(student));
  $("display-picked").textContent = student?.name || (state.courageBoost ? "첫 참여 모험가를 찾아요" : "잠시 후 만나요");
  $("display-picker-guide").textContent = student
    ? `${state.teams.find((team) => team.studentIds.includes(student.id))?.name || ""}${state.courageBoost ? " · 공격 +6" : ""}`
    : "생각할 시간을 충분히 줄게요.";

  const participation = stats(state);
  $("display-runes").textContent = `✦ ${state.classRunes}`;
  $("display-coverage-copy").textContent = `${participation.participated.length} / ${participation.present.length}명`;
  $("display-coverage-bar").style.width = `${participation.percentage}%`;
  updateTimer();
}

function buildLoot(state) {
  const participation = stats(state);
  const loot = [];
  if (state.boss.defeated) loot.push(["🏆", "결계 파괴자의 보물상자"]);
  if (participation.percentage === 100) loot.push(["🛡️", "모두의 용사 휘장"]);
  if (state.classRunes >= 2) loot.push(["✦", `협동 룬 ${state.classRunes}개`]);
  if (!loot.length) loot.push(["🗺️", "다음 원정의 지도 조각"]);
  return loot;
}

function renderSummary(state) {
  showScene("display-summary");
  const participation = stats(state);
  const damage = state.boss.maxHp - state.boss.hp;
  $("display-summary-emblem").textContent = state.boss.defeated ? "🏆" : "🗺️";
  $("display-summary-title").textContent = state.boss.defeated ? `${state.boss.name}의 결계를 깨뜨렸어요!` : "다음 원정을 위한 힘을 모았어요!";
  $("display-summary-message").textContent = state.boss.defeated
    ? "정답뿐 아니라 용기 내어 도전한 모든 순간이 승리를 만들었어요."
    : `결계가 ${state.boss.hp} HP 남았어요. 다음 원정에서 다시 도전해요!`;
  const loot = $("display-loot");
  loot.replaceChildren();
  buildLoot(state).forEach(([emoji, name]) => {
    const item = document.createElement("div");
    const icon = document.createElement("span");
    icon.textContent = emoji;
    const text = document.createElement("b");
    text.textContent = name;
    item.append(icon, text);
    loot.append(item);
  });
  const container = $("display-summary-stats");
  container.replaceChildren();
  [["첫 참여", `${participation.participated.length}/${participation.present.length}명`], ["보스 피해", `${damage}`], ["협동 룬", `${state.classRunes}개`]].forEach(([label, value]) => {
    const card = document.createElement("div");
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    card.append(small, strong);
    container.append(card);
  });
}

function render(state) {
  currentState = state;
  if (!state || state.version !== 3) return showScene("display-idle");
  if (state.phase === "summary") renderSummary(state);
  else renderQuestion(state);
}

document.addEventListener("DOMContentLoaded", () => {
  const initial = EQ_STATE.init(render);
  render(initial);
  ticker = setInterval(updateTimer, 250);
});

window.addEventListener("beforeunload", () => clearInterval(ticker));
