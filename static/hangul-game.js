(() => {
  "use strict";

  // ------------------------------------------------------------- 데이터
  const CONSONANTS = [
    { char: "ㄱ", word: "기린", emoji: "🦒" },
    { char: "ㄴ", word: "나비", emoji: "🦋" },
    { char: "ㄷ", word: "다람쥐", emoji: "🐿️" },
    { char: "ㄹ", word: "로봇", emoji: "🤖" },
    { char: "ㅁ", word: "무지개", emoji: "🌈" },
    { char: "ㅂ", word: "바나나", emoji: "🍌" },
    { char: "ㅅ", word: "사자", emoji: "🦁" },
    { char: "ㅇ", word: "오리", emoji: "🦆" },
    { char: "ㅈ", word: "자동차", emoji: "🚗" },
    { char: "ㅊ", word: "치타", emoji: "🐆" },
    { char: "ㅋ", word: "코끼리", emoji: "🐘" },
    { char: "ㅌ", word: "토끼", emoji: "🐰" },
    { char: "ㅍ", word: "포도", emoji: "🍇" },
    { char: "ㅎ", word: "호랑이", emoji: "🐯" },
  ];

  const VOWELS = [
    { char: "ㅏ", word: "아이스크림", emoji: "🍦" },
    { char: "ㅑ", word: "야구공", emoji: "⚾" },
    { char: "ㅓ", word: "얼음", emoji: "🧊" },
    { char: "ㅕ", word: "여우", emoji: "🦊" },
    { char: "ㅗ", word: "오리", emoji: "🦆" },
    { char: "ㅛ", word: "요구르트", emoji: "🥛" },
    { char: "ㅜ", word: "우산", emoji: "☂️" },
    { char: "ㅠ", word: "유령", emoji: "👻" },
    { char: "ㅡ", word: "그네", emoji: "🎠" },
    { char: "ㅣ", word: "이빨", emoji: "🦷" },
  ];

  // ------------------------------------------------------------- 상태
  const state = {
    deck: [],
    index: 0,
    stars: Number(localStorage.getItem("hangul-stars") || 0),
    quizPool: [],
    quizTarget: null,
    quizLocked: false,
  };

  // ------------------------------------------------------------- 요소
  const screens = {
    home: document.getElementById("screen-home"),
    learn: document.getElementById("screen-learn"),
    quiz: document.getElementById("screen-quiz"),
  };
  const homeBtn = document.getElementById("home-btn");
  const starCountEl = document.getElementById("star-count");
  const deckLabel = document.getElementById("deck-label");
  const letterGlyph = document.getElementById("letter-glyph");
  const letterEmoji = document.getElementById("letter-emoji");
  const letterWord = document.getElementById("letter-word");
  const dotsEl = document.getElementById("dots");
  const quizEmoji = document.getElementById("quiz-emoji");
  const quizWord = document.getElementById("quiz-word");
  const quizOptions = document.getElementById("quiz-options");
  const praiseBanner = document.getElementById("praise-banner");
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // ------------------------------------------------------------- 음성
  let voices = [];
  function loadVoices() {
    voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    const koVoice = voices.find((v) => v.lang && v.lang.startsWith("ko"));
    if (koVoice) utter.voice = koVoice;
    utter.rate = 0.85;
    utter.pitch = 1.15;
    window.speechSynthesis.speak(utter);
  }

  function speakLetter(item) {
    speak(`${item.char}! ${item.word}`);
  }

  // ------------------------------------------------------------- 사운드(성공 차임)
  let audioCtx = null;
  function playChime() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = audioCtx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) {
      /* 오디오를 사용할 수 없는 환경은 조용히 넘어감 */
    }
  }

  // ------------------------------------------------------------- 별 카운터
  function addStars(n) {
    state.stars += n;
    localStorage.setItem("hangul-stars", String(state.stars));
    starCountEl.textContent = state.stars;
  }
  starCountEl.textContent = state.stars;

  // ------------------------------------------------------------- 화면 전환
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
    homeBtn.classList.toggle("hidden", name === "home");
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  homeBtn.addEventListener("click", () => showScreen("home"));

  // ------------------------------------------------------------- 학습 화면
  function openLearn(deckName) {
    state.deck = deckName === "consonant" ? CONSONANTS : VOWELS;
    deckLabel.textContent = deckName === "consonant" ? "자음 배우기" : "모음 배우기";
    state.index = 0;
    renderDots();
    renderCard();
    showScreen("learn");
  }

  function renderDots() {
    dotsEl.innerHTML = "";
    state.deck.forEach((_, i) => {
      const d = document.createElement("span");
      d.className = "dot" + (i === state.index ? " active" : "");
      dotsEl.appendChild(d);
    });
  }

  function renderCard() {
    const item = state.deck[state.index];
    letterGlyph.textContent = item.char;
    letterEmoji.textContent = item.emoji;
    letterWord.textContent = item.word;
    [...dotsEl.children].forEach((d, i) => d.classList.toggle("active", i === state.index));
    speakLetter(item);
  }

  document.getElementById("prev-btn").addEventListener("click", () => {
    state.index = (state.index - 1 + state.deck.length) % state.deck.length;
    renderCard();
  });
  document.getElementById("next-btn").addEventListener("click", () => {
    state.index = (state.index + 1) % state.deck.length;
    renderCard();
  });
  document.getElementById("speaker-btn").addEventListener("click", () => {
    speakLetter(state.deck[state.index]);
  });

  // ------------------------------------------------------------- 퀴즈 화면
  function openQuiz() {
    state.quizPool = [...CONSONANTS, ...VOWELS];
    nextQuestion();
    showScreen("quiz");
  }

  function pickDistractors(target, count) {
    const others = state.quizPool.filter((it) => it.char !== target.char);
    const picked = [];
    while (picked.length < count && others.length) {
      const idx = Math.floor(Math.random() * others.length);
      picked.push(others.splice(idx, 1)[0]);
    }
    return picked;
  }

  function nextQuestion() {
    state.quizLocked = false;
    const target = state.quizPool[Math.floor(Math.random() * state.quizPool.length)];
    state.quizTarget = target;
    quizEmoji.textContent = target.emoji;
    quizWord.textContent = target.word;

    const options = [target, ...pickDistractors(target, 2)];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    quizOptions.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt.char;
      btn.addEventListener("click", () => handleAnswer(btn, opt));
      quizOptions.appendChild(btn);
    });

    speak(`${target.word}! 어떤 글자로 시작할까요?`);
  }

  function handleAnswer(btn, opt) {
    if (state.quizLocked) return;
    if (opt.char === state.quizTarget.char) {
      state.quizLocked = true;
      btn.classList.add("correct");
      addStars(1);
      playChime();
      showPraise();
      speak(pickPraise());
      setTimeout(nextQuestion, 1400);
    } else {
      btn.classList.add("wrong");
      speak("다시 해볼까요?");
      setTimeout(() => btn.classList.remove("wrong"), 400);
    }
  }

  const PRAISES = ["잘했어요!", "최고예요!", "정답이에요!", "우와 대단해요!"];
  function pickPraise() {
    return PRAISES[Math.floor(Math.random() * PRAISES.length)];
  }

  function showPraise() {
    praiseBanner.textContent = "⭐ " + pickPraise();
    praiseBanner.classList.add("show");
    burstConfetti();
    setTimeout(() => praiseBanner.classList.remove("show"), 1100);
  }

  // ------------------------------------------------------------- 컨페티
  const CONFETTI_COLORS = ["#ff8fb3", "#ffd166", "#6ec6ff", "#8fe3b0", "#b28dff"];
  let particles = [];
  let rafId = null;

  function burstConfetti() {
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -10 - 4,
        size: Math.random() * 8 + 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
      });
    }
    if (!rafId) animateConfetti();
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      p.life += 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    particles = particles.filter((p) => p.life < 120 && p.y < canvas.height + 40);
    if (particles.length) {
      rafId = requestAnimationFrame(animateConfetti);
    } else {
      rafId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ------------------------------------------------------------- 메뉴 버튼
  document.getElementById("menu-consonant").addEventListener("click", () => openLearn("consonant"));
  document.getElementById("menu-vowel").addEventListener("click", () => openLearn("vowel"));
  document.getElementById("menu-quiz").addEventListener("click", openQuiz);

  showScreen("home");
})();
