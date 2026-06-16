/**
 * Marauder's Retro Portfolio — interactions
 */

let audioMuted = false;
let audioCtx = null;
let particles = [];
let level = 12;
let currentQuestionIdx = 0;
let houseVotes = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
let isDrawing = false;
let drawPoints = [];

const attributes = { dada: 94, potions: 88, runes: 81, creatures: 76 };

const sortingQuestions = [
  {
    text: "Choose your primary developer tool asset:",
    choices: [
      { text: "Sword of Clean Architecture (Refactor Everything)", house: "Gryffindor" },
      { text: "Invisibility Cloak of Silent Stealth (Undetected Backend)", house: "Slytherin" },
      { text: "Wand of Extreme Logic (Rigorous Math/Structure)", house: "Ravenclaw" },
      { text: "Cauldron of Shared Brew (Helpful Community Docs)", house: "Hufflepuff" },
    ],
  },
  {
    text: "A production pipeline collapses near release. Your reflex is:",
    choices: [
      { text: "Charge in courageously and manually fix the live environment!", house: "Gryffindor" },
      { text: "Route responsibility to minor contractors gracefully.", house: "Slytherin" },
      { text: "Analyze the root compiler logs comprehensively.", house: "Ravenclaw" },
      { text: "Coordinate a comforting support group with cookies first.", house: "Hufflepuff" },
    ],
  },
  {
    text: "Select your favorite potion formulation ingredient:",
    choices: [
      { text: "Fiery Dragon blood (Extremely Fast Compiled GPU)", house: "Gryffindor" },
      { text: "Subtle Venom of Silent Serpents (High-Grade Exploits)", house: "Slytherin" },
      { text: "Powdered Sage of Absolute Wisemen (Elegant Machine Learning)", house: "Ravenclaw" },
      { text: "Kind Mandrake soil (Accessible APIs for everyone)", house: "Hufflepuff" },
    ],
  },
];

const houseThemeConfigs = {
  Gryffindor: { primary: "#740001", secondary: "#ae0001", accent: "#eeb939", accentRGB: "238, 185, 57", emoji: "🦁" },
  Slytherin: { primary: "#1a472a", secondary: "#2a623d", accent: "#aaaaaa", accentRGB: "170, 170, 170", emoji: "🐍" },
  Ravenclaw: { primary: "#0e1a40", secondary: "#222f5b", accent: "#946b2d", accentRGB: "148, 107, 45", emoji: "🦅" },
  Hufflepuff: { primary: "#ecb939", secondary: "#f0c75e", accent: "#372e29", accentRGB: "55, 46, 41", emoji: "🦡" },
};

let canvas, ctx, drawCanvas, drawCtx;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("wand-canvas");
  ctx = canvas?.getContext("2d");
  drawCanvas = document.getElementById("sandbox-draw-pad");
  drawCtx = drawCanvas?.getContext("2d");

  if (canvas && ctx) {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", (e) => {
      for (let i = 0; i < 2; i++) particles.push(new Particle(e.clientX, e.clientY));
    });
    animateParticles();
  }

  if (drawCanvas && drawCtx) {
    setTimeout(resizeDrawCanvas, 100);
    window.addEventListener("resize", resizeDrawCanvas);
    drawCanvas.addEventListener("mousedown", startDrawing);
    drawCanvas.addEventListener("touchstart", startDrawing, { passive: true });
    drawCanvas.addEventListener("mousemove", draw);
    drawCanvas.addEventListener("touchmove", draw, { passive: true });
    drawCanvas.addEventListener("mouseup", stopDrawing);
    drawCanvas.addEventListener("touchend", stopDrawing);
  }

  startSortingQuiz();
});

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playBeep(frequency, duration, type = "sine") {
  if (audioMuted) return;
  initAudio();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function playMagicalSwoosh() {
  if (audioMuted) return;
  initAudio();
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.45);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(now + 0.45);
  } catch (_) {}
}

function toggleMute() {
  audioMuted = !audioMuted;
  const icon = document.getElementById("sfx-icon");
  const text = document.querySelector("#sfx-toggle span");
  if (audioMuted) {
    icon.className = "fa-solid fa-volume-xmark";
    if (text) text.textContent = "SOUNDS OFF";
  } else {
    icon.className = "fa-solid fa-volume-high";
    if (text) text.textContent = "SOUNDS ON";
    playBeep(600, 0.15);
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 3;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * -1.5 - 0.5;
    this.life = 1.0;
    this.decay = Math.random() * 0.03 + 0.015;
    this.color = getThemeParticleColor();
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= this.decay;
    if (this.size > 0.1) this.size -= 0.1;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.size);
    ctx.lineTo(this.x + this.size * 0.4, this.y - this.size * 0.4);
    ctx.lineTo(this.x + this.size, this.y);
    ctx.lineTo(this.x + this.size * 0.4, this.y + this.size * 0.4);
    ctx.lineTo(this.x, this.y + this.size);
    ctx.lineTo(this.x - this.size * 0.4, this.y + this.size * 0.4);
    ctx.lineTo(this.x - this.size, this.y);
    ctx.lineTo(this.x - this.size * 0.4, this.y - this.size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function getThemeParticleColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--theme-accent").trim() || "#eeb939";
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function animateParticles() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].life <= 0) {
      particles.splice(i, 1);
      i--;
    }
  }
  requestAnimationFrame(animateParticles);
}

function triggerNotification(text) {
  const alertBox = document.getElementById("retro-alert");
  const alertText = document.getElementById("retro-alert-text");
  if (alertText) alertText.textContent = text;
  alertBox?.classList.remove("hidden");
  playBeep(660, 0.12);
  playBeep(880, 0.15);
}

function dismissAlert() {
  document.getElementById("retro-alert")?.classList.add("hidden");
  playBeep(330, 0.08);
}

function projectCastAlert(projectName) {
  triggerNotification(`Accio Cast! Conjuring files for ${projectName}...`);
}

function startSortingQuiz() {
  currentQuestionIdx = 0;
  houseVotes = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
  renderTerminalQuestion();
  playBeep(440, 0.2, "triangle");
}

function renderTerminalQuestion() {
  const qEl = document.getElementById("sorting-question");
  const choicesContainer = document.getElementById("terminal-choices");
  if (!qEl || !choicesContainer) return;

  if (currentQuestionIdx < sortingQuestions.length) {
    const currentQ = sortingQuestions[currentQuestionIdx];
    qEl.textContent = `[QUESTION ${currentQuestionIdx + 1}/${sortingQuestions.length}] ${currentQ.text}`;
    choicesContainer.innerHTML = "";
    currentQ.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.className =
        "w-full text-left p-2 border border-green-800 hover:bg-green-950/40 text-sm font-retro-terminal transition duration-150 flex items-start gap-2";
      btn.innerHTML = `<span class="text-green-500 font-pixel text-[9px] mt-1">[${idx + 1}]</span> <span>${choice.text}</span>`;
      btn.onclick = () => handleChoice(choice.house);
      choicesContainer.appendChild(btn);
    });
  } else {
    calculateSortingResult();
  }
}

function handleChoice(house) {
  houseVotes[house]++;
  currentQuestionIdx++;
  playBeep(520, 0.08, "sine");
  renderTerminalQuestion();
}

function calculateSortingResult() {
  let sortedHouse = "Gryffindor";
  let maxVotes = -1;
  for (const [house, votes] of Object.entries(houseVotes)) {
    if (votes > maxVotes) {
      maxVotes = votes;
      sortedHouse = house;
    }
  }
  applyHouseTheme(sortedHouse);

  const qEl = document.getElementById("sorting-question");
  const choicesContainer = document.getElementById("terminal-choices");
  if (qEl) qEl.textContent = "// ANALYSIS COMPLETE! The Sorting Hat detects your deep inner potential...";
  if (choicesContainer) {
    choicesContainer.innerHTML = `
      <div class="col-span-1 md:col-span-2 text-center p-6 border-2 border-dashed border-green-500 bg-green-950 bg-opacity-30">
        <p class="font-pixel text-xl tracking-widest text-green-300 animate-bounce mb-2">${sortedHouse.toUpperCase()}!</p>
        <p class="font-vintage text-base text-white">The entire portfolio has re-attuned its magical frequencies to match your newly sorted House.</p>
      </div>
    `;
  }
  playMagicalSwoosh();
  triggerNotification(`Sorted into ${sortedHouse}! Portal alignment complete.`);
}

function applyHouseTheme(house) {
  const config = houseThemeConfigs[house];
  if (!config) return;
  document.documentElement.style.setProperty("--theme-primary", config.primary);
  document.documentElement.style.setProperty("--theme-secondary", config.secondary);
  document.documentElement.style.setProperty("--theme-accent", config.accent);
  document.documentElement.style.setProperty("--theme-accent-rgb", config.accentRGB);
  const display = document.getElementById("active-house-display");
  const emoji = document.getElementById("house-emoji");
  if (display) display.textContent = house.toUpperCase();
  if (emoji) emoji.textContent = config.emoji;
  updateBarThemes();
}

function updateBarThemes() {
  document.querySelectorAll(".house-bg-primary").forEach((el) => {
    el.style.backgroundColor = "var(--theme-primary)";
  });
  document.querySelectorAll(".house-text-primary").forEach((el) => {
    el.style.color = "var(--theme-primary)";
  });
}

function triggerLevelUp() {
  level++;
  const levelEl = document.getElementById("wizard-level");
  if (levelEl) levelEl.textContent = level;

  attributes.dada = Math.min(100, attributes.dada + Math.floor(Math.random() * 3 + 1));
  attributes.potions = Math.min(100, attributes.potions + Math.floor(Math.random() * 3 + 1));
  attributes.runes = Math.min(100, attributes.runes + Math.floor(Math.random() * 3 + 1));
  attributes.creatures = Math.min(100, attributes.creatures + Math.floor(Math.random() * 3 + 1));

  updateStatBar("dada", attributes.dada);
  updateStatBar("potions", attributes.potions);
  updateStatBar("runes", attributes.runes);
  updateStatBar("creatures", attributes.creatures);

  playBeep(440, 0.1);
  playBeep(554, 0.1);
  playBeep(659, 0.1);
  playBeep(880, 0.2);
  triggerNotification(`LEVEL UP! Advanced to Level ${level}! Your stats are scaling.`);
}

function updateStatBar(key, val) {
  const valEl = document.getElementById(`stat-${key}-val`);
  const barEl = document.getElementById(`stat-${key}-bar`);
  if (valEl) valEl.textContent = `${val}%`;
  if (barEl) barEl.style.width = `${val}%`;
}

function resizeDrawCanvas() {
  if (!drawCanvas) return;
  const rect = drawCanvas.parentNode.getBoundingClientRect();
  drawCanvas.width = rect.width;
  drawCanvas.height = 256;
  clearSandboxDrawPad();
}

function getCoords(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDrawing(e) {
  isDrawing = true;
  drawPoints = [];
  const coords = getCoords(e);
  drawCtx.beginPath();
  drawCtx.moveTo(coords.x, coords.y);
  drawPoints.push(coords);
  playBeep(250, 0.05, "sawtooth");
}

function draw(e) {
  if (!isDrawing) return;
  const coords = getCoords(e);
  drawCtx.lineWidth = 6;
  drawCtx.lineCap = "round";
  drawCtx.strokeStyle = "rgba(30, 19, 12, 0.8)";
  drawCtx.lineTo(coords.x, coords.y);
  drawCtx.stroke();
  drawPoints.push(coords);
}

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;
  analyzeDrawnGesture();
}

function clearSandboxDrawPad() {
  if (!drawCtx || !drawCanvas) return;
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawCtx.strokeStyle = "rgba(30,19,12,0.06)";
  drawCtx.lineWidth = 2;
  for (let y = 30; y < drawCanvas.height; y += 30) {
    drawCtx.beginPath();
    drawCtx.moveTo(0, y);
    drawCtx.lineTo(drawCanvas.width, y);
    drawCtx.stroke();
  }
}

function analyzeDrawnGesture() {
  if (drawPoints.length < 10) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  drawPoints.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const startPt = drawPoints[0];
  const endPt = drawPoints[drawPoints.length - 1];
  const startEndDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
  const isSquare = Math.abs(width - height) < Math.max(width, height) * 0.4;

  let detectedSpell = "NONE";

  if (startEndDist < Math.max(width, height) * 0.35 && isSquare && width > 40) {
    detectedSpell = "LUMOS";
    triggerLumosEffect();
  } else {
    const midpoint = drawPoints[Math.floor(drawPoints.length / 2)];
    const isV = startPt.y < midpoint.y && endPt.y < midpoint.y && midpoint.y > minY + height * 0.7;
    if (isV && width > 40) {
      detectedSpell = "EXPECTO PATRONUM";
      triggerPatronumEffect();
    } else {
      const isN = startPt.y > minY + height * 0.5 && endPt.y < minY + height * 0.5 && width > 40;
      if (isN) {
        detectedSpell = "NOX";
        triggerNoxEffect();
      }
    }
  }

  const history = document.getElementById("spell-cast-history");
  if (history) history.textContent = detectedSpell;
}

function flashSpellScreen() {
  const flash = document.getElementById("spell-cast-flash");
  flash?.classList.add("spell-flash");
  setTimeout(() => flash?.classList.remove("spell-flash"), 600);
}

function triggerLumosEffect() {
  playMagicalSwoosh();
  flashSpellScreen();
  document.body.classList.add("lumos-active");
  const icon = document.getElementById("lumos-icon");
  if (icon) icon.className = "fa-solid fa-lightbulb text-yellow-400";
  triggerNotification("Lumos cast! Reverse-lighting spell triggered across dimensions.");
}

function triggerNoxEffect() {
  playMagicalSwoosh();
  flashSpellScreen();
  document.body.classList.remove("lumos-active");
  const icon = document.getElementById("lumos-icon");
  if (icon) icon.className = "fa-regular fa-lightbulb";
  triggerNotification("Nox cast! Spellbooks returned to default vintage darkness state.");
}

function triggerPatronumEffect() {
  playMagicalSwoosh();
  flashSpellScreen();
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < 80; i++) {
    setTimeout(() => {
      particles.push(new Particle(w / 2 + (Math.random() * 400 - 200), h / 2 + (Math.random() * 400 - 200)));
    }, i * 10);
  }
  triggerNotification("EXPECTO PATRONUM! Invoked a sparkling retro-shield from dark crawlers.");
}

function triggerLumos() {
  if (document.body.classList.contains("lumos-active")) triggerNoxEffect();
  else triggerLumosEffect();
}

// Expose for inline onclick handlers
window.toggleMute = toggleMute;
window.dismissAlert = dismissAlert;
window.projectCastAlert = projectCastAlert;
window.startSortingQuiz = startSortingQuiz;
window.triggerLevelUp = triggerLevelUp;
window.clearSandboxDrawPad = clearSandboxDrawPad;
window.triggerLumos = triggerLumos;
window.playBeep = playBeep;
window.triggerNotification = triggerNotification;
