/** Warcraft chrome — gold frame, faction detection, scroll toasts, parchment transitions. */
(function () {
  var mount = window.__duckyAppearanceSkinMount;
  if (!mount || !mount.slots) return;

  var slots = mount.slots;
  var key = mount.key;
  var pluginId = mount.pluginId || "warcraft";
  var ASSET_BASE = "/plugin-ui/" + encodeURIComponent(pluginId) + "/ui/";
  var nodes = [];
  var tabObserver = null;
  var panelObserver = null;
  var hookHandler = null;
  var factionTimer = 0;
  var lastAnimAt = 0;
  var animBusy = false;
  var reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function track(el) {
    nodes.push(el);
    return el;
  }

  // ── Carved gold corner ornament ────────────────────────────────
  var cornerUid = 0;
  function cornerSvgHtml() {
    cornerUid += 1;
    var gid = "wcG" + cornerUid;
    var hid = "wcH" + cornerUid;
    return (
      '<svg class="wc-corner-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      "<defs>" +
      '<linearGradient id="' + gid + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#e8c06a"/>' +
      '<stop offset="45%" stop-color="#8f6b24"/>' +
      '<stop offset="100%" stop-color="#3d2e12"/>' +
      "</linearGradient>" +
      '<linearGradient id="' + hid + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#fbbf24" stop-opacity="0.9"/>' +
      '<stop offset="100%" stop-color="transparent" stop-opacity="0"/>' +
      "</linearGradient>" +
      "</defs>" +
      // L-shaped carved bracket with a stepped inner edge
      '<path d="M0 0 L100 0 L84 16 L38 16 Q16 16 16 38 L16 84 L0 100 Z" fill="url(#' + gid + ')" stroke="#000" stroke-width="2"/>' +
      // filigree highlight
      '<path d="M6 6 L88 6 L72 20" stroke="url(#' + hid + ')" stroke-width="2" fill="none"/>' +
      '<path d="M6 6 L6 88 L20 72" stroke="url(#' + hid + ')" stroke-width="2" fill="none"/>' +
      // gem stud
      '<circle cx="13" cy="13" r="5" fill="#7c1f1f" stroke="#e8c06a" stroke-width="1.4"/>' +
      '<circle cx="11.4" cy="11.4" r="1.5" fill="#f8b4b4" opacity="0.8"/>' +
      // rivets
      '<circle cx="52" cy="10" r="2.6" fill="#2c2113" stroke="#b98a3a" stroke-width="1"/>' +
      '<circle cx="10" cy="52" r="2.6" fill="#2c2113" stroke="#b98a3a" stroke-width="1"/>' +
      "</svg>"
    );
  }

  function makeCorner(pos) {
    var el = document.createElement("div");
    el.className = "wc-corner wc-corner--" + pos;
    el.innerHTML = cornerSvgHtml();
    return el;
  }

  var frame = track(document.createElement("div"));
  frame.className = "wc-frame";
  ["tl", "tr", "bl", "br"].forEach(function (c) {
    frame.appendChild(makeCorner(c));
  });
  ["top", "bottom"].forEach(function (side) {
    var trim = document.createElement("div");
    trim.className = "wc-frame-trim wc-frame-trim--h " + side;
    frame.appendChild(trim);
  });
  ["left", "right"].forEach(function (side) {
    var trim = document.createElement("div");
    trim.className = "wc-frame-trim wc-frame-trim--v " + side;
    frame.appendChild(trim);
  });
  slots.frame.replaceChildren(frame);

  var header = track(document.createElement("div"));
  header.className = "wc-header";
  header.innerHTML = '<div class="wc-header-glint"></div>';
  slots.header.replaceChildren(header);

  var left = track(document.createElement("div"));
  left.className = "wc-rail wc-rail--left";
  slots.left.replaceChildren(left);

  var right = track(document.createElement("div"));
  right.className = "wc-rail wc-rail--right";
  slots.right.replaceChildren(right);

  // ── Faction detection (accent colour of the active profile) ────
  var FACTIONS = {
    "#5a8ac4": "human",
    "#d4624a": "orc",
    "#5aaaa5": "elf",
    "#a68ac4": "undead",
  };

  function detectFaction() {
    var accent = "";
    try {
      accent = (
        getComputedStyle(document.body).getPropertyValue("--accent") || ""
      )
        .trim()
        .toLowerCase();
    } catch (_) {
      /* ignore */
    }
    var faction = FACTIONS[accent] || "classic";
    if (document.body.getAttribute("data-wc-faction") !== faction) {
      document.body.setAttribute("data-wc-faction", faction);
    }
  }

  detectFaction();
  factionTimer = window.setInterval(detectFaction, 2500);

  // ── Panel decoration (class-only; never insert into React hosts) ─
  var PANEL_SEL =
    ".dock-rail-shell, .editor-group, .settings-view-sidebar-shell, " +
    ".settings-view-main, .chat-column, .modal";

  function decoratePanel(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.getAttribute("data-wc-panel") === "1") return;
    if (!el.matches || !el.matches(PANEL_SEL)) return;
    el.setAttribute("data-wc-panel", "1");
    el.classList.add("wc-panel");
  }

  function decorateAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches(PANEL_SEL)) decoratePanel(scope);
    if (!scope.querySelectorAll) return;
    scope.querySelectorAll(PANEL_SEL).forEach(decoratePanel);
  }

  decorateAll(document);
  if (typeof MutationObserver === "function") {
    panelObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type !== "childList") continue;
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType !== 1) continue;
          decoratePanel(n);
          if (n.querySelectorAll) decorateAll(n);
        }
      }
    });
    panelObserver.observe(document.body, { childList: true, subtree: true });
  }

  // ── Sounds (plugin wavs + WebAudio fallback) ───────────────────
  var audioCtx = null;
  function getCtx() {
    if (audioCtx) return audioCtx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  function playSynthRustle() {
    var ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    var t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * 0.25);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.4));
    }
    var noise = ctx.createBufferSource();
    var ng = ctx.createGain();
    var nf = ctx.createBiquadFilter();
    noise.buffer = buf;
    nf.type = "bandpass";
    nf.frequency.value = 1400;
    nf.Q.value = 0.8;
    ng.gain.setValueAtTime(0.11, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(ctx.destination);
    noise.start(t);
  }

  function playWav(name) {
    try {
      var a = new Audio(ASSET_BASE + "sounds/" + name + ".wav?t=" + Date.now());
      a.volume = 0.45;
      void a.play().catch(function () {
        playSynthRustle();
      });
    } catch (_) {
      playSynthRustle();
    }
  }

  // ── Scroll toast (warcraftcn Toast, vanilla) ───────────────────
  var toastRoot = document.createElement("div");
  toastRoot.className = "wc-toast-root";
  toastRoot.setAttribute("aria-hidden", "true");
  document.body.appendChild(toastRoot);

  function showToast(message, variant, durationMs) {
    if (!message) return;
    var dur = durationMs || 5000;
    var toast = document.createElement("div");
    toast.className = "wc-toast" + (variant ? " wc-toast--" + variant : "");
    var hl = document.createElement("div");
    hl.className = "wc-toast-handle";
    var center = document.createElement("div");
    center.className = "wc-toast-center";
    var text = document.createElement("div");
    text.className = "wc-toast-text";
    text.textContent = String(message).slice(0, 120);
    center.appendChild(text);
    var hr = document.createElement("div");
    hr.className = "wc-toast-handle wc-toast-handle--flip";
    toast.appendChild(hl);
    toast.appendChild(center);
    toast.appendChild(hr);
    toastRoot.appendChild(toast);
    playWav("scroll");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        toast.classList.add("is-open");
      });
    });
    window.setTimeout(function () {
      toast.classList.remove("is-open");
      window.setTimeout(function () {
        toast.remove();
      }, 900);
    }, Math.max(1600, dur - 900));
  }
  window.__wcToast = showToast;

  // ── Scoped tab transitions (out THEN in; clone lives outside React) ─
  var OUT_MS = 170;
  var IN_MS = 360;
  var pendingHost = null;
  var pendingTimer = 0;

  function contentHostForTab(tab) {
    if (!tab) return null;
    if (
      tab.classList.contains("settings-view-sidebar-tab") ||
      tab.classList.contains("settings-view-header-tab") ||
      tab.closest(".settings-view")
    ) {
      var settings = tab.closest(".settings-view") || document.querySelector(".settings-view");
      return settings ? settings.querySelector(".settings-view-content") : null;
    }
    if (tab.classList.contains("editor-tab") || tab.closest(".editor-group")) {
      var group = tab.closest(".editor-group");
      return group ? group.querySelector(".editor-group-body") : null;
    }
    return null;
  }

  function clearClones() {
    document.querySelectorAll(".wc-panel-clone").forEach(function (c) {
      c.remove();
    });
  }

  function finishIn(host) {
    if (!host) {
      animBusy = false;
      return;
    }
    clearClones();
    host.classList.add("wc-anim-host");
    host.classList.remove("wc-panel-in");
    void host.offsetWidth;
    host.classList.add("wc-panel-in");
    window.setTimeout(function () {
      host.classList.remove("wc-panel-in", "wc-anim-host");
      animBusy = false;
      pendingHost = null;
    }, IN_MS);
  }

  function runScopedTransition(host) {
    if (!host) return;
    if (reduced) {
      playWav("click");
      return;
    }
    var now = Date.now();
    if (animBusy && pendingHost === host) return;
    if (now - lastAnimAt < 120) return;
    lastAnimAt = now;
    animBusy = true;
    pendingHost = host;

    if (pendingTimer) {
      window.clearTimeout(pendingTimer);
      pendingTimer = 0;
    }

    playWav("click");
    clearClones();

    var rect = host.getBoundingClientRect();
    var clone = document.createElement("div");
    clone.className = "wc-panel-clone";
    clone.setAttribute("aria-hidden", "true");
    clone.style.left = rect.left + "px";
    clone.style.top = rect.top + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    try {
      var shot = host.cloneNode(true);
      shot.classList.remove("wc-anim-host", "wc-panel-in");
      clone.appendChild(shot);
    } catch (_) {
      /* empty ok */
    }
    document.body.appendChild(clone);

    host.classList.add("wc-anim-host");
    host.style.opacity = "0";

    pendingTimer = window.setTimeout(function () {
      pendingTimer = 0;
      host.style.opacity = "";
      finishIn(host);
    }, OUT_MS);
  }

  function onTabPointerDown(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var tab = t.closest(
      ".editor-tab, .settings-view-sidebar-tab, .settings-view-header-tab"
    );
    if (!tab) return;
    if (tab.classList.contains("is-active") || tab.disabled) return;
    var ctx = getCtx();
    if (ctx && ctx.state === "suspended") void ctx.resume();
    var host = contentHostForTab(tab);
    if (host) runScopedTransition(host);
  }
  document.addEventListener("pointerdown", onTabPointerDown, true);

  // Fallback when route changes without pointerdown (keyboard / hooks)
  function snapshotActive() {
    return {
      settings: (
        document.querySelector(".settings-view-sidebar-tab.is-active") || {}
      ).textContent,
      settingsHeader: (
        document.querySelector(".settings-view-header-tab.is-active") || {}
      ).textContent,
      editor: (document.querySelector(".editor-tab.is-active") || {}).textContent,
    };
  }
  var prevSnap = snapshotActive();

  function hostForSnapChange(prev, next) {
    if ((prev.settings || "") !== (next.settings || "")) {
      return document.querySelector(".settings-view-content");
    }
    if ((prev.settingsHeader || "") !== (next.settingsHeader || "")) {
      return document.querySelector(".settings-view-content");
    }
    if ((prev.editor || "") !== (next.editor || "")) {
      var tab = document.querySelector(".editor-tab.is-active");
      return contentHostForTab(tab);
    }
    return null;
  }

  hookHandler = function (ev) {
    var detail = ev && ev.detail;
    var id = detail && detail.id;
    if (!id || (detail && detail.source === "warcraft")) return;
    detectFaction();
    if (id === "agent.done") {
      showToast("Work complete.", "success");
      return;
    }
    if (id === "agent.error") {
      showToast("The task has failed.", "error");
      return;
    }
    if (id === "verse.errors") {
      showToast("Verse errors reported.", "error");
      return;
    }
    if (animBusy) return;
    if (id === "tab.changed") {
      var tab = document.querySelector(".editor-tab.is-active");
      var host = contentHostForTab(tab);
      if (host && !host.closest(".settings-view")) runScopedTransition(host);
    }
  };
  window.addEventListener("ducky:hook", hookHandler);

  if (typeof MutationObserver === "function") {
    tabObserver = new MutationObserver(function () {
      var next = snapshotActive();
      var host = hostForSnapChange(prevSnap, next);
      prevSnap = next;
      if (!host) return;
      if (animBusy) return;
      runScopedTransition(host);
    });
    tabObserver.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });
  }

  // ── Cleanup ────────────────────────────────────────────────────
  window.__duckyAppearanceSkinCleanups = window.__duckyAppearanceSkinCleanups || {};
  window.__duckyAppearanceSkinCleanups[key] = function () {
    if (tabObserver) {
      tabObserver.disconnect();
      tabObserver = null;
    }
    if (panelObserver) {
      panelObserver.disconnect();
      panelObserver = null;
    }
    if (factionTimer) {
      window.clearInterval(factionTimer);
      factionTimer = 0;
    }
    document.querySelectorAll("[data-wc-panel='1']").forEach(function (el) {
      el.removeAttribute("data-wc-panel");
      el.classList.remove("wc-panel");
    });
    document.body.removeAttribute("data-wc-faction");
    if (hookHandler) {
      window.removeEventListener("ducky:hook", hookHandler);
      hookHandler = null;
    }
    document.removeEventListener("pointerdown", onTabPointerDown, true);
    if (pendingTimer) {
      window.clearTimeout(pendingTimer);
      pendingTimer = 0;
    }
    clearClones();
    if (window.__wcToast === showToast) delete window.__wcToast;
    toastRoot.remove();
    document
      .querySelectorAll(".wc-panel-in, .wc-anim-host")
      .forEach(function (el) {
        el.classList.remove("wc-panel-in", "wc-anim-host");
        el.style.opacity = "";
      });
    slots.frame.replaceChildren();
    slots.header.replaceChildren();
    slots.left.replaceChildren();
    slots.right.replaceChildren();
    nodes.length = 0;
  };
})();
