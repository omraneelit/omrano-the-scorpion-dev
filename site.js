(() => {
  "use strict";

  document.documentElement.classList.add("js");

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
  if (reduceMotion || !("IntersectionObserver" in window)) {
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
})();
