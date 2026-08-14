/**
 * Studio-only interaction layer. Garage never calls this chrome.
 */
const STUDIO_ROLES = [
  "Frontend Engineer",
  "UI/UX Designer",
  "Product Builder",
  "Interface Craftsman",
];

let studioBound = false;
let studioRaf = 0;
let galaxyRaf = 0;
let studioRoleTimer = 0;
let studioClockTimer = 0;
let studioRevealObs = null;
let studioNavObs = null;
let cursorX = 0;
let cursorY = 0;
let ringX = 0;
let ringY = 0;
let roleIndex = 0;
let galaxyStars = [];
let galaxyDust = [];
let galaxyMeteors = [];
let galaxyCore = { x: 0.62, y: 0.28 };
let lastMeteor = 0;

function resizeGalaxy(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function seedGalaxy(w, h) {
  const area = w * h;
  const starCount = Math.min(160, Math.max(70, Math.floor(area / 9000)));
  galaxyStars = Array.from({ length: starCount }, () => {
    const depth = Math.random();
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      z: depth,
      r: depth > 0.82 ? Math.random() * 1.6 + 0.9 : Math.random() * 0.9 + 0.2,
      a: Math.random() * 0.7 + 0.25,
      tw: Math.random() * Math.PI * 2,
      sp: 0.008 + Math.random() * 0.02,
      hue: Math.random() > 0.78 ? (Math.random() > 0.5 ? 210 : 270) : 0,
    };
  });
  galaxyDust = Array.from({ length: Math.min(70, Math.floor(starCount / 6)) }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 38 + 12,
    a: Math.random() * 0.04 + 0.015,
    hue: 250 + Math.random() * 40,
  }));
  galaxyMeteors = [];
}

function spawnMeteor(w) {
  galaxyMeteors.push({
    x: Math.random() * w * 0.8 + w * 0.1,
    y: -20,
    len: 80 + Math.random() * 90,
    vx: 6 + Math.random() * 5,
    vy: 9 + Math.random() * 6,
    life: 1,
  });
}

function paintGalaxy(t) {
  const canvas = document.getElementById("galaxy-canvas");
  if (!canvas || !studioActive()) {
    galaxyRaf = 0;
    return;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, w, h);

  const parX = ((cursorX || w / 2) / w - 0.5) * 18;
  const parY = ((cursorY || h / 2) / h - 0.5) * 12;

  const coreX = w * galaxyCore.x + parX * 0.15;
  const coreY = h * galaxyCore.y + parY * 0.12;
  const pulse = 0.55 + Math.sin(t / 2400) * 0.08;
  const core = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, Math.max(w, h) * 0.42);
  core.addColorStop(0, `rgba(237, 233, 254, ${0.16 * pulse})`);
  core.addColorStop(0.18, `rgba(167, 139, 250, ${0.2 * pulse})`);
  core.addColorStop(0.42, `rgba(79, 70, 229, ${0.12 * pulse})`);
  core.addColorStop(1, "rgba(3, 0, 20, 0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  galaxyDust.forEach((d) => {
    ctx.beginPath();
    ctx.fillStyle = `hsla(${d.hue}, 80%, 70%, ${d.a})`;
    ctx.arc(d.x + parX * 0.2, d.y + parY * 0.2, d.r, 0, Math.PI * 2);
    ctx.fill();
  });

  galaxyStars.forEach((s) => {
    s.tw += s.sp;
    const twinkle = 0.55 + Math.sin(s.tw) * 0.45;
    const x = s.x + parX * s.z * 0.55;
    const y = s.y + parY * s.z * 0.55;
    ctx.beginPath();
    if (s.hue) ctx.fillStyle = `hsla(${s.hue}, 90%, 82%, ${s.a * twinkle})`;
    else ctx.fillStyle = `rgba(255,255,255,${s.a * twinkle})`;
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
    if (s.z > 0.88) {
      ctx.strokeStyle = `rgba(255,255,255,${0.18 * twinkle})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - s.r * 3.2, y);
      ctx.lineTo(x + s.r * 3.2, y);
      ctx.moveTo(x, y - s.r * 3.2);
      ctx.lineTo(x, y + s.r * 3.2);
      ctx.stroke();
    }
  });

  if (!reducedMotion() && t - lastMeteor > 14000 + Math.random() * 10000) {
    spawnMeteor(w);
    lastMeteor = t;
  }

  for (let i = galaxyMeteors.length - 1; i >= 0; i--) {
    const m = galaxyMeteors[i];
    m.x += m.vx;
    m.y += m.vy;
    m.life -= 0.012;
    const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 8, m.y - m.vy * 8);
    grad.addColorStop(0, `rgba(255,255,255,${0.9 * m.life})`);
    grad.addColorStop(1, "rgba(167,139,250,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * 7, m.y - m.vy * 7);
    ctx.stroke();
    if (m.life <= 0 || m.y > h + 40) galaxyMeteors.splice(i, 1);
  }

  galaxyRaf = requestAnimationFrame(paintGalaxy);
}

function startGalaxy() {
  const canvas = document.getElementById("galaxy-canvas");
  if (!canvas) return;
  const { w, h } = resizeGalaxy(canvas);
  seedGalaxy(w, h);
  lastMeteor = performance.now();
  if (galaxyRaf) cancelAnimationFrame(galaxyRaf);
  if (reducedMotion()) {
    paintGalaxy(performance.now());
    galaxyRaf = 0;
    return;
  }
  galaxyRaf = requestAnimationFrame(paintGalaxy);
}

function stopGalaxy() {
  if (galaxyRaf) cancelAnimationFrame(galaxyRaf);
  galaxyRaf = 0;
  const canvas = document.getElementById("galaxy-canvas");
  const ctx = canvas?.getContext("2d");
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function studioActive() {
  return document.documentElement.getAttribute("data-skin") === "studio";
}

function finePointer() {
  return window.matchMedia("(pointer: fine)").matches;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function updateStudioClock() {
  const nodes = document.querySelectorAll("[data-studio-clock]");
  if (!nodes.length) return;
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  nodes.forEach((el) => {
    el.textContent = `${text} PHT`;
  });
}

function rotateStudioRole() {
  const el = document.getElementById("studio-role-text");
  if (!el) return;
  roleIndex = (roleIndex + 1) % STUDIO_ROLES.length;
  el.classList.add("is-swap");
  window.setTimeout(() => {
    el.textContent = STUDIO_ROLES[roleIndex];
    el.classList.remove("is-swap");
  }, 280);
}

function setSpot(x, y) {
  document.documentElement.style.setProperty("--spot-x", `${x}px`);
  document.documentElement.style.setProperty("--spot-y", `${y}px`);
}

function tickCursor() {
  if (!studioActive() || !finePointer()) {
    studioRaf = 0;
    return;
  }
  ringX += (cursorX - ringX) * 0.18;
  ringY += (cursorY - ringY) * 0.18;
  const cursor = document.getElementById("studio-cursor");
  if (cursor) {
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    const ring = cursor.querySelector(".studio-cursor-ring");
    if (ring) ring.style.transform = `translate3d(${ringX - cursorX}px, ${ringY - cursorY}px, 0)`;
  }
  studioRaf = requestAnimationFrame(tickCursor);
}

function onStudioPointerMove(e) {
  if (!studioActive()) return;
  cursorX = e.clientX;
  cursorY = e.clientY;
  setSpot(e.clientX, e.clientY);

  const card = e.target.closest?.(".studio-spot");
  if (card) {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  if (!studioRaf && finePointer() && !reducedMotion()) {
    studioRaf = requestAnimationFrame(tickCursor);
  }
}

function onStudioPointerOver(e) {
  const cursor = document.getElementById("studio-cursor");
  if (!cursor) return;
  const hoverable = e.target.closest?.("a, button, input, [data-cursor='hover']");
  cursor.classList.toggle("is-hover", Boolean(hoverable));
}

function onStudioScroll() {
  if (!studioActive()) return;
  const bar = document.getElementById("studio-progress");
  if (bar) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = `${pct}%`;
  }
  const topbar = document.getElementById("studio-topbar");
  if (topbar) topbar.classList.toggle("is-scrolled", window.scrollY > 24);
}

function bindReveals() {
  studioRevealObs?.disconnect();
  if (!studioActive()) return;

  const targets = document.querySelectorAll(
    "html[data-skin='studio'] header > div.bg-stone-900, html[data-skin='studio'] main > section, html[data-skin='studio'] .studio-services, html[data-skin='studio'] .studio-featured, html[data-skin='studio'] .studio-contact, html[data-skin='studio'] footer"
  );

  if (reducedMotion()) {
    targets.forEach((el) => el.classList.add("is-in"));
    return;
  }

  studioRevealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          studioRevealObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((el) => {
    el.classList.add("studio-reveal");
    studioRevealObs.observe(el);
  });
}

function bindNavSpy() {
  studioNavObs?.disconnect();
  if (!studioActive()) return;
  const links = [...document.querySelectorAll("#studio-topbar [data-spy]")];
  const ids = links.map((a) => a.getAttribute("data-spy")).filter(Boolean);
  const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;

  studioNavObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle("is-current", link.getAttribute("data-spy") === id);
        });
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0.1 }
  );
  sections.forEach((sec) => studioNavObs.observe(sec));
}

function studioCategory(project) {
  const hay = `${project.tag || ""} ${(project.tags || []).join(" ")}`.toUpperCase();
  if (/WALLET|PAYMENT|ANALYTICS|FINTECH|GROWTH|INSPIRE/.test(hay)) return "fintech";
  if (/ADMIN|BACKEND|GATEWAY|API/.test(hay)) return "platform";
  return "product";
}

function applyStudioFilter(filter) {
  const cards = document.querySelectorAll("#showroom-grid [data-studio-filter]");
  let visible = 0;
  cards.forEach((card) => {
    const show = filter === "all" || card.getAttribute("data-studio-filter") === filter;
    card.classList.toggle("is-filtered-out", !show);
    if (show) visible += 1;
  });
  const empty = document.getElementById("studio-filter-empty");
  if (empty) empty.classList.toggle("hidden", visible > 0);
  document.querySelectorAll("[data-studio-filter-btn]").forEach((btn) => {
    btn.classList.toggle("is-on", btn.getAttribute("data-studio-filter-btn") === filter);
  });
}

function bindStudioFilters() {
  document.querySelectorAll("[data-studio-filter-btn]").forEach((btn) => {
    btn.onclick = () => applyStudioFilter(btn.getAttribute("data-studio-filter-btn"));
  });
}

async function copyStudioEmail() {
  const email = "legaspiariesdianne@gmail.com";
  try {
    await navigator.clipboard.writeText(email);
    if (typeof triggerGarageNotification === "function") {
      triggerGarageNotification("Email copied — say hello.");
    }
    const btn = document.getElementById("studio-copy-email");
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = "Copied";
      window.setTimeout(() => {
        btn.textContent = prev;
      }, 1600);
    }
  } catch (err) {
    window.location.href = `mailto:${email}`;
  }
}

function syncStudioHeroStats() {
  const projects = window.__lastProjects || [];
  const work = document.getElementById("studio-stat-work");
  if (work && projects.length) work.textContent = String(projects.length);
}

function studioGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function updateStudioGreeting() {
  const el = document.getElementById("studio-greeting");
  if (el) el.textContent = studioGreeting();
}

function countUp(el, to, ms = 900) {
  if (!el || reducedMotion()) {
    if (el) el.textContent = String(to);
    return;
  }
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(to * eased));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function animateStudioStats() {
  const work = document.getElementById("studio-stat-work");
  const n = Number(work?.textContent);
  if (work && Number.isFinite(n) && n > 0) countUp(work, n);
}

function prepSkillBars(reset) {
  ["stat-aero-bar", "stat-react-bar", "stat-db-bar"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.dataset.width) el.dataset.width = el.style.width || "90%";
    el.style.width = reset ? "0%" : el.dataset.width;
  });
}

function bindSkillPlay() {
  const section = document.getElementById("mechanic-credentials");
  if (!section || !studioActive()) {
    prepSkillBars(false);
    return;
  }
  prepSkillBars(true);
  const obs = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        prepSkillBars(false);
        obs.disconnect();
      }
    },
    { threshold: 0.35 }
  );
  obs.observe(section);
}

function bindMagnetic() {
  document.querySelectorAll(".studio-magnetic").forEach((btn) => {
    btn.onmousemove = (e) => {
      if (!studioActive() || reducedMotion()) return;
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.22;
      const y = (e.clientY - r.top - r.height / 2) * 0.28;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    };
    btn.onmouseleave = () => {
      btn.style.transform = "";
    };
  });
}

function bindTilt() {
  document.querySelectorAll(".studio-tilt").forEach((card) => {
    card.onmousemove = (e) => {
      if (!studioActive() || reducedMotion() || !finePointer()) return;
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    card.onmouseleave = () => {
      card.style.transform = "";
    };
  });
}

function enableStudioChrome() {
  document.body.classList.remove("studio-cursor-on");
  updateStudioClock();
  updateStudioGreeting();
  if (!studioClockTimer) {
    studioClockTimer = window.setInterval(updateStudioClock, 15000);
  }
  bindReveals();
  bindNavSpy();
  bindSkillPlay();
  syncStudioHeroStats();
  onStudioScroll();
  startGalaxy();
}

function disableStudioChrome() {
  document.body.classList.remove("studio-cursor-on");
  document.querySelectorAll(".studio-reveal").forEach((el) => {
    el.classList.remove("studio-reveal", "is-in");
  });
  studioRevealObs?.disconnect();
  studioNavObs?.disconnect();
  studioRevealObs = null;
  studioNavObs = null;
  if (studioRaf) cancelAnimationFrame(studioRaf);
  studioRaf = 0;
  if (studioRoleTimer) {
    window.clearInterval(studioRoleTimer);
    studioRoleTimer = 0;
  }
  if (studioClockTimer) {
    window.clearInterval(studioClockTimer);
    studioClockTimer = 0;
  }
  stopGalaxy();
  prepSkillBars(false);
}

function bindStudioOnce() {
  if (studioBound) return;
  studioBound = true;
  window.addEventListener("pointermove", onStudioPointerMove, { passive: true });
  window.addEventListener("pointerover", onStudioPointerOver, { passive: true });
  window.addEventListener("scroll", onStudioScroll, { passive: true });
  window.addEventListener("resize", () => {
    if (!studioActive()) return;
    startGalaxy();
  });
  document.getElementById("studio-copy-email")?.addEventListener("click", copyStudioEmail);
}

window.__onStudioSkinChange = function (skin) {
  bindStudioOnce();
  if (skin === "studio") enableStudioChrome();
  else disableStudioChrome();
};

window.__bindStudioCards = function () {
  syncStudioHeroStats();
  bindStudioFilters();
  const current = document.querySelector("[data-studio-filter-btn].is-on");
  applyStudioFilter(current?.getAttribute("data-studio-filter-btn") || "all");
};

document.addEventListener("DOMContentLoaded", () => {
  bindStudioOnce();
  if (studioActive()) enableStudioChrome();
});
