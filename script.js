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

  /* ---------- Judge panel ----------
     Illustrative scenarios for the Handbook Assistant's three gates.
     Thresholds match the project's defaults (0.5 / 0.8 / 0.7). */
  var THRESH = [0.5, 0.8, 0.7];
  var SCENARIOS = [
    {
      q: "What's the minimum GPA to stay off academic probation?",
      retrieve: "5 excerpts · CS handbook first",
      scores: [0.86, 0.92, 0.88],
      verdict: ["ok", "Answered", "All three judges agree, so the student gets a cited answer from the handbook."]
    },
    {
      q: "Can I register 21 credit hours this term?",
      retrieve: "5 excerpts · none cover overloads",
      scores: [0.34, null, null],
      verdict: ["esc", "Escalated to an advisor", "The excerpts don't cover the question, so no answer is generated. A pending ticket is opened with the reason and the excerpts."]
    },
    {
      q: "هل يمكنني التحويل من قسم نظم المعلومات إلى علوم الحاسب في السنة الثالثة؟",
      rtl: true,
      retrieve: "5 excerpts · IS handbook first",
      scores: [0.71, 0.62, 0.84],
      verdict: ["esc", "Escalated to an advisor", "The draft is on topic, but some of its claims aren't supported by the excerpts. It fails faithfulness, so a human decides."]
    }
  ];

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".judge-tabs [role=tab]"));
  var qEl = document.getElementById("j-question");
  var rEl = document.getElementById("j-retrieve-val");
  var gates = Array.prototype.slice.call(document.querySelectorAll("#j-gates .gate"));
  var vEl = document.getElementById("j-verdict");
  var timers = [], cycle = null, userPicked = false, current = 0;

  function later(fn, ms) { timers.push(setTimeout(fn, reduceMotion ? 0 : ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function setGate(i, score) {
    var g = gates[i];
    var fill = g.querySelector(".fill"), scoreEl = g.querySelector(".g-score"), st = g.querySelector(".g-status");
    g.classList.remove("pass", "fail", "skipped");
    if (score === null) {
      g.classList.add("skipped");
      fill.style.setProperty("--v", 0);
      scoreEl.textContent = "—";
      st.className = "g-status skip";
      st.textContent = "not run · escalated earlier";
      return;
    }
    var ok = score >= THRESH[i];
    g.classList.add(ok ? "pass" : "fail");
    fill.style.setProperty("--v", score);
    scoreEl.textContent = score.toFixed(2);
    st.className = "g-status " + (ok ? "pass" : "fail");
    st.textContent = (ok ? "pass · ≥ " : "fail · < ") + THRESH[i].toFixed(2);
  }

  function show(idx) {
    clearTimers();
    current = idx;
    var s = SCENARIOS[idx];
    tabs.forEach(function (t, i) { t.setAttribute("aria-selected", String(i === idx)); t.tabIndex = i === idx ? 0 : -1; });
    qEl.textContent = s.q;
    if (s.rtl) { qEl.setAttribute("dir", "rtl"); qEl.setAttribute("lang", "ar"); } else { qEl.removeAttribute("dir"); qEl.removeAttribute("lang"); }

    // reset
    rEl.textContent = "searching…";
    gates.forEach(function (g) {
      g.classList.remove("pass", "fail", "skipped");
      g.querySelector(".fill").style.setProperty("--v", 0);
      g.querySelector(".g-score").textContent = "…";
      var st = g.querySelector(".g-status"); st.className = "g-status skip"; st.textContent = "waiting";
    });
    vEl.className = "verdict wait";
    vEl.innerHTML = "<b>Judging…</b><span>Checking the draft against the evidence.</span>";

    later(function () { rEl.textContent = s.retrieve; }, 450);
    later(function () { setGate(0, s.scores[0]); }, 900);
    // gates 2a and 2b run concurrently, so they fill together
    later(function () { setGate(1, s.scores[1]); setGate(2, s.scores[2]); }, 1800);
    later(function () {
      vEl.className = "verdict " + s.verdict[0];
      vEl.innerHTML = "<b></b><span></span>";
      vEl.querySelector("b").textContent = s.verdict[1];
      vEl.querySelector("span").textContent = s.verdict[2];
    }, 2600);
  }

  function startCycle() {
    if (reduceMotion || userPicked) return;
    cycle = setInterval(function () { show((current + 1) % SCENARIOS.length); }, 7500);
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

  if (tabs.length) {
    show(0);
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
