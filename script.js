(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var darkMedia = window.matchMedia("(prefers-color-scheme: dark)");

  /* ---------- Theme ---------- */
  document.querySelector(".theme-toggle").addEventListener("click", function () {
    var current = root.getAttribute("data-theme") || (darkMedia.matches ? "dark" : "light");
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  /* ---------- Gem accent ---------- */
  var GEMS = { emerald: "#0e5e4f", sapphire: "#1d4f91", ruby: "#9e1c3f" };
  var gemBtns = Array.prototype.slice.call(document.querySelectorAll(".gems [role=radio]"));
  var favicon = document.querySelector("link[rel=icon]");

  function setFavicon(hex) {
    if (!favicon) return;
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'>" +
      "<circle cx='17' cy='17' r='17' fill='" + hex + "'/>" +
      "<circle cx='17' cy='17' r='8.5' fill='none' stroke='#f5f1e8' stroke-width='2.6'/>" +
      "<circle cx='17' cy='17' r='2' fill='#f5f1e8' fill-opacity='.6'/>" +
      "<circle cx='23' cy='11' r='3.2' fill='#e0a93c'/></svg>";
    favicon.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function setGem(name, save) {
    if (!GEMS[name]) name = "emerald";
    if (name === "emerald") root.removeAttribute("data-accent"); else root.setAttribute("data-accent", name);
    gemBtns.forEach(function (b) {
      var on = b.getAttribute("data-accent") === name;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    setFavicon(GEMS[name]);
    if (save) { try { localStorage.setItem("accent", name); } catch (e) {} }
  }

  gemBtns.forEach(function (b, i) {
    b.addEventListener("click", function () { setGem(b.getAttribute("data-accent"), true); });
    b.addEventListener("keydown", function (e) {
      var d = (e.key === "ArrowRight" || e.key === "ArrowDown") ? 1 : (e.key === "ArrowLeft" || e.key === "ArrowUp") ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = gemBtns[(i + d + gemBtns.length) % gemBtns.length];
      n.focus(); n.click();
    });
  });
  setGem(root.getAttribute("data-accent") || "emerald", false);

  /* ---------- Mobile menu ---------- */
  var menu = document.getElementById("menu");
  var menuBtn = document.querySelector(".menu-toggle");
  function setMenu(open) {
    menu.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  menuBtn.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Get to know me ----------
     A few facets of who I am; cycles on its own until someone picks one. */
  var FACETS = [
    {
      "tab": "Builder",
      "title": "The builder",
      "line": "I learn by building, and I don't stop at \"it runs.\" If I can't explain how it fails, I'm not done.",
      "stat": [
        "5",
        "end-to-end projects"
      ],
      "tags": [
        "LLM agents",
        "NLP",
        "Generative vision",
        "Classical ML"
      ]
    },
    {
      "tab": "Teacher",
      "title": "The teacher",
      "line": "I've been a teaching assistant since 2025. Explaining something to a room of students is how I find out whether I really understand it.",
      "stat": [
        "100+",
        "students mentored"
      ],
      "tags": [
        "Machine Learning",
        "Algorithms",
        "Data Structures"
      ]
    },
    {
      "tab": "Researcher",
      "title": "The researcher",
      "line": "My graduation project turned into a peer-reviewed paper on teaching Stable Diffusion to draw floor plans.",
      "stat": [
        "1",
        "published paper · MGV 2025"
      ],
      "tags": [
        "Stable Diffusion",
        "Prompt templates",
        "Co-author"
      ]
    },
    {
      "tab": "Learner",
      "title": "The learner",
      "line": "Math first, then machine learning, deep learning, NLP and LLM agents. I keep going back to the fundamentals.",
      "stat": [
        "30+",
        "certificates earned"
      ],
      "tags": [
        "DeepLearning.AI",
        "Stanford",
        "LangChain Academy",
        "DataTalks.Club"
      ]
    },
    {
      "tab": "Languages",
      "title": "Three languages",
      "line": "Arabic at home, English at work, and German whenever I get the chance.",
      "stat": [
        "8.0",
        "IELTS band score"
      ],
      "tags": [
        "عربي",
        "English",
        "Deutsch"
      ]
    },
    {
      "tab": "Off the clock",
      "title": "Off the clock",
      "line": "When I'm not building or teaching, you'll find me reading, listening to podcasts, or playing video games.",
      "stat": [
        "Giza",
        "6th of October, Egypt"
      ],
      "tags": [
        "Reading",
        "Podcasts",
        "Video games"
      ]
    }
  ];
  var DWELL = 6000;

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".me-tabs [role=tab]"));
  var screenEl = document.getElementById("me-screen");
  var facetEl = document.getElementById("me-facet");
  var lineEl = document.getElementById("me-line");
  var statV = document.getElementById("me-stat-v");
  var statL = document.getElementById("me-stat-l");
  var tagsEl = document.getElementById("me-tags");
  var progress = document.querySelector(".me-progress");
  var timer = null, swapTimer = null, userPicked = false, current = 0;

  function render(f) {
    facetEl.textContent = f.title;
    lineEl.textContent = f.line;
    statV.textContent = f.stat[0];
    statL.textContent = f.stat[1];
    tagsEl.textContent = "";
    f.tags.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t;
      if (/[\u0600-\u06FF]/.test(t)) { li.lang = "ar"; li.className = "ar"; }
      tagsEl.appendChild(li);
    });
  }

  function restartBar() {
    if (reduceMotion || userPicked) { progress.classList.add("stopped"); return; }
    progress.classList.remove("run");
    void progress.offsetWidth; // restart the CSS transition
    progress.style.setProperty("--me-dur", DWELL + "ms");
    progress.classList.add("run");
  }

  function show(idx, animate) {
    current = idx;
    tabs.forEach(function (t, i) { t.setAttribute("aria-selected", String(i === idx)); t.tabIndex = i === idx ? 0 : -1; });
    clearTimeout(swapTimer);
    if (animate && !reduceMotion) {
      screenEl.classList.add("swap");
      swapTimer = setTimeout(function () { render(FACETS[idx]); screenEl.classList.remove("swap"); }, 220);
    } else {
      render(FACETS[idx]);
    }
    restartBar();
  }

  function schedule() {
    clearTimeout(timer);
    if (reduceMotion || userPicked || document.hidden) return;
    timer = setTimeout(function () { show((current + 1) % FACETS.length, true); schedule(); }, DWELL);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { userPicked = true; clearTimeout(timer); show(i, true); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (i + d + tabs.length) % tabs.length;
      tabs[n].focus(); tabs[n].click();
    });
  });

  // Reserve room for the tallest facet so the hero doesn't jump as they change.
  function reserveHeight() {
    screenEl.style.minHeight = "";
    var tallest = 0;
    FACETS.forEach(function (f) { render(f); tallest = Math.max(tallest, screenEl.offsetHeight); });
    screenEl.style.minHeight = tallest + "px";
    render(FACETS[current]);
  }

  if (tabs.length) {
    reserveHeight();
    window.addEventListener("resize", reserveHeight);
    show(0, false);
    schedule();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearTimeout(timer); else { restartBar(); schedule(); }
    });
  }

  /* ---------- Reveal + counters ---------- */
  function countUp(el) {
    var target = +el.getAttribute("data-count"), suffix = el.getAttribute("data-suffix") || "";
    var start = null, dur = 1300;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var targets = document.querySelectorAll(".sec-head, .about-text, .counter, .proj, .core-stack, .skill, .timeline li, .cert, .more-certs, .paper, .contact-grid");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        var c = entry.target.querySelector("[data-count]");
        if (c) countUp(c);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }
})();
