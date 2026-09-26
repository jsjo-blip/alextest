(() => {
  "use strict";

  // ------------------------------------------------------------ 종목 설정
  // period: 줄이 한 바퀴 도는 시간(초). jumpV/gravity: 점프 초기속도/중력(px/s, px/s²).
  const EVENTS = {
    basic: {
      name: "기본 뛰기",
      color: "#3aa7f0",
      startPeriod: 0.9,
      minPeriod: 0.5,
      speedUp: 0.008, // 성공할 때마다 줄어드는 주기
      jumpV: 680,
      gravity: 2800,
    },
    double: {
      name: "쌩쌩이",
      color: "#ff7a4d",
      startPeriod: 0.44,
      minPeriod: 0.4,
      speedUp: 0.002,
      jumpV: 960,
      gravity: 3000,
    },
    cross: {
      name: "엇걸어뛰기",
      color: "#9a6bff",
      startPeriod: 1.0,
      minPeriod: 0.6,
      speedUp: 0.008,
      jumpV: 680,
      gravity: 2800,
    },
  };

  const W = 800;
  const H = 450;
  const GROUND_Y = 400;
  const CX = W / 2;
  const CLEAR_HEIGHT = 10; // 줄이 발밑을 지날 때 이만큼 떠 있어야 통과
  const ROPE_R = 80;

  // ------------------------------------------------------------ DOM
  const $ = (sel) => document.querySelector(sel);
  const screens = { menu: $("#screen-menu"), game: $("#screen-game") };
  const canvas = $("#game-canvas");
  const ctx = canvas.getContext("2d");
  const hudEvent = $("#hud-event");
  const hudCount = $("#hud-count");
  const hudBest = $("#hud-best");

  // ------------------------------------------------------------ 최고 기록 (브라우저 저장)
  function loadBest(key) {
    try {
      return Number(localStorage.getItem("jump-rope-best-" + key) || 0);
    } catch (e) {
      return 0;
    }
  }
  function saveBest(key, value) {
    try {
      localStorage.setItem("jump-rope-best-" + key, String(value));
    } catch (e) {
      /* 저장 불가 환경에서는 무시 */
    }
  }
  function refreshMenuBest() {
    document.querySelectorAll("[data-best]").forEach((el) => {
      el.textContent = loadBest(el.dataset.best);
    });
  }

  // ------------------------------------------------------------ 효과음
  let audioCtx = null;
  function beep(freq, duration, type = "sine", volume = 0.15) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      /* 오디오 미지원 */
    }
  }

  // ------------------------------------------------------------ 게임 상태
  let game = null;

  function newGame(eventKey) {
    const cfg = EVENTS[eventKey];
    return {
      key: eventKey,
      cfg,
      state: "ready", // ready → playing → over
      count: 0,
      best: loadBest(eventKey),
      period: cfg.startPeriod,
      angle: Math.PI, // 0 = 머리 위, π = 발밑. 줄이 발 뒤에 있는 상태로 시작
      elapsed: 0,
      height: 0, // 땅에서 발까지 높이
      vy: 0,
      airborne: false,
      passesThisJump: 0,
      crossed: false,
      popups: [],
      overAt: 0,
      flash: 0,
    };
  }

  function startEvent(eventKey) {
    game = newGame(eventKey);
    hudEvent.textContent = game.cfg.name;
    hudEvent.style.color = game.cfg.color;
    updateHud();
    showScreen("game");
  }

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
    if (name === "menu") {
      game = null;
      refreshMenuBest();
    }
  }

  function updateHud() {
    hudCount.textContent = game.count;
    hudBest.textContent = game.best;
  }

  function popup(text, color) {
    game.popups.push({ text, color, life: 0.9 });
  }

  // ------------------------------------------------------------ 입력
  function onAction() {
    if (!game) return;
    if (game.state === "ready") {
      game.state = "playing";
      return;
    }
    if (game.state === "over") {
      if (performance.now() - game.overAt > 500) startEvent(game.key);
      return;
    }
    if (!game.airborne) {
      game.airborne = true;
      game.vy = game.cfg.jumpV;
      game.passesThisJump = 0;
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) onAction();
    } else if (e.code === "Escape" && game) {
      showScreen("menu");
    }
  });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    onAction();
  });
  document.querySelectorAll(".event-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.blur(); // 스페이스 바가 버튼을 다시 누르지 않도록
      startEvent(btn.dataset.event);
    });
  });
  $("#back-btn").addEventListener("click", (e) => {
    e.currentTarget.blur();
    showScreen("menu");
  });

  // ------------------------------------------------------------ 업데이트
  function update(dt) {
    const g = game;
    g.popups.forEach((p) => (p.life -= dt));
    g.popups = g.popups.filter((p) => p.life > 0);
    g.flash = Math.max(0, g.flash - dt);
    if (g.state !== "playing") return;

    g.elapsed += dt;

    // 점프 물리
    if (g.airborne) {
      g.vy -= g.cfg.gravity * dt;
      g.height += g.vy * dt;
      if (g.height <= 0) {
        g.height = 0;
        g.airborne = false;
        onLand();
      }
    }

    // 줄 회전 (시작 직후엔 천천히 돌기 시작)
    const warmup = Math.min(1, 0.5 + g.elapsed * 0.8);
    const prev = g.angle;
    g.angle += ((2 * Math.PI) / g.period) * warmup * dt;

    // 줄이 머리 위를 지남 → 엇걸어뛰기는 팔 모양 전환
    if (Math.floor(g.angle / (2 * Math.PI)) > Math.floor(prev / (2 * Math.PI))) {
      if (g.key === "cross") g.crossed = !g.crossed;
    }

    // 줄이 발밑을 지남 → 판정
    const bottom = (a) => Math.floor((a - Math.PI) / (2 * Math.PI));
    if (bottom(g.angle) > bottom(prev)) {
      if (g.height < CLEAR_HEIGHT) {
        trip();
      } else {
        onPass();
      }
    }
  }

  function onPass() {
    const g = game;
    g.passesThisJump += 1;
    if (g.key === "double") {
      beep(g.passesThisJump >= 2 ? 880 : 520, 0.06, "triangle");
      return; // 쌩쌩이는 착지할 때 판정
    }
    addCount(g.crossed ? "엇걸어!" : "좋아요!");
  }

  function onLand() {
    const g = game;
    if (g.key !== "double") return;
    if (g.passesThisJump >= 3) {
      addCount("쌩쌩쌩!!");
    } else if (g.passesThisJump === 2) {
      addCount("쌩쌩!");
    } else if (g.passesThisJump === 1) {
      popup("한 번만 넘었어요", "#999");
    }
  }

  function addCount(text) {
    const g = game;
    g.count += 1;
    g.period = Math.max(g.cfg.minPeriod, g.period - g.cfg.speedUp);
    if (g.count > g.best) {
      g.best = g.count;
      saveBest(g.key, g.best);
    }
    popup(text, g.cfg.color);
    beep(660 + Math.min(g.count, 40) * 10, 0.08, "triangle");
    updateHud();
  }

  function trip() {
    const g = game;
    g.state = "over";
    g.overAt = performance.now();
    g.flash = 0.4;
    g.angle = Math.PI; // 줄이 발에 걸린 채로 멈춤
    beep(140, 0.35, "sawtooth", 0.12);
  }

  // ------------------------------------------------------------ 그리기
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function bodyPose(g) {
    const footY = GROUND_Y - g.height;
    const shoulderY = footY - 105;
    const handY = footY - 72;
    // 엇걸어뛰기: 두 손이 몸 앞에서 교차 (왼손이 오른쪽, 오른손이 왼쪽)
    const hands = g.crossed
      ? { left: { x: CX + 26, y: handY - 6 }, right: { x: CX - 26, y: handY - 6 } }
      : { left: { x: CX - 44, y: handY }, right: { x: CX + 44, y: handY } };
    return {
      footY,
      hipY: footY - 52,
      shoulderY,
      headY: footY - 126,
      shoulders: { left: { x: CX - 16, y: shoulderY }, right: { x: CX + 16, y: shoulderY } },
      hands,
    };
  }

  function drawRope(g, pose, front) {
    const inFront = Math.sin(g.angle) > 0; // 0→π 구간: 몸 앞에서 내려옴
    if (inFront !== front) return;
    const { left, right } = pose.hands;
    const handMidY = (left.y + right.y) / 2;
    const midX = (left.x + right.x) / 2;
    let midY = handMidY - ROPE_R * Math.cos(g.angle);
    midY = Math.min(midY, GROUND_Y + 2); // 땅바닥 아래로는 못 내려감
    // 곡선의 가운데가 (midX, midY)를 지나도록 제어점 계산
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    if (g.crossed) {
      // 엇걸어 상태에서는 줄이 교차한 손 바깥쪽으로 고리를 만듦
      const cpY = (8 * midY - 2 * handMidY) / 6;
      ctx.bezierCurveTo(left.x + 60, cpY, right.x - 60, cpY, right.x, right.y);
    } else {
      ctx.quadraticCurveTo(midX, 2 * midY - handMidY, right.x, right.y);
    }
    ctx.lineWidth = front ? 4 : 2.5;
    ctx.strokeStyle = g.state === "over" ? "#e5484d" : front ? "#2d2a4a" : "#9a97b8";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawPerson(g, pose) {
    const color = g.cfg.color;
    const tucked = g.airborne && g.key === "double" ? 1 : g.airborne ? 0.5 : 0;

    // 그림자
    const shadowScale = Math.max(0.4, 1 - g.height / 250);
    ctx.fillStyle = "rgba(45, 42, 74, 0.15)";
    ctx.beginPath();
    ctx.ellipse(CX, GROUND_Y + 4, 34 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 다리 (공중에서는 무릎을 굽힘)
    ctx.strokeStyle = "#2d2a4a";
    ctx.lineWidth = 9;
    const kneeOut = 10 + tucked * 12;
    const kneeY = pose.hipY + 26 - tucked * 8;
    const footRise = tucked * 14;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.moveTo(CX + s * 8, pose.hipY);
      ctx.lineTo(CX + s * kneeOut, kneeY);
      ctx.lineTo(CX + s * 10, pose.footY - footRise);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CX + s * 10, pose.footY - footRise);
      ctx.lineTo(CX + s * 20, pose.footY - footRise);
      ctx.stroke();
    });

    // 몸통
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(CX - 20, pose.shoulderY - 6, 40, pose.hipY - pose.shoulderY + 10, 12);
    ctx.fill();

    // 팔
    ctx.strokeStyle = "#f2c29b";
    ctx.lineWidth = 8;
    ["left", "right"].forEach((side) => {
      const sh = pose.shoulders[side];
      const hand = pose.hands[side];
      line(sh.x, sh.y, hand.x, hand.y);
    });
    // 손잡이
    ctx.strokeStyle = "#ffcf3f";
    ctx.lineWidth = 7;
    ["left", "right"].forEach((side) => {
      const hand = pose.hands[side];
      line(hand.x, hand.y - 6, hand.x, hand.y + 6);
    });

    // 머리
    ctx.fillStyle = "#f2c29b";
    ctx.beginPath();
    ctx.arc(CX, pose.headY, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d2a4a";
    ctx.beginPath();
    ctx.arc(CX, pose.headY - 5, 19, Math.PI, Math.PI * 2);
    ctx.fill();
    // 얼굴
    if (g.state === "over") {
      ctx.strokeStyle = "#2d2a4a";
      ctx.lineWidth = 2;
      [-7, 7].forEach((dx) => {
        line(CX + dx - 3, pose.headY + 1, CX + dx + 3, pose.headY + 7);
        line(CX + dx + 3, pose.headY + 1, CX + dx - 3, pose.headY + 7);
      });
    } else {
      ctx.fillStyle = "#2d2a4a";
      [-7, 7].forEach((dx) => {
        ctx.beginPath();
        ctx.arc(CX + dx, pose.headY + 3, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = "#2d2a4a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CX, pose.headY + 8, 5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }

  function drawSpeedLines(g, pose) {
    if (g.key !== "double" || g.state !== "playing") return;
    ctx.strokeStyle = "rgba(255, 122, 77, 0.35)";
    ctx.lineWidth = 3;
    const t = g.elapsed * 12;
    for (let i = 0; i < 4; i++) {
      const y = pose.footY - 20 - i * 30;
      const off = ((t + i * 7) % 20) - 10;
      line(CX - 120 - off, y, CX - 80 - off, y);
      line(CX + 80 + off, y, CX + 120 + off, y);
    }
  }

  function draw() {
    const g = game;
    ctx.clearRect(0, 0, W, H);

    // 배경
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, "#dff0ff");
    sky.addColorStop(1, "#fdf6ee");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y);
    ctx.fillStyle = "#e9c89b";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.strokeStyle = "#d4ae7c";
    ctx.lineWidth = 2;
    line(0, GROUND_Y, W, GROUND_Y);

    // 배경 큰 숫자
    ctx.fillStyle = "rgba(45, 42, 74, 0.07)";
    ctx.font = "bold 200px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(g.count), CX, 200);

    const pose = bodyPose(g);
    drawSpeedLines(g, pose);
    drawRope(g, pose, false);
    drawPerson(g, pose);
    drawRope(g, pose, true);

    // 엇걸어뛰기 팔 상태 표시
    if (g.key === "cross" && g.state === "playing") {
      ctx.font = "bold 22px sans-serif";
      ctx.fillStyle = g.crossed ? g.cfg.color : "#6b6890";
      ctx.fillText(g.crossed ? "✖ 엇걸어" : "↔ 벌려", CX + 190, 90);
    }

    // 팝업 텍스트
    g.popups.forEach((p) => {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.font = "bold 30px sans-serif";
      ctx.fillText(p.text, CX - 190, 130 - (0.9 - p.life) * 40);
      ctx.globalAlpha = 1;
    });

    // 걸렸을 때 붉은 번쩍임
    if (g.flash > 0) {
      ctx.fillStyle = `rgba(229, 72, 77, ${g.flash * 0.5})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 안내 오버레이
    if (g.state === "ready") {
      overlay(g.cfg.name, "스페이스 바를 누르면 줄이 돌기 시작해요", describeEvent(g.key));
    } else if (g.state === "over") {
      const record = g.count > 0 && g.count === g.best ? "🎉 최고 기록!" : `최고 기록 ${g.best}회`;
      overlay(`걸렸어요! ${g.count}회`, "스페이스 바: 다시 하기 · Esc: 종목 선택", record);
    }
  }

  function describeEvent(key) {
    if (key === "double") return "높이 뛰어서 한 번 점프에 줄을 두 번 넘기세요";
    if (key === "cross") return "팔이 벌려 → 엇걸어로 번갈아 바뀌어요";
    return "줄이 발밑에 오기 직전에 점프!";
  }

  function overlay(title, sub, extra) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.beginPath();
    ctx.roundRect(CX - 250, 40, 500, 150, 18);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#2d2a4a";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(title, CX, 82);
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#6b6890";
    ctx.fillText(extra, CX, 125);
    ctx.fillText(sub, CX, 158);
  }

  // ------------------------------------------------------------ 루프
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (game) {
      update(dt);
      draw();
    }
    requestAnimationFrame(loop);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  refreshMenuBest();
  requestAnimationFrame(loop);
})();
