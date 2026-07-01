const $ = (id) => document.getElementById(id);
const optionLabels = ["①", "②", "③", "④"];
const typeLabels = { multiple: "골라 보기", ox: "O · X", talk: "함께 말하기" };
let currentState = null;
let ticker = null;

function showScene(id) {
  document.querySelectorAll(".display-scene").forEach((scene) => scene.classList.toggle("active", scene.id === id));
}

function stats(state) {
  const present = (state.roster || []).filter((student) => student.present);
  const participated = present.filter((student) => Number(state.participation?.[student.id] || 0) > 0);
  return { present, participated, percentage: present.length ? Math.round((participated.length / present.length) * 100) : 0 };
}

function renderOptions(state, question) {
  const container = $("display-options");
  container.replaceChildren();
  if (question.type === "multiple") {
    question.options.forEach((option, index) => {
      const row = document.createElement("div");
      row.className = "display-option";
      if (state.revealed) row.classList.add(index === question.answer ? "correct" : "dim");
      const label = document.createElement("b");
      label.textContent = optionLabels[index];
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
    icon.textContent = "💬";
    const text = document.createElement("b");
    text.textContent = "먼저 짝과 이야기한 뒤, 팀의 생각을 모아 보세요.";
    prompt.append(icon, text);
    container.append(prompt);
  }

  const explanation = $("display-explanation");
  explanation.classList.toggle("hidden", !state.revealed);
  if (state.revealed) {
    const answer = question.type === "multiple"
      ? `${optionLabels[question.answer]} ${question.options[question.answer]}`
      : question.type === "ox" ? (question.answer ? "O · 그렇다" : "X · 아니다") : question.answer;
    explanation.textContent = `${question.type === "talk" ? "성공 기준" : "정답"}: ${answer}${question.explanation ? ` · ${question.explanation}` : ""}`;
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
    const name = document.createElement("b");
    name.textContent = team.name;
    copy.append(dot, name);
    const score = document.createElement("strong");
    score.textContent = `★ ${team.stars}`;
    row.append(copy, score);
    container.append(row);
  });
}

function updateTimer() {
  const element = $("display-timer");
  if (!currentState?.timerEndsAt) {
    element.textContent = currentState?.revealed ? "정답 확인" : "생각 중";
    element.classList.remove("urgent");
    return;
  }
  const remaining = Math.max(0, Math.ceil((currentState.timerEndsAt - Date.now()) / 1000));
  element.textContent = remaining > 0 ? `${remaining}초` : "생각 마무리";
  element.classList.toggle("urgent", remaining <= 10);
}

function renderQuestion(state) {
  showScene("display-question");
  const question = state.questions?.[state.currentIndex];
  if (!question) return;
  $("display-class-name").textContent = state.className;
  $("display-meta").textContent = `${state.grade}학년 · ${state.subject} · ${state.topic}`;
  $("display-question-number").textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
  $("display-kind").textContent = typeLabels[question.type] || "생각하기";
  $("display-question-text").textContent = question.question;
  renderOptions(state, question);
  renderTeams(state);

  const student = state.roster.find((item) => item.id === state.pickedStudentId);
  const picker = document.querySelector(".display-picker");
  picker.classList.toggle("highlight", Boolean(student));
  $("display-picked").textContent = student?.name || "잠시 후 만나요";

  const participation = stats(state);
  $("display-coverage-copy").textContent = `${participation.participated.length} / ${participation.present.length}명`;
  $("display-coverage-bar").style.width = `${participation.percentage}%`;
  updateTimer();
}

function renderSummary(state) {
  showScene("display-summary");
  const participation = stats(state);
  const totalStars = state.teams.reduce((sum, team) => sum + team.stars, 0);
  $("display-summary-title").textContent = participation.percentage === 100
    ? "오늘, 모두가 참여했어요!"
    : "오늘, 모두가 한 걸음 내디뎠어요!";
  const container = $("display-summary-stats");
  container.replaceChildren();
  [["참여한 친구", `${participation.participated.length} / ${participation.present.length}명`], ["함께 모은 별", `${totalStars}개`]].forEach(([label, value]) => {
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
  if (!state || state.version !== 2) return showScene("display-idle");
  if (state.phase === "summary") renderSummary(state);
  else renderQuestion(state);
}

document.addEventListener("DOMContentLoaded", () => {
  const initial = EQ_STATE.init(render);
  render(initial);
  ticker = setInterval(updateTimer, 250);
});

window.addEventListener("beforeunload", () => clearInterval(ticker));
