/* Ink in water: particles drift along a slowly changing flow field and
   leave fading trails. The pointer stirs a vortex; a click sends a ripple. */
(function () {
  var canvas = document.getElementById("ink");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pauseBtn = document.querySelector(".motion-toggle");

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, t = 0, particles = [], ripples = [];
  var colors = { ink: "14, 94, 79", brass: "168, 118, 31" };
  var pointer = { x: -9999, y: -9999, active: false, vx: 0, vy: 0 };
  var running = false, paused = false;

  try { paused = localStorage.getItem("motion") === "off"; } catch (e) {}

  function readColors() {
    var s = getComputedStyle(root);
    colors.ink = toRgb(s.getPropertyValue("--accent")) || colors.ink;
    colors.brass = toRgb(s.getPropertyValue("--brass")) || colors.brass;
  }
  function toRgb(hex) {
    hex = (hex || "").trim().replace("#", "");
    if (hex.length !== 6) return null;
    return parseInt(hex.slice(0, 2), 16) + ", " + parseInt(hex.slice(2, 4), 16) + ", " + parseInt(hex.slice(4, 6), 16);
  }

  function spawn(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.vx = 0; p.vy = 0;
    p.life = 0;
    p.maxLife = 180 + Math.random() * 320;
    p.brass = Math.random() < 0.14;
    return p;
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.round(Math.min(950, Math.max(160, (W * H) / 1500)));
    particles.length = Math.min(particles.length, target);
    while (particles.length < target) particles.push(spawn({}));
  }

  // Smooth, cheap flow field built from layered sines; t makes it evolve.
  function angleAt(x, y) {
    var f = 0.0022;
    return (
      Math.sin(x * f + t * 0.35) * 1.6 +
      Math.cos(y * f * 1.3 - t * 0.25) * 1.4 +
      Math.sin((x + y) * f * 0.6 + t * 0.15) * 1.1
    );
  }

  function step() {
    t += 0.004;
    var R = Math.min(220, Math.max(140, W * 0.14)), R2 = R * R;

    // Fade the previous frame to leave soft trails without painting a background.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, 0.055)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    var inkPath = new Path2D(), brassPath = new Path2D();

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = angleAt(p.x, p.y);
      var ax = Math.cos(a) * 0.09, ay = Math.sin(a) * 0.09;

      // Pointer vortex: swirl around the cursor, with a gentle pull of its motion.
      if (pointer.active) {
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 1) {
          var d = Math.sqrt(d2), k = 1 - d / R;
          ax += (-dy / d) * k * 0.55 + (dx / d) * k * 0.08 + pointer.vx * k * 0.02;
          ay += (dx / d) * k * 0.55 + (dy / d) * k * 0.08 + pointer.vy * k * 0.02;
        }
      }

      // Ripples: push outward near the expanding ring.
      for (var r = 0; r < ripples.length; r++) {
        var rp = ripples[r];
        var rx = p.x - rp.x, ry = p.y - rp.y, rd = Math.sqrt(rx * rx + ry * ry) || 1;
        var band = Math.abs(rd - rp.radius);
        if (band < 40) {
          var push = (1 - band / 40) * rp.strength;
          ax += (rx / rd) * push; ay += (ry / rd) * push;
        }
      }

      p.vx = (p.vx + ax) * 0.94;
      p.vy = (p.vy + ay) * 0.94;
      var ox = p.x, oy = p.y;
      p.x += p.vx; p.y += p.vy;
      p.life++;

      if (p.life > p.maxLife || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
        spawn(p);
        continue;
      }
      var path = p.brass ? brassPath : inkPath;
      path.moveTo(ox, oy);
      path.lineTo(p.x, p.y);
    }

    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(" + colors.ink + ", 0.34)";
    ctx.stroke(inkPath);
    ctx.strokeStyle = "rgba(" + colors.brass + ", 0.42)";
    ctx.stroke(brassPath);

    // Draw and age ripples.
    for (var j = ripples.length - 1; j >= 0; j--) {
      var q = ripples[j];
      q.radius += 6;
      q.strength *= 0.96;
      q.alpha *= 0.94;
      ctx.strokeStyle = "rgba(" + colors.brass + ", " + q.alpha.toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.radius, 0, Math.PI * 2); ctx.stroke();
      if (q.alpha < 0.01) ripples.splice(j, 1);
    }

    pointer.vx *= 0.9; pointer.vy *= 0.9;
  }

  function loop() {
    if (!running) return;
    step();
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || paused || reduceMotion || document.hidden) return;
    running = true;
    requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  // A still frame for reduced motion or when paused before the first frame.
  function stillFrame() {
    for (var n = 0; n < 90; n++) step();
  }

  function setPaused(v) {
    paused = v;
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", String(v));
      pauseBtn.setAttribute("aria-label", v ? "Play background animation" : "Pause background animation");
      pauseBtn.classList.toggle("is-paused", v);
    }
    try { localStorage.setItem("motion", v ? "off" : "on"); } catch (e) {}
    if (v) stop(); else start();
  }

  readColors();
  resize();
  if (reduceMotion || paused) stillFrame();
  if (pauseBtn) {
    if (reduceMotion) pauseBtn.hidden = true;
    pauseBtn.addEventListener("click", function () { setPaused(!paused); });
    setPaused(paused);
  }
  start();

  window.addEventListener("resize", function () { resize(); if (!running) stillFrame(); });
  window.addEventListener("pointermove", function (e) {
    if (pointer.active) { pointer.vx = e.clientX - pointer.x; pointer.vy = e.clientY - pointer.y; }
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener("pointerdown", function (e) {
    if (e.target.closest("a, button, [role=tab], input, textarea")) return;
    ripples.push({ x: e.clientX, y: e.clientY, radius: 4, strength: 2.2, alpha: 0.5 });
    if (ripples.length > 6) ripples.shift();
  }, { passive: true });
  document.addEventListener("pointerleave", function () { pointer.active = false; });
  window.addEventListener("blur", function () { pointer.active = false; });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  // Re-read colours when the theme changes.
  new MutationObserver(readColors).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (mq.addEventListener) mq.addEventListener("change", readColors);
})();
