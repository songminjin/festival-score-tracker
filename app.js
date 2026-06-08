const SCORE_RULES = [
  { key: "simple", label: "단순", points: 1 },
  { key: "valid", label: "유효", points: 50 },
  { key: "gana", label: "가나", points: 500 },
  { key: "dara1", label: "다라-1", points: 1000 },
  { key: "dara2", label: "다라-2", points: 500 },
  { key: "online", label: "온라인", points: 5 },
  { key: "preaching", label: "프리칭", points: 10 },
  { key: "elka", label: "엘카", points: 20 },
  { key: "lms", label: "LMS", points: 5 },
];

const MISSIONS = [
  "아침모임 10회",
  "감사 인사 10회",
  "새 친구 돕기 10회",
  "정리정돈 10회",
  "온라인 참여 10회",
  "칭찬 나누기 10회",
  "독서 활동 10회",
  "팀 미션 10회",
  "축제 준비 10회",
];

const STORAGE_KEY = "block-festa-records-v1";
let records = loadRecords();
let toastTimer;

const scoreCards = document.querySelector("#score-cards");
const missionGrid = document.querySelector("#mission-grid");
const scoreInputs = document.querySelector("#score-inputs");
const missionInputs = document.querySelector("#mission-inputs");
const recordDate = document.querySelector("#record-date");
const dateStatus = document.querySelector("#date-status");
const dailyScorePreview = document.querySelector("#daily-score-preview");
const historyList = document.querySelector("#history-list");

function emptyScoreRecord() {
  return Object.fromEntries(SCORE_RULES.map(({ key }) => [key, 0]));
}

function emptyMissionRecord() {
  return Object.fromEntries(MISSIONS.map((_, index) => [`mission${index + 1}`, 0]));
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function safeNumber(value) {
  return Math.max(0, Number.parseInt(value, 10) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function calculateScore(counts) {
  return SCORE_RULES.reduce(
    (total, rule) => total + safeNumber(counts?.[rule.key]) * rule.points,
    0,
  );
}

function getTotals() {
  const scoreCounts = emptyScoreRecord();
  const missionCounts = emptyMissionRecord();

  Object.values(records).forEach((record) => {
    SCORE_RULES.forEach(({ key }) => {
      scoreCounts[key] += safeNumber(record.score?.[key]);
    });
    MISSIONS.forEach((_, index) => {
      const key = `mission${index + 1}`;
      missionCounts[key] += safeNumber(record.missions?.[key]);
    });
  });

  return { scoreCounts, missionCounts, totalScore: calculateScore(scoreCounts) };
}

function buildStaticUi() {
  const dashboardRules = SCORE_RULES.filter(({ key }) => key !== "dara2").map((rule) =>
    rule.key === "dara1"
      ? { key: "dara", label: "다라", pointsLabel: "다라-1 1,000점 · 다라-2 500점" }
      : { ...rule, pointsLabel: `1개당 ${formatNumber(rule.points)}점` },
  );

  scoreCards.innerHTML = dashboardRules.map(
    ({ key, label, pointsLabel }) => `
      <article class="score-card">
        <h3>${label}</h3>
        <strong id="total-${key}">0개</strong>
        <span id="detail-${key}">${pointsLabel}</span>
      </article>
    `,
  ).join("");

  scoreInputs.innerHTML = SCORE_RULES.map(
    ({ key, label, points }) => `
      <div class="number-field">
        <div>
          <label for="score-${key}">${label}</label>
          <small>개당 ${formatNumber(points)}점</small>
        </div>
        <input
          id="score-${key}"
          data-score-key="${key}"
          type="number"
          min="0"
          step="1"
          value="0"
          inputmode="numeric"
        />
      </div>
    `,
  ).join("");

  missionInputs.innerHTML = MISSIONS.map(
    (mission, index) => `
      <div class="mission-input-row">
        <label for="mission-${index + 1}">미션 ${index + 1}. ${mission}</label>
        <input
          id="mission-${index + 1}"
          data-mission-key="mission${index + 1}"
          type="number"
          min="0"
          step="1"
          value="0"
          inputmode="numeric"
        />
      </div>
    `,
  ).join("");
}

function renderDashboard() {
  const totals = getTotals();

  document.querySelector("#grand-total").textContent = formatNumber(totals.totalScore);
  SCORE_RULES.filter(({ key }) => key !== "dara1" && key !== "dara2").forEach(({ key }) => {
    document.querySelector(`#total-${key}`).textContent =
      `${formatNumber(totals.scoreCounts[key])}개`;
  });

  const daraTotal = totals.scoreCounts.dara1 + totals.scoreCounts.dara2;
  document.querySelector("#total-dara").textContent = `${formatNumber(daraTotal)}개`;
  document.querySelector("#detail-dara").textContent =
    `다라-1 ${formatNumber(totals.scoreCounts.dara1)}개 · 다라-2 ${formatNumber(totals.scoreCounts.dara2)}개`;

  missionGrid.innerHTML = MISSIONS.map((mission, index) => {
    const key = `mission${index + 1}`;
    const count = totals.missionCounts[key];
    const progress = Math.min(100, (count / 10) * 100);
    const completed = count >= 10;
    return `
      <article class="mission-card ${completed ? "completed" : ""}">
        <span class="mission-number">${String(index + 1).padStart(2, "0")}</span>
        <h3>${mission}</h3>
        <div
          class="progress-track"
          role="progressbar"
          aria-label="${mission}"
          aria-valuemin="0"
          aria-valuemax="10"
          aria-valuenow="${Math.min(count, 10)}"
        >
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-label">
          <span>${completed ? "미션 완료!" : "진행 중"}</span>
          <span>${formatNumber(count)} / 10</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderHistory() {
  const dates = Object.keys(records).sort().reverse();
  document.querySelector("#history-count").textContent = `${dates.length}일 기록`;

  if (!dates.length) {
    historyList.innerHTML =
      '<div class="empty-state">아직 저장된 기록이 없습니다. 첫 기록을 만들어 보세요.</div>';
    return;
  }

  historyList.innerHTML = dates
    .map((date) => {
      const record = records[date];
      const scoreSummary = SCORE_RULES.filter(({ key }) => safeNumber(record.score?.[key]) > 0)
        .map(({ key, label }) => `${label} ${safeNumber(record.score[key])}`)
        .join(" · ");
      const missionTotal = Object.values(record.missions || {}).reduce(
        (sum, value) => sum + safeNumber(value),
        0,
      );
      return `
        <article class="history-row">
          <strong>${formatDate(date)}</strong>
          <p>${scoreSummary || "점수 기록 없음"} · 빙고 ${missionTotal}회</p>
          <span>${formatNumber(calculateScore(record.score || {}))}점</span>
        </article>
      `;
    })
    .join("");
}

function getScoreFormValues() {
  return Object.fromEntries(
    SCORE_RULES.map(({ key }) => [
      key,
      safeNumber(document.querySelector(`[data-score-key="${key}"]`).value),
    ]),
  );
}

function getMissionFormValues() {
  return Object.fromEntries(
    MISSIONS.map((_, index) => {
      const key = `mission${index + 1}`;
      return [key, safeNumber(document.querySelector(`[data-mission-key="${key}"]`).value)];
    }),
  );
}

function setScoreForm(values = {}) {
  SCORE_RULES.forEach(({ key }) => {
    document.querySelector(`[data-score-key="${key}"]`).value = safeNumber(values[key]);
  });
  updateDailyPreview();
}

function setMissionForm(values = {}) {
  MISSIONS.forEach((_, index) => {
    const key = `mission${index + 1}`;
    document.querySelector(`[data-mission-key="${key}"]`).value = safeNumber(values[key]);
  });
}

function updateDailyPreview() {
  dailyScorePreview.textContent = `${formatNumber(calculateScore(getScoreFormValues()))}점`;
}

function loadSelectedDate() {
  const date = recordDate.value;
  const record = records[date];
  setScoreForm(record?.score || emptyScoreRecord());
  setMissionForm(record?.missions || emptyMissionRecord());
  dateStatus.textContent = record
    ? `${formatDate(date)} 기록을 불러왔습니다.`
    : "새로운 날짜입니다.";
}

function upsertRecordSection(section, mode) {
  const date = recordDate.value;
  if (!date) {
    showToast("먼저 기록 날짜를 선택해 주세요.");
    return;
  }

  const exists = Boolean(records[date]?.[section]);
  if (mode === "save" && exists) {
    showToast("이미 저장된 날짜입니다. 값을 바꾸려면 수정 버튼을 눌러 주세요.");
    return;
  }
  if (mode === "edit" && !exists) {
    showToast("수정할 기존 기록이 없습니다. 먼저 저장해 주세요.");
    return;
  }

  const values = section === "score" ? getScoreFormValues() : getMissionFormValues();
  records[date] = { ...records[date], [section]: values };
  saveRecords();
  renderAll();

  const noun = section === "score" ? "점수" : "빙고";
  showToast(`${formatDate(date)} ${noun} 기록을 ${mode === "save" ? "저장" : "수정"}했습니다.`);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}-view`);
  });
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderDashboard();
  renderHistory();
  loadSelectedDate();
}

buildStaticUi();
recordDate.value = localToday();
renderAll();

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelectorAll("[data-go-admin]").forEach((button) => {
  button.addEventListener("click", () => switchView("admin"));
});

scoreInputs.addEventListener("input", updateDailyPreview);
recordDate.addEventListener("change", loadSelectedDate);
document.querySelector("#save-score").addEventListener("click", () => upsertRecordSection("score", "save"));
document.querySelector("#edit-score").addEventListener("click", () => upsertRecordSection("score", "edit"));
document
  .querySelector("#save-mission")
  .addEventListener("click", () => upsertRecordSection("missions", "save"));
document
  .querySelector("#edit-mission")
  .addEventListener("click", () => upsertRecordSection("missions", "edit"));

document.querySelector("#reset-all").addEventListener("click", () => {
  const confirmed = window.confirm("모든 날짜의 점수와 빙고 기록을 초기화할까요?");
  if (!confirmed) return;
  records = {};
  saveRecords();
  renderAll();
  showToast("점수와 빙고 기록을 모두 초기화했습니다.");
});
