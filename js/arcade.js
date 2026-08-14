/**
 * Retro Garage Arcade Hub — multiple mini-games on one cabinet
 */
const gameCanvas = document.getElementById("piston-arcade-canvas");
const gCtx = gameCanvas?.getContext("2d");

let activeGameId = "dodger";
let gameLoopId = null;
let gameActive = false;
let gameScore = 0;
let highScores = { dodger: 250, breakout: 0, snake: 0, shooter: 0 };

const keys = {
  ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
  a: false, d: false, w: false, s: false, " ": false,
};

function getThemePrimary() {
  return getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim() || "#ff2a2a";
}

/** Shared cartoon car & road drawing helpers */
function drawRoadSurface(w, h, scroll = 0) {
  gCtx.fillStyle = "#1e1e24";
  gCtx.fillRect(0, 0, w, h);
  gCtx.strokeStyle = "#eab308";
  gCtx.lineWidth = 3;
  gCtx.setLineDash([18, 18]);
  gCtx.lineDashOffset = -(scroll || Date.now() / 15) % 36;
  gCtx.beginPath();
  gCtx.moveTo(w / 2, 0);
  gCtx.lineTo(w / 2, h);
  gCtx.stroke();
  gCtx.setLineDash([]);
  gCtx.strokeStyle = "#fff";
  gCtx.lineWidth = 2;
  gCtx.beginPath();
  gCtx.moveTo(8, 0);
  gCtx.lineTo(8, h);
  gCtx.moveTo(w - 8, 0);
  gCtx.lineTo(w - 8, h);
  gCtx.stroke();
}

function drawCartoonCar(x, y, w, h, color, facing = "up") {
  gCtx.fillStyle = color || getThemePrimary();
  if (facing === "up") {
    gCtx.fillRect(x, y, w, h);
    gCtx.fillStyle = "#000";
    gCtx.fillRect(x - 4, y + 4, 7, 10);
    gCtx.fillRect(x + w - 3, y + 4, 7, 10);
    gCtx.fillRect(x - 4, y + h - 14, 7, 12);
    gCtx.fillRect(x + w - 3, y + h - 14, 7, 12);
    gCtx.fillStyle = "#e2e8f0";
    gCtx.fillRect(x + 5, y + 8, w - 10, h * 0.35);
    gCtx.fillStyle = color || getThemePrimary();
    gCtx.fillRect(x + w / 2 - 3, y - 6, 6, 8);
  } else {
    gCtx.fillRect(x, y, w, h);
    gCtx.fillStyle = "#000";
    gCtx.fillRect(x + 3, y + h - 2, 9, 6);
    gCtx.fillRect(x + w - 12, y + h - 2, 9, 6);
    gCtx.fillStyle = "#64748b";
    gCtx.fillRect(x + 6, y + 4, w - 12, h * 0.45);
  }
}

function drawTire(x, y, r) {
  gCtx.fillStyle = "#111";
  gCtx.beginPath();
  gCtx.arc(x, y, r, 0, Math.PI * 2);
  gCtx.fill();
  gCtx.strokeStyle = "#444";
  gCtx.lineWidth = 2;
  gCtx.stroke();
  gCtx.fillStyle = "#666";
  gCtx.beginPath();
  gCtx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  gCtx.fill();
}

function drawTrafficCone(x, y, s) {
  gCtx.fillStyle = "#f97316";
  gCtx.beginPath();
  gCtx.moveTo(x + s / 2, y);
  gCtx.lineTo(x + s, y + s);
  gCtx.lineTo(x, y + s);
  gCtx.closePath();
  gCtx.fill();
  gCtx.fillStyle = "#fff";
  gCtx.fillRect(x + s * 0.25, y + s * 0.45, s * 0.5, s * 0.12);
  gCtx.strokeStyle = "#000";
  gCtx.stroke();
}

function drawOilSpill(x, y, s) {
  gCtx.fillStyle = "#1e293b";
  gCtx.beginPath();
  gCtx.ellipse(x + s / 2, y + s / 2, s * 0.55, s * 0.35, 0, 0, Math.PI * 2);
  gCtx.fill();
  gCtx.fillStyle = "#334155";
  gCtx.beginPath();
  gCtx.ellipse(x + s / 2 - 3, y + s / 2 - 2, s * 0.2, s * 0.12, 0, 0, Math.PI * 2);
  gCtx.fill();
}

function drawNitroCan(x, y, s) {
  gCtx.fillStyle = "#dc2626";
  gCtx.fillRect(x + s * 0.2, y, s * 0.6, s);
  gCtx.fillStyle = "#eab308";
  gCtx.fillRect(x + s * 0.25, y + s * 0.25, s * 0.5, s * 0.35);
  gCtx.fillStyle = "#fff";
  gCtx.font = `bold ${Math.floor(s * 0.35)}px monospace`;
  gCtx.fillText("N", x + s * 0.38, y + s * 0.55);
}

function drawGasPump(x, y, s) {
  gCtx.fillStyle = "#22c55e";
  gCtx.fillRect(x, y + s * 0.2, s * 0.7, s * 0.8);
  gCtx.fillStyle = "#000";
  gCtx.fillRect(x + s * 0.15, y + s * 0.35, s * 0.4, s * 0.25);
  gCtx.fillStyle = "#eab308";
  gCtx.fillRect(x + s * 0.55, y, s * 0.35, s * 0.5);
}

function setupGameCanvas() {
  if (!gameCanvas) return;
  const rect = gameCanvas.parentNode.getBoundingClientRect();
  gameCanvas.width = rect.width;
  gameCanvas.height = 320;
}

function stopCurrentGame() {
  gameActive = false;
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  gameLoopId = null;
  ArcadeGames[activeGameId]?.stop?.();
}

function updateHUD(meta) {
  document.getElementById("game-title").textContent = meta.title;
  document.getElementById("game-subtitle").textContent = meta.subtitle;
  document.getElementById("game-description").innerHTML = meta.description;
  document.getElementById("game-controls-list").innerHTML = meta.controls
    .filter((c) => c[0])
    .map((c) => `<div class="flex justify-between text-xs font-pixel bg-stone-950 p-2 border border-stone-800"><span>${c[0]}</span><span>${c[1]}</span></div>`)
    .join("");
  document.getElementById("game-stat-1-label").textContent = meta.stat1Label || "SPEED:";
  document.getElementById("game-stat-2-label").textContent = meta.stat2Label || "XP:";
  document.getElementById("arcade-high-score").textContent = String(highScores[activeGameId]).padStart(5, "0");

  const touchRow = document.getElementById("touch-controls-row");
  const touchLeft = document.getElementById("touch-left-btn");
  const touchRight = document.getElementById("touch-right-btn");
  const touchAction = document.getElementById("touch-action-btn");

  if (meta.touchMode === "steer") {
    touchRow.classList.remove("hidden");
    touchLeft.classList.remove("hidden");
    touchRight.classList.remove("hidden");
    touchAction.classList.add("hidden");
  } else if (meta.touchMode === "dpad") {
    touchRow.classList.remove("hidden");
    touchLeft.classList.remove("hidden");
    touchRight.classList.remove("hidden");
    touchAction.classList.add("hidden");
  } else if (meta.touchMode === "action") {
    touchRow.classList.remove("hidden");
    touchLeft.classList.remove("hidden");
    touchRight.classList.remove("hidden");
    touchAction.classList.remove("hidden");
    touchAction.innerHTML = meta.actionIcon || '<i class="fa-solid fa-crosshairs text-xl"></i>';
  } else {
    touchRow.classList.add("hidden");
  }
}

function showOverlay(title, message, buttonText) {
  const overlay = document.getElementById("game-overlay");
  if (!overlay) return;
  const studio = document.documentElement.getAttribute("data-skin") === "studio";
  const label = buttonText || (studio ? "Start" : "[ START ENGINE ]");
  overlay.innerHTML = `
    <h3 class="font-cartoon text-4xl text-amber-400 mb-2">${title}</h3>
    <p class="font-pixel text-[10px] text-stone-400 max-w-sm mb-6 leading-loose">${message}</p>
    <button onclick="startArcadeGame()" class="garage-border theme-bg-primary hover:theme-bg-accent text-black font-pixel text-xs px-6 py-3 transition uppercase tracking-widest">
      ${label}
    </button>
  `;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  document.getElementById("game-overlay")?.classList.add("hidden");
}

function endGame(gameOverTitle, message) {
  gameActive = false;
  playDashboardBeep(220, 0.4, "triangle", 0.15);
  playDashboardBeep(110, 0.3, "sawtooth", 0.1);

  if (gameScore > highScores[activeGameId]) {
    highScores[activeGameId] = gameScore;
    document.getElementById("arcade-high-score").textContent = String(gameScore).padStart(5, "0");
    triggerGarageNotification(
      document.documentElement.getAttribute("data-skin") === "studio"
        ? `New high score in ${ArcadeGames[activeGameId].meta.title}: ${gameScore}`
        : `NEW HIGH SCORE in ${ArcadeGames[activeGameId].meta.title}: ${gameScore} XP!`
    );
  } else {
    triggerGarageNotification(
      document.documentElement.getAttribute("data-skin") === "studio"
        ? `${gameOverTitle} Score: ${gameScore}`
        : `${gameOverTitle} Final score: ${gameScore} XP.`
    );
  }

  const studio = document.documentElement.getAttribute("data-skin") === "studio";
  showOverlay(gameOverTitle, `${message} Score: <span class="text-white">${gameScore}${studio ? "" : " XP"}</span>`, studio ? "Play again" : "[ RESTART ENGINE ]");
}

function updateStats(val1, val2, progressPct) {
  document.getElementById("game-speed-val").textContent = val1;
  document.getElementById("game-xp-val").textContent = val2;
  document.getElementById("game-progress-bar").style.width = `${Math.min(100, progressPct)}%`;
}

function selectArcadeGame(gameId) {
  if (!ArcadeGames[gameId]) return;
  playDashboardBeep(520 + Object.keys(ArcadeGames).indexOf(gameId) * 40, 0.08);
  stopCurrentGame();
  activeGameId = gameId;

  document.querySelectorAll(".arcade-cabinet-btn").forEach((btn) => {
    btn.classList.toggle("theme-bg-primary", btn.dataset.game === gameId);
    btn.classList.toggle("text-black", btn.dataset.game === gameId);
    btn.classList.toggle("bg-stone-800", btn.dataset.game !== gameId);
    btn.classList.toggle("text-white", btn.dataset.game !== gameId);
  });

  setupGameCanvas();
  updateHUD(ArcadeGames[gameId].meta);
  ArcadeGames[gameId].reset();
  const studio = document.documentElement.getAttribute("data-skin") === "studio";
  showOverlay(
    studio ? "Ready?" : "READY TO RACE?",
    ArcadeGames[gameId].meta.startMessage || (studio ? "Pick a game and start." : "Insert coin and start your engine!")
  );
}

function startArcadeGame() {
  hideOverlay();
  setupGameCanvas();
  stopCurrentGame();
  gameActive = true;
  gameScore = 0;
  const game = ArcadeGames[activeGameId];
  game.reset();
  game.start();
  triggerGarageNotification(
    document.documentElement.getAttribute("data-skin") === "studio"
      ? `${game.meta.title} — started`
      : `${game.meta.title} — ENGINES ON!`
  );
}

function runGameLoop(tickFn) {
  if (!gameActive || !gCtx || !gameCanvas) return;
  gameLoopId = requestAnimationFrame((t) => {
    if (!gameActive) return;
    tickFn(t);
    runGameLoop(tickFn);
  });
}

/* ─── GAME 1: Highway Heat Dodger ─── */
const BugDodger = {
  meta: {
    title: "Highway Heat Dodger",
    subtitle: "PISTON_CUP_HIGHWAY_v1.0",
    description: 'Steer your hot rod down the strip! Dodge <strong class="text-orange-400">Traffic Cones 🚧</strong> and <strong class="text-stone-400">Oil Spills 🛢️</strong>, grab <strong class="text-red-400">Nitro Cans ⛽</strong> for boost XP.',
    controls: [["LEFT / A", "STEER LEFT"], ["RIGHT / D", "STEER RIGHT"]],
    stat1Label: "MPH:", stat2Label: "NITRO XP:",
    touchMode: "steer",
    startMessage: "Hit the highway — dodge hazards and collect nitro!",
  },
  carX: 150, speed: 5, obstacles: [], collectibles: [], spawnObs: null, spawnCol: null,

  reset() {
    this.carX = (gameCanvas?.width || 400) / 2 - 20;
    this.speed = 5;
    this.obstacles = [];
    this.collectibles = [];
    clearTimeout(this.spawnObs);
    clearTimeout(this.spawnCol);
  },

  start() {
    this.spawnObs = setTimeout(() => this.spawnObstacle(), 800);
    this.spawnCol = setTimeout(() => this.spawnCollectible(), 1200);
    runGameLoop(() => this.tick());
  },

  stop() {
    clearTimeout(this.spawnObs);
    clearTimeout(this.spawnCol);
  },

  spawnObstacle() {
    if (!gameActive) return;
    this.obstacles.push({
      x: Math.random() * (gameCanvas.width - 40),
      y: -50,
      w: 32,
      h: 32,
      type: Math.random() > 0.5 ? "cone" : "oil",
    });
    this.spawnObs = setTimeout(() => this.spawnObstacle(), Math.max(1200 - this.speed * 50, 600));
  },

  spawnCollectible() {
    if (!gameActive) return;
    this.collectibles.push({ x: Math.random() * (gameCanvas.width - 40), y: -50, w: 24, h: 24 });
    this.spawnCol = setTimeout(() => this.spawnCollectible(), 1500);
  },

  tick() {
    drawRoadSurface(gameCanvas.width, gameCanvas.height, Date.now() / (14 - this.speed * 0.5));

    if (keys.ArrowLeft || keys.a) this.carX = Math.max(10, this.carX - 6);
    if (keys.ArrowRight || keys.d) this.carX = Math.min(gameCanvas.width - 50, this.carX + 6);

    drawCartoonCar(this.carX, gameCanvas.height - 70, 38, 55, getThemePrimary(), "up");

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += this.speed;
      if (o.type === "cone") drawTrafficCone(o.x, o.y, o.w);
      else drawOilSpill(o.x, o.y, o.w);

      if (this.carX < o.x + o.w && this.carX + 38 > o.x && gameCanvas.height - 70 < o.y + o.h && gameCanvas.height - 15 > o.y) {
        this.stop();
        return endGame("CRASHED OUT!", "You wiped out on a pit lane hazard!");
      }
      if (o.y > gameCanvas.height) this.obstacles.splice(i, 1);
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.y += this.speed - 1;
      drawNitroCan(c.x, c.y, c.w);
      if (this.carX < c.x + c.w && this.carX + 38 > c.x && gameCanvas.height - 70 < c.y + c.h && gameCanvas.height - 15 > c.y) {
        gameScore += 50;
        playDashboardBeep(880, 0.1, "sine", 0.1);
        this.collectibles.splice(i, 1);
        if (gameScore % 150 === 0) this.speed = Math.min(12, this.speed + 1);
        continue;
      }
      if (c.y > gameCanvas.height) this.collectibles.splice(i, 1);
    }

    updateStats(`${this.speed * 10} MPH`, gameScore, (gameScore / 300) * 100);
  },
};

/* ─── GAME 2: Tire Bounce Pit Stop ─── */
const PitBreakout = {
  meta: {
    title: "Tire Bounce Pit Stop",
    subtitle: "SPARE_TIRE_BREAKOUT_v2.1",
    description: 'Bounce a <strong class="text-stone-300">Spare Tire 🛞</strong> off your bumper to smash stacked <strong class="text-amber-400">Rust Barrels 🛢️</strong> in the pit wall!',
    controls: [["LEFT / A", "SLIDE BUMPER"], ["RIGHT / D", "SLIDE BUMPER"]],
    stat1Label: "BARRELS:", stat2Label: "PIT XP:",
    touchMode: "steer",
    startMessage: "Clear every rust barrel before the tire goes flat!",
  },
  paddle: { x: 0, w: 90, h: 14 },
  ball: { x: 0, y: 0, vx: 3, vy: -4, r: 10 },
  bricks: [], brickRows: 4, brickCols: 8, bricksLeft: 0,

  reset() {
    this.paddle.x = gameCanvas.width / 2 - 45;
    this.ball.x = gameCanvas.width / 2;
    this.ball.y = gameCanvas.height - 50;
    this.ball.vx = (Math.random() > 0.5 ? 1 : -1) * 3.5;
    this.ball.vy = -4;
    this.bricks = [];
    this.bricksLeft = 0;
    const colors = ["#b45309", "#d97706", "#ca8a04", "#92400e"];
    const labels = ["OIL", "RUST", "GEAR", "BOLT"];
    const bw = (gameCanvas.width - 20) / this.brickCols - 4;
    for (let row = 0; row < this.brickRows; row++) {
      for (let col = 0; col < this.brickCols; col++) {
        this.bricks.push({
          x: 10 + col * (bw + 4), y: 30 + row * 22, w: bw, h: 18,
          color: colors[row], label: labels[row], alive: true,
        });
        this.bricksLeft++;
      }
    }
  },

  start() { runGameLoop(() => this.tick()); },
  stop() {},

  tick() {
    gCtx.fillStyle = "#0f172a";
    gCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    gCtx.fillStyle = "#1e293b";
    gCtx.fillRect(0, gameCanvas.height - 36, gameCanvas.width, 36);
    gCtx.fillStyle = "#eab308";
    gCtx.font = "8px monospace";
    gCtx.fillText("PIT LANE", 8, gameCanvas.height - 12);

    if (keys.ArrowLeft || keys.a) this.paddle.x = Math.max(0, this.paddle.x - 7);
    if (keys.ArrowRight || keys.d) this.paddle.x = Math.min(gameCanvas.width - this.paddle.w, this.paddle.x + 7);

    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;

    if (this.ball.x - this.ball.r < 0 || this.ball.x + this.ball.r > gameCanvas.width) this.ball.vx *= -1;
    if (this.ball.y - this.ball.r < 0) this.ball.vy *= -1;

    const py = gameCanvas.height - 30;
    if (this.ball.y + this.ball.r >= py && this.ball.y - this.ball.r <= py + this.paddle.h &&
        this.ball.x >= this.paddle.x && this.ball.x <= this.paddle.x + this.paddle.w) {
      this.ball.vy = -Math.abs(this.ball.vy);
      const hit = (this.ball.x - this.paddle.x) / this.paddle.w - 0.5;
      this.ball.vx = hit * 8;
      playDashboardBeep(440, 0.05);
    }

    if (this.ball.y > gameCanvas.height) {
      this.stop();
      return endGame("FLAT TIRE!", "The spare tire rolled out of the pit!");
    }

    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (this.ball.x + this.ball.r > b.x && this.ball.x - this.ball.r < b.x + b.w &&
          this.ball.y + this.ball.r > b.y && this.ball.y - this.ball.r < b.y + b.h) {
        b.alive = false;
        this.bricksLeft--;
        gameScore += 25;
        this.ball.vy *= -1;
        playDashboardBeep(660, 0.08, "square", 0.06);
        if (this.bricksLeft === 0) {
          gameScore += 200;
          this.stop();
          return endGame("PIT CREW WIN!", "All rust barrels cleared — back on the track!");
        }
        break;
      }
    }

    gCtx.fillStyle = getThemePrimary();
    gCtx.fillRect(this.paddle.x, py, this.paddle.w, this.paddle.h);
    gCtx.fillStyle = "#000";
    gCtx.fillRect(this.paddle.x + 4, py + 2, 12, 10);
    gCtx.fillRect(this.paddle.x + this.paddle.w - 16, py + 2, 12, 10);
    drawTire(this.ball.x, this.ball.y, this.ball.r);

    for (const b of this.bricks) {
      if (!b.alive) continue;
      gCtx.fillStyle = b.color;
      gCtx.fillRect(b.x, b.y, b.w, b.h);
      gCtx.strokeStyle = "#000";
      gCtx.strokeRect(b.x, b.y, b.w, b.h);
      gCtx.fillStyle = "#fef3c7";
      gCtx.font = "8px monospace";
      gCtx.fillText(b.label, b.x + 4, b.y + 13);
    }

    updateStats(`${this.bricksLeft} LEFT`, gameScore, ((this.brickRows * this.brickCols - this.bricksLeft) / (this.brickRows * this.brickCols)) * 100);
  },
};

/* ─── GAME 3: Convoy Chain ─── */
const FuelSnake = {
  meta: {
    title: "Convoy Chain",
    subtitle: "TRUCK_TRAIN_v3.0",
    description: 'Link your <strong class="text-red-400">Hot Rod Convoy 🏎️</strong> across the garage floor. Pick up <strong class="text-green-400">Gas Pumps ⛽</strong> to grow — don\'t rear-end yourself!',
    controls: [["ARROWS / WASD", "STEER LEAD CAR"]],
    stat1Label: "CARS:", stat2Label: "CONVOY XP:",
    touchMode: "dpad",
    startMessage: "Build the longest convoy without crashing!",
  },
  grid: 16, snake: [], dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
  fuel: { x: 0, y: 0 }, tickRate: 120, lastTick: 0,

  reset() {
    const cx = Math.floor((gameCanvas.width / this.grid) / 2);
    const cy = Math.floor((gameCanvas.height / this.grid) / 2);
    this.snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.placeFuel();
    this.lastTick = 0;
  },

  placeFuel() {
    const cols = Math.floor(gameCanvas.width / this.grid);
    const rows = Math.floor(gameCanvas.height / this.grid);
    do {
      this.fuel = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } while (this.snake.some((s) => s.x === this.fuel.x && s.y === this.fuel.y));
  },

  start() { runGameLoop((t) => this.tick(t)); },
  stop() {},

  tick(timestamp = 0) {
    if (timestamp - this.lastTick < this.tickRate) {
      this.draw();
      return;
    }
    this.lastTick = timestamp;

    if (keys.ArrowUp || keys.w) { if (this.dir.y !== 1) this.nextDir = { x: 0, y: -1 }; }
    if (keys.ArrowDown || keys.s) { if (this.dir.y !== -1) this.nextDir = { x: 0, y: 1 }; }
    if (keys.ArrowLeft || keys.a) { if (this.dir.x !== 1) this.nextDir = { x: -1, y: 0 }; }
    if (keys.ArrowRight || keys.d) { if (this.dir.x !== -1) this.nextDir = { x: 1, y: 0 }; }

    this.dir = { ...this.nextDir };
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    const cols = Math.floor(gameCanvas.width / this.grid);
    const rows = Math.floor(gameCanvas.height / this.grid);

    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows ||
        this.snake.some((s) => s.x === head.x && s.y === head.y)) {
      this.stop();
      return endGame("PILE-UP!", "Convoy collision — total gridlock!");
    }

    this.snake.unshift(head);
    if (head.x === this.fuel.x && head.y === this.fuel.y) {
      gameScore += 30;
      playDashboardBeep(770, 0.1);
      this.placeFuel();
      if (gameScore % 90 === 0) this.tickRate = Math.max(70, this.tickRate - 8);
    } else {
      this.snake.pop();
    }

    this.draw();
    updateStats(this.snake.length, gameScore, Math.min(100, (this.snake.length / 20) * 100));
  },

  draw() {
    gCtx.fillStyle = "#1a1a2e";
    gCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    gCtx.strokeStyle = "#334155";
    gCtx.lineWidth = 1;
    for (let x = 0; x < gameCanvas.width; x += this.grid) {
      gCtx.beginPath();
      gCtx.moveTo(x, 0);
      gCtx.lineTo(x, gameCanvas.height);
      gCtx.stroke();
    }
    for (let y = 0; y < gameCanvas.height; y += this.grid) {
      gCtx.beginPath();
      gCtx.moveTo(0, y);
      gCtx.lineTo(gameCanvas.width, y);
      gCtx.stroke();
    }

    drawGasPump(this.fuel.x * this.grid, this.fuel.y * this.grid, this.grid);

    this.snake.forEach((seg, i) => {
      const px = seg.x * this.grid + 1;
      const py = seg.y * this.grid + 1;
      const sz = this.grid - 2;
      if (i === 0) {
        drawCartoonCar(px, py, sz, sz, getThemePrimary(), "up");
      } else {
        gCtx.fillStyle = i % 2 ? "#64748b" : "#475569";
        gCtx.fillRect(px, py, sz, sz);
        gCtx.fillStyle = "#000";
        gCtx.fillRect(px + 2, py + sz - 4, 4, 3);
        gCtx.fillRect(px + sz - 6, py + sz - 4, 4, 3);
      }
    });
  },
};

/* ─── GAME 4: Mud Slinger Rally ─── */
const CompileBlaster = {
  meta: {
    title: "Mud Slinger Rally",
    subtitle: "OFFROAD_BLASTER_v4.0",
    description: 'Drive your rally car and <strong class="text-cyan-400">Sling Mud 💨</strong> at falling <strong class="text-amber-700">Boulder Hazards 🪨</strong> before they crush your hood!',
    controls: [["LEFT / A", "DRIFT LEFT"], ["RIGHT / D", "DRIFT RIGHT"], ["SPACE", "SLING MUD"]],
    stat1Label: "LAP:", stat2Label: "RALLY XP:",
    touchMode: "action",
    actionIcon: '<i class="fa-solid fa-droplet text-xl"></i>',
    startMessage: "Clear the mud track — sling before they hit!",
  },
  ship: { x: 0, w: 40, h: 30 }, bullets: [], enemies: [], spawnTimer: null,
  wave: 1, fireCooldown: 0,

  reset() {
    this.ship.x = gameCanvas.width / 2 - 20;
    this.bullets = [];
    this.enemies = [];
    this.wave = 1;
    this.fireCooldown = 0;
    clearInterval(this.spawnTimer);
  },

  start() {
    this.spawnTimer = setInterval(() => this.spawnEnemy(), Math.max(900 - this.wave * 50, 400));
    runGameLoop(() => this.tick());
  },

  stop() { clearInterval(this.spawnTimer); },

  spawnEnemy() {
    if (!gameActive) return;
    this.enemies.push({
      x: Math.random() * (gameCanvas.width - 34),
      y: -34, w: 30, h: 30, vy: 1.5 + this.wave * 0.3,
      type: Math.random() > 0.5 ? "boulder" : "barrel",
    });
  },

  fire() {
    if (this.fireCooldown > 0) return;
    this.bullets.push({ x: this.ship.x + 18, y: gameCanvas.height - 52, vy: -9 });
    this.fireCooldown = 12;
    playDashboardBeep(900, 0.06, "square", 0.04);
  },

  tick() {
    drawRoadSurface(gameCanvas.width, gameCanvas.height, Date.now() / 8);

    if (keys.ArrowLeft || keys.a) this.ship.x = Math.max(0, this.ship.x - 5);
    if (keys.ArrowRight || keys.d) this.ship.x = Math.min(gameCanvas.width - this.ship.w, this.ship.x + 5);
    if (keys[" "]) this.fire();
    if (this.fireCooldown > 0) this.fireCooldown--;

    drawCartoonCar(this.ship.x, gameCanvas.height - 48, this.ship.w, this.ship.h, getThemePrimary(), "up");

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += b.vy;
      gCtx.fillStyle = "#92400e";
      gCtx.beginPath();
      gCtx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      gCtx.fill();
      gCtx.fillStyle = "#a16207";
      gCtx.beginPath();
      gCtx.arc(b.x - 1, b.y - 1, 2, 0, Math.PI * 2);
      gCtx.fill();
      if (b.y < 0) this.bullets.splice(i, 1);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.y += e.vy;
      if (e.type === "boulder") {
        gCtx.fillStyle = "#78716c";
        gCtx.beginPath();
        gCtx.arc(e.x + 15, e.y + 15, 14, 0, Math.PI * 2);
        gCtx.fill();
        gCtx.strokeStyle = "#44403c";
        gCtx.stroke();
      } else {
        gCtx.fillStyle = "#b45309";
        gCtx.fillRect(e.x + 4, e.y + 8, e.w - 8, e.h - 8);
        gCtx.fillStyle = "#78350f";
        gCtx.fillRect(e.x + 8, e.y, e.w - 16, 8);
      }

      if (e.y + e.h >= gameCanvas.height - 48 && e.x + e.w > this.ship.x && e.x < this.ship.x + this.ship.w) {
        this.stop();
        return endGame("HOOD CRUSHED!", "A boulder smashed your rally car!");
      }
      if (e.y > gameCanvas.height) this.enemies.splice(i, 1);

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
          this.enemies.splice(i, 1);
          this.bullets.splice(j, 1);
          gameScore += 40;
          playDashboardBeep(1100, 0.06);
          if (gameScore > 0 && gameScore % 200 === 0) {
            this.wave++;
            clearInterval(this.spawnTimer);
            this.spawnTimer = setInterval(() => this.spawnEnemy(), Math.max(900 - this.wave * 50, 400));
          }
          break;
        }
      }
    }

    updateStats(`LAP ${this.wave}`, gameScore, Math.min(100, (gameScore / 400) * 100));
  },
};

/* ─── GAME 5: Drag Strip Launch ─── */
const ReactionPitStop = {
  meta: {
    title: "Drag Strip Launch",
    subtitle: "CHRISTMAS_TREE_v5.0",
    description: 'Stage your <strong class="text-red-400">Drag Racer 🏁</strong> at the Christmas Tree — hit SPACE the instant the lights go <strong class="text-green-400">Green</strong>. False start = disqualified!',
    controls: [["SPACE", "LAUNCH ON GREEN"], ["R", "RESTAGE CAR"]],
    stat1Label: "BEST 0-60:", stat2Label: "DRAG XP:",
    touchMode: "action",
    actionIcon: '<i class="fa-solid fa-flag-checkered text-xl"></i>',
    startMessage: "Stage at the line — reaction time wins the race!",
  },
  phase: "idle", lights: [false, false, false], greenAt: 0, reactionMs: null,
  bestMs: Infinity, falseStart: false, rKeyWasDown: false, carProgress: 0,

  reset() {
    this.phase = "countdown";
    this.lights = [false, false, false];
    this.reactionMs = null;
    this.falseStart = false;
    this.rKeyWasDown = false;
    this.carProgress = 0;
    setTimeout(() => this.lightSequence(0), 600);
  },

  start() { runGameLoop(() => this.tick()); },
  stop() {},

  lightSequence(i) {
    if (!gameActive || this.phase !== "countdown") return;
    if (i < 3) {
      this.lights[i] = true;
      playDashboardBeep(300 + i * 80, 0.15, "square", 0.08);
      setTimeout(() => this.lightSequence(i + 1), 700 + Math.random() * 400);
    } else {
      this.greenAt = performance.now();
      this.phase = "go";
      playDashboardBeep(880, 0.2, "sine", 0.1);
    }
  },

  launch() {
    if (this.phase === "countdown") {
      this.falseStart = true;
      this.phase = "done";
      playDashboardBeep(150, 0.5, "sawtooth", 0.12);
      this.stop();
      return endGame("FALSE START!", "Red light foul — you're disqualified!");
    }
    if (this.phase === "go") {
      this.reactionMs = Math.round(performance.now() - this.greenAt);
      this.phase = "done";
      this.carProgress = 1;
      const pts = Math.max(10, 300 - this.reactionMs);
      gameScore += pts;
      if (this.reactionMs < this.bestMs) this.bestMs = this.reactionMs;
      playDashboardBeep(1200, 0.15);
      setTimeout(() => { if (gameActive) this.reset(); }, 1800);
    }
  },

  tick() {
    gCtx.fillStyle = "#1c1917";
    gCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    drawRoadSurface(gameCanvas.width, gameCanvas.height * 0.55, 0);

    gCtx.fillStyle = "#374151";
    gCtx.fillRect(gameCanvas.width / 2 - 14, 20, 28, 170);
    gCtx.fillStyle = "#111";
    gCtx.fillRect(gameCanvas.width / 2 - 20, 190, 40, 8);

    const colors = this.phase === "go"
      ? ["#22c55e", "#22c55e", "#22c55e"]
      : this.lights.map((on) => (on ? "#ef4444" : "#374151"));

    colors.forEach((c, i) => {
      gCtx.fillStyle = c;
      gCtx.beginPath();
      gCtx.arc(gameCanvas.width / 2, 50 + i * 50, 20, 0, Math.PI * 2);
      gCtx.fill();
      gCtx.strokeStyle = "#000";
      gCtx.lineWidth = 3;
      gCtx.stroke();
    });

    const carY = gameCanvas.height - 70 + (this.carProgress ? -40 : 0);
    drawCartoonCar(gameCanvas.width / 2 - 19, carY, 38, 55, getThemePrimary(), "up");

    if (this.carProgress) {
      gCtx.strokeStyle = "rgba(255,255,255,0.3)";
      gCtx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        gCtx.beginPath();
        gCtx.moveTo(gameCanvas.width / 2 - 60 - i * 20, carY + 20);
        gCtx.lineTo(gameCanvas.width / 2 - 80 - i * 20, carY + 20);
        gCtx.stroke();
      }
    }

    gCtx.fillStyle = "#f8fafc";
    gCtx.font = "10px 'Press Start 2P', monospace";
    gCtx.textAlign = "center";

    if (this.phase === "idle" || this.phase === "countdown") {
      gCtx.fillText("STAGE YOUR CAR...", gameCanvas.width / 2, gameCanvas.height - 12);
    } else if (this.phase === "go") {
      gCtx.fillStyle = "#22c55e";
      gCtx.fillText("GREEN! LAUNCH!", gameCanvas.width / 2, gameCanvas.height - 12);
    } else if (this.reactionMs !== null) {
      gCtx.fillStyle = "#eab308";
      gCtx.fillText(`${this.reactionMs}ms 0-60`, gameCanvas.width / 2, gameCanvas.height - 20);
      gCtx.fillStyle = "#94a3b8";
      gCtx.font = "8px 'Press Start 2P', monospace";
      gCtx.fillText("RESTAGING...", gameCanvas.width / 2, gameCanvas.height - 6);
    }

    gCtx.textAlign = "left";

    if (keys[" "]) {
      keys[" "] = false;
      this.launch();
    }
    if (keys.r && !this.rKeyWasDown) {
      this.rKeyWasDown = true;
      this.reset();
    }
    if (!keys.r) this.rKeyWasDown = false;

    const best = this.bestMs === Infinity ? "—" : `${this.bestMs}ms`;
    updateStats(best, gameScore, Math.min(100, gameScore / 5));
  },
};

const ArcadeGames = {
  dodger: BugDodger,
  breakout: PitBreakout,
  snake: FuelSnake,
  shooter: CompileBlaster,
  reaction: ReactionPitStop,
};

function initArcade() {
  setupGameCanvas();
  selectArcadeGame("dodger");

  window.addEventListener("keydown", (e) => {
    if (e.key in keys) {
      keys[e.key] = true;
      if (e.key === " ") e.preventDefault();
    }
    if (e.key === "r" || e.key === "R") keys.r = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.key in keys) keys[e.key] = false;
    if (e.key === "r" || e.key === "R") keys.r = false;
  });

  document.querySelectorAll(".arcade-cabinet-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectArcadeGame(btn.dataset.game));
  });

  document.getElementById("touch-left-btn")?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys.ArrowLeft = true;
  });
  document.getElementById("touch-left-btn")?.addEventListener("touchend", (e) => {
    e.preventDefault();
    keys.ArrowLeft = false;
  });
  document.getElementById("touch-right-btn")?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (activeGameId === "snake") keys.ArrowUp = true;
    else keys.ArrowRight = true;
  });
  document.getElementById("touch-right-btn")?.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (activeGameId === "snake") keys.ArrowUp = false;
    else keys.ArrowRight = false;
  });
  document.getElementById("touch-action-btn")?.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys[" "] = true;
    if (activeGameId === "shooter") ArcadeGames.shooter.fire();
  });
  document.getElementById("touch-action-btn")?.addEventListener("touchend", (e) => {
    e.preventDefault();
    keys[" "] = false;
  });

  window.addEventListener("resize", setupGameCanvas);
}

document.addEventListener("DOMContentLoaded", initArcade);

// Legacy alias
function startGame() { startArcadeGame(); }
