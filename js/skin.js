/**
 * Dual-skin controller — Garage (default) and Studio (professional).
 * Persists to localStorage and restyles copy, chrome, and dynamic cards.
 */
const SKIN_STORAGE_KEY = "aries-portfolio-skin";
const SKIN_GARAGE = "garage";
const SKIN_STUDIO = "studio";

const STUDIO_THEME = {
  primary: "#818cf8",
  secondary: "#4f46e5",
  accent: "#c4b5fd",
};

const SKIN_META = {
  garage: {
    title: "Aries Legaspi — Retro Cartoon Garage & Portfolio",
    description: "High-performance web mechanic portfolio by Aries Legaspi (@Xicc29)",
  },
  studio: {
    title: "Aries Legaspi — Frontend Engineer & UI/UX Designer",
    description: "Product-minded frontend engineer and UI/UX designer. Fintech, healthcare, and crafted interfaces.",
  },
};

function getActiveSkin() {
  return document.documentElement.getAttribute("data-skin") === SKIN_STUDIO
    ? SKIN_STUDIO
    : SKIN_GARAGE;
}

function isStudio() {
  return getActiveSkin() === SKIN_STUDIO;
}

function persistSkin(skin) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skin);
  } catch (err) {
    /* private mode */
  }
}

function applyStudioTokens() {
  const root = document.documentElement.style;
  root.setProperty("--theme-primary", STUDIO_THEME.primary);
  root.setProperty("--theme-secondary", STUDIO_THEME.secondary);
  root.setProperty("--theme-accent", STUDIO_THEME.accent);
}

function restoreGaragePaint() {
  const root = document.documentElement.style;
  root.setProperty("--theme-primary", "#ff2a2a");
  root.setProperty("--theme-secondary", "#aa0000");
  root.setProperty("--theme-accent", "#ffb700");
  const avatar = document.getElementById("car-avatar-emoji");
  if (avatar) avatar.textContent = "🏎️";
}

function updateSkinToggle(skin) {
  document.querySelectorAll("[data-skin-set]").forEach((btn) => {
    const active = btn.getAttribute("data-skin-set") === skin;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function updateDocumentMeta(skin) {
  const meta = SKIN_META[skin] || SKIN_META.garage;
  document.title = meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", meta.description);
}

function refreshDynamicSkin() {
  if (typeof window.__refreshPortfolioSkin === "function") {
    window.__refreshPortfolioSkin();
  }
}

function setSkin(skin, { announce = true } = {}) {
  const next = skin === SKIN_STUDIO ? SKIN_STUDIO : SKIN_GARAGE;
  const prev = getActiveSkin();
  document.documentElement.setAttribute("data-skin", next);
  persistSkin(next);
  updateSkinToggle(next);
  updateDocumentMeta(next);

  if (next === SKIN_STUDIO) {
    applyStudioTokens();
  } else if (prev === SKIN_STUDIO) {
    restoreGaragePaint();
  }

  refreshDynamicSkin();
  if (typeof window.__onStudioSkinChange === "function") {
    window.__onStudioSkinChange(next);
  }

  if (announce && typeof triggerGarageNotification === "function") {
    if (next === SKIN_STUDIO) {
      triggerGarageNotification("Studio mode — a quieter, hiring-ready view of the same work.");
    } else {
      triggerGarageNotification("Garage mode restored. Engines hot, tires spinning.");
    }
  }

  if (typeof playDashboardBeep === "function") {
    playDashboardBeep(next === SKIN_STUDIO ? 520 : 700, 0.12, "sine", 0.04);
  }
}

function initSkinToggle() {
  document.querySelectorAll("[data-skin-set]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setSkin(btn.getAttribute("data-skin-set"));
    });
  });

  updateSkinToggle(getActiveSkin());
  updateDocumentMeta(getActiveSkin());

  if (isStudio()) applyStudioTokens();
}

document.addEventListener("DOMContentLoaded", initSkinToggle);

window.getActiveSkin = getActiveSkin;
window.isStudio = isStudio;
window.setSkin = setSkin;
