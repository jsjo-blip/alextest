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

  // ------------------------------------------------------------- 단어 만들기 (레벨 1)
  // 레벨 1: 받침 없이, 기본 자음 14개 + 기본 모음 10개로만 이루어진 2글자 낱말
  const WORDS_LEVEL1 = [
    { word: "나비", emoji: "🦋" },
    { word: "거미", emoji: "🕷️" },
    { word: "다리", emoji: "🦵" },
    { word: "모자", emoji: "🧢" },
    { word: "바지", emoji: "👖" },
    { word: "버스", emoji: "🚌" },
    { word: "비누", emoji: "🧼" },
    { word: "사자", emoji: "🦁" },
    { word: "아기", emoji: "👶" },
    { word: "오리", emoji: "🦆" },
    { word: "우유", emoji: "🥛" },
    { word: "가지", emoji: "🍆" },
    { word: "기차", emoji: "🚂" },
    { word: "포도", emoji: "🍇" },
    { word: "포크", emoji: "🍴" },
    { word: "하마", emoji: "🦛" },
    { word: "고추", emoji: "🌶️" },
  ];

  // 유니코드 한글 음절 = (초성 * 21 + 중성) * 28 + 종성 + 0xAC00 규칙을 이용한 조합/분해
  const FULL_CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  const FULL_JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
  const FULL_JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

  function decomposeSyllable(ch) {
    const code = ch.codePointAt(0) - 0xac00;
    const cho = Math.floor(code / (21 * 28));
    const jung = Math.floor((code % (21 * 28)) / 28);
    const jong = code % 28;
    return { cho: FULL_CHO[cho], jung: FULL_JUNG[jung], jong: FULL_JONG[jong] };
  }

  function composeSyllable(cho, jung, jong = "") {
    const choIdx = FULL_CHO.indexOf(cho);
    const jungIdx = FULL_JUNG.indexOf(jung);
    const jongIdx = FULL_JONG.indexOf(jong);
    const code = 0xac00 + (choIdx * 21 + jungIdx) * 28 + jongIdx;
    return String.fromCodePoint(code);
  }

  // ------------------------------------------------------------- 따라쓰기 (레벨 1)
  // 글자(음절): 가나다라...의 기본 14자, 전부 기본 자음 + 모음 'ㅏ'로만 구성
  const SYLLABLES = CONSONANTS.map((c) => ({ text: composeSyllable(c.char, "ㅏ") }));

  const TRACE_CATEGORIES = {
    consonant: {
      label: "자음",
      items: CONSONANTS.map((c) => ({ text: c.char, cueWord: c.word, emoji: c.emoji })),
    },
    vowel: {
      label: "모음",
      items: VOWELS.map((v) => ({ text: v.char, cueWord: v.word, emoji: v.emoji })),
    },
    syllable: {
      label: "글자",
      items: SYLLABLES.map((s) => ({ text: s.text, cueWord: null, emoji: null })),
    },
    word: {
      label: "단어",
      items: WORDS_LEVEL1.map((w) => ({ text: w.word, cueWord: null, emoji: w.emoji })),
    },
  };

  // ------------------------------------------------------------- 상태
  const state = {
    deck: [],
    index: 0,
    stars: Number(localStorage.getItem("hangul-stars") || 0),
    quizPool: [],
    quizTarget: null,
    quizLocked: false,
    wordTarget: null,
    wordSyllables: [],
    wordStep: 0,
    wordLocked: false,
    lastWordIndex: -1,
    traceCategoryKey: null,
    traceItems: [],
    traceIndex: 0,
    traceStage: "dotted",
    traceQuizPool: [],
    traceQuizTarget: null,
    traceQuizLocked: false,
  };

  // ------------------------------------------------------------- 요소
  const screens = {
    home: document.getElementById("screen-home"),
    learn: document.getElementById("screen-learn"),
    quiz: document.getElementById("screen-quiz"),
    word: document.getElementById("screen-word"),
    traceMenu: document.getElementById("screen-trace-menu"),
    trace: document.getElementById("screen-trace"),
    traceQuiz: document.getElementById("screen-trace-quiz"),
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
  const voiceNoticeEl = document.getElementById("voice-notice");
  const wordTargetEmoji = document.getElementById("word-target-emoji");
  const syllableBoxesEl = document.getElementById("syllable-boxes");
  const wordResultEl = document.getElementById("word-result");
  const wordStepHint = document.getElementById("word-step-hint");
  const wordOptions = document.getElementById("word-options");
  const traceStageLabel = document.getElementById("trace-stage-label");
  const traceCueEmoji = document.getElementById("trace-cue-emoji");
  const traceCueText = document.getElementById("trace-cue-text");
  const traceCueWord = document.getElementById("trace-cue-word");
  const traceCanvas = document.getElementById("trace-canvas");
  const traceCtx = traceCanvas.getContext("2d");
  const traceDotsEl = document.getElementById("trace-dots");
  const traceQuizLabel = document.getElementById("trace-quiz-label");
  const traceQuizEmoji = document.getElementById("trace-quiz-emoji");
  const traceQuizWord = document.getElementById("trace-quiz-word");
  const traceQuizHint = document.getElementById("trace-quiz-hint");
  const traceQuizOptions = document.getElementById("trace-quiz-options");
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
  let resolveVoicesReady;
  const voicesReady = new Promise((resolve) => {
    resolveVoicesReady = resolve;
  });

  function loadVoices() {
    voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (voices.length) resolveVoicesReady();
  }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    // 일부 브라우저는 voiceschanged를 끝내 발생시키지 않으므로, 음성을
    // 영영 기다리지 않도록 짧은 시간 뒤에는 그냥 진행한다.
    setTimeout(resolveVoicesReady, 300);
  } else {
    resolveVoicesReady();
  }

  let voiceNoticeShown = false;
  function maybeShowVoiceNotice() {
    if (voiceNoticeShown || !voiceNoticeEl) return;
    voiceNoticeShown = true;
    const hasKorean = voices.some((v) => v.lang && v.lang.startsWith("ko"));
    if (!hasKorean) {
      voiceNoticeEl.classList.add("show");
      setTimeout(() => voiceNoticeEl.classList.remove("show"), 6000);
    }
  }
  voiceNoticeEl?.addEventListener("click", () => voiceNoticeEl.classList.remove("show"));

  // 크롬 계열 브라우저는 발화가 길어지거나 탭이 잠시 쉬면 speechSynthesis가
  // 멈춰버리는 알려진 버그가 있어, 말하는 동안 주기적으로 깨워준다.
  let speechWatchdog = null;
  function stopSpeechWatchdog() {
    clearInterval(speechWatchdog);
    speechWatchdog = null;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    voicesReady.then(() => {
      maybeShowVoiceNotice();
      window.speechSynthesis.cancel();
      stopSpeechWatchdog();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ko-KR";
      const koVoice = voices.find((v) => v.lang && v.lang.startsWith("ko"));
      if (koVoice) {
        try {
          utter.voice = koVoice;
        } catch (e) {
          /* 음성 객체를 지정하지 못해도 lang 속성만으로 계속 진행 */
        }
      }
      utter.rate = 0.85;
      utter.pitch = 1.15;

      utter.onstart = () => {
        speechWatchdog = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            stopSpeechWatchdog();
            return;
          }
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }, 4000);
      };
      utter.onend = stopSpeechWatchdog;
      utter.onerror = stopSpeechWatchdog;

      window.speechSynthesis.speak(utter);
    });
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
    stopSpeechWatchdog();
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

  // ------------------------------------------------------------- 단어 만들기 화면
  function pickWord() {
    if (WORDS_LEVEL1.length === 1) return WORDS_LEVEL1[0];
    let idx;
    do {
      idx = Math.floor(Math.random() * WORDS_LEVEL1.length);
    } while (idx === state.lastWordIndex);
    state.lastWordIndex = idx;
    return WORDS_LEVEL1[idx];
  }

  function openWordGame() {
    state.wordLocked = false;
    const target = pickWord();
    state.wordTarget = target;
    state.wordSyllables = [...target.word].map((ch) => {
      const { cho, jung } = decomposeSyllable(ch);
      return { cho, jung, choPicked: null, jungPicked: null };
    });
    state.wordStep = 0;

    wordTargetEmoji.textContent = target.emoji;
    wordResultEl.textContent = "";
    renderSyllableBoxes();
    nextWordStep();
    showScreen("word");
    speak(`${target.word}! 이 낱말을 만들어봐요.`);
  }

  function renderSyllableBoxes() {
    syllableBoxesEl.innerHTML = "";
    state.wordSyllables.forEach((syl) => {
      const box = document.createElement("div");
      box.className = "syllable-box";
      if (syl.choPicked && syl.jungPicked) {
        box.textContent = composeSyllable(syl.choPicked, syl.jungPicked);
        box.classList.add("filled");
      } else if (syl.choPicked) {
        box.textContent = syl.choPicked;
        box.classList.add("filled");
      }
      syllableBoxesEl.appendChild(box);
    });
  }

  function pickWordDistractors(pool, target, count) {
    const others = pool.filter((c) => c !== target);
    const picked = [];
    while (picked.length < count && others.length) {
      const idx = Math.floor(Math.random() * others.length);
      picked.push(others.splice(idx, 1)[0]);
    }
    return picked;
  }

  function nextWordStep() {
    state.wordLocked = false;
    const totalSteps = state.wordSyllables.length * 2;
    if (state.wordStep >= totalSteps) {
      completeWord();
      return;
    }
    const syllableIdx = Math.floor(state.wordStep / 2);
    const isVowelStep = state.wordStep % 2 === 1;
    const syl = state.wordSyllables[syllableIdx];
    const target = isVowelStep ? syl.jung : syl.cho;
    const pool = isVowelStep ? VOWELS.map((v) => v.char) : CONSONANTS.map((c) => c.char);

    wordStepHint.textContent = isVowelStep ? "어떤 모음일까요?" : "어떤 자음일까요?";

    const choices = [target, ...pickWordDistractors(pool, target, 2)];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    wordOptions.innerHTML = "";
    choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = choice;
      btn.addEventListener("click", () => handleWordAnswer(btn, choice, target, syllableIdx, isVowelStep));
      wordOptions.appendChild(btn);
    });
  }

  function handleWordAnswer(btn, choice, target, syllableIdx, isVowelStep) {
    if (state.wordLocked) return;
    if (choice === target) {
      state.wordLocked = true;
      btn.classList.add("correct");
      const syl = state.wordSyllables[syllableIdx];
      if (isVowelStep) {
        syl.jungPicked = choice;
      } else {
        syl.choPicked = choice;
      }
      renderSyllableBoxes();
      playChime();
      state.wordStep += 1;
      setTimeout(nextWordStep, 500);
    } else {
      btn.classList.add("wrong");
      setTimeout(() => btn.classList.remove("wrong"), 400);
    }
  }

  function completeWord() {
    const target = state.wordTarget;
    wordOptions.innerHTML = "";
    wordStepHint.textContent = "";
    wordResultEl.textContent = target.word;
    [...syllableBoxesEl.children].forEach((box) => box.classList.add("complete"));
    addStars(1);
    playChime();
    showPraise();
    speak(`${target.word}! ${pickPraise()}`);
    setTimeout(openWordGame, 1800);
  }

  document.getElementById("word-speaker-btn").addEventListener("click", () => {
    if (state.wordTarget) speak(state.wordTarget.word);
  });

  // ------------------------------------------------------------- 따라쓰기 캔버스
  const TRACE_SIZE = 280;
  let traceDrawing = false;

  function setupTraceCanvas() {
    const dpr = window.devicePixelRatio || 1;
    traceCanvas.width = TRACE_SIZE * dpr;
    traceCanvas.height = TRACE_SIZE * dpr;
    traceCanvas.style.width = TRACE_SIZE + "px";
    traceCanvas.style.height = TRACE_SIZE + "px";
    traceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  setupTraceCanvas();

  function traceFontSize(text) {
    return text.length === 1 ? TRACE_SIZE * 0.62 : TRACE_SIZE * 0.36;
  }

  function drawTraceGuide(text) {
    traceCtx.clearRect(0, 0, TRACE_SIZE, TRACE_SIZE);
    if (!text) return;
    traceCtx.save();
    traceCtx.font = `900 ${traceFontSize(text)}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
    traceCtx.textAlign = "center";
    traceCtx.textBaseline = "middle";
    traceCtx.lineWidth = 3;
    traceCtx.setLineDash([10, 12]);
    traceCtx.strokeStyle = "rgba(58, 46, 92, 0.35)";
    traceCtx.strokeText(text, TRACE_SIZE / 2, TRACE_SIZE / 2);
    traceCtx.restore();
  }

  function clearTraceInk() {
    const item = state.traceItems[state.traceIndex];
    drawTraceGuide(state.traceStage === "dotted" && item ? item.text : "");
  }

  function tracePointerPos(e) {
    const rect = traceCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  traceCanvas.addEventListener("pointerdown", (e) => {
    traceDrawing = true;
    const p = tracePointerPos(e);
    traceCtx.beginPath();
    traceCtx.moveTo(p.x, p.y);
    try {
      traceCanvas.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 일부 브라우저는 포인터 캡처를 지원하지 않음 */
    }
  });
  traceCanvas.addEventListener("pointermove", (e) => {
    if (!traceDrawing) return;
    const p = tracePointerPos(e);
    traceCtx.lineCap = "round";
    traceCtx.lineJoin = "round";
    traceCtx.lineWidth = 16;
    traceCtx.setLineDash([]);
    traceCtx.strokeStyle = "#8a5cf6";
    traceCtx.lineTo(p.x, p.y);
    traceCtx.stroke();
  });
  function stopTraceDrawing() {
    traceDrawing = false;
  }
  traceCanvas.addEventListener("pointerup", stopTraceDrawing);
  traceCanvas.addEventListener("pointerleave", stopTraceDrawing);
  traceCanvas.addEventListener("pointercancel", stopTraceDrawing);

  document.getElementById("trace-clear-btn").addEventListener("click", clearTraceInk);

  // ------------------------------------------------------------- 따라쓰기 화면
  function openTraceMenu() {
    showScreen("traceMenu");
  }

  function speakTraceItem(item) {
    if (item.cueWord) {
      speak(`${item.text}! ${item.cueWord}`);
    } else {
      speak(item.text);
    }
  }

  function startTraceCategory(key) {
    state.traceCategoryKey = key;
    state.traceItems = TRACE_CATEGORIES[key].items;
    state.traceIndex = 0;
    state.traceStage = "dotted";
    renderTraceItem();
    showScreen("trace");
  }

  function renderTraceDots() {
    traceDotsEl.innerHTML = "";
    state.traceItems.forEach((_, i) => {
      const d = document.createElement("span");
      d.className = "dot" + (i === state.traceIndex ? " active" : "");
      traceDotsEl.appendChild(d);
    });
  }

  function renderTraceItem() {
    const item = state.traceItems[state.traceIndex];
    const categoryLabel = TRACE_CATEGORIES[state.traceCategoryKey].label;
    const stageLabel = state.traceStage === "dotted" ? "점선 따라 쓰기" : "점선 없이 쓰기";
    traceStageLabel.textContent = `${categoryLabel} · ${stageLabel}`;

    traceCueEmoji.textContent = item.emoji || "";
    traceCueText.textContent = item.text;
    traceCueWord.textContent = item.cueWord || "";

    drawTraceGuide(state.traceStage === "dotted" ? item.text : "");
    renderTraceDots();
    speakTraceItem(item);
  }

  function goTraceNext() {
    if (state.traceIndex < state.traceItems.length - 1) {
      state.traceIndex += 1;
      renderTraceItem();
      return;
    }
    if (state.traceStage === "dotted") {
      state.traceStage = "free";
      state.traceIndex = 0;
      renderTraceItem();
      return;
    }
    startTraceQuiz(state.traceCategoryKey);
  }

  document.getElementById("trace-next-btn").addEventListener("click", goTraceNext);
  document.getElementById("trace-speaker-btn").addEventListener("click", () => {
    const item = state.traceItems[state.traceIndex];
    if (item) speakTraceItem(item);
  });

  // ------------------------------------------------------------- 따라쓰기 퀴즈
  const TRACE_QUIZ_HINTS = {
    consonant: "어떤 글자로 시작할까요?",
    vowel: "어떤 글자로 시작할까요?",
    syllable: "방금 들은 글자를 찾아보세요",
    word: "그림에 맞는 낱말을 찾아보세요",
  };

  function startTraceQuiz(key) {
    state.traceCategoryKey = key;
    state.traceQuizPool = TRACE_CATEGORIES[key].items;
    traceQuizLabel.textContent = `${TRACE_CATEGORIES[key].label} 퀴즈`;
    traceQuizHint.textContent = TRACE_QUIZ_HINTS[key];
    nextTraceQuizQuestion();
    showScreen("traceQuiz");
  }

  function pickTraceQuizDistractors(target, count) {
    const others = state.traceQuizPool.filter((it) => it.text !== target.text);
    const picked = [];
    while (picked.length < count && others.length) {
      const idx = Math.floor(Math.random() * others.length);
      picked.push(others.splice(idx, 1)[0]);
    }
    return picked;
  }

  function nextTraceQuizQuestion() {
    state.traceQuizLocked = false;
    const pool = state.traceQuizPool;
    const target = pool[Math.floor(Math.random() * pool.length)];
    state.traceQuizTarget = target;

    traceQuizEmoji.textContent = target.emoji || "🔊";
    traceQuizWord.textContent = target.cueWord || "";

    const options = [target, ...pickTraceQuizDistractors(target, 2)];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    traceQuizOptions.innerHTML = "";
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-btn" + (opt.text.length > 1 ? " option-wide" : "");
      btn.textContent = opt.text;
      btn.addEventListener("click", () => handleTraceQuizAnswer(btn, opt));
      traceQuizOptions.appendChild(btn);
    });

    speakTraceItem(target);
  }

  function handleTraceQuizAnswer(btn, opt) {
    if (state.traceQuizLocked) return;
    if (opt.text === state.traceQuizTarget.text) {
      state.traceQuizLocked = true;
      btn.classList.add("correct");
      addStars(1);
      playChime();
      showPraise();
      speak(pickPraise());
      setTimeout(nextTraceQuizQuestion, 1400);
    } else {
      btn.classList.add("wrong");
      speak("다시 해볼까요?");
      setTimeout(() => btn.classList.remove("wrong"), 400);
    }
  }

  // ------------------------------------------------------------- 메뉴 버튼
  document.getElementById("menu-consonant").addEventListener("click", () => openLearn("consonant"));
  document.getElementById("menu-vowel").addEventListener("click", () => openLearn("vowel"));
  document.getElementById("menu-quiz").addEventListener("click", openQuiz);
  document.getElementById("menu-word").addEventListener("click", openWordGame);
  document.getElementById("menu-trace").addEventListener("click", openTraceMenu);
  document.getElementById("trace-menu-consonant").addEventListener("click", () => startTraceCategory("consonant"));
  document.getElementById("trace-menu-vowel").addEventListener("click", () => startTraceCategory("vowel"));
  document.getElementById("trace-menu-syllable").addEventListener("click", () => startTraceCategory("syllable"));
  document.getElementById("trace-menu-word").addEventListener("click", () => startTraceCategory("word"));

  showScreen("home");
})();
