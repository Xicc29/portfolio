/**
 * Live GitHub data for Marauder's Portfolio
 */
const GITHUB_USERNAME = "Xicc29";

document.addEventListener("DOMContentLoaded", () => {
  initGitHub();
});

async function initGitHub() {
  try {
    const [user, repos] = await Promise.all([
      fetchGitHub(`https://api.github.com/users/${GITHUB_USERNAME}`),
      fetchGitHub(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`
      ),
    ]);

    renderProfile(user);
    renderSpellbook(repos);
    renderGitHubStats(user, repos);
  } catch (err) {
    console.error("GitHub sync failed:", err);
    const grid = document.getElementById("spellbook-cards");
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full pixel-border bg-[#e8d7b3] p-8 text-center font-vintage">
          <p class="font-pixel text-[10px] text-stone-600 mb-2">OWL DELIVERY FAILED</p>
          <p>Could not reach the GitHub archives. Refresh to try again.</p>
        </div>
      `;
    }
  }
}

async function fetchGitHub(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

function renderProfile(user) {
  const nameEl = document.getElementById("wizard-name");
  const handleEl = document.getElementById("github-handle");
  const bioEl = document.getElementById("github-bio");
  const avatarEl = document.getElementById("github-avatar");
  const memberEl = document.getElementById("github-member");
  const levelEl = document.getElementById("wizard-level");

  if (nameEl) nameEl.textContent = user.name || user.login;
  if (handleEl) handleEl.textContent = `@${user.login}`;
  if (memberEl) {
    const year = new Date(user.created_at).getFullYear();
    memberEl.textContent = `GitHub member since ${year}`;
  }
  if (levelEl) levelEl.textContent = Math.max(1, user.public_repos + 3);

  if (bioEl && user.bio) {
    bioEl.textContent = user.bio;
    bioEl.classList.remove("hidden");
  }

  if (avatarEl && user.avatar_url) {
    avatarEl.src = user.avatar_url;
    avatarEl.alt = user.name || user.login;
    avatarEl.classList.remove("hidden");
    document.getElementById("avatar-fallback")?.classList.add("hidden");
  }
}

function renderGitHubStats(user, repos) {
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  setText("stat-repos", user.public_repos);
  setText("stat-followers", user.followers);
  setText("stat-stars", totalStars);

  const syncEl = document.getElementById("github-sync-note");
  if (syncEl) {
    syncEl.textContent = `Live from GitHub · ${new Date().toLocaleString()}`;
  }
}

function renderSpellbook(repos) {
  const grid = document.getElementById("spellbook-cards");
  if (!grid) return;

  const publicRepos = repos.filter((r) => !r.fork);

  if (!publicRepos.length) {
    grid.innerHTML = `
      <div class="col-span-full pixel-border bg-[#e8d7b3] p-10 text-center shadow-[4px_4px_0_#1e130c]">
        <p class="font-pixel text-xs house-text-primary mb-3">📜 EMPTY GRIMOIRE</p>
        <p class="font-vintage text-lg text-stone-800">
          No public repositories yet — your next spell will appear here automatically when you publish on GitHub.
        </p>
      </div>
    `;
    return;
  }

  const tags = ["ALOHOMORA REPOS", "PATRONUS GUARD", "FELIX FELICIS", "SPELLCRAFT", "ANCIENT RUNE"];

  grid.innerHTML = publicRepos
    .map((repo, i) => {
      const tag = tags[i % tags.length];
      const desc =
        repo.description ||
        "An enchanted repository awaiting its official scroll description.";
      const lang = repo.language ? `<span>#${escapeHtml(repo.language)}</span>` : "";
      const updated = formatRelativeDate(repo.updated_at);
      const demo = repo.homepage
        ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener" class="block text-center pixel-border py-1.5 bg-stone-800 text-yellow-100 hover:bg-stone-700 font-pixel text-[10px] transition mb-2">
            <i class="fa-solid fa-bolt"></i> VIEW DEMO
          </a>`
        : "";

      return `
        <div class="pixel-border-interactive pixel-border bg-[#e8d7b3] p-5 flex flex-col justify-between shadow-[4px_4px_0_#1e130c] group hover:bg-[#ebdcb9]">
          <div>
            <div class="flex justify-between items-center mb-3">
              <span class="text-xs font-pixel house-text-primary tracking-wide">${tag}</span>
              <span class="font-pixel text-[10px] bg-stone-900 text-yellow-100 px-2 py-0.5">★ ${repo.stargazers_count}</span>
            </div>
            <h3 class="font-magic-title text-xl font-bold mb-2 group-hover:scale-105 transition duration-300">${escapeHtml(repo.name)}</h3>
            <p class="font-vintage text-base text-stone-800 leading-relaxed mb-3">${escapeHtml(desc)}</p>
            <p class="font-pixel text-[9px] text-stone-500 mb-2">⑂ ${repo.forks_count} forks · ↻ ${updated}</p>
          </div>
          <div>
            <div class="flex flex-wrap gap-2 mb-4 font-pixel text-[9px] text-stone-600">
              ${lang}
              <span>#${repo.private ? "PRIVATE" : "PUBLIC"}</span>
            </div>
            ${demo}
            <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" class="block text-center pixel-border py-1.5 bg-stone-900 text-yellow-100 hover:bg-stone-800 font-pixel text-[10px] transition">
              <i class="fa-solid fa-wand-magic-sparkles"></i> VIEW SOURCE
            </a>
          </div>
        </div>
      `;
    })
    .join("");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatRelativeDate(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
