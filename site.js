(() => {
  "use strict";

  // Theme Toggle
  const themeToggles = document.querySelectorAll(".theme-toggle");
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else if (!prefersDark) {
    document.documentElement.setAttribute("data-theme", "light");
  }

  themeToggles.forEach(t => {
    t.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || (prefersDark ? "dark" : "light");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  });

  document.documentElement.classList.add("js");

  const UPDATE_BADGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  function gameIdFromHref(href) {
    if (!href) return null;
    const filename = new URL(href, window.location.href).pathname.split("/").pop();
    return filename?.replace(/\.html$/, "") || null;
  }

  function addUpdateBadge(container, updatedAt) {
    if (!container || container.querySelector(".game-update-badge")) return;

    const badge = document.createElement("span");
    const dateLabel = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(updatedAt));

    badge.className = "game-update-badge";
    badge.textContent = "NEW UPDATE";
    badge.setAttribute("aria-label", `New update published ${dateLabel}`);
    badge.title = `Updated ${dateLabel}`;
    container.append(badge);
  }

  async function showRecentGameUpdates() {
    const registryUrl = location.pathname.includes("/games/")
      ? "../data/game-updates.json"
      : "data/game-updates.json";

    try {
      const response = await fetch(registryUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Update registry returned ${response.status}`);

      const registry = await response.json();
      const now = Date.now();
      const isRecent = updatedAt => {
        const timestamp = Date.parse(updatedAt);
        const age = now - timestamp;
        return Number.isFinite(timestamp) && age >= 0 && age < UPDATE_BADGE_WINDOW_MS;
      };

      document.querySelectorAll(".game-card").forEach(card => {
        const id = gameIdFromHref(card.querySelector(".project-card-link")?.getAttribute("href"));
        const updatedAt = id && registry.games?.[id]?.last_updated;
        if (updatedAt && isRecent(updatedAt)) {
          addUpdateBadge(card.querySelector(".project-visual"), updatedAt);
        }
      });

      if (location.pathname.includes("/games/")) {
        const id = gameIdFromHref(location.pathname);
        const updatedAt = id && registry.games?.[id]?.last_updated;
        if (updatedAt && isRecent(updatedAt)) {
          addUpdateBadge(document.querySelector(".game-detail-art"), updatedAt);
        }
      }
    } catch (error) {
      console.warn("Game update badges are unavailable.", error);
    }
  }

  showRecentGameUpdates();

  if (location.pathname.includes("/games/") && !document.querySelector('script[type="application/ld+json"]')) {
    const title = document.querySelector("h1")?.textContent.replace(/\s+/g, " ").trim();
    const description = document.querySelector('meta[name="description"]')?.content;
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const image = document.querySelector('meta[property="og:image"]')?.content;
    const metadata = [...document.querySelectorAll(".game-meta span")].map(item => item.textContent.trim());
    if (title && description && canonical) {
      const structuredData = document.createElement("script");
      structuredData.type = "application/ld+json";
      structuredData.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: title,
        description,
        url: canonical,
        image,
        genre: metadata[0],
        gamePlatform: metadata.slice(1),
        author: {
          "@type": "Person",
          name: "Omrano The Scorpion Dev",
          url: "https://omraneelit.github.io/omrano-the-scorpion-dev/"
        }
      });
      document.head.append(structuredData);
    }
  }

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    const navigation = links.closest("#site-navigation");
    const closeMenu = () => {
      toggle.setAttribute("aria-expanded", "false");
      links.classList.remove("is-open");
      navigation?.classList.remove("is-open");
    };

    toggle.addEventListener("click", () => {
      const opening = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(opening));
      links.classList.toggle("is-open", opening);
      navigation?.classList.toggle("is-open", opening);
    });

    links.addEventListener("click", event => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        toggle.focus();
      }
    });

    const desktop = window.matchMedia("(min-width: 761px)");
    desktop.addEventListener?.("change", event => {
      if (event.matches) closeMenu();
    });

    const sectionIds = ["announcements", "games", "arcade", "tools", "about", "contact"];
    const navMap = new Map(
      sectionIds.map(id => [id, document.querySelector(`.nav-links a[href="#${id}"]`)])
    );
    const setActive = id => navMap.forEach((a, k) => a?.setAttribute("aria-current", k === id ? "true" : "false"));
    const spy = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-25% 0px -65% 0px" }
    );
    sectionIds.forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  const revealItems = document.querySelectorAll([
    ".hero > *",
    ".announcements-heading",
    ".section-heading",
    ".arcade-heading",
    ".announcement-card",
    ".project-card",
    ".tool-card",
    ".about-grid > *",
    ".contact-card",
    ".game-back",
    ".game-detail-grid > *",
    ".game-summary",
    ".policy-hero > *",
    ".policy-content section",
    ".progress-card"
  ].join(","));

  revealItems.forEach((item, index) => {
    item.classList.add("reveal");
    item.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsTimeline = CSS.supports && CSS.supports("animation-timeline", "view()");

  if (supportsTimeline) {
    // Handled by CSS native scroll-driven animations
  } else if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    revealItems.forEach(item => revealObserver.observe(item));
  }

  const heroSection = document.querySelector(".hero");
  if (heroSection && !reduceMotion) {
    const orb = heroSection.querySelector(".hero-orb");
    const cards = heroSection.querySelectorAll(".pixel-card");
    heroSection.addEventListener("mousemove", (e) => {
      const rect = heroSection.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const moveX = (e.clientX - centerX) / rect.width;
      const moveY = (e.clientY - centerY) / rect.height;
      
      if (orb) {
        orb.style.transform = `translate(${moveX * -25}px, ${moveY * -25}px)`;
      }
      cards.forEach((card, index) => {
        const factor = (index + 1) * 18;
        card.style.transform = `translate(${moveX * factor}px, ${moveY * factor}px)`;
      });
    });
    heroSection.addEventListener("mouseleave", () => {
      if (orb) orb.style.transform = "";
      cards.forEach(card => card.style.transform = "");
    });
  }

  // Scroll progress bar
  const scrollBar = document.getElementById("scroll-progress");
  if (scrollBar) {
    const updateScrollProgress = () => {
      const scrollPx = document.documentElement.scrollTop || document.body.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = winHeightPx > 0 ? (scrollPx / winHeightPx) * 100 : 0;
      scrollBar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
    };
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    updateScrollProgress();
  }

  // Interactive Card Spotlight & 3D Tilt
  const spotlightCards = document.querySelectorAll(".announcement-card, .project-card, .tool-card, .progress-card");
  spotlightCards.forEach(card => {
    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);

      if (!reduceMotion && card.classList.contains("project-card") && !card.classList.contains("project-card-coming")) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-5px)`;
      }
    });

    card.addEventListener("mouseleave", () => {
      if (!reduceMotion && card.classList.contains("project-card")) {
        card.style.transform = "";
      }
    });
  });

  // =========================================================================
  // 12 MAJOR MODERN ADDONS CONTROLLER
  // =========================================================================

  // 1. Service Worker (PWA Offline Support)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      const swPath = location.pathname.includes("/projects/") || location.pathname.includes("/games/") ? "../sw.js" : "sw.js";
      navigator.serviceWorker.register(swPath).catch(err => console.debug("SW error:", err));
    });
  }

  // 2. Toast Notifications System
  window.showStudioToast = function(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // 4. Live Game Catalog Filter & Search Bar
  const gameSearchInput = document.getElementById("game-search");
  const gameFilterTabs = document.querySelectorAll(".game-filter-tabs .filter-tab");
  const gameCards = document.querySelectorAll(".project-grid .project-card");
  const gameSearchCount = document.getElementById("game-search-count");

  function applyGameFilters() {
    if (!gameCards.length) return;
    const query = (gameSearchInput?.value || "").toLowerCase().trim();
    const activeTab = document.querySelector(".game-filter-tabs .filter-tab.active");
    const filter = activeTab?.getAttribute("data-filter") || "all";

    let visibleCount = 0;
    gameCards.forEach(card => {
      const title = (card.getAttribute("data-title") || card.querySelector("h3")?.textContent || "").toLowerCase();
      const keywords = (card.getAttribute("data-keywords") || "").toLowerCase();
      const status = card.getAttribute("data-status") || "";
      const genre = (card.getAttribute("data-genre") || "").toLowerCase();

      const matchesQuery = !query || title.includes(query) || keywords.includes(query) || genre.includes(query);
      let matchesFilter = true;
      if (filter === "playable") matchesFilter = status === "playable";
      else if (filter === "progress") matchesFilter = status === "progress";
      else if (filter !== "all") matchesFilter = genre.includes(filter);

      const isVisible = matchesQuery && matchesFilter;
      card.classList.toggle("is-filtered-out", !isVisible);
      if (isVisible) visibleCount++;
    });

    if (gameSearchCount) {
      gameSearchCount.textContent = `${visibleCount} game${visibleCount === 1 ? "" : "s"}`;
    }
  }

  gameSearchInput?.addEventListener("input", applyGameFilters);
  gameFilterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      gameFilterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      applyGameFilters();
    });
  });

  function checkUrlGameFilter() {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get("filter") || params.get("genre") || params.get("tag");
    if (filterParam) {
      const target = filterParam.toLowerCase();
      const matchingTab = document.querySelector(`.game-filter-tabs .filter-tab[data-filter="${target}"]`);
      if (matchingTab) matchingTab.click();
    }
  }
  checkUrlGameFilter();

  // 5. Devlog & Announcements Category Tabs
  const annTabs = document.querySelectorAll(".announcement-filter-tabs .filter-tab");
  const annCards = document.querySelectorAll(".announcement-grid .announcement-card");

  annTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      annTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const cat = tab.getAttribute("data-cat");
      annCards.forEach(card => {
        const cardCat = card.getAttribute("data-category");
        const visible = cat === "all" || cardCat === cat;
        card.classList.toggle("is-filtered-out", !visible);
      });
    });
  });

  // Dynamic Arcade Engine Loader (Performance Lazy-Load)
  let arcadeScriptLoaded = false;
  function loadArcadeGameScript() {
    if (arcadeScriptLoaded) return;
    arcadeScriptLoaded = true;
    const script = document.createElement("script");
    script.src = "game.js";
    script.defer = true;
    document.body.appendChild(script);
  }

  const arcadeSection = document.getElementById("arcade");
  if (arcadeSection && "IntersectionObserver" in window) {
    const arcadeObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadArcadeGameScript();
        arcadeObserver.disconnect();
      }
    }, { rootMargin: "300px" });
    arcadeObserver.observe(arcadeSection);
  } else if (arcadeSection) {
    loadArcadeGameScript();
  }

  // 6. Arcade Subnav, Achievements & Leaderboard
  const btnArcadePlay = document.getElementById("btn-arcade-play");
  const btnArcadeAchieve = document.getElementById("btn-arcade-achievements");
  const btnArcadeScores = document.getElementById("btn-arcade-scores");
  const playView = document.getElementById("arcade-play-view");
  const achievePanel = document.getElementById("arcade-achievements-panel");
  const scoresPanel = document.getElementById("arcade-scores-panel");

  function switchArcadeView(target) {
    const btns = [btnArcadePlay, btnArcadeAchieve, btnArcadeScores].filter(Boolean);
    const panels = [playView, achievePanel, scoresPanel].filter(Boolean);
    btns.forEach(b => b.classList.remove("active"));
    panels.forEach(p => p.hidden = true);

    if (target === "achieve" && achievePanel) {
      btnArcadeAchieve?.classList.add("active");
      achievePanel.hidden = false;
      refreshAchievementsUI();
    } else if (target === "scores" && scoresPanel) {
      btnArcadeScores?.classList.add("active");
      scoresPanel.hidden = false;
      refreshLeaderboardUI();
    } else if (playView) {
      btnArcadePlay?.classList.add("active");
      playView.hidden = false;
    }
  }

  btnArcadePlay?.addEventListener("click", () => switchArcadeView("play"));
  btnArcadeAchieve?.addEventListener("click", () => switchArcadeView("achieve"));
  btnArcadeScores?.addEventListener("click", () => switchArcadeView("scores"));

  function refreshAchievementsUI() {
    try {
      const raw = localStorage.getItem("scorpion_achievements");
      const stored = raw ? JSON.parse(raw) : null;
      const ids = ["first_kill", "ten_kills", "armored_kill", "wave_three", "century_score"];
      let count = 0;
      ids.forEach(id => {
        const item = document.querySelector(`.achievement-item[data-id="${id}"]`);
        const badge = document.getElementById(`badge-${id}`);
        const isUnlocked = Array.isArray(stored) ? stored.includes(id) : Boolean(stored && stored[id]);
        if (isUnlocked) {
          count++;
          item?.classList.add("unlocked");
          if (badge) badge.textContent = "UNLOCKED";
        }
      });
      const counter = document.getElementById("achieve-count");
      if (counter) counter.textContent = `${count}/5`;
    } catch (_) {}
  }
  refreshAchievementsUI();
  window.addEventListener("scorpion_achievements_updated", refreshAchievementsUI);

  function refreshLeaderboardUI() {
    try {
      const tbody = document.getElementById("leaderboard-body");
      if (!tbody) return;
      const defaultScores = [
        { name: "SCO", score: 2450, wave: 4 },
        { name: "ACE", score: 1820, wave: 3 },
        { name: "VOID", score: 1240, wave: 3 },
        { name: "OMR", score: 980, wave: 2 },
        { name: "PIL", score: 650, wave: 2 }
      ];
      const saved = JSON.parse(localStorage.getItem("scorpion_scores") || "null") || defaultScores;
      tbody.innerHTML = saved.slice(0, 5).map((s, idx) => `
        <tr>
          <td>0${idx + 1}</td>
          <td>${s.name || s.initials || "PIL"}</td>
          <td>${String(s.score).padStart(6, "0")}</td>
          <td>WAVE 0${s.wave || 1}</td>
        </tr>
      `).join("");
    } catch (_) {}
  }
  refreshLeaderboardUI();
  window.addEventListener("scorpion_scores_updated", refreshLeaderboardUI);

  // 7. Tech Stack Radar Drawer
  const techCards = document.querySelectorAll(".tech-radar-card");
  const techDetail = document.getElementById("tech-radar-detail");
  const techData = {
    godot: {
      title: "Godot 4.7 Architecture",
      badge: "PRIMARY RUNTIME",
      desc: "Core engine utilized across studio titles including Zero Hour: Protocol and Shadow Engine. Leverages Godot's node hierarchy, Vulkan forward+ rendering, and lightweight binary distribution.",
      tags: ["Scene Trees", "Signals & Events", "Custom Viewports", "Vulkan Forward+"]
    },
    gdscript: {
      title: "GDScript & C# Gameplay Stack",
      badge: "GAMEPLAY LOGIC",
      desc: "High-level deterministic OOP structures written in typed GDScript and performance-critical numerical kernels implemented in C# for high unit-count battlefield simulations.",
      tags: ["Static Typing", "SIMD Operations", "Async Signals", "Memory Safety"]
    },
    simulation: {
      title: "Headless Simulation Core",
      badge: "HEADLESS ARCHITECTURE",
      desc: "Decoupled logic core that runs identically with or without visual rendering. Supports BigNumber math, production throughput graphs, and instant offline catch-up calculations.",
      tags: ["BigNumber Math", "Offline Catch-up", "State Machines", "Event Bus"]
    },
    shaders: {
      title: "GLSL Spatial & Canvas Shaders",
      badge: "VISUAL EFFECTS",
      desc: "Custom vertex and fragment shader graphs for stylized rendering, retro CRT scanline distortion, reactive water reflections, and dynamic foliage wind response.",
      tags: ["GLSL", "Post-Processing", "CRT Filter", "Screen Space"]
    },
    blender: {
      title: "Blender 3D Asset Pipeline",
      badge: "3D ART & ASSETS",
      desc: "Low-poly modular tilekits, vertex-colored vehicle units, mechanical weapon rigs, and glTF 2.0 automated export batches straight into Godot resource collections.",
      tags: ["glTF 2.0", "Modular Kits", "Rigging", "Vertex Colors"]
    },
    crossplatform: {
      title: "Cross-Platform Deployment",
      badge: "DEPLOYMENT",
      desc: "Unified multi-target builds across WebAssembly (HTML5 canvas), Desktop binaries for Windows and Linux, and touch-optimized builds for mobile platforms.",
      tags: ["WebAssembly", "Desktop Native", "PWA", "Touch Input"]
    }
  };

  techCards.forEach(card => {
    card.addEventListener("click", () => {
      techCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      const key = card.getAttribute("data-tech");
      const data = techData[key];
      if (data && techDetail) {
        document.getElementById("radar-detail-title").textContent = data.title;
        document.getElementById("radar-detail-badge").textContent = data.badge;
        document.getElementById("radar-detail-desc").textContent = data.desc;
        document.getElementById("radar-detail-tags").innerHTML = data.tags.map(t => `<span>${t}</span>`).join("");
      }
    });
  });

  // 8. Studio Jukebox ("Scorpion Radio" - Real Studio OST Tracks)
  const radioToggle = document.getElementById("radio-toggle-btn");
  const radioDrawer = document.getElementById("radio-drawer");
  const radioPlayBtn = document.getElementById("radio-play-btn");
  const radioPrevBtn = document.getElementById("radio-prev-btn");
  const radioNextBtn = document.getElementById("radio-next-btn");
  const radioTrackTitle = document.getElementById("radio-track-title");
  const radioTrackGenre = document.getElementById("radio-track-genre");
  const radioTimeDisplay = document.getElementById("radio-time-display");
  const radioProgressBar = document.getElementById("radio-progress-bar");
  const radioProgressFill = document.getElementById("radio-progress-fill");
  const radioCanvas = document.getElementById("radio-visualizer");
  const radioWrapper = document.getElementById("scorpion-radio");
  const radioHideBtn = document.getElementById("radio-hide-btn");
  const radioShowBtn = document.getElementById("radio-show-btn");
  const radioDrawerClose = document.getElementById("radio-drawer-close");
  const radioVolumeSlider = document.getElementById("radio-volume-slider");
  const radioVolumeBtn = document.getElementById("radio-volume-btn");

  const radioTracks = [
    {
      id: "neon-grid",
      title: "Track 01: Neon Grid",
      genre: "Synthwave / Outrun (116 BPM)",
      srcMp3: "assets/audio/track-01-neon-grid.mp3",
      srcOgg: "assets/audio/track-01-neon-grid.ogg"
    },
    {
      id: "deep-orbit",
      title: "Track 02: Deep Orbit",
      genre: "Ambient Chillwave (92 BPM)",
      srcMp3: "assets/audio/track-02-deep-orbit.mp3",
      srcOgg: "assets/audio/track-02-deep-orbit.ogg"
    },
    {
      id: "void-cyberpunk",
      title: "Track 03: Void Cyberpunk",
      genre: "Dark Electro / Cyberpunk (128 BPM)",
      srcMp3: "assets/audio/track-03-void-cyberpunk.mp3",
      srcOgg: "assets/audio/track-03-void-cyberpunk.ogg"
    }
  ];

  let currentTrackIdx = 0;
  let isRadioPlaying = false;
  const audioElement = new Audio();
  audioElement.preload = "none";

  let audioCtx = null;
  let analyserNode = null;
  let sourceNode = null;
  let frequencyData = null;

  radioToggle?.addEventListener("click", () => {
    const isExpanded = radioToggle.getAttribute("aria-expanded") === "true";
    radioToggle.setAttribute("aria-expanded", String(!isExpanded));
    if (radioDrawer) radioDrawer.hidden = isExpanded;
  });

  radioDrawerClose?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (radioDrawer) radioDrawer.hidden = true;
    radioToggle?.setAttribute("aria-expanded", "false");
  });

  // Dismiss track drawer when clicking outside
  document.addEventListener("click", (e) => {
    if (radioDrawer && !radioDrawer.hidden) {
      if (!radioWrapper?.contains(e.target) && !radioToggle?.contains(e.target)) {
        radioDrawer.hidden = true;
        radioToggle?.setAttribute("aria-expanded", "false");
      }
    }
  });

  // Dismiss track drawer on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && radioDrawer && !radioDrawer.hidden) {
      radioDrawer.hidden = true;
      radioToggle?.setAttribute("aria-expanded", "false");
    }
  });

  function setRadioVisibility(visible) {
    if (radioWrapper) radioWrapper.hidden = !visible;
    if (radioShowBtn) radioShowBtn.hidden = visible;
    if (!visible && radioDrawer) {
      radioDrawer.hidden = true;
      radioToggle?.setAttribute("aria-expanded", "false");
    }
    try {
      localStorage.setItem("studio_radio_visible", visible ? "true" : "false");
    } catch (_) {}
  }

  radioHideBtn?.addEventListener("click", () => {
    setRadioVisibility(false);
    window.showStudioToast?.("📻 Radio player hidden (click 📻 to restore)", "info");
  });

  radioShowBtn?.addEventListener("click", () => {
    setRadioVisibility(true);
    window.showStudioToast?.("📻 Radio player restored", "info");
  });

  try {
    if (localStorage.getItem("studio_radio_visible") === "false") {
      setRadioVisibility(false);
    }
  } catch (_) {}

  function initWebAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64;
        frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
        try {
          sourceNode = audioCtx.createMediaElementSource(audioElement);
          sourceNode.connect(analyserNode);
          analyserNode.connect(audioCtx.destination);
        } catch (e) {
          // If media element source cannot connect directly, fallback to visual animation
          console.warn("MediaElementSource note:", e);
        }
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function formatAudioTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  const radioTrackSelect = document.getElementById("radio-track-select");
  radioTrackSelect?.addEventListener("change", () => {
    currentTrackIdx = Number(radioTrackSelect.value);
    loadTrack(true);
  });

  function updateTrackMetadata() {
    const track = radioTracks[currentTrackIdx];
    if (radioTrackTitle) radioTrackTitle.textContent = track.title;
    if (radioTrackGenre) radioTrackGenre.textContent = track.genre;
    if (radioTrackSelect) radioTrackSelect.value = String(currentTrackIdx);
  }

  function loadTrack(playImmediately = false) {
    const track = radioTracks[currentTrackIdx];
    updateTrackMetadata();
    const canPlayOgg = audioElement.canPlayType("audio/ogg; codecs=vorbis");
    audioElement.src = (canPlayOgg && track.srcOgg) ? track.srcOgg : track.srcMp3;
    audioElement.load();

    if (playImmediately) {
      initWebAudio();
      audioElement.play().then(() => {
        setPlaybackState(true);
      }).catch(err => {
        console.warn("Audio playback prevented:", err);
        setPlaybackState(false);
      });
    }
  }

  function setPlaybackState(playing) {
    isRadioPlaying = playing;
    radioWrapper?.classList.toggle("radio-playing", isRadioPlaying);
    if (radioPlayBtn) radioPlayBtn.textContent = isRadioPlaying ? "⏸" : "▶";
    const statusLbl = radioToggle?.querySelector(".radio-status-label");
    if (statusLbl) statusLbl.textContent = isRadioPlaying ? "RADIO: ON" : "RADIO: OFF";
  }

  function toggleRadioPlayback() {
    initWebAudio();
    if (audioElement.paused) {
      if (!audioElement.src || audioElement.src === window.location.href) {
        loadTrack(true);
      } else {
        audioElement.play().then(() => {
          setPlaybackState(true);
          window.showStudioToast(`📻 Playing ${radioTracks[currentTrackIdx].title}`, "info");
        }).catch(err => {
          console.warn("Playback error:", err);
        });
      }
    } else {
      audioElement.pause();
      setPlaybackState(false);
    }
  }

  audioElement.addEventListener("play", () => setPlaybackState(true));
  audioElement.addEventListener("pause", () => setPlaybackState(false));
  audioElement.addEventListener("ended", () => {
    currentTrackIdx = (currentTrackIdx + 1) % radioTracks.length;
    loadTrack(true);
    window.showStudioToast(`📻 Next Track: ${radioTracks[currentTrackIdx].title}`, "info");
  });

  audioElement.addEventListener("timeupdate", () => {
    const cur = audioElement.currentTime || 0;
    const dur = audioElement.duration || 0;
    if (radioTimeDisplay) {
      radioTimeDisplay.textContent = `${formatAudioTime(cur)} / ${formatAudioTime(dur)}`;
    }
    if (radioProgressFill && dur > 0) {
      const pct = (cur / dur) * 100;
      radioProgressFill.style.width = `${pct}%`;
    }
  });

  radioProgressBar?.addEventListener("click", (e) => {
    if (!audioElement.duration) return;
    const rect = radioProgressBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioElement.currentTime = pos * audioElement.duration;
  });

  radioPlayBtn?.addEventListener("click", toggleRadioPlayback);
  radioNextBtn?.addEventListener("click", () => {
    currentTrackIdx = (currentTrackIdx + 1) % radioTracks.length;
    loadTrack(isRadioPlaying);
    if (isRadioPlaying) {
      window.showStudioToast(`📻 Playing ${radioTracks[currentTrackIdx].title}`, "info");
    }
  });
  radioPrevBtn?.addEventListener("click", () => {
    currentTrackIdx = (currentTrackIdx - 1 + radioTracks.length) % radioTracks.length;
    loadTrack(isRadioPlaying);
    if (isRadioPlaying) {
      window.showStudioToast(`📻 Playing ${radioTracks[currentTrackIdx].title}`, "info");
    }
  });

  // Initial metadata setup
  updateTrackMetadata();

  // Volume & Mute control
  let savedVolume = 0.8;
  try {
    const v = localStorage.getItem("studio_radio_volume");
    if (v !== null) savedVolume = parseFloat(v);
  } catch (_) {}

  audioElement.volume = isNaN(savedVolume) ? 0.8 : Math.max(0, Math.min(1, savedVolume));
  if (radioVolumeSlider) radioVolumeSlider.value = String(audioElement.volume);

  function updateVolumeIcon() {
    if (!radioVolumeBtn) return;
    if (audioElement.muted || audioElement.volume === 0) {
      radioVolumeBtn.textContent = "🔇";
      radioVolumeBtn.setAttribute("aria-label", "Unmute radio");
    } else if (audioElement.volume < 0.5) {
      radioVolumeBtn.textContent = "🔉";
      radioVolumeBtn.setAttribute("aria-label", "Mute radio");
    } else {
      radioVolumeBtn.textContent = "🔊";
      radioVolumeBtn.setAttribute("aria-label", "Mute radio");
    }
  }
  updateVolumeIcon();

  radioVolumeSlider?.addEventListener("input", (e) => {
    const vol = parseFloat(e.target.value);
    audioElement.volume = vol;
    audioElement.muted = (vol === 0);
    updateVolumeIcon();
    try {
      localStorage.setItem("studio_radio_volume", String(vol));
    } catch (_) {}
  });

  radioVolumeBtn?.addEventListener("click", () => {
    audioElement.muted = !audioElement.muted;
    if (!audioElement.muted && audioElement.volume === 0) {
      audioElement.volume = 0.8;
      if (radioVolumeSlider) radioVolumeSlider.value = "0.8";
    }
    updateVolumeIcon();
    window.showStudioToast?.(audioElement.muted ? "🔇 Radio Muted" : "🔊 Radio Unmuted", "info");
  });

  if (radioCanvas) {
    const vCtx = radioCanvas.getContext("2d");
    function renderVisualizer() {
      vCtx.clearRect(0, 0, radioCanvas.width, radioCanvas.height);
      const bars = 16;
      const barW = radioCanvas.width / bars - 2;

      if (isRadioPlaying && analyserNode && frequencyData) {
        analyserNode.getByteFrequencyData(frequencyData);
        for (let i = 0; i < bars; i++) {
          const val = frequencyData[i * 2] || 0;
          const h = Math.max(3, (val / 255) * radioCanvas.height * 0.92);
          vCtx.fillStyle = "#36e0a5";
          vCtx.fillRect(i * (barW + 2), radioCanvas.height - h, barW, h);
        }
      } else {
        for (let i = 0; i < bars; i++) {
          const h = isRadioPlaying
            ? Math.max(3, (Math.sin(Date.now() / 120 + i * 0.5) * 0.5 + 0.5) * radioCanvas.height * 0.85)
            : 3;
          vCtx.fillStyle = isRadioPlaying ? "#36e0a5" : "rgba(255,255,255,0.2)";
          vCtx.fillRect(i * (barW + 2), radioCanvas.height - h, barW, h);
        }
      }
      requestAnimationFrame(renderVisualizer);
    }
    requestAnimationFrame(renderVisualizer);
  }

  // Back to Top Button
  const backToTopBtn = document.getElementById("back-to-top-btn");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 280) {
        backToTopBtn.classList.add("is-visible");
      } else {
        backToTopBtn.classList.remove("is-visible");
      }
    }, { passive: true });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth"
      });
    });
  }

  // 9. Global Command Palette
  const cmdModal = document.getElementById("command-palette");
  const openCmdBtn = document.getElementById("open-cmd-palette");
  const cmdInput = document.getElementById("cmd-input");
  const cmdResults = document.getElementById("cmd-results");

  const isSubpage = location.pathname.includes("/games/") || location.pathname.includes("/projects/");
  const navTo = (hash) => {
    if (isSubpage) {
      window.location.href = `../index.html#${hash}`;
    } else {
      location.hash = hash;
    }
  };

  const cmdItems = [
    { title: "Scroll to Top of Page", badge: "NAV", action: () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }) },
    { title: "Toggle Dark / Light Theme", badge: "THEME", action: () => document.getElementById("theme-toggle")?.click() },
    { title: "Radio: Play / Pause Studio Soundtrack", badge: "AUDIO", action: () => toggleRadioPlayback() },
    { title: "Radio: Next Track", badge: "AUDIO", action: () => radioNextBtn?.click() },
    { title: "Radio: Previous Track", badge: "AUDIO", action: () => radioPrevBtn?.click() },
    { title: "Radio: Mute / Unmute Volume", badge: "AUDIO", action: () => radioVolumeBtn?.click() },
    { title: "Radio: Play Track 01 - Neon Grid", badge: "AUDIO", action: () => { currentTrackIdx = 0; loadTrack(true); } },
    { title: "Radio: Play Track 02 - Deep Orbit", badge: "AUDIO", action: () => { currentTrackIdx = 1; loadTrack(true); } },
    { title: "Radio: Play Track 03 - Void Cyberpunk", badge: "AUDIO", action: () => { currentTrackIdx = 2; loadTrack(true); } },
    { title: "Radio: Toggle Player Dock Visibility", badge: "AUDIO", action: () => setRadioVisibility(radioWrapper ? radioWrapper.hidden : true) },
    { title: "Subscribe to Studio RSS Devlog Feed", badge: "RSS", action: () => window.open(isSubpage ? "../feed.xml" : "feed.xml", "_blank") },
    { title: "Follow Studio on itch.io", badge: "ITCH", action: () => window.open("https://omrane-el-it.itch.io/", "_blank") },
    { title: "Launch Scorpion Strike Browser Arcade", badge: "ARCADE", action: () => { if (isSubpage) window.location.href = "../index.html#arcade"; else { location.hash = "arcade"; document.getElementById("game-start")?.click(); } } },
    { title: "Open Quick Contact Terminal", badge: "CONTACT", action: () => openContactModal() },
    { title: "View Studio Press Kit & Media Assets", badge: "PRESS", action: () => openPresskitModal() },
    { title: "Copy Studio Email Address", badge: "CLIPBOARD", action: () => copyEmailToClipboard() },
    { title: "Jump to Featured Games", badge: "NAV", action: () => navTo("games") },
    { title: "Jump to Announcements & Devlogs", badge: "NAV", action: () => navTo("announcements") },
    { title: "Jump to Shadow Engine Framework", badge: "NAV", action: () => navTo("tools") },
    { title: "Jump to Tech Stack Radar", badge: "NAV", action: () => navTo("about") },
    { title: "Play Lineburst (itch.io)", badge: "GAME", action: () => window.open("https://omrane-el-it.itch.io/linebrust", "_blank") },
    { title: "Play Paws & Platters (itch.io)", badge: "GAME", action: () => window.open("https://omrane-el-it.itch.io/pawsandplatters", "_blank") },
    { title: "Play Turf Bag: Alley Mafia (itch.io)", badge: "GAME", action: () => window.open("https://omrane-el-it.itch.io/turfbagalleymafia", "_blank") }
  ];

  let selectedCmdIdx = 0;
  function renderCmdResults(filtered) {
    if (!cmdResults) return;
    if (filtered.length === 0) {
      cmdResults.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);font-size:0.85rem;">No matching commands found</div>';
      return;
    }
    cmdResults.innerHTML = filtered.map((item, idx) => `
      <button class="cmd-item ${idx === selectedCmdIdx ? "selected" : ""}" data-idx="${idx}" type="button" role="option">
        <div class="cmd-item-left">
          <span class="cmd-item-icon">⚡</span>
          <span>${item.title}</span>
        </div>
        <span class="cmd-badge">${item.badge}</span>
      </button>
    `).join("");

    cmdResults.querySelectorAll(".cmd-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-idx"));
        filtered[idx]?.action();
        cmdModal?.close();
      });
    });
  }

  function filterCommands() {
    const q = (cmdInput?.value || "").toLowerCase().trim();
    const filtered = cmdItems.filter(i => i.title.toLowerCase().includes(q) || i.badge.toLowerCase().includes(q));
    selectedCmdIdx = 0;
    renderCmdResults(filtered);
  }

  let lastModalTrigger = null;
  function registerModalFocusRestore(dialog) {
    if (!dialog) return;
    dialog.addEventListener("close", () => {
      if (lastModalTrigger && typeof lastModalTrigger.focus === "function") {
        lastModalTrigger.focus();
        lastModalTrigger = null;
      }
    });
  }
  registerModalFocusRestore(cmdModal);

  openCmdBtn?.addEventListener("click", () => {
    lastModalTrigger = openCmdBtn;
    cmdModal?.showModal();
    if (cmdInput) cmdInput.value = "";
    filterCommands();
    cmdInput?.focus();
  });

  window.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (cmdModal?.open) {
        cmdModal.close();
      } else {
        lastModalTrigger = document.activeElement;
        cmdModal?.showModal();
        if (cmdInput) cmdInput.value = "";
        filterCommands();
        cmdInput?.focus();
      }
    }
  });

  cmdInput?.addEventListener("input", filterCommands);
  cmdInput?.addEventListener("keydown", e => {
    const items = cmdResults?.querySelectorAll(".cmd-item");
    if (!items || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedCmdIdx = (selectedCmdIdx + 1) % items.length;
      updateSelectedCmd();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedCmdIdx = (selectedCmdIdx - 1 + items.length) % items.length;
      updateSelectedCmd();
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[selectedCmdIdx]?.click();
    }
  });

  function updateSelectedCmd() {
    const items = cmdResults?.querySelectorAll(".cmd-item");
    items?.forEach((it, idx) => it.classList.toggle("selected", idx === selectedCmdIdx));
    items?.[selectedCmdIdx]?.scrollIntoView({ block: "nearest" });
  }

  cmdModal?.addEventListener("click", e => {
    if (e.target === cmdModal) cmdModal.close();
  });

  // 10. Fullscreen Screenshot Lightbox Modal
  const lightboxModal = document.getElementById("lightbox-modal");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");

  const lightboxTriggers = [...document.querySelectorAll(".lightbox-trigger")];
  let currentLightboxIdx = 0;
  registerModalFocusRestore(lightboxModal);

  function showLightbox(idx) {
    if (!lightboxModal || !lightboxImg || !lightboxTriggers.length) return;
    lastModalTrigger = document.activeElement;
    currentLightboxIdx = (idx + lightboxTriggers.length) % lightboxTriggers.length;
    const trigger = lightboxTriggers[currentLightboxIdx];
    lightboxImg.src = trigger.src;
    lightboxImg.alt = trigger.alt || "Screenshot preview";
    if (lightboxCaption) lightboxCaption.textContent = trigger.alt || "";
    lightboxModal.showModal();
  }

  lightboxTriggers.forEach((img, idx) => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", e => {
      e.preventDefault();
      showLightbox(idx);
    });
  });

  lightboxClose?.addEventListener("click", () => lightboxModal?.close());
  lightboxPrev?.addEventListener("click", () => showLightbox(currentLightboxIdx - 1));
  lightboxNext?.addEventListener("click", () => showLightbox(currentLightboxIdx + 1));
  lightboxModal?.addEventListener("click", e => {
    if (e.target === lightboxModal) lightboxModal.close();
  });
  window.addEventListener("keydown", e => {
    if (!lightboxModal?.open) return;
    if (e.key === "ArrowLeft") showLightbox(currentLightboxIdx - 1);
    else if (e.key === "ArrowRight") showLightbox(currentLightboxIdx + 1);
  });

  // 11. Studio Press Kit Modal
  const presskitModal = document.getElementById("presskit-modal");
  const openPresskitNav = document.getElementById("open-presskit-nav");
  const openPresskitFooter = document.getElementById("footer-presskit-btn");
  const closePresskit = document.getElementById("close-presskit");
  const copyBioBtn = document.getElementById("btn-copy-press-bio");
  registerModalFocusRestore(presskitModal);

  function openPresskitModal(triggerEl) {
    lastModalTrigger = triggerEl instanceof HTMLElement ? triggerEl : document.activeElement;
    presskitModal?.showModal();
  }
  openPresskitNav?.addEventListener("click", () => openPresskitModal(openPresskitNav));
  openPresskitFooter?.addEventListener("click", () => openPresskitModal(openPresskitFooter));
  closePresskit?.addEventListener("click", () => presskitModal?.close());
  presskitModal?.addEventListener("click", e => {
    if (e.target === presskitModal) presskitModal.close();
  });

  document.querySelectorAll(".copy-hex-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const hex = btn.getAttribute("data-hex");
      if (hex) {
        navigator.clipboard.writeText(hex).then(() => {
          window.showStudioToast(`Copied ${hex} to clipboard!`, "success");
        });
      }
    });
  });

  copyBioBtn?.addEventListener("click", () => {
    const text = `Omrano The Scorpion Dev
Independent Game & App Developer
Specializing in Godot 4, strategy, tactical simulations, and tactile puzzles.
Primary Titles: Zero Hour: Protocol, Paws & Platters, Turf Bag: Alley Mafia, Lineburst, Shadow Engine.
Website: https://omraneelit.github.io/omrano-the-scorpion-dev/
Contact: omraneelitdev@gmail.com`;
    navigator.clipboard.writeText(text).then(() => {
      window.showStudioToast("Copied Studio Press Kit to clipboard!", "success");
    });
  });

  // 12. Interactive Contact Modal
  const contactModal = document.getElementById("contact-modal");
  const openContactBtn = document.getElementById("open-contact-btn");
  const closeContactBtn = document.getElementById("close-contact-modal");
  const copyEmailBtn = document.getElementById("btn-copy-email");
  registerModalFocusRestore(contactModal);

  function openContactModal() {
    lastModalTrigger = openContactBtn || document.activeElement;
    contactModal?.showModal();
  }
  function copyEmailToClipboard() {
    navigator.clipboard.writeText("omraneelitdev@gmail.com").then(() => {
      window.showStudioToast("Email address copied: omraneelitdev@gmail.com", "success");
    });
  }

  openContactBtn?.addEventListener("click", openContactModal);
  closeContactBtn?.addEventListener("click", () => contactModal?.close());
  copyEmailBtn?.addEventListener("click", copyEmailToClipboard);
  contactModal?.addEventListener("click", e => {
    if (e.target === contactModal) contactModal.close();
  });

  // 13. Shadow Engine Tycoon Sandbox Controller
  const sandbox = document.getElementById("tycoon-sandbox");
  if (sandbox) {
    const venuePresets = {
      coffee: {
        title: "☕ Sunrise Coffee — Floor 01",
        tapValue: 5,
        stations: [
          { name: "Order Register", speed: 2.0, yield: 4, level: 1, timer: 0 },
          { name: "Espresso Machine", speed: 3.5, yield: 12, level: 1, timer: 0 },
          { name: "Bakery Counter", speed: 5.0, yield: 25, level: 1, timer: 0 }
        ],
        upgrades: [
          { name: "Automated Grinder (+Speed)", cost: 25, mult: 1.25 },
          { name: "Artisan Beans (+Yield)", cost: 60, mult: 1.5 },
          { name: "Neon Signage (+Customers)", cost: 140, mult: 2.0 }
        ]
      },
      arcade: {
        title: "🕹️ Cyber Arcade — Level 01",
        tapValue: 8,
        stations: [
          { name: "Token Dispenser", speed: 1.8, yield: 6, level: 1, timer: 0 },
          { name: "Pinball Matrix", speed: 3.0, yield: 16, level: 1, timer: 0 },
          { name: "VR Holo-Cabin", speed: 4.5, yield: 38, level: 1, timer: 0 }
        ],
        upgrades: [
          { name: "Overclocked CRT (+Speed)", cost: 40, mult: 1.3 },
          { name: "Rare Cartridges (+Yield)", cost: 95, mult: 1.6 },
          { name: "Tournament Stream (+Customers)", cost: 220, mult: 2.2 }
        ]
      },
      potions: {
        title: "🧪 Alchemist Lab — Chamber 01",
        tapValue: 12,
        stations: [
          { name: "Herb Mortar", speed: 2.2, yield: 10, level: 1, timer: 0 },
          { name: "Alembic Distiller", speed: 4.0, yield: 28, level: 1, timer: 0 },
          { name: "Infusion Crucible", speed: 6.0, yield: 65, level: 1, timer: 0 }
        ],
        upgrades: [
          { name: "Phoenix Flame (+Speed)", cost: 50, mult: 1.35 },
          { name: "Dragon Scale Filter (+Yield)", cost: 120, mult: 1.7 },
          { name: "Guild Contract (+Customers)", cost: 300, mult: 2.5 }
        ]
      }
    };

    let currentVenue = "coffee";
    let vaultCash = 15;
    let prestigeMult = 1.0;
    let state = JSON.parse(JSON.stringify(venuePresets.coffee));

    const vaultEl = document.getElementById("sandbox-vault");
    const incomeEl = document.getElementById("sandbox-income");
    const customersEl = document.getElementById("sandbox-customers");
    const multEl = document.getElementById("sandbox-mult");
    const titleEl = document.getElementById("stage-venue-title");
    const tapValEl = document.getElementById("tap-value");
    const stationsGrid = document.getElementById("stations-grid");
    const upgradesList = document.getElementById("sandbox-upgrades");
    const tapBtn = document.getElementById("sandbox-tap-btn");
    const prestigeBtn = document.getElementById("sandbox-prestige-btn");
    const logEl = document.getElementById("sandbox-log");
    const queueCanvas = document.getElementById("sandbox-queue-canvas");
    const qCtx = queueCanvas?.getContext("2d");

    let customers = [];
    function addLog(msg) {
      if (!logEl) return;
      const entry = document.createElement("div");
      entry.className = "log-entry";
      const time = new Date().toTimeString().split(" ")[0];
      entry.innerHTML = `<span>[${time}]</span> ${msg}`;
      logEl.prepend(entry);
      if (logEl.children.length > 20) logEl.lastChild.remove();
    }

    function renderSandboxUI() {
      if (titleEl) titleEl.textContent = state.title;
      if (tapValEl) tapValEl.textContent = `$${Math.round(state.tapValue * prestigeMult)}`;

      if (stationsGrid) {
        stationsGrid.innerHTML = state.stations.map((st, i) => `
          <div class="station-card">
            <div class="station-header">
              <strong>${st.name} (Lv. ${st.level})</strong>
              <span>+$${Math.round(st.yield * prestigeMult)} / ${st.speed.toFixed(1)}s</span>
            </div>
            <div class="station-progress-bar">
              <div class="progress-bar-fill" id="st-fill-${i}"></div>
            </div>
          </div>
        `).join("");
      }

      if (upgradesList) {
        upgradesList.innerHTML = state.upgrades.map((upg, i) => `
          <button class="upgrade-btn" data-upg="${i}" ${vaultCash < upg.cost ? "disabled" : ""} type="button">
            <div><strong>${upg.name}</strong></div>
            <span>$${upg.cost}</span>
          </button>
        `).join("");

        upgradesList.querySelectorAll(".upgrade-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-upg"));
            const upg = state.upgrades[idx];
            if (vaultCash >= upg.cost) {
              vaultCash -= upg.cost;
              state.stations.forEach(s => {
                s.yield = Math.round(s.yield * upg.mult);
                s.speed = Math.max(0.6, s.speed * 0.85);
              });
              upg.cost = Math.round(upg.cost * 1.8);
              addLog(`Applied upgrade: ${upg.name}`);
              renderSandboxUI();
            }
          });
        });
      }
    }

    document.querySelectorAll(".venue-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".venue-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentVenue = btn.getAttribute("data-venue");
        state = JSON.parse(JSON.stringify(venuePresets[currentVenue]));
        customers = [];
        addLog(`Switched venue to ${state.title}`);
        renderSandboxUI();
      });
    });

    tapBtn?.addEventListener("click", () => {
      const earn = Math.round(state.tapValue * prestigeMult);
      vaultCash += earn;
      customers.push({ x: 0, targetX: 60 + Math.random() * 480, color: "#36e0a5" });
      addLog(`Manual order fulfilled: +$${earn}`);
      if (window.showStudioToast) window.showStudioToast(`+$${earn} order fulfilled`, "success");
    });

    prestigeBtn?.addEventListener("click", () => {
      if (vaultCash >= 500) {
        vaultCash = 0;
        prestigeMult += 1.0;
        addLog(`Prestige Expansion triggered! Global multiplier now ${prestigeMult.toFixed(1)}x`);
        if (window.showStudioToast) window.showStudioToast(`Expanded! Multiplier: ${prestigeMult.toFixed(1)}x`, "info");
        renderSandboxUI();
      }
    });

    renderSandboxUI();

    let lastSimTime = performance.now();
    function simLoop(now) {
      const dt = Math.min((now - lastSimTime) / 1000, 0.1);
      lastSimTime = now;

      let incomeRate = 0;
      state.stations.forEach((st, i) => {
        st.timer += dt;
        const pct = Math.min(100, (st.timer / st.speed) * 100);
        const fill = document.getElementById(`st-fill-${i}`);
        if (fill) fill.style.width = `${pct}%`;

        if (st.timer >= st.speed) {
          st.timer = 0;
          const gain = Math.round(st.yield * prestigeMult);
          vaultCash += gain;
          customers.push({ x: 0, targetX: 40 + Math.random() * 500, color: "#38bdf8" });
          if (customers.length > 18) customers.shift();
        }
        incomeRate += (st.yield * prestigeMult) / st.speed;
      });

      if (vaultEl) vaultEl.textContent = `$${vaultCash.toLocaleString()}`;
      if (incomeEl) incomeEl.textContent = `+$${incomeRate.toFixed(1)} /s`;
      if (customersEl) customersEl.textContent = customers.length;
      if (multEl) multEl.textContent = `${prestigeMult.toFixed(1)}x`;

      if (prestigeBtn) {
        prestigeBtn.disabled = vaultCash < 500;
        prestigeBtn.textContent = vaultCash >= 500 ? `Expand (+1.0x Mult)` : `Expand (Req $500)`;
      }

      if (qCtx && queueCanvas) {
        qCtx.clearRect(0, 0, queueCanvas.width, queueCanvas.height);
        qCtx.fillStyle = "rgba(0,0,0,0.15)";
        qCtx.fillRect(0, 0, queueCanvas.width, queueCanvas.height);

        qCtx.fillStyle = "rgba(54, 224, 165, 0.2)";
        qCtx.fillRect(queueCanvas.width - 60, 20, 40, queueCanvas.height - 40);
        qCtx.strokeStyle = "#36e0a5";
        qCtx.strokeRect(queueCanvas.width - 60, 20, 40, queueCanvas.height - 40);

        customers.forEach((c, idx) => {
          c.x += (c.targetX - c.x) * 0.08;
          qCtx.fillStyle = c.color;
          qCtx.beginPath();
          qCtx.arc(c.x, 60 + Math.sin(now / 150 + idx) * 10, 8, 0, Math.PI * 2);
          qCtx.fill();
        });
      }

      requestAnimationFrame(simLoop);
    }
    requestAnimationFrame(simLoop);
  }

  // Universal Web Share Buttons
  document.querySelectorAll(".card-share-btn, .quick-share-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const title = btn.getAttribute("data-share-title") || "Omrano The Scorpion Dev";
      const relUrl = btn.getAttribute("data-share-url") || "";
      const fullUrl = new URL(relUrl, window.location.href).href;

      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: `Check out "${title}" by Omrano The Scorpion Dev:`,
            url: fullUrl
          });
          return;
        } catch (err) {
          if (err.name === "AbortError") return;
        }
      }

      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        window.showStudioToast?.("📋 Link copied to clipboard!", "success");
      } catch (_) {
        window.prompt("Copy link to share:", fullUrl);
      }
    });
  });
})();
