/* Retro Web Audio Synthesizer Controls */
let dashboardMuted = false;
let audioCtx = null;

function initDashboardAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playDashboardBeep(frequency, duration, type = "sine", volume = 0.05) {
  if (dashboardMuted) return;
  initDashboardAudio();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (err) {
    console.warn("Audio context not initialized yet", err);
  }
}

function playRetroEngineRev(frequency) {
  if (dashboardMuted) return;
  initDashboardAudio();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

function toggleDashboardMute() {
  dashboardMuted = !dashboardMuted;
  const icon = document.getElementById("sfx-icon");
  const text = document.querySelector("#sfx-toggle span");
  if (dashboardMuted) {
    icon.className = "fa-solid fa-volume-xmark";
    text.textContent = "AUDIO OFF";
  } else {
    icon.className = "fa-solid fa-volume-high";
    text.textContent = "AUDIO ON";
    playDashboardBeep(600, 0.15);
  }
}

const themeConfigs = {
  Lightning: {
    primary: "#ff2a2a",
    secondary: "#aa0000",
    accent: "#ffb700",
    emoji: "🏎️",
  },
  Dinoco: {
    primary: "#00aaff",
    secondary: "#006699",
    accent: "#ffffff",
    emoji: "💎",
  },
  Lowrider: {
    primary: "#2aff2a",
    secondary: "#00aa00",
    accent: "#cc00ff",
    emoji: "🌴",
  },
  Rusty: {
    primary: "#d97706",
    secondary: "#78350f",
    accent: "#fef08a",
    emoji: "🪝",
  },
};

function changePaintTheme(themeName) {
  const config = themeConfigs[themeName];
  if (!config) return;

  document.documentElement.style.setProperty("--theme-primary", config.primary);
  document.documentElement.style.setProperty("--theme-secondary", config.secondary);
  document.documentElement.style.setProperty("--theme-accent", config.accent);

  const avatar = document.getElementById("car-avatar-emoji");
  if (avatar) avatar.textContent = config.emoji;

  document.querySelectorAll(".theme-bg-primary").forEach((el) => {
    el.style.backgroundColor = "var(--theme-primary)";
  });
  document.querySelectorAll(".theme-text-primary").forEach((el) => {
    el.style.color = "var(--theme-primary)";
  });

  playDashboardBeep(700, 0.2, "triangle");
  triggerGarageNotification(`Applied Paint Job: ${themeName}! Ready to spin tires.`);
}

const exhCanvas = document.getElementById("exhaust-canvas");
const exhCtx = exhCanvas?.getContext("2d");
let exhaustPuffs = [];

function resizeExhaustCanvas() {
  if (!exhCanvas) return;
  exhCanvas.width = window.innerWidth;
  exhCanvas.height = window.innerHeight;
}

class ExhaustPuff {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 12 + 6;
    this.vx = Math.random() * 2 - 1;
    this.vy = Math.random() * -1 - 1;
    this.opacity = 1.0;
    this.decay = Math.random() * 0.02 + 0.01;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.opacity -= this.decay;
    if (this.size > 0.2) this.size -= 0.1;
  }
  draw() {
    if (!exhCtx) return;
    exhCtx.save();
    exhCtx.globalAlpha = this.opacity;
    exhCtx.fillStyle = "#475569";
    exhCtx.beginPath();
    exhCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    exhCtx.fill();
    exhCtx.restore();
  }
}

function animateExhaust() {
  if (!exhCtx || !exhCanvas) return;
  exhCtx.clearRect(0, 0, exhCanvas.width, exhCanvas.height);
  for (let i = 0; i < exhaustPuffs.length; i++) {
    exhaustPuffs[i].update();
    exhaustPuffs[i].draw();
    if (exhaustPuffs[i].opacity <= 0) {
      exhaustPuffs.splice(i, 1);
      i--;
    }
  }
  requestAnimationFrame(animateExhaust);
}

function triggerGarageNotification(text) {
  const alertBox = document.getElementById("garage-alert");
  const alertText = document.getElementById("garage-alert-text");
  if (!alertBox || !alertText) return;
  alertText.textContent = text;
  alertBox.classList.remove("hidden");
  playDashboardBeep(880, 0.12, "square", 0.03);
  playDashboardBeep(1100, 0.15, "square", 0.03);
}

function dismissGarageAlert() {
  document.getElementById("garage-alert")?.classList.add("hidden");
  playDashboardBeep(440, 0.1);
}

function revProjectAlert(projectName) {
  triggerGarageNotification(`Test Driving ${projectName}! Vrooom! Compiling static assets...`);
}

let currentTuningLevel = 88;
const skillsStats = { aero: 96, react: 90, db: 83 };

function revTuningStats() {
  currentTuningLevel += 2;
  document.getElementById("garage-tuning-level").textContent = currentTuningLevel;

  skillsStats.aero = Math.min(100, skillsStats.aero + Math.floor(Math.random() * 2 + 1));
  skillsStats.react = Math.min(100, skillsStats.react + Math.floor(Math.random() * 2 + 1));
  skillsStats.db = Math.min(100, skillsStats.db + Math.floor(Math.random() * 2 + 1));

  document.getElementById("stat-aero-val").textContent = `${skillsStats.aero}%`;
  document.getElementById("stat-aero-bar").style.width = `${skillsStats.aero}%`;
  document.getElementById("stat-react-val").textContent = `${skillsStats.react}%`;
  document.getElementById("stat-react-bar").style.width = `${skillsStats.react}%`;
  document.getElementById("stat-db-val").textContent = `${skillsStats.db}%`;
  document.getElementById("stat-db-bar").style.width = `${skillsStats.db}%`;

  playDashboardBeep(440, 0.08);
  playDashboardBeep(554, 0.08);
  playDashboardBeep(659, 0.15);
  triggerGarageNotification(`Tuned chassis component! Current Diagnostic Level: ${currentTuningLevel}`);
}

const LOADER_STATUSES = [
  "Cranking the starter motor...",
  "Warming up the V8 pixels...",
  "Inflating turbo tires...",
  "Syncing GitHub pit lane...",
  "Polishing chrome bumper...",
  "Garage doors opening — peel out!",
];

const LOADER_MIN_MS = 2600;

function initGarageLoader() {
  const loader = document.getElementById("garage-loader");
  if (!loader) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    loader.remove();
    document.body.classList.remove("is-loading");
    return;
  }

  const fill = document.getElementById("garage-loader-fill");
  const status = document.getElementById("garage-loader-status");
  const pct = document.getElementById("garage-loader-pct");
  const start = performance.now();
  let rafId = 0;

  function updateProgress() {
    const elapsed = performance.now() - start;
    const progress = Math.min(96, (elapsed / LOADER_MIN_MS) * 100);
    if (fill) fill.style.width = `${progress}%`;
    if (pct) pct.textContent = `${Math.floor(progress)}%`;
    const idx = Math.min(
      LOADER_STATUSES.length - 1,
      Math.floor((progress / 100) * LOADER_STATUSES.length)
    );
    if (status) status.textContent = LOADER_STATUSES[idx];
    if (progress < 96) rafId = requestAnimationFrame(updateProgress);
  }

  rafId = requestAnimationFrame(updateProgress);

  function finishLoader() {
    cancelAnimationFrame(rafId);
    if (fill) fill.style.width = "100%";
    if (pct) pct.textContent = "100%";
    if (status) status.textContent = LOADER_STATUSES[LOADER_STATUSES.length - 1];

    playDashboardBeep(520, 0.06, "triangle", 0.03);
    playDashboardBeep(700, 0.1, "square", 0.03);

    loader.classList.add("garage-loader--exiting");
    setTimeout(() => {
      loader.classList.add("garage-loader--gone");
      document.body.classList.remove("is-loading");
      setTimeout(() => loader.remove(), 320);
    }, 880);
  }

  Promise.all([
    new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    }),
    new Promise((resolve) => setTimeout(resolve, LOADER_MIN_MS)),
  ]).then(finishLoader);
}

initGarageLoader();

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("resize", resizeExhaustCanvas);
  resizeExhaustCanvas();
  animateExhaust();

  window.addEventListener("mousemove", (e) => {
    if (Math.random() < 0.3) exhaustPuffs.push(new ExhaustPuff(e.clientX, e.clientY));
  });

  const engineSlider = document.getElementById("engine-slider");
  const rpmText = document.getElementById("rpm-text");
  engineSlider?.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    rpmText.textContent = `${val * 15} RPM`;
    playRetroEngineRev(val);
  });
});
