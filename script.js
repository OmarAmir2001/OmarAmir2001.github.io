(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme ---------- */
  document.querySelector(".theme-toggle").addEventListener("click", function () {
    var light = root.getAttribute("data-theme") === "light";
    if (light) root.removeAttribute("data-theme"); else root.setAttribute("data-theme", "light");
    try { localStorage.setItem("theme", light ? "dark" : "light"); } catch (e) {}
  });

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

  /* ---------- Terminal typing ---------- */
  var term = document.querySelector(".term");
  if (term && !reduceMotion) {
    var parts = Array.prototype.slice.call(term.querySelectorAll(".t-line, .t-out"));
    term.classList.add("typing");
    var i = 0;
    var next = function () {
      if (i >= parts.length) { term.classList.remove("typing"); return; }
      var el = parts[i++];
      el.classList.add("shown");
      var cmd = el.classList.contains("t-line") && el.querySelector("[data-type]");
      if (!cmd) { setTimeout(next, 260); return; }
      var full = cmd.textContent, n = 0;
      cmd.textContent = "";
      var speed = full.length > 30 ? 14 : 35;
      (function type() {
        cmd.textContent = full.slice(0, ++n);
        if (n < full.length) setTimeout(type, speed); else setTimeout(next, 220);
      })();
    };
    setTimeout(next, 250);
  }

  /* ---------- Reveal + counters ---------- */
  function countUp(el) {
    var target = +el.getAttribute("data-count"), suffix = el.getAttribute("data-suffix") || "";
    var start = null, dur = 1200;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var targets = document.querySelectorAll(".sec-title, .about-text, .counter, .feature, .card, .skill, .tl-item, .certs li, .paper, .contact-box");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        var c = entry.target.querySelector("[data-count]");
        if (c) countUp(c);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    targets.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
  }

  /* ---------- Embedding-space background ----------
     Points drift slowly; the pointer acts as a query vector and
     lights up its k nearest neighbours, like a retrieval step. */
  var canvas = document.getElementById("field");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W, H, pts = [], K = 5;
  var query = { x: -1, y: -1, auto: true, t: 0 };

  function rgb() { return getComputedStyle(root).getPropertyValue("--field-dot").trim() || "45, 212, 191"; }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(110, (W * H) / 14000));
    pts = [];
    for (var j = 0; j < count; j++) {
      pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18,
        r: Math.random() * 1.4 + .6
      });
    }
  }

  function draw() {
    var c = rgb();
    ctx.clearRect(0, 0, W, H);

    if (query.auto) {
      query.t += 0.0025;
      query.x = W * (0.5 + 0.35 * Math.cos(query.t * 1.3));
      query.y = H * (0.5 + 0.3 * Math.sin(query.t * 1.9));
    }

    var i, p;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (!reduceMotion) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      p.d = (p.x - query.x) * (p.x - query.x) + (p.y - query.y) * (p.y - query.y);
    }

    // faint links between close points: the "cluster" structure
    ctx.lineWidth = 1;
    for (i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d2 = dx * dx + dy * dy;
        if (d2 < 9000) {
          ctx.strokeStyle = "rgba(" + c + "," + (0.07 * (1 - d2 / 9000)) + ")";
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    }

    // k nearest neighbours of the query
    var nn = pts.slice().sort(function (a, b) { return a.d - b.d; }).slice(0, K);
    ctx.setLineDash([3, 4]);
    nn.forEach(function (q) {
      ctx.strokeStyle = "rgba(" + c + ",0.28)";
      ctx.beginPath(); ctx.moveTo(query.x, query.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    });
    ctx.setLineDash([]);

    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      var hit = nn.indexOf(p) !== -1;
      ctx.fillStyle = "rgba(" + c + "," + (hit ? 0.9 : 0.28) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, hit ? p.r + 1.6 : p.r, 0, Math.PI * 2); ctx.fill();
    }

    // the query point itself
    ctx.strokeStyle = "rgba(" + c + ",0.6)";
    ctx.beginPath(); ctx.arc(query.x, query.y, 5, 0, Math.PI * 2); ctx.stroke();
  }

  var running = false;
  function loop() {
    if (!running) return;
    draw();
    requestAnimationFrame(loop);
  }
  function start() { if (!running && !reduceMotion) { running = true; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  resize();
  draw();
  start();

  window.addEventListener("resize", function () { resize(); draw(); });
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    query.auto = false; query.x = e.clientX; query.y = e.clientY;
    if (reduceMotion) draw();
  });
  document.addEventListener("pointerleave", function () { query.auto = true; });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
})();
