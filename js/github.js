/**
 * Live GitHub data + featured projects for Retro Garage Portfolio
 */
const GITHUB_USERNAME = "Xicc29";

document.addEventListener("DOMContentLoaded", () => {
  const projects = mergeProjects([]);
  const activities = enrichActivity(CONTRIBUTION_ACTIVITY);
  renderShowroom(projects);
  renderContributions(projects, activities);
  initGitHub();
});

async function initGitHub() {
  try {
    const [user, repos, events] = await Promise.all([
      fetchGitHub(`https://api.github.com/users/${GITHUB_USERNAME}`),
      fetchGitHub(
        `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`
      ),
      fetchGitHub(`https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=30`).catch(
        () => []
      ),
    ]);

    renderProfile(user);
    const projects = mergeProjects(repos);
    renderShowroom(projects);
    renderGitHubStats(user, repos, projects);
    renderContributions(projects, mergeActivity(events));
  } catch (err) {
    console.error("GitHub sync failed:", err);
    const projects = mergeProjects([]);
    renderShowroom(projects);
    renderContributions(projects, enrichActivity(CONTRIBUTION_ACTIVITY));
    const syncEl = document.getElementById("github-sync-note");
    if (syncEl) {
      syncEl.textContent = "Featured projects loaded · GitHub sync unavailable";
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

function mergeProjects(repos) {
  const publicRepos = repos.filter((r) => !r.fork);
  const repoByKey = Object.fromEntries(
    publicRepos.map((r) => [`${(r.owner?.login || GITHUB_USERNAME).toLowerCase()}/${r.name.toLowerCase()}`, r])
  );
  const usedKeys = new Set();
  const merged = [];

  for (const featured of FEATURED_PROJECTS) {
    const owner = (featured.owner || GITHUB_USERNAME).toLowerCase();
    const repoName = (featured.githubRepo || featured.name).toLowerCase();
    const key = `${owner}/${repoName}`;
    const repo = featured.githubRepo ? repoByKey[key] : null;

    if (repo) usedKeys.add(key);

    merged.push({
      name: featured.name || repo?.name,
      tag: featured.tag || "TURBO BUILD",
      description:
        featured.description ||
        repo?.description ||
        "A high-performance build awaiting blueprint specs.",
      language: featured.language || repo?.language,
      tags: featured.tags || (repo?.language ? [`#${repo.language}`] : []),
      github: featured.github || repo?.html_url,
      demo: featured.demo || repo?.homepage || null,
      stars: repo?.stargazers_count ?? 0,
      forks: repo?.forks_count ?? 0,
      updated: featured.updatedAt || repo?.updated_at || null,
      private: featured.private ?? repo?.private ?? true,
      owner: featured.owner || repo?.owner?.login || GITHUB_USERNAME,
      horsepower:
        featured.horsepower ||
        400 + (repo?.stargazers_count || 0) * 50 + (repo?.forks_count || 0) * 25,
      featured: true,
    });
  }

  for (const repo of publicRepos) {
    const key = `${repo.owner.login.toLowerCase()}/${repo.name.toLowerCase()}`;
    if (usedKeys.has(key)) continue;
    merged.push({
      name: repo.name,
      tag: "GITHUB BUILD",
      description: repo.description || "Public repository synced from GitHub.",
      language: repo.language,
      tags: repo.language ? [`#${repo.language}`] : [],
      github: repo.html_url,
      demo: repo.homepage || null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updated: repo.updated_at,
      private: false,
      owner: repo.owner.login,
      horsepower: 400 + repo.stargazers_count * 50 + repo.forks_count * 25,
      featured: false,
    });
  }

  return merged;
}

function renderProfile(user) {
  const nameEl = document.getElementById("mechanic-name");
  const handleEl = document.getElementById("github-handle");
  const bioEl = document.getElementById("github-bio");
  const avatarEl = document.getElementById("github-avatar");
  const memberEl = document.getElementById("github-member");
  const levelEl = document.getElementById("garage-tuning-level");

  if (nameEl) nameEl.textContent = user.name || "Aries Legaspi";
  if (handleEl) handleEl.textContent = `@${user.login}`;
  if (memberEl) {
    const year = new Date(user.created_at).getFullYear();
    memberEl.textContent = `GitHub member since ${year}`;
  }
  if (levelEl) levelEl.textContent = Math.max(1, FEATURED_PROJECTS.length + 3);

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

function renderGitHubStats(user, repos, projects) {
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  setText("stat-repos", projects.length);
  setText("stat-followers", user.followers);
  setText("stat-stars", totalStars);

  const syncEl = document.getElementById("github-sync-note");
  if (syncEl) {
    syncEl.textContent = isStudioSkin()
      ? `${projects.length} projects · synced ${new Date().toLocaleString()}`
      : `${projects.length} projects in showroom · synced ${new Date().toLocaleString()}`;
  }
}

function isStudioSkin() {
  return document.documentElement.getAttribute("data-skin") === "studio";
}

function renderShowroom(projects) {
  window.__lastProjects = projects;
  const grid = document.getElementById("showroom-grid");
  if (!grid) return;

  if (!projects.length) {
    grid.innerHTML = isStudioSkin()
      ? `
      <div class="col-span-full garage-border bg-stone-900 p-10 text-center">
        <p class="font-pixel text-xs text-amber-400 mb-3">No projects yet</p>
        <p class="font-heavy text-lg text-stone-300">Add work in js/projects.js to populate this grid.</p>
      </div>`
      : `
      <div class="col-span-full garage-border bg-stone-900 p-10 text-center shadow-[4px_4px_0_#000]">
        <p class="font-pixel text-xs text-amber-400 mb-3">🏁 EMPTY SHOWROOM</p>
        <p class="font-heavy text-lg text-stone-300">Add projects in js/projects.js to fill the showroom.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects
    .map((project, index) => renderProjectCard(project, index))
    .join("");
  if (typeof window.__bindStudioCards === "function") window.__bindStudioCards();
}

function renderProjectCard(project, index = 0) {
  if (isStudioSkin()) return renderStudioProjectCard(project, index);

  const tag = escapeHtml(project.tag);
  const name = escapeHtml(project.name);
  const desc = escapeHtml(project.description);
  const hp = project.horsepower;
  const stars = project.stars ?? 0;
  const updated = project.updated ? formatRelativeDate(project.updated) : "featured";
  const forks = project.forks ?? 0;

  const tagPills = (project.tags || [])
    .map((t) => `<span>${escapeHtml(t.replace(/^#/, "#"))}</span>`)
    .join(" ");

  const langPill =
    project.language && !(project.tags || []).some((t) => t.includes(project.language))
      ? `<span>#${escapeHtml(project.language)}</span>`
      : "";

  const privateBadge = project.private
    ? `<span class="font-pixel text-[9px] bg-stone-800 text-amber-400 px-2 py-1 border border-stone-700">🔒 PRIVATE</span>`
    : `<span class="font-pixel text-[9px] bg-black text-green-400 px-2 py-1 border border-stone-800">★ ${stars}</span>`;

  const demo = project.demo
    ? `<a href="${escapeHtml(project.demo)}" target="_blank" rel="noopener" class="block text-center garage-border py-2 bg-stone-950 text-white hover:text-amber-400 font-pixel text-[10px] transition mb-2">
        <i class="fa-solid fa-flag-checkered"></i> LIVE TEST TRACK
      </a>`
    : "";

  const sourceBtn = project.github
    ? `<a href="${escapeHtml(project.github)}" target="_blank" rel="noopener" class="block text-center garage-border py-2 bg-stone-950 text-white hover:text-amber-400 font-pixel text-[10px] transition">
        <i class="fa-solid fa-${project.private ? "lock" : "wrench"}"></i> ${project.private ? "VIEW PRIVATE REPO" : "START TEST DRIVE"}
      </a>`
    : project.demo
      ? ""
      : `<button onclick="triggerGarageNotification('Source code available on request — contact Aries!')" class="w-full text-center garage-border py-2 bg-stone-950 text-stone-400 hover:text-amber-400 font-pixel text-[10px] transition">
        <i class="fa-solid fa-lock"></i> REQUEST ACCESS
      </button>`;

  return `
    <div class="garage-border-interactive garage-border bg-stone-900 p-5 flex flex-col justify-between shadow-[4px_4px_0_#000] group">
      <div>
        <div class="flex justify-between items-center mb-3 gap-2">
          <span class="text-xs font-pixel text-amber-400 tracking-wide">${tag}</span>
          ${privateBadge}
        </div>
        <h3 class="font-cartoon text-3xl text-white mb-2 group-hover:scale-105 transition-all duration-300">${name}</h3>
        <p class="text-sm text-stone-300 leading-relaxed mb-4">${desc}</p>
        <p class="font-pixel text-[9px] text-stone-500 mb-2">${project.private ? "🔒 private build" : `⑂ ${forks} forks · ↻ ${updated}`} · ${hp}HP · ${escapeHtml(project.owner || "GitHub")}</p>
      </div>
      <div>
        <div class="flex flex-wrap gap-2 mb-4 font-pixel text-[9px] text-stone-400">
          ${tagPills}
          ${langPill}
        </div>
        ${demo}
        ${sourceBtn}
      </div>
    </div>
  `;
}

function studioProjectFilter(project) {
  const hay = `${project.tag || ""} ${(project.tags || []).join(" ")}`.toUpperCase();
  if (/WALLET|PAYMENT|ANALYTICS|FINTECH|GROWTH|INSPIRE/.test(hay)) return "fintech";
  if (/ADMIN|BACKEND|GATEWAY|API/.test(hay)) return "platform";
  return "product";
}

function renderStudioProjectCard(project, index = 0) {
  const name = escapeHtml(project.name);
  const tag = escapeHtml(project.tag || "");
  const n = String(index + 1).padStart(2, "0");
  const filter = studioProjectFilter(project);
  const href = project.demo || project.github || "";
  const year = project.updated ? String(new Date(project.updated).getFullYear()) : "";
  const lang = project.language ? escapeHtml(project.language) : "";
  const meta = [lang, year].filter(Boolean).join(" · ");
  const action = project.demo ? "Live" : project.github ? (project.private ? "Private" : "Repo") : "";
  const actionHtml = action
    ? `<span class="studio-index-go">${action} <i class="fa-solid fa-arrow-up-right-from-square"></i></span>`
    : `<span class="studio-index-go"></span>`;

  const inner = `
      <span class="studio-index">${n}</span>
      <h3>${name}</h3>
      <span class="studio-index-tag">${tag}</span>
      <span class="studio-index-meta">${meta}</span>
      ${actionHtml}
  `;

  if (href) {
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="studio-index-row" data-studio-filter="${filter}">${inner}</a>`;
  }
  return `<article class="studio-index-row" data-studio-filter="${filter}">${inner}</article>`;
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

const EVENT_LABELS = {
  garage: {
    PushEvent: { icon: "fa-code-commit", label: "Engine Push", color: "text-green-400" },
    PullRequestEvent: { icon: "fa-code-merge", label: "Pit Merge", color: "text-cyan-400" },
    CreateEvent: { icon: "fa-flag-checkered", label: "New Track", color: "text-amber-400" },
    IssuesEvent: { icon: "fa-bug", label: "Bug Fix", color: "text-red-400" },
    WatchEvent: { icon: "fa-star", label: "Starred", color: "text-yellow-400" },
    MemberEvent: { icon: "fa-users", label: "Joined Crew", color: "text-purple-400" },
    DeleteEvent: { icon: "fa-trash", label: "Branch Removed", color: "text-stone-400" },
  },
  studio: {
    PushEvent: { icon: "fa-code-commit", label: "Push", color: "text-green-400" },
    PullRequestEvent: { icon: "fa-code-merge", label: "Pull request", color: "text-cyan-400" },
    CreateEvent: { icon: "fa-plus", label: "Created", color: "text-amber-400" },
    IssuesEvent: { icon: "fa-bug", label: "Issue", color: "text-red-400" },
    WatchEvent: { icon: "fa-star", label: "Starred", color: "text-yellow-400" },
    MemberEvent: { icon: "fa-users", label: "Joined", color: "text-purple-400" },
    DeleteEvent: { icon: "fa-trash", label: "Deleted", color: "text-stone-400" },
  },
};

function eventLabel(type) {
  const pack = isStudioSkin() ? EVENT_LABELS.studio : EVENT_LABELS.garage;
  return pack[type] || { icon: "fa-code", label: isStudioSkin() ? "Activity" : "Commit", color: "text-stone-400" };
}

function formatBranch(branch) {
  if (!branch) return "";
  return branch.replace(/^refs\/heads\//, "");
}

function enrichActivity(events) {
  return (events || []).map((e) => ({
    ...e,
    repoUrl: e.repoUrl || `https://github.com/${e.repo}`,
    branch: formatBranch(e.branch),
  }));
}

function mergeActivity(apiEvents) {
  const baked = enrichActivity(CONTRIBUTION_ACTIVITY);
  const live = enrichActivity(
    (apiEvents || []).map((e) => ({
      type: e.type,
      repo: e.repo?.name || "unknown",
      created_at: e.created_at,
      branch: e.payload?.ref || null,
    }))
  );
  const seen = new Set();
  return [...live, ...baked].filter((e) => {
    const key = `${e.repo}-${e.created_at}-${e.type}-${e.branch || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderContributions(projects, activities) {
  window.__lastProjects = projects;
  window.__lastActivities = activities;
  const orgs = [...new Set(projects.map((p) => p.owner))];
  const now = Date.now();
  const monthAgo = now - 30 * 86400000;
  const activeThisMonth = projects.filter(
    (p) => p.updated && new Date(p.updated).getTime() > monthAgo
  ).length;

  const langCounts = {};
  projects.forEach((p) => {
    if (p.language) langCounts[p.language] = (langCounts[p.language] || 0) + 1;
  });
  const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "TypeScript";

  setText("contrib-repos", projects.length);
  setText("contrib-orgs", orgs.length);
  setText("contrib-recent", activeThisMonth);
  setText("contrib-stack", topLang);
  setText("contrib-total", activities.length);
  setText("contrib-pushes", activities.filter((a) => a.type === "PushEvent").length);
  setText("contrib-feed-count", `${activities.length} logged`);

  renderContributionHeatmap(activities);
  renderContributionFeed(activities);
  renderContributionBreakdown(projects, orgs, langCounts);

  const syncEl = document.getElementById("contributions-sync-note");
  if (syncEl) {
    syncEl.textContent = isStudioSkin()
      ? `${activities.length} GitHub events · ${CONTRIBUTION_ROLE}`
      : `Showing all ${activities.length} GitHub contributions · ${CONTRIBUTION_ROLE}`;
  }
}

function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatHeatmapDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const HEATMAP_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HEATMAP_DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function renderContributionHeatmap(activities) {
  const container = document.getElementById("contribution-heatmap");
  if (!container) return;

  const weeks = 52;
  const dayMap = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toLocalDateKey(today);

  (activities || []).forEach((a) => {
    if (!a.created_at) return;
    const key = toLocalDateKey(new Date(a.created_at));
    dayMap[key] = (dayMap[key] || 0) + 1;
  });

  const start = new Date(today);
  start.setDate(start.getDate() - weeks * 7 + 1);
  const end = new Date(today);

  let totalLaps = 0;
  let activeDays = 0;
  let peakDay = 0;

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      if (cell > end) continue;
      const key = toLocalDateKey(cell);
      const count = dayMap[key] || 0;
      if (count > 0) {
        totalLaps += count;
        activeDays += 1;
        if (count > peakDay) peakDay = count;
      }
    }
  }

  setText("heatmap-total", totalLaps);
  setText("heatmap-active", activeDays);
  setText("heatmap-peak", peakDay);

  let monthsHtml = "";
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + w * 7);
    const month = weekStart.getMonth();
    if (month !== lastMonth) {
      monthsHtml += `<span class="heatmap-month-label">${HEATMAP_MONTHS[month]}</span>`;
      lastMonth = month;
    } else {
      monthsHtml += `<span class="heatmap-month-label heatmap-month-label--spacer">&nbsp;</span>`;
    }
  }

  let gridHtml = "";
  for (let w = 0; w < weeks; w++) {
    gridHtml += `<div class="contrib-week">`;
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      const key = toLocalDateKey(cell);
      const isFuture = cell > today;
      const count = isFuture ? 0 : dayMap[key] || 0;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4;
      const classes = [
        "contrib-cell",
        `contrib-l${level}`,
        key === todayKey ? "contrib-cell--today" : "",
        isFuture ? "contrib-cell--future" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const label = isFuture
        ? isStudioSkin()
          ? "Upcoming"
          : "Upcoming lap"
        : `${formatHeatmapDate(key)}: ${count} ${isStudioSkin() ? "contribution" : "commit"}${count === 1 ? "" : "s"}`;
      gridHtml += `<span class="${classes}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`;
    }
    gridHtml += `</div>`;
  }

  const dayLabelsHtml = HEATMAP_DAY_LABELS.map(
    (label) => `<span class="heatmap-day-label">${label}</span>`
  ).join("");

  container.innerHTML = `
    <div class="heatmap-months">${monthsHtml}</div>
    <div class="heatmap-body">
      <div class="heatmap-day-labels">${dayLabelsHtml}</div>
      <div class="heatmap-grid">${gridHtml}</div>
    </div>
  `;

  container.scrollLeft = container.scrollWidth;
}

function renderContributionFeed(activities) {
  const feed = document.getElementById("contribution-feed");
  if (!feed) return;

  const merged = [...(activities || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  if (!merged.length) {
    feed.innerHTML = `<p class="font-pixel text-[10px] text-stone-500">No recent activity logged yet.</p>`;
    return;
  }

  feed.innerHTML = merged
    .map((e) => {
      const meta = eventLabel(e.type);
      const when = formatRelativeDate(e.created_at);
      const repoShort = e.repo;
      const repoUrl = e.repoUrl || `https://github.com/${e.repo}`;
      const branchLine = e.branch
        ? `<p class="font-mono text-[8px] text-stone-500 mt-1 truncate">${escapeHtml(e.branch)}</p>`
        : "";
      return `
        <div class="contrib-feed-item bg-stone-950 border border-stone-800 p-3 flex items-start gap-3">
          <i class="fa-solid ${meta.icon} ${meta.color} mt-0.5"></i>
          <div class="min-w-0 flex-1">
            <p class="font-pixel text-[10px] text-white truncate">
              <span class="${meta.color}">${meta.label}</span> → ${escapeHtml(repoShort)}
            </p>
            ${branchLine}
            <p class="font-pixel text-[8px] text-stone-500 mt-1">${when} · ${new Date(e.created_at).toLocaleDateString()}</p>
          </div>
          ${repoUrl ? `<a href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener" class="font-pixel text-[8px] text-amber-400 hover:underline shrink-0">${isStudioSkin() ? "View" : "VIEW"}</a>` : ""}
        </div>
      `;
    })
    .join("");
}

function renderContributionBreakdown(projects, orgs, langCounts) {
  const el = document.getElementById("contrib-breakdown");
  if (!el) return;

  const tagCounts = {};
  projects.forEach((p) => {
    tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1;
  });

  const studio = isStudioSkin();
  const orgHtml = orgs
    .map(
      (o) =>
        `<span class="bg-stone-950 border border-stone-800 px-2 py-1 text-amber-400">${escapeHtml(o)}</span>`
    )
    .join(" ");

  const langHtml = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([lang, n]) =>
        `<div class="flex justify-between bg-stone-950 border border-stone-800 px-3 py-2"><span>${escapeHtml(lang)}</span><span class="text-amber-400">${n} ${studio ? "repos" : "repos"}</span></div>`
    )
    .join("");

  const tagHtml = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(
      ([tag, n]) =>
        `<div class="flex justify-between bg-stone-950 border border-stone-800 px-3 py-2"><span>${escapeHtml(tag)}</span><span class="text-green-400">${n}</span></div>`
    )
    .join("");

  el.innerHTML = `
    <div class="bg-stone-900 border-2 border-black p-3">
      <p class="text-amber-400 mb-2 text-[9px]">${studio ? "TEAMS" : "PIT TEAMS"}</p>
      <div class="flex flex-wrap gap-1">${orgHtml}</div>
    </div>
    <div class="bg-stone-900 border-2 border-black p-3">
      <p class="text-amber-400 mb-2 text-[9px]">${studio ? "LANGUAGES" : "FUEL TYPES"}</p>
      <div class="space-y-1">${langHtml || "<p class='text-stone-500'>—</p>"}</div>
    </div>
    <div class="bg-stone-900 border-2 border-black p-3">
      <p class="text-amber-400 mb-2 text-[9px]">${studio ? "CATEGORIES" : "BUILD TYPES"}</p>
      <div class="space-y-1">${tagHtml}</div>
    </div>
  `;
}

window.__refreshPortfolioSkin = function () {
  if (window.__lastProjects) renderShowroom(window.__lastProjects);
  if (window.__lastProjects && window.__lastActivities) {
    renderContributions(window.__lastProjects, window.__lastActivities);
  }
};
