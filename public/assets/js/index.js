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

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `student-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function selectedTopic() {
  return $("topic-select").value === CUSTOM_TOPIC
    ? $("custom-topic").value.trim()
    : $("topic-select").value;
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

function loadRosterFromText() {
  const names = $("roster-input").value
    .split(/\r?\n|,|;/)
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 40);
  const uniqueNames = [...new Set(names)];
  if (!uniqueNames.length) {
    toast("학생 이름을 한 줄에 한 명씩 입력해 주세요.");
    return;
  }
  const previous = new Map(roster.map((student) => [student.name, student]));
  roster = uniqueNames.map((name) => previous.get(name) || { id: makeId(), name: name.slice(0, 20), present: true });
  renderAttendance();
}

function renderAttendance() {
  const area = $("attendance-area");
  $("roster-empty").classList.toggle("hidden", roster.length > 0);
  area.classList.toggle("hidden", roster.length === 0);
  const list = $("attendance-list");
  list.replaceChildren();
  roster.forEach((student) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `attendance-person${student.present ? " present" : ""}`;
    button.textContent = student.name;
    button.setAttribute("aria-pressed", String(student.present));
    button.title = student.present ? "참석 중 · 누르면 결석 처리" : "결석 · 누르면 참석 처리";
    button.addEventListener("click", () => {
      student.present = !student.present;
      renderAttendance();
    });
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
    color: EQ_STATE.TEAM_COLORS[index],
    studentIds: [],
    stars: 0
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
  if (presentStudents.length < 2) return toast("참석 학생을 두 명 이상 등록해 주세요.");

  const button = $("generate-button");
  const status = $("generation-status");
  button.disabled = true;
  button.querySelector("span").textContent = "문제 구성 중…";
  status.textContent = "학년 수준에 맞는 지식 확인과 말하기 미션을 섞고 있어요.";
  status.classList.remove("hidden");

  let questions = [];
  let source = "ai";
  try {
    questions = await requestQuestions({ grade: Number(grade), subject, topic, count });
    if (questions.length < Math.min(3, count)) throw new Error("사용할 수 있는 문항이 부족해요.");
  } catch (error) {
    console.warn("AI 문항 대신 참여 미션을 사용합니다.", error);
    questions = QuizKit.fallbackQuestions({ topic, count });
    source = "participation";
  }

  const participation = Object.fromEntries(roster.map((student) => [student.id, 0]));
  const session = {
    version: 2,
    phase: "live",
    createdAt: Date.now(),
    source,
    className: $("class-name").value.trim().slice(0, 40) || "우리 반 탐험 수업",
    grade: Number(grade),
    subject,
    topic,
    roster: roster.map((student) => ({ ...student })),
    teams: buildTeams(presentStudents, $("team-count").value),
    questions,
    currentIndex: 0,
    revealed: false,
    participation,
    pickedStudentId: null,
    pickedCredited: false,
    lastPickedId: null,
    awards: {},
    timerEndsAt: null
  };
  EQ_STATE.set(session);
  button.disabled = false;
  button.querySelector("span").textContent = "수업 만들기";
  status.classList.add("hidden");
  toast(source === "ai" ? "AI 퀴즈가 준비됐어요!" : "AI 연결 없이 참여 미션으로 시작합니다.", 3800);
}

function findStudent(state, id) {
  return state.roster?.find((student) => student.id === id);
}

function teamForStudent(state, id) {
  return state.teams?.find((team) => team.studentIds.includes(id));
}

function participationStats(state) {
  const present = (state.roster || []).filter((student) => student.present);
  const participated = present.filter((student) => Number(state.participation?.[student.id] || 0) > 0);
  return { present, participated, percentage: present.length ? Math.round((participated.length / present.length) * 100) : 0 };
}

function renderQuestion(state) {
  const question = state.questions[state.currentIndex];
  $("question-kind").textContent = QuizKit.typeLabels[question.type] || "생각하기";
  $("question-number").textContent = `문제 ${state.currentIndex + 1} / ${state.questions.length}`;
  $("question-text").textContent = question.question;
  const options = $("answer-options");
  options.replaceChildren();

  if (question.type === "multiple") {
    question.options.forEach((option, index) => {
      const row = document.createElement("div");
      row.className = "answer-option";
      if (state.revealed) row.classList.add(index === question.answer ? "correct" : "dim");
      const label = document.createElement("b");
      label.textContent = QuizKit.optionLabels[index];
      const text = document.createElement("span");
      text.textContent = option;
      row.append(label, text);
      options.append(row);
    });
  } else if (question.type === "ox") {
    [true, false].forEach((value, index) => {
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
    icon.textContent = "💬";
    const copy = document.createElement("b");
    copy.textContent = "먼저 짝과 이야기한 뒤, 팀의 생각을 모아 보세요.";
    mission.append(icon, copy);
    options.append(mission);
  }

  const explanation = $("answer-explanation");
  explanation.classList.toggle("hidden", !state.revealed);
  if (state.revealed) {
    const answer = question.type === "multiple"
      ? `${QuizKit.optionLabels[question.answer]} ${question.options[question.answer]}`
      : question.type === "ox" ? (question.answer ? "O · 그렇다" : "X · 아니다") : question.answer;
    explanation.textContent = `${question.type === "talk" ? "성공 기준" : "정답"}: ${answer}${question.explanation ? ` · ${question.explanation}` : ""}`;
  }
  $("reveal-answer").disabled = state.revealed;
  $("next-question").disabled = !state.revealed;
  $("next-question").textContent = state.currentIndex === state.questions.length - 1 ? "수업 마치기" : "다음 문제";
}

function renderPicker(state) {
  const card = $("picked-student");
  const student = findStudent(state, state.pickedStudentId);
  card.classList.toggle("has-student", Boolean(student));
  card.replaceChildren();
  const icon = document.createElement("span");
  icon.textContent = "✦";
  const name = document.createElement("strong");
  name.textContent = student ? student.name : "추천 버튼을 눌러주세요";
  const guide = document.createElement("small");
  if (student) {
    const count = state.participation?.[student.id] || 0;
    guide.textContent = `${teamForStudent(state, student.id)?.name || ""} · 지금까지 ${count}회 참여`;
  } else {
    guide.textContent = "부담스러우면 한 번 건너뛰어도 괜찮아요.";
  }
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
    score.textContent = `별 ${team.stars}개 · ${team.studentIds.length}명`;
    text.append(name, score);
    copy.append(dot, text);

    const actions = document.createElement("div");
    actions.className = "team-awards";
    [1, 2].forEach((points) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "award-button";
      if (Number(state.awards?.[team.id] || 0) >= points) button.classList.add("active");
      button.textContent = points === 1 ? "도전 +1" : "정답 +2";
      button.addEventListener("click", () => awardTeam(team.id, points));
      actions.append(button);
    });
    row.append(copy, actions);
    container.append(row);
  });
}

function renderCoverage(state) {
  const stats = participationStats(state);
  $("live-attendance").textContent = `${stats.present.length} / ${state.roster.length}`;
  $("live-coverage").textContent = `${stats.percentage}%`;
  $("live-progress").textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
  $("coverage-copy").textContent = `${stats.participated.length} / ${stats.present.length}명`;
  $("coverage-bar").style.width = `${stats.percentage}%`;
  $("coverage-message").textContent = stats.percentage === 100
    ? "모두 한 번 이상 참여했어요! 이제 다양한 생각을 즐겨요."
    : stats.participated.length === 0
      ? "첫 번째 도전을 기다리고 있어요."
      : `${stats.present.length - stats.participated.length}명에게 첫 참여 기회를 더 주세요.`;
}

function renderLive(state) {
  showView("view-live");
  $("live-title").textContent = state.className;
  $("live-meta").textContent = `${state.grade}학년 · ${state.subject} · ${state.topic}`;
  renderQuestion(state);
  renderPicker(state);
  renderTeams(state);
  renderCoverage(state);
  updateTimer(state);
}

function recommendStudent() {
  const state = EQ_STATE.get();
  const present = state.roster.filter((student) => student.present);
  if (!present.length) return;
  const minimum = Math.min(...present.map((student) => Number(state.participation?.[student.id] || 0)));
  let candidates = present.filter((student) => Number(state.participation?.[student.id] || 0) === minimum);
  if (candidates.length > 1 && state.lastPickedId) candidates = candidates.filter((student) => student.id !== state.lastPickedId);
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  EQ_STATE.update({ pickedStudentId: picked.id, pickedCredited: false, lastPickedId: picked.id });
}

function awardTeam(teamId, points) {
  const state = EQ_STATE.get();
  const previous = Number(state.awards?.[teamId] || 0);
  const awarded = Math.max(previous, points);
  const difference = awarded - previous;
  if (!difference) return;
  const teams = state.teams.map((team) => team.id === teamId ? { ...team, stars: team.stars + difference } : team);
  const participation = { ...state.participation };
  let pickedCredited = state.pickedCredited;
  if (state.pickedStudentId && !pickedCredited) {
    participation[state.pickedStudentId] = Number(participation[state.pickedStudentId] || 0) + 1;
    pickedCredited = true;
  }
  EQ_STATE.update({ teams, participation, pickedCredited, awards: { ...state.awards, [teamId]: awarded } });
}

function revealAnswer() {
  const state = EQ_STATE.get();
  if (!state || state.revealed) return;
  EQ_STATE.update({ revealed: true, timerEndsAt: null });
}

function nextQuestion() {
  const state = EQ_STATE.get();
  if (!state?.revealed) return;
  if (state.currentIndex >= state.questions.length - 1) {
    EQ_STATE.update({ phase: "summary", endedAt: Date.now(), timerEndsAt: null });
    return;
  }
  EQ_STATE.update({
    currentIndex: state.currentIndex + 1,
    revealed: false,
    pickedStudentId: null,
    pickedCredited: false,
    awards: {},
    timerEndsAt: null
  });
}

function startTimer(seconds) {
  EQ_STATE.update({ timerEndsAt: Date.now() + seconds * 1000 });
}

function updateTimer(state) {
  const element = $("timer-readout");
  if (!state?.timerEndsAt) {
    element.textContent = "—";
    return;
  }
  const remaining = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
  element.textContent = `${remaining}초`;
}

function renderSummary(state) {
  showView("view-summary");
  const stats = participationStats(state);
  const totalStars = state.teams.reduce((sum, team) => sum + team.stars, 0);
  $("summary-lead").textContent = `${state.grade}학년 ${state.subject} ‘${state.topic}’ 수업의 기록입니다.`;
  const metrics = [
    ["출석", `${stats.present.length} / ${state.roster.length}명`, "오늘 함께한 학생 수"],
    ["참여 커버리지", `${stats.percentage}%`, stats.percentage === 100 ? "모든 학생이 한 번 이상 참여했어요" : "다음 수업에서 첫 참여를 먼저 챙겨 주세요"],
    ["함께 모은 별", `${totalStars}개`, "도전과 정답을 모두 포함한 점수"]
  ];
  const container = $("summary-metrics");
  container.replaceChildren();
  metrics.forEach(([label, value, description]) => {
    const card = document.createElement("div");
    card.className = "summary-metric";
    const small = document.createElement("small");
    small.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = description;
    card.append(small, strong, span);
    container.append(card);
  });

  const body = $("summary-table");
  body.replaceChildren();
  [...state.roster].sort((a, b) => Number(b.present) - Number(a.present)).forEach((student) => {
    const row = document.createElement("tr");
    const values = [
      student.name,
      student.present ? "참석" : "결석",
      student.present ? (teamForStudent(state, student.id)?.name || "—") : "—",
      student.present ? `${state.participation?.[student.id] || 0}회` : "—"
    ];
    values.forEach((value) => {
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
    ["수업명", "학년", "교과", "주제", "학생", "출석", "팀", "참여 횟수"],
    ...state.roster.map((student) => [
      state.className,
      state.grade,
      state.subject,
      state.topic,
      student.name,
      student.present ? "참석" : "결석",
      student.present ? (teamForStudent(state, student.id)?.name || "") : "",
      student.present ? Number(state.participation?.[student.id] || 0) : ""
    ])
  ];
  const csv = `\ufeff${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `${state.className.replace(/[\\/:*?"<>|]/g, "_")}_참여기록.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function openProjector() {
  const popup = window.open("/display", "everyone-expedition-display", "width=1440,height=900,menubar=no,toolbar=no,location=no");
  if (!popup) toast("팝업이 차단됐어요. 브라우저에서 팝업을 허용해 주세요.", 4200);
}

function renderFromState(state) {
  if (!state || state.version !== 2) return showView("view-prep");
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
  $("new-session").addEventListener("click", () => { EQ_STATE.clear(); showView("view-prep"); toast("새 수업을 준비할 수 있어요."); });
  document.querySelectorAll("[data-scroll]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".step-link").forEach((link) => link.classList.toggle("active", link === button));
    $(button.dataset.scroll).scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  const initial = EQ_STATE.init(renderFromState);
  renderFromState(initial);
  timerTicker = setInterval(() => {
    const state = EQ_STATE.get();
    if (state?.phase === "live") updateTimer(state);
  }, 250);
});

window.addEventListener("beforeunload", () => clearInterval(timerTicker));
