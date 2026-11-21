// 초등 한글(어휘) 학습 프로그램 - 구몬 스타일 단계 학습
(function () {
  const STORAGE_KEY = "koreanStudyProgress_v1";
  const STAMP_KEY = "koreanStudyStamps_v1";
  const PASS_RATIO = 0.7;

  const state = {
    bandId: KOREAN_STUDY_DATA.bands[0].id,
    level: null,
    band: null,
    cardIndex: 0,
    quizIndex: 0,
    quizItems: [],
    correctCount: 0,
  };

  const el = (id) => document.getElementById(id);

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveProgress(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

  function loadStamps() {
    try { return JSON.parse(localStorage.getItem(STAMP_KEY)) || []; }
    catch { return []; }
  }
  function stampToday() {
    const stamps = loadStamps();
    const today = new Date().toISOString().slice(0, 10);
    if (!stamps.includes(today)) stamps.push(today);
    localStorage.setItem(STAMP_KEY, JSON.stringify(stamps));
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    el(id).classList.add("active");
  }

  // -------------------- 홈 화면 --------------------
  function findBand(id) { return KOREAN_STUDY_DATA.bands.find((b) => b.id === id); }

  function renderStampBoard() {
    const stamps = loadStamps();
    const row = el("stamp-row");
    row.innerHTML = "";
    const dow = ["일", "월", "화", "수", "목", "금", "토"];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const done = stamps.includes(key);
      const cell = document.createElement("div");
      cell.className = "stamp-day" + (done ? " done" : "");
      cell.innerHTML = `<span class="dow">${dow[d.getDay()]}</span><span class="mark">${done ? "🌟" : "・"}</span>`;
      row.appendChild(cell);
    }
  }

  function renderBandTabs() {
    const wrap = el("band-tabs");
    wrap.innerHTML = "";
    KOREAN_STUDY_DATA.bands.forEach((band) => {
      const btn = document.createElement("button");
      btn.className = "band-tab" + (band.id === state.bandId ? " active" : "");
      btn.style.background = band.id === state.bandId ? band.color : "";
      btn.textContent = band.label;
      btn.addEventListener("click", () => {
        state.bandId = band.id;
        renderBandTabs();
        renderLevelGrid();
      });
      wrap.appendChild(btn);
    });
  }

  function isLevelUnlocked(band, idx, progress) {
    if (idx === 0) return true;
    const prevId = band.levels[idx - 1].id;
    return !!(progress[prevId] && progress[prevId].cleared);
  }

  function renderLevelGrid() {
    const band = findBand(state.bandId);
    const progress = loadProgress();
    const grid = el("level-grid");
    grid.innerHTML = "";
    band.levels.forEach((level, idx) => {
      const unlocked = isLevelUnlocked(band, idx, progress);
      const rec = progress[level.id];
      const card = document.createElement("button");
      card.className = "level-card" + (unlocked ? "" : " locked");
      const stars = rec ? "⭐".repeat(rec.stars) + "☆".repeat(3 - rec.stars) : "☆☆☆";
      card.innerHTML = `
        <span class="lv-title">${level.title}</span>
        <span class="lv-stars">${stars}</span>
        ${unlocked ? "" : '<span class="lv-lock">🔒</span>'}
      `;
      if (unlocked) {
        card.addEventListener("click", () => startLevel(band, level));
      }
      grid.appendChild(card);
    });
  }

  function renderHome() {
    renderStampBoard();
    renderBandTabs();
    renderLevelGrid();
    showScreen("screen-home");
  }

  // -------------------- 학습(카드) 화면 --------------------
  function startLevel(band, level) {
    state.band = band;
    state.level = level;
    state.cardIndex = 0;
    showScreen("screen-learn");
    el("learn-title").textContent = level.title;
    renderCard();
  }

  function renderCard() {
    const words = state.level.words;
    const w = words[state.cardIndex];
    el("word-emoji").textContent = w.emoji;
    el("word-text").textContent = w.word;
    el("word-meaning").textContent = w.meaning;
    el("prev-card-btn").disabled = state.cardIndex === 0;
    const isLast = state.cardIndex === words.length - 1;
    el("next-card-btn").textContent = isLast ? "시험 보러 가기 ➜" : "다음 낱말 ▶";

    const dots = el("card-dots");
    dots.innerHTML = "";
    words.forEach((_, i) => {
      const d = document.createElement("span");
      if (i === state.cardIndex) d.className = "on";
      dots.appendChild(d);
    });
    speak(w.word);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // -------------------- 시험(퀴즈) 화면 --------------------
  function startQuiz() {
    state.quizIndex = 0;
    state.correctCount = 0;
    const words = state.level.words;
    const allWords = state.band.levels.flatMap((l) => l.words);
    state.quizItems = words.map((w, i) => ({
      word: w,
      type: i % 2 === 0 ? "choice" : "dictation",
      options: i % 2 === 0 ? buildOptions(w, allWords) : null,
    }));
    showScreen("screen-quiz");
    renderQuizItem();
  }

  function buildOptions(word, pool) {
    const distractors = shuffle(pool.filter((w) => w.word !== word.word)).slice(0, 3);
    return shuffle([word, ...distractors]);
  }

  function renderQuizItem() {
    const total = state.quizItems.length;
    el("quiz-count").textContent = `${state.quizIndex + 1} / ${total} 문제`;
    const item = state.quizItems[state.quizIndex];
    const body = el("quiz-body");
    body.innerHTML = "";

    if (item.type === "choice") {
      const q = document.createElement("div");
      q.className = "quiz-question";
      q.textContent = `"${item.word.word}"의 뜻은 무엇일까요?`;
      body.appendChild(q);

      const opts = document.createElement("div");
      opts.className = "quiz-options";
      item.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt.meaning;
        btn.addEventListener("click", () => handleChoiceAnswer(btn, opt.word === item.word.word));
        opts.appendChild(btn);
      });
      body.appendChild(opts);
    } else {
      const q = document.createElement("div");
      q.className = "quiz-question";
      q.innerHTML = `🔊 소리를 듣고 낱말을 받아써 보세요.<br><button type="button" class="speak-btn" id="quiz-speak-btn">🔊</button>`;
      body.appendChild(q);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "dictation-input";
      input.id = "dictation-input";
      input.placeholder = "여기에 입력하세요";
      body.appendChild(input);

      const feedback = document.createElement("div");
      feedback.className = "feedback";
      feedback.id = "dictation-feedback";
      body.appendChild(feedback);

      const submit = document.createElement("button");
      submit.className = "btn wide";
      submit.id = "dictation-submit";
      submit.textContent = "확인";
      submit.addEventListener("click", () => handleDictationAnswer(item.word.word));
      body.appendChild(submit);

      el("quiz-speak-btn").addEventListener("click", () => speak(item.word.word));
      speak(item.word.word);
    }
  }

  function handleChoiceAnswer(btn, isCorrect) {
    document.querySelectorAll(".option-btn").forEach((b) => (b.disabled = true));
    btn.classList.add(isCorrect ? "correct" : "wrong");
    if (isCorrect) state.correctCount++;
    setTimeout(nextQuizItem, 700);
  }

  function handleDictationAnswer(answer) {
    const input = el("dictation-input");
    const submit = el("dictation-submit");
    if (submit.dataset.locked) return;
    submit.dataset.locked = "1";
    const isCorrect = input.value.trim() === answer;
    const feedback = el("dictation-feedback");
    input.classList.add(isCorrect ? "correct" : "wrong");
    input.disabled = true;
    feedback.classList.add(isCorrect ? "correct" : "wrong");
    feedback.textContent = isCorrect ? "정답이에요! 🎉" : `아쉬워요. 정답은 "${answer}" 예요.`;
    if (isCorrect) state.correctCount++;
    setTimeout(nextQuizItem, 900);
  }

  function nextQuizItem() {
    state.quizIndex++;
    if (state.quizIndex >= state.quizItems.length) {
      finishQuiz();
    } else {
      renderQuizItem();
    }
  }

  function finishQuiz() {
    const total = state.quizItems.length;
    const ratio = state.correctCount / total;
    const cleared = ratio >= PASS_RATIO;
    const stars = ratio === 1 ? 3 : ratio >= PASS_RATIO ? 2 : ratio >= 0.4 ? 1 : 0;

    const progress = loadProgress();
    const prev = progress[state.level.id];
    progress[state.level.id] = {
      cleared: cleared || (prev && prev.cleared),
      stars: Math.max(stars, prev ? prev.stars : 0),
      lastScore: state.correctCount,
      total,
    };
    saveProgress(progress);
    stampToday();

    showScreen("screen-result");
    el("result-score").textContent = `${state.correctCount} / ${total} 개 정답`;
    el("result-stars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    el("result-msg").textContent = cleared
      ? "참 잘했어요! 다음 레벨이 열렸어요."
      : `70% 이상 맞히면 다음 레벨이 열려요. (${Math.round(PASS_RATIO * 100)}% 이상 필요)`;
    el("retry-btn").onclick = () => startQuiz();
  }

  // -------------------- 이벤트 연결 --------------------
  el("prev-card-btn").addEventListener("click", () => {
    if (state.cardIndex > 0) { state.cardIndex--; renderCard(); }
  });
  el("next-card-btn").addEventListener("click", () => {
    if (state.cardIndex < state.level.words.length - 1) {
      state.cardIndex++;
      renderCard();
    } else {
      startQuiz();
    }
  });
  el("card-speak-btn").addEventListener("click", () => {
    speak(state.level.words[state.cardIndex].word);
  });
  el("back-home-from-learn").addEventListener("click", renderHome);
  el("back-home-from-result").addEventListener("click", renderHome);

  renderHome();
})();
