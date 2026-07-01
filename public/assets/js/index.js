const $ = (id) => document.getElementById(id);
const views = ["view-prep", "view-live", "view-summary"];
let roster = [];
let timerTicker = null;

function showView(id) {
  const changed = !$(id).classList.contains("active");
  views.forEach((viewId) => $(viewId).classList.toggle("active", viewId === id));
  $("header-projector").classList.toggle("hidden", id === "view-prep");
  if (changed) window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message, duration = 2800) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => element.classList.remove("show"), duration);
}

function storyToast(message, duration = 3200) {
  const element = $("story-toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(storyToast.timeout);
  storyToast.timeout = setTimeout(() => element.classList.remove("show"), duration);
}

function showBattleFloat(text, className = "damage") {
  const layer = $("battle-floaters");
  if (!layer) return;
  const floater = document.createElement("span");
  floater.className = `battle-float ${className}`;
  floater.textContent = text;
  floater.style.left = `${30 + Math.random() * 40}%`;
  layer.append(floater);
  setTimeout(() => floater.remove(), 1500);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `student-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function selectedTopic() {
  return $("topic-select").value === CUSTOM_TOPIC ? $("custom-topic").value.trim() : $("topic-select").value;
}

function fillSelect(select, values, placeholder) {
  select.replaceChildren();
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.append(first);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.disabled = values.length === 0;
}

function updateAdventurePreview() {
  const world = QuizKit.getWorld($("subject-select").value);
  $("adventure-art").textContent = world.emblem;
  $("adventure-name").textContent = world.name;
  $("adventure-intro").textContent = world.intro;
  $("adventure-boss").textContent = world.boss;
}

function loadRosterFromText() {
  const names = $("roster-input").value
    .split(/\r?\n|,|;/)
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 40);
  const uniqueNames = [...new Set(names)];
  if (!uniqueNames.length) return toast("학생 이름을 한 줄에 한 명씩 입력해 주세요.");
  const previous = new Map(roster.map((student) => [student.name, student]));
  roster = uniqueNames.map((name) => previous.get(name) || { id: makeId(), name: name.slice(0, 20), present: true });
  renderAttendance();
}

function renderAttendance() {
  $("roster-empty").classList.toggle("hidden", roster.length > 0);
  $("attendance-area").classList.toggle("hidden", roster.length === 0);
  const list = $("attendance-list");
  list.replaceChildren();
  roster.forEach((student) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `attendance-person${student.present ? " present" : ""}`;
    button.textContent = student.name;
    button.setAttribute("aria-pressed", String(student.present));
    button.title = student.present ? "원정 참가 · 누르면 결석 처리" : "결석 · 누르면 원정 참가";
    button.addEventListener("click", () => { student.present = !student.present; renderAttendance(); });
    list.append(button);
  });
  $("present-count").textContent = `${roster.filter((student) => student.present).length}명`;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    globalThis.crypto?.getRandomValues?.(random);
    const next = globalThis.crypto?.getRandomValues ? random[0] % (index + 1) : Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

function buildTeams(students, requestedCount) {
  const count = Math.max(2, Math.min(Number(requestedCount), 4, students.length));
  const teams = Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: QuizKit.teamNames[index],
    role: QuizKit.teamRoles[index],
    color: EQ_STATE.TEAM_COLORS[index],
    studentIds: [],
    stars: 0,
    damage: 0
  }));
  shuffle(students).forEach((student, index) => teams[index % count].studentIds.push(student.id));
  return teams;
}

function normalizeQuestions(questions, limit) {
  if (!Array.isArray(questions)) return [];
  return questions.slice(0, limit).map((item) => {
    const type = ["multiple", "ox", "talk"].includes(item?.type) ? item.type : "multiple";
    const question = String(item?.question || "").trim().slice(0, 240);
    const explanation = String(item?.explanation || "").trim().slice(0, 300);
    if (!question) return null;
    if (type === "multiple") {
      const options = Array.isArray(item.options) ? item.options.slice(0, 4).map((value) => String(value).trim().slice(0, 100)) : [];
      const answer = Number(item.answer);
      if (options.length !== 4 || options.some((option) => !option) || !Number.isInteger(answer) || answer < 0 || answer > 3) return null;
      return { type, question, options, answer, explanation };
    }
    if (type === "ox") return { type, question, answer: Boolean(item.answer), explanation };
    return { type, question, answer: String(item.answer || "함께 설명하면 성공!").slice(0, 180), explanation };
  }).filter(Boolean);
}

async function requestQuestions(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "문제를 만들지 못했어요.");
    return normalizeQuestions(data.questions, payload.count);
  } finally {
    clearTimeout(timeout);
  }
}

async function createSession() {
  const grade = $("grade-select").value;
  const subject = $("subject-select").value;
  const topic = selectedTopic();
  const presentStudents = roster.filter((student) => student.present);
  const count = Number($("question-count").value);
  if (!grade || !subject || !topic) return toast("학년, 교과, 수업 주제를 모두 선택해 주세요.");
  if (presentStudents.length < 2) return toast("원정 참가 학생을 두 명 이상 등록해 주세요.");

  const button = $("generate-button");
  const status = $("generation-status");
  button.disabled = true;
  button.querySelector("span").textContent = "던전 생성 중…";
  status.textContent = "지식 문제를 만들고 몬스터와 보상을 던전에 배치하고 있어요.";
  status.classList.remove("hidden");

  let questions = [];
  let source = "ai";
  try {
    questions = await requestQuestions({ grade: Number(grade), subject, topic, count });
    if (questions.length < Math.min(3, count)) throw new Error("사용할 수 있는 임무가 부족해요.");
  } catch (error) {
    console.warn("AI 문항 대신 참여 미션을 사용합니다.", error);
    questions = QuizKit.fallbackQuestions({ topic, count });
    source = "participation";
  }

  const teams = buildTeams(presentStudents, $("team-count").value);
  const world = QuizKit.getWorld(subject);
  const maxHp = QuizKit.bossMaxHp(questions.length, teams.length);
  const participation = Object.fromEntries(roster.map((student) => [student.id, 0]));
  EQ_STATE.set({
    version: 3,
    phase: "live",
    createdAt: Date.now(),
    source,
    className: $("class-name").value.trim().slice(0, 40) || "우리 반 별빛 원정대",
    grade: Number(grade), subject, topic,
    roster: roster.map((student) => ({ ...student })),
    teams, questions,
    world: JSON.parse(JSON.stringify(world)),
    boss: { name: world.boss, emoji: world.bossEmoji, hp: maxHp, maxHp, defeated: false },
    currentIndex: 0,
    revealed: false,
    participation,
    pickedStudentId: null,
    pickedCredited: false,
    lastPickedId: null,
    awards: {},
    cooperationBonus: false,
    classRunes: 0,
    unlockedRewards: [],
    usedRewards: [],
    hintActive: false,
    courageBoost: false,
    battleMessage: "도전하면 보스의 결계가 약해져요",
    timerEndsAt: null
  });
  button.disabled = false;
  button.querySelector("span").textContent = "원정 시작하기";
  status.classList.add("hidden");
  storyToast(`${world.name}의 첫 번째 관문이 열렸습니다!`, 4200);
  if (source !== "ai") toast("AI 연결 없이 참여 미션 던전으로 시작합니다.", 3800);
}

function findStudent(state, id) { return state.roster?.find((student) => student.id === id); }
function teamForStudent(state, id) { return state.teams?.find((team) => team.studentIds.includes(id)); }
function participationStats(state) {
  const present = (state.roster || []).filter((student) => student.present);
  const participated = present.filter((student) => Number(state.participation?.[student.id] || 0) > 0);
  return { present, participated, percentage: present.length ? Math.round((participated.length / present.length) * 100) : 0 };
}
function totalStars(state) { return state.teams.reduce((sum, team) => sum + team.stars, 0); }

function renderDungeon(state) {
  const stageIndex = QuizKit.stageIndex(state.currentIndex, state.questions.length);
  const stage = state.world.stages[stageIndex];
  $("world-emblem").textContent = state.world.emblem;
  $("world-name").textContent = state.world.name;
  $("story-beat").textContent = stage.story;
  $("boss-name").textContent = state.boss.name;
  const hpPercent = state.boss.maxHp ? Math.max(0, (state.boss.hp / state.boss.maxHp) * 100) : 0;
  $("boss-hp-bar").style.width = `${hpPercent}%`;
  $("boss-hp-bar").classList.toggle("danger", hpPercent <= 30);
  $("boss-hp-text").textContent = state.boss.defeated ? "결계 파괴 완료!" : `${state.boss.hp} / ${state.boss.maxHp} HP`;
  $("encounter-emoji").textContent = stage.emoji;
  $("encounter-stage").textContent = `제${stageIndex + 1}구역 · ${stage.name}`;
  $("encounter-name").textContent = stage.enemy;
  $("battle-message").textContent = state.battleMessage || stage.story;

  const path = $("dungeon-path");
  path.replaceChildren();
  state.world.stages.forEach((item, index) => {
    const node = document.createElement("div");
    node.className = `path-node${index < stageIndex ? " done" : index === stageIndex ? " current" : ""}`;
    const marker = document.createElement("span");
    marker.textContent = index < stageIndex ? "✓" : index === 3 ? state.world.bossEmoji : String(index + 1);
    const label = document.createElement("small");
    label.textContent = item.name;
    node.append(marker, label);
    path.append(node);
  });
}

function renderQuestion(state) {
  const question = state.questions[state.currentIndex];
  $("question-kind").textContent = QuizKit.typeLabels[question.type] || "지식 임무";
  $("question-number").textContent = `임무 ${state.currentIndex + 1} / ${state.questions.length}`;
  $("question-text").textContent = question.question;
  const options = $("answer-options");
  options.replaceChildren();
  const hintOff = question.type === "multiple"
    ? question.options.map((_, index) => index).filter((index) => index !== question.answer).slice(0, 2)
    : [];

  if (question.type === "multiple") {
    question.options.forEach((option, index) => {
      const row = document.createElement("div");
      row.className = "answer-option";
      if (state.revealed) row.classList.add(index === question.answer ? "correct" : "dim");
      else if (state.hintActive && hintOff.includes(index)) row.classList.add("hint-off");
      const label = document.createElement("b");
      label.textContent = QuizKit.optionLabels[index];
      const text = document.createElement("span");
      text.textContent = option;
      row.append(label, text);
      options.append(row);
    });
  } else if (question.type === "ox") {
    [true, false].forEach((value) => {
      const row = document.createElement("div");
      row.className = "answer-option";
      if (state.revealed) row.classList.add(value === question.answer ? "correct" : "dim");
      const label = document.createElement("b");
      label.textContent = value ? "O" : "X";
      const text = document.createElement("span");
      text.textContent = value ? "그렇다" : "아니다";
      row.append(label, text);
      options.append(row);
    });
  } else {
    const mission = document.createElement("div");
    mission.className = "talk-prompt";
    const icon = document.createElement("span");
    icon.textContent = "🗣️";
    const copy = document.createElement("b");
    copy.textContent = "짝과 먼저 작전을 세운 뒤 길드의 생각을 모아 발표하세요.";
    mission.append(icon, copy);
    options.append(mission);
  }

  const explanation = $("answer-explanation");
  explanation.classList.toggle("hidden", !state.revealed);
  if (state.revealed) {
    const answer = question.type === "multiple"
      ? `${QuizKit.optionLabels[question.answer]} ${question.options[question.answer]}`
      : question.type === "ox" ? (question.answer ? "O · 그렇다" : "X · 아니다") : question.answer;
    explanation.textContent = `${question.type === "talk" ? "미션 성공 조건" : "정답 룬"}: ${answer}${question.explanation ? ` · ${question.explanation}` : ""}`;
  }
  $("reveal-answer").disabled = state.revealed;
  $("next-question").disabled = !state.revealed;
  $("next-question").textContent = state.currentIndex === state.questions.length - 1 ? "원정 마치기" : "다음 구역";
}

function renderPicker(state) {
  const card = $("picked-student");
  const student = findStudent(state, state.pickedStudentId);
  card.classList.toggle("has-student", Boolean(student));
  card.replaceChildren();
  const icon = document.createElement("span");
  icon.textContent = state.courageBoost ? "🚩" : "✦";
  const name = document.createElement("strong");
  name.textContent = student ? student.name : state.courageBoost ? "첫 참여 모험가를 찾아요" : "추천 버튼을 눌러주세요";
  const guide = document.createElement("small");
  if (student) {
    const count = state.participation?.[student.id] || 0;
    guide.textContent = `${teamForStudent(state, student.id)?.name || ""} · 지금까지 ${count}회 참여${state.courageBoost ? " · 공격 +6" : ""}`;
  } else guide.textContent = "한 번 건너뛰어도 괜찮아요.";
  card.append(icon, name, guide);
}

function renderTeams(state) {
  const container = $("team-controls");
  container.replaceChildren();
  state.teams.forEach((team) => {
    const row = document.createElement("div");
    row.className = "team-control";
    const copy = document.createElement("div");
    copy.className = "team-copy";
    const dot = document.createElement("i");
    dot.className = "team-dot";
    dot.style.backgroundColor = team.color;
    const text = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = team.name;
    const score = document.createElement("small");
    score.textContent = `${team.role} · ★ ${team.stars} · 피해 ${team.damage}`;
    text.append(name, score);
    copy.append(dot, text);
    const actions = document.createElement("div");
    actions.className = "team-awards";
    [[1, "도전", QuizKit.attack.challenge], [2, "정답", QuizKit.attack.correct]].forEach(([points, label, damage]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "award-button";
      if (Number(state.awards?.[team.id] || 0) >= points) button.classList.add("active");
      button.innerHTML = `<span>${label}</span><b>-${damage}</b>`;
      button.addEventListener("click", () => awardTeam(team.id, points));
      actions.append(button);
    });
    row.append(copy, actions);
    container.append(row);
  });
}

function renderRewards(state) {
  const container = $("reward-items");
  container.replaceChildren();
  const stars = totalStars(state);
  QuizKit.rewards.forEach((reward) => {
    const unlocked = state.unlockedRewards.includes(reward.id);
    const used = state.usedRewards.includes(reward.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reward-item${unlocked ? " unlocked" : ""}${used ? " used" : ""}`;
    button.disabled = !unlocked || used;
    const icon = document.createElement("span");
    icon.textContent = reward.emoji;
    const copy = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = reward.name;
    const status = document.createElement("small");
    status.textContent = used ? "사용 완료" : unlocked ? reward.description : `별 ${stars}/${reward.threshold}`;
    copy.append(name, status);
    button.append(icon, copy);
    button.addEventListener("click", () => useReward(reward.id));
    container.append(button);
  });
}

function renderCoverage(state) {
  const stats = participationStats(state);
  $("live-attendance").textContent = `${stats.present.length} / ${state.roster.length}`;
  $("live-coverage").textContent = `${stats.percentage}%`;
  $("live-runes").textContent = `${state.classRunes}개`;
  $("coverage-copy").textContent = `${stats.participated.length} / ${stats.present.length}명`;
  $("coverage-bar").style.width = `${stats.percentage}%`;
  $("coverage-message").textContent = stats.percentage === 100
    ? "전원 첫 참여 달성! 마지막 협동 주문이 충전됐어요."
    : stats.participated.length === 0
      ? "첫 번째 도전 공격을 기다리고 있어요."
      : `${stats.present.length - stats.participated.length}명의 첫 참여를 도우면 원정대가 더 강해져요.`;
}

function renderLive(state) {
  showView("view-live");
  $("live-title").textContent = state.className;
  $("live-meta").textContent = `${state.grade}학년 · ${state.subject} · ${state.topic}`;
  renderDungeon(state);
  renderQuestion(state);
  renderPicker(state);
  renderTeams(state);
  renderRewards(state);
  renderCoverage(state);
  updateTimer(state);
}

function recommendStudent() {
  const state = EQ_STATE.get();
  const present = state.roster.filter((student) => student.present);
  if (!present.length) return;
  let minimum = Math.min(...present.map((student) => Number(state.participation?.[student.id] || 0)));
  if (state.courageBoost && present.some((student) => Number(state.participation?.[student.id] || 0) === 0)) minimum = 0;
  let candidates = present.filter((student) => Number(state.participation?.[student.id] || 0) === minimum);
  if (candidates.length > 1 && state.lastPickedId) candidates = candidates.filter((student) => student.id !== state.lastPickedId);
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  EQ_STATE.update({ pickedStudentId: picked.id, pickedCredited: false, lastPickedId: picked.id });
}

function damageFor(points) {
  return QuizKit.damageFor(points);
}

function awardTeam(teamId, points) {
  const state = EQ_STATE.get();
  const previous = Number(state.awards?.[teamId] || 0);
  const awarded = Math.max(previous, points);
  if (awarded === previous) return;

  const baseDamage = damageFor(awarded) - damageFor(previous);
  const awards = { ...state.awards, [teamId]: awarded };
  const cooperation = !state.cooperationBonus && state.teams.every((team) => Number(awards[team.id] || 0) > 0);
  const participation = { ...state.participation };
  let pickedCredited = state.pickedCredited;
  let courageBoost = state.courageBoost;
  let courageDamage = 0;
  if (state.pickedStudentId && !pickedCredited) {
    participation[state.pickedStudentId] = Number(participation[state.pickedStudentId] || 0) + 1;
    pickedCredited = true;
    if (courageBoost) {
      courageDamage = QuizKit.attack.courage;
      courageBoost = false;
    }
  }
  const totalDamage = baseDamage + (cooperation ? QuizKit.attack.cooperation : 0) + courageDamage;
  const teams = state.teams.map((team) => team.id === teamId
    ? { ...team, stars: team.stars + (awarded - previous), damage: team.damage + baseDamage + courageDamage }
    : team);
  const newStars = teams.reduce((sum, team) => sum + team.stars, 0);
  const unlockedRewards = [...state.unlockedRewards];
  const newlyUnlocked = [];
  QuizKit.rewards.forEach((reward) => {
    if (QuizKit.rewardIdsForStars(newStars).includes(reward.id) && !unlockedRewards.includes(reward.id)) {
      unlockedRewards.push(reward.id);
      newlyUnlocked.push(reward);
    }
  });
  const hp = Math.max(0, state.boss.hp - totalDamage);
  const boss = { ...state.boss, hp, defeated: hp === 0 };
  const battleMessage = boss.defeated
    ? `${state.boss.name}의 결계가 무너졌습니다!`
    : cooperation
      ? `모든 길드 협동! 룬 폭발로 추가 피해 ${QuizKit.attack.cooperation}`
      : `${teams.find((team) => team.id === teamId).name}이(가) 결계에 ${totalDamage} 피해!`;

  EQ_STATE.update({
    teams, awards, participation, pickedCredited, courageBoost, boss,
    cooperationBonus: state.cooperationBonus || cooperation,
    classRunes: state.classRunes + (cooperation ? 1 : 0),
    unlockedRewards,
    battleMessage
  });
  showBattleFloat(`-${totalDamage} HP`, cooperation ? "cooperation" : "damage");
  if (cooperation) storyToast("협동 룬 발동! 모든 길드의 공격이 하나로 합쳐졌습니다.");
  if (boss.defeated && !state.boss.defeated) storyToast(`결계 파괴 성공! ${state.boss.name}이(가) 쓰러졌습니다!`, 4500);
  newlyUnlocked.forEach((reward, index) => setTimeout(() => storyToast(`보물 획득: ${reward.emoji} ${reward.name}`, 3000), index * 3300));
}

function useReward(rewardId) {
  const state = EQ_STATE.get();
  if (!state.unlockedRewards.includes(rewardId) || state.usedRewards.includes(rewardId)) return;
  if (rewardId === "compass") {
    const question = state.questions[state.currentIndex];
    if (question.type !== "multiple" || state.revealed) return toast("힌트 나침반은 정답 공개 전 객관식 임무에서 사용할 수 있어요.");
    EQ_STATE.update({ usedRewards: [...state.usedRewards, rewardId], hintActive: true, battleMessage: "나침반이 오답 두 개를 가리켰습니다." });
    storyToast("🧭 힌트 나침반 발동! 오답 두 개가 흐려집니다.");
  } else if (rewardId === "sand") {
    const start = Math.max(Date.now(), state.timerEndsAt || Date.now());
    EQ_STATE.update({ usedRewards: [...state.usedRewards, rewardId], timerEndsAt: start + 30000, battleMessage: "시간의 모래로 작전 시간 30초를 얻었습니다." });
    storyToast("⌛ 시간의 모래 발동! 작전 시간 +30초");
  } else if (rewardId === "banner") {
    EQ_STATE.update({ usedRewards: [...state.usedRewards, rewardId], courageBoost: true, battleMessage: "용기의 깃발이 첫 참여 모험가를 부르고 있습니다." });
    storyToast("🚩 용기의 깃발 발동! 첫 참여 모험가의 다음 공격 +6");
  }
}

function revealAnswer() {
  const state = EQ_STATE.get();
  if (!state || state.revealed) return;
  EQ_STATE.update({ revealed: true, timerEndsAt: null, battleMessage: "정답 룬이 나타났습니다. 길드의 공격을 기록하세요." });
}

function nextQuestion() {
  const state = EQ_STATE.get();
  if (!state?.revealed) return;
  if (state.currentIndex >= state.questions.length - 1) {
    const stats = participationStats(state);
    const finalSpell = stats.percentage === 100 && state.boss.hp > 0;
    const boss = finalSpell ? { ...state.boss, hp: 0, defeated: true } : state.boss;
    if (finalSpell) storyToast("전원 참여 주문 발동! 남은 결계를 한 번에 정화했습니다!", 4500);
    EQ_STATE.update({ phase: "summary", endedAt: Date.now(), timerEndsAt: null, boss });
    return;
  }
  const nextIndex = state.currentIndex + 1;
  const previousStage = QuizKit.stageIndex(state.currentIndex, state.questions.length);
  const nextStage = QuizKit.stageIndex(nextIndex, state.questions.length);
  EQ_STATE.update({
    currentIndex: nextIndex,
    revealed: false,
    pickedStudentId: null,
    pickedCredited: false,
    awards: {},
    cooperationBonus: false,
    hintActive: false,
    battleMessage: state.world.stages[nextStage].story,
    timerEndsAt: null
  });
  if (nextStage !== previousStage) storyToast(`${state.world.stages[nextStage].name} 진입! ${state.world.stages[nextStage].story}`, 4000);
}

function startTimer(seconds) { EQ_STATE.update({ timerEndsAt: Date.now() + seconds * 1000 }); }
function updateTimer(state) {
  const element = $("timer-readout");
  if (!state?.timerEndsAt) { element.textContent = "—"; return; }
  const remaining = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
  element.textContent = `${remaining}초`;
}

function buildLoot(state) {
  const stats = participationStats(state);
  const loot = [];
  if (state.boss.defeated) loot.push(["🏆", "결계 파괴자의 보물상자"]);
  if (stats.percentage === 100) loot.push(["🛡️", "모두의 용사 휘장"]);
  if (state.classRunes >= 2) loot.push(["✦", `협동 룬 조각 ${state.classRunes}개`]);
  if (loot.length === 0) loot.push(["🗺️", "다음 원정을 여는 지도 조각"]);
  return loot;
}

function renderSummary(state) {
  showView("view-summary");
  const stats = participationStats(state);
  const stars = totalStars(state);
  $("victory-emblem").textContent = state.boss.defeated ? "🏆" : "🗺️";
  $("summary-title").textContent = state.boss.defeated ? `${state.boss.name}의 결계를 깨뜨렸어요!` : "보스가 물러났지만 결계가 남아 있어요.";
  $("summary-lead").textContent = state.boss.defeated
    ? `${state.world.name}에 지식의 빛이 돌아왔습니다. 모두의 도전이 만든 승리예요.`
    : `남은 결계는 ${state.boss.hp} HP. 다음 원정에서 더 많은 첫 참여를 모아 다시 도전해요.`;
  const lootRow = $("loot-row");
  lootRow.replaceChildren();
  buildLoot(state).forEach(([emoji, name]) => {
    const item = document.createElement("div");
    const icon = document.createElement("span");
    icon.textContent = emoji;
    const copy = document.createElement("b");
    copy.textContent = name;
    item.append(icon, copy);
    lootRow.append(item);
  });
  const metrics = [
    ["첫 참여 달성", `${stats.percentage}%`, `${stats.participated.length}/${stats.present.length}명의 모험가가 참여했어요`],
    ["보스 피해", `${state.boss.maxHp - state.boss.hp}`, `결계 ${state.boss.maxHp} HP 중 원정대가 깎은 피해`],
    ["협동 성과", `룬 ${state.classRunes} · 별 ${stars}`, "모든 길드가 함께 참여한 순간의 기록"]
  ];
  const container = $("summary-metrics");
  container.replaceChildren();
  metrics.forEach(([label, value, description]) => {
    const card = document.createElement("div");
    card.className = "summary-metric";
    [label, value, description].forEach((text, index) => {
      const element = document.createElement(index === 0 ? "small" : index === 1 ? "strong" : "span");
      element.textContent = text;
      card.append(element);
    });
    container.append(card);
  });
  const body = $("summary-table");
  body.replaceChildren();
  [...state.roster].sort((a, b) => Number(b.present) - Number(a.present)).forEach((student) => {
    const row = document.createElement("tr");
    [student.name, student.present ? "참가" : "결석", student.present ? (teamForStudent(state, student.id)?.name || "—") : "—", student.present ? `${state.participation?.[student.id] || 0}회` : "—"].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    body.append(row);
  });
}

function downloadCsv() {
  const state = EQ_STATE.get();
  if (!state) return;
  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [
    ["원정대", "학년", "교과", "주제", "던전", "보스 격파", "학생", "출석", "길드", "참여 횟수"],
    ...state.roster.map((student) => [state.className, state.grade, state.subject, state.topic, state.world.name, state.boss.defeated ? "성공" : "미완료", student.name, student.present ? "참가" : "결석", student.present ? (teamForStudent(state, student.id)?.name || "") : "", student.present ? Number(state.participation?.[student.id] || 0) : ""])
  ];
  const csv = `\ufeff${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${state.className.replace(/[\\/:*?"<>|]/g, "_")}_원정기록.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function openProjector() {
  const popup = window.open("/display", "everyone-expedition-display", "width=1440,height=900,menubar=no,toolbar=no,location=no");
  if (!popup) toast("팝업이 차단됐어요. 브라우저에서 팝업을 허용해 주세요.", 4200);
}

function renderFromState(state) {
  if (!state || state.version !== 3) return showView("view-prep");
  if (state.phase === "summary") renderSummary(state);
  else renderLive(state);
}

function bindEvents() {
  $("grade-select").addEventListener("change", (event) => {
    fillSelect($("subject-select"), getSubjects(event.target.value), "교과 선택");
    fillSelect($("topic-select"), [], "교과를 먼저 선택하세요");
    $("custom-topic-field").classList.add("hidden");
  });
  $("subject-select").addEventListener("change", () => {
    fillSelect($("topic-select"), getTopics($("grade-select").value, $("subject-select").value), "수업 주제 선택");
    $("custom-topic-field").classList.add("hidden");
    updateAdventurePreview();
  });
  $("topic-select").addEventListener("change", (event) => {
    $("custom-topic-field").classList.toggle("hidden", event.target.value !== CUSTOM_TOPIC);
    if (event.target.value === CUSTOM_TOPIC) $("custom-topic").focus();
  });
  $("load-roster").addEventListener("click", loadRosterFromText);
  $("load-sample").addEventListener("click", () => {
    $("roster-input").value = ["김하늘", "박이든", "최다온", "이서준", "정가람", "한지우", "오시온", "윤나래", "강도윤", "문채원", "임로운", "신해봄"].join("\n");
    loadRosterFromText();
  });
  $("present-all").addEventListener("click", () => { roster.forEach((student) => { student.present = true; }); renderAttendance(); });
  $("generate-button").addEventListener("click", createSession);
  $("pick-student").addEventListener("click", recommendStudent);
  $("reveal-answer").addEventListener("click", revealAnswer);
  $("next-question").addEventListener("click", nextQuestion);
  document.querySelectorAll("[data-timer]").forEach((button) => button.addEventListener("click", () => startTimer(Number(button.dataset.timer))));
  $("stop-timer").addEventListener("click", () => EQ_STATE.update({ timerEndsAt: null }));
  $("header-projector").addEventListener("click", openProjector);
  $("download-csv").addEventListener("click", downloadCsv);
  $("new-session").addEventListener("click", () => { EQ_STATE.clear(); showView("view-prep"); toast("새 원정을 준비할 수 있어요."); });
  document.querySelectorAll("[data-scroll]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".step-link").forEach((link) => link.classList.toggle("active", link === button));
    $(button.dataset.scroll).scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  updateAdventurePreview();
  const initial = EQ_STATE.init(renderFromState);
  renderFromState(initial);
  timerTicker = setInterval(() => {
    const state = EQ_STATE.get();
    if (state?.phase === "live") updateTimer(state);
  }, 250);
});

window.addEventListener("beforeunload", () => clearInterval(timerTicker));
