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

  /* ---------- Pipeline player ----------
     Steps through each project's pipeline, one stage at a time. */
  var PROJECTS = [
    {
      "key": "handbook",
      "tag": "LLM · RAG · Human-in-the-loop",
      "name": "Handbook Assistant",
      "sum": "Answers student questions from the handbooks, or hands them to a human advisor.",
      "steps": [
        [
          "Retrieve",
          "handbook excerpts via pgvector",
          ""
        ],
        [
          "Context check",
          "do the excerpts cover the question?",
          "gate"
        ],
        [
          "Generate",
          "an answer built only from the excerpts",
          ""
        ],
        [
          "Faithfulness + relevance",
          "two judges, run in parallel",
          "gate"
        ],
        [
          "Answer or escalate",
          "a ticket for an advisor if any check fails",
          "ok"
        ]
      ],
      "stats": [
        [
          "3",
          "judge gates"
        ],
        [
          "115",
          "tests in CI"
        ]
      ]
    },
    {
      "key": "mizan",
      "tag": "LLM · RAG · Arabic NLP",
      "name": "Mizan",
      "sum": "Egyptian labor law questions, answered in Arabic or English.",
      "steps": [
        [
          "Load profile",
          "what it remembers about the user",
          ""
        ],
        [
          "Retrieve",
          "ChromaDB with multilingual-e5",
          ""
        ],
        [
          "Grade passages",
          "rewrite the question and retry if weak",
          "gate"
        ],
        [
          "Generate",
          "a personalized, grounded answer",
          ""
        ],
        [
          "Save profile",
          "Trustcall updates the user's memory",
          "ok"
        ]
      ],
      "stats": [
        [
          "AR + EN",
          "languages"
        ],
        [
          "Live",
          "on Hugging Face"
        ]
      ]
    },
    {
      "key": "repo",
      "tag": "LLM pipeline",
      "name": "GitHub Repository Q&A",
      "sum": "Ask questions about a codebase through a REST API.",
      "steps": [
        [
          "Ingest",
          "load the repository",
          ""
        ],
        [
          "Retrieve",
          "find the code relevant to the question",
          ""
        ],
        [
          "Answer",
          "an LLM response grounded in the repo",
          ""
        ],
        [
          "Serve",
          "a REST API packaged with Docker",
          "ok"
        ]
      ],
      "stats": [
        [
          "<200 ms",
          "API responses"
        ],
        [
          "Docker",
          "reproducible"
        ]
      ]
    },
    {
      "key": "visioneer",
      "tag": "Generative vision · Published",
      "name": "Visioneer",
      "sum": "Floor plans generated from text prompts, inside an Android app.",
      "steps": [
        [
          "Prompt template",
          "a structured description of the layout",
          ""
        ],
        [
          "Fine-tuned SD 1.5",
          "trained on 12,000+ floor plans",
          ""
        ],
        [
          "Floor plan",
          "the generated layout",
          ""
        ],
        [
          "Android app",
          "view and share the design",
          "ok"
        ]
      ],
      "stats": [
        [
          "12k+",
          "training samples"
        ],
        [
          "1",
          "published paper"
        ]
      ]
    },
    {
      "key": "bookings",
      "tag": "Classical ML",
      "name": "Reservation Cancellation",
      "sum": "Predicts which reservations will be cancelled.",
      "steps": [
        [
          "Features",
          "engineered from 10,000+ records",
          ""
        ],
        [
          "Train",
          "a supervised model",
          ""
        ],
        [
          "Tune",
          "hyperparameters, +12% F1",
          ""
        ],
        [
          "Predict",
          "85% accuracy",
          "ok"
        ]
      ],
      "stats": [
        [
          "85%",
          "accuracy"
        ],
        [
          "+12%",
          "F1 from tuning"
        ]
      ]
    }
  ];

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".player-tabs [role=tab]"));
  var tagEl = document.getElementById("pl-tag");
  var nameEl = document.getElementById("pl-name");
  var sumEl = document.getElementById("pl-sum");
  var stepsEl = document.getElementById("pl-steps");
  var statsEl = document.getElementById("pl-stats");
  var linkEl = document.getElementById("pl-link");
  var footEl = document.querySelector(".pl-foot");
  var timers = [], cycle = null, userPicked = false, current = 0;

  function later(fn, ms) { timers.push(setTimeout(fn, reduceMotion ? 0 : ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function show(idx) {
    clearTimers();
    current = idx;
    var p = PROJECTS[idx];
    tabs.forEach(function (t, i) { t.setAttribute("aria-selected", String(i === idx)); t.tabIndex = i === idx ? 0 : -1; });
    tagEl.textContent = p.tag;
    nameEl.textContent = p.name;
    sumEl.textContent = p.sum;
    linkEl.setAttribute("href", "#proj-" + p.key);

    stepsEl.textContent = "";
    var items = p.steps.map(function (s) {
      var li = el("li", "pl-step" + (s[2] ? " " + s[2] : ""));
      var dot = el("span", "pl-dot"); dot.setAttribute("aria-hidden", "true");
      var body = el("div");
      body.appendChild(el("b", null, s[0]));
      body.appendChild(el("small", null, s[1]));
      li.appendChild(dot); li.appendChild(body);
      stepsEl.appendChild(li);
      return li;
    });

    statsEl.textContent = "";
    p.stats.forEach(function (st) {
      var d = el("div");
      d.appendChild(el("b", null, st[0]));
      d.appendChild(el("span", null, st[1]));
      statsEl.appendChild(d);
    });

    footEl.classList.add("pending");
    items.forEach(function (li, i) { later(function () { li.classList.add("on"); }, 350 + i * 520); });
    later(function () { footEl.classList.remove("pending"); }, 350 + items.length * 520);
  }

  function startCycle() {
    if (reduceMotion || userPicked) return;
    cycle = setInterval(function () { show((current + 1) % PROJECTS.length); }, 6500);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { userPicked = true; clearInterval(cycle); show(i); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (i + d + tabs.length) % tabs.length;
      tabs[n].focus(); tabs[n].click();
    });
  });

  // Reserve room for the tallest project so the hero doesn't jump between them.
  var screenEl = document.getElementById("pl-screen");
  function reserveHeight() {
    var showing = current, tallest = 0;
    screenEl.style.minHeight = "";
    PROJECTS.forEach(function (p, i) {
      show(i);
      tallest = Math.max(tallest, screenEl.offsetHeight);
    });
    screenEl.style.minHeight = tallest + "px";
    show(showing);
  }

  if (tabs.length) {
    reserveHeight();
    window.addEventListener("resize", reserveHeight);
    startCycle();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) clearInterval(cycle); else { clearInterval(cycle); startCycle(); }
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
