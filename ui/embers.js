/** Warcraft golden-embers FX for #ducky-fx-root (appearance.effects). */
(function () {
  var mount = window.__duckyAppearanceFxMount;
  var root = (mount && mount.root) || document.getElementById("ducky-fx-root");
  var key = (mount && mount.key) || "warcraft::embers";
  if (!root) return;

  var reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var canvas = document.createElement("canvas");
  canvas.className = "ducky-fx-canvas";
  canvas.setAttribute("aria-hidden", "true");
  root.replaceChildren(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var embers = [];
  var motes = [];
  var fog = [];
  var raf = 0;
  var start = performance.now();

  function spawnEmber(w, h, atBottom) {
    return {
      x: Math.random() * w,
      y: atBottom ? h + 10 : Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(0.15 + Math.random() * 0.45),
      r: 0.8 + Math.random() * 1.8,
      a: 0.25 + Math.random() * 0.55,
      tw: Math.random() * Math.PI * 2,
      twSpeed: 0.002 + Math.random() * 0.004,
      hot: Math.random() < 0.3,
    };
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    embers = [];
    motes = [];
    fog = [];
    var n = Math.floor((w * h) / 26000);
    for (var i = 0; i < n; i++) embers.push(spawnEmber(w, h, false));
    var m = Math.floor((w * h) / 14000);
    for (var j = 0; j < m; j++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        a: 0.04 + Math.random() * 0.12,
        s: 0.5 + Math.random() * 1.1,
        tw: Math.random() * Math.PI * 2,
        twSpeed: 0.0006 + Math.random() * 0.002,
      });
    }
    for (var f = 0; f < 26; f++) {
      fog.push({
        x: Math.random() * w,
        y: h * 0.4 + Math.random() * h * 0.6,
        r: 90 + Math.random() * 220,
        a: 0.012 + Math.random() * 0.025,
        drift: (Math.random() - 0.5) * 0.05,
      });
    }
  }

  function draw(ts) {
    raf = window.requestAnimationFrame(draw);
    var w = window.innerWidth;
    var h = window.innerHeight;
    var cx = w * 0.5;
    var t = ts - start;

    // Dark stone-hall void with a warm hearth glow low centre
    var bg = ctx.createRadialGradient(cx, h * 0.42, 0, cx, h * 0.42, Math.max(w, h) * 0.75);
    bg.addColorStop(0, "#1a1208");
    bg.addColorStop(0.55, "#0e0904");
    bg.addColorStop(1, "#060402");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    var hearth = ctx.createRadialGradient(cx, h + 40, 10, cx, h + 40, h * 0.7);
    hearth.addColorStop(0, "rgba(214, 120, 40, 0.10)");
    hearth.addColorStop(0.5, "rgba(160, 80, 20, 0.05)");
    hearth.addColorStop(1, "transparent");
    ctx.fillStyle = hearth;
    ctx.fillRect(0, 0, w, h);

    // Fog banks
    for (var f = 0; f < fog.length; f++) {
      var fb = fog[f];
      if (!reduced) {
        fb.x += fb.drift;
        if (fb.x < -fb.r) fb.x = w + fb.r;
        if (fb.x > w + fb.r) fb.x = -fb.r;
      }
      var fg = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, fb.r);
      fg.addColorStop(0, "rgba(120, 90, 40," + fb.a + ")");
      fg.addColorStop(1, "transparent");
      ctx.fillStyle = fg;
      ctx.fillRect(fb.x - fb.r, fb.y - fb.r, fb.r * 2, fb.r * 2);
    }

    // Dust motes (still points that twinkle)
    for (var m = 0; m < motes.length; m++) {
      var mo = motes[m];
      var ta = reduced
        ? mo.a
        : mo.a * (0.5 + 0.5 * Math.sin(mo.tw + t * mo.twSpeed));
      ctx.fillStyle = "rgba(232, 192, 106," + ta + ")";
      ctx.fillRect(mo.x, mo.y, mo.s, mo.s);
    }

    // Rising embers
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      if (!reduced) {
        e.x += e.vx + Math.sin(e.tw + t * 0.001) * 0.12;
        e.y += e.vy;
        if (e.y < -12 || e.x < -12 || e.x > w + 12) {
          embers[i] = spawnEmber(w, h, true);
          e = embers[i];
        }
      }
      var flicker = reduced
        ? e.a
        : e.a * (0.55 + 0.45 * Math.sin(e.tw + t * e.twSpeed * 3));
      var col = e.hot ? "255, 170, 70" : "232, 192, 106";
      var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 3.2);
      g.addColorStop(0, "rgba(" + col + "," + flicker + ")");
      g.addColorStop(0.4, "rgba(" + col + "," + flicker * 0.35 + ")");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(e.x - e.r * 3.2, e.y - e.r * 3.2, e.r * 6.4, e.r * 6.4);
    }
  }

  resize();
  raf = window.requestAnimationFrame(draw);
  window.addEventListener("resize", resize);

  window.__duckyAppearanceFxCleanups = window.__duckyAppearanceFxCleanups || {};
  window.__duckyAppearanceFxCleanups[key] = function () {
    window.cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    root.replaceChildren();
  };
})();
