/* Try Saigon engine: a 360° role-play of a first day in Ho Chi Minh City.
   The world (scenes, people, prices, phrases) lives in trip.js; scene.js paints the 360° views.
   Progress is kept in this browser (localStorage) so a visitor can come back to it. */
(function () {
  "use strict";
  var T = window.TRIP;
  var root = document.getElementById("ts");
  if (!T || !root) return;

  var DENOMS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];
  var CUR = { USD: "$", EUR: "€", GBP: "£", AUD: "A$" };
  var KEY = "ts_state_v1";
  var S, RATE = { rates: T.fallbackRate, live: false, date: "" };
  // Hotspot editor: open /try-saigon/?edit to see the yaw/pitch of any point you click, and jump between scenes.
  var EDIT = /[?&]edit\b/.test(location.search);

  /* ---------------------------------------------------------------- helpers */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function vnd(n) { return Math.round(n).toLocaleString("en-US") + " ₫"; }
  function home(n) { return CUR[S.cur] + (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function toHome(v) { return v / RATE.rates[S.cur]; }
  function clock(m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + ":" + (mm < 10 ? "0" : "") + mm + (h < 12 ? " am" : " pm"); }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function $(s, r) { return (r || root).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); }
  function cash() { return DENOMS.reduce(function (t, d) { return t + d * (S.notes[d] || 0); }, 0); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function addSkill(o) { for (var k in o) S.skills[k] = (S.skills[k] || 0) + o[k]; }
  function spend(what, v, how) { S.spent.push({ what: what, vnd: v, how: how || "cash", t: S.time }); }

  // Vietnamese words for an amount of dong, Southern style ("ngàn"), e.g. 33000 -> "ba mươi ba ngàn"
  var D = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  function vi999(n, full) {
    var h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, u = n % 10, w = [];
    if (h || full) w.push(D[h] + " trăm");
    if (t > 1) { w.push(D[t] + " mươi"); if (u === 1) w.push("mốt"); else if (u === 5) w.push("lăm"); else if (u) w.push(D[u]); }
    else if (t === 1) { w.push("mười"); if (u === 5) w.push("lăm"); else if (u) w.push(D[u]); }
    else if (u) { if (h || full) w.push("lẻ"); w.push(D[u]); }
    return w.join(" ");
  }
  function viMoney(v) {
    var tr = Math.floor(v / 1e6), ng = Math.floor(v / 1000) % 1000, w = [];
    if (tr) w.push(vi999(tr) + " triệu");
    if (ng) w.push(vi999(ng, !!tr) + " ngàn");
    return w.join(" ") || "không";
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function viCount(n) { return n <= 9 ? D[n] : String(n); }

  function greedy(amount, small) {
    var out = {}, left = amount;
    if (small) { // ask for some small notes: 2 x 100k, 2 x 50k, 3 x 20k, 2 x 10k first
      [[100000, 2], [50000, 2], [20000, 3], [10000, 2]].forEach(function (p) {
        var k = Math.min(p[1], Math.floor(left / p[0] / 2)); if (k > 0) { out[p[0]] = k; left -= k * p[0]; }
      });
    }
    DENOMS.forEach(function (d) { var k = Math.floor(left / d); if (k) { out[d] = (out[d] || 0) + k; left -= k * d; } });
    return out;
  }
  function addNotes(o) { for (var d in o) S.notes[d] = (S.notes[d] || 0) + o[d]; }
  function noteHtml(d, extra) {
    return '<span class="ts-note n' + d + '"' + (extra || "") + '><b>' + (d >= 1000 ? (d / 1000).toLocaleString("en-US") : d) + '</b><i>000</i></span>';
  }

  /* ---------------------------------------------------------------- listen: Vietnamese text-to-speech */
  // Uses the device's own Vietnamese voice (speechSynthesis). Every Vietnamese phrase in the dialogue sheet gets a listen button.
  var TTS = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window, viVoice = null, warned = false;
  function pickVoice() { if (!TTS) return; var v = speechSynthesis.getVoices(); viVoice = v.find(function (x) { return /^vi/i.test(x.lang); }) || null; }
  if (TTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(t) {
    if (!TTS || !t) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t); u.lang = "vi-VN"; u.rate = 0.85; if (viVoice) u.voice = viVoice;
    speechSynthesis.speak(u);
    if (!viVoice && !warned && speechSynthesis.getVoices().length) { warned = true; toast("Your device has no Vietnamese voice, so this may sound wrong. On iPhone add one in Settings → Accessibility → Spoken Content → Voices."); }
  }
  var SPK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  function speakify(box) {
    if (!TTS || !box) return;
    Array.prototype.forEach.call(box.querySelectorAll('[lang="vi"]:not([data-sp])'), function (e) {
      e.dataset.sp = "1";
      if (e.closest("button, label, a, .ts-hs") || !e.textContent.trim()) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "ts-speak"; b.innerHTML = SPK; b.setAttribute("aria-label", "Listen in Vietnamese");
      b.onclick = function (ev) { ev.stopPropagation(); speak(e.textContent.replace(/[()…]/g, "").trim()); };
      e.insertAdjacentElement("afterend", b);
    });
  }

  /* ---------------------------------------------------------------- rate */
  function loadRate() {
    return fetch("/api/rate").then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      if (j && j.rates && j.rates.USD) RATE = { rates: j.rates, live: true, date: j.date || "", source: j.source || "" };
    }).catch(function () {});
  }
  function rateLine(where) {
    var mid = RATE.rates[S.cur], buy = Math.floor(mid * T.spreads[where]);
    return { mid: mid, buy: buy };
  }

  /* ---------------------------------------------------------------- stage: 360° viewer + HUD + sheet */
  var viewer = null, stage;
  function scene() { return T.scenes[S.scene]; }
  function objFlags(o) {
    var c = [];
    if (o.nav && (!o.navNeeds || S.flags[o.navNeeds])) c.push("nav");
    if (o.once && S.flags[o.once]) c.push("done");
    if (o.from != null && S.time < o.from) c.push("closed");
    return c.join(" ");
  }
  function frame() {
    root.innerHTML =
      '<div class="ts-stage" id="ts-stage">' +
        '<div id="ts-pano" class="ts-view"></div>' +
        '<div class="ts-fade" id="ts-fade"></div>' +
        '<div class="ts-top"><div class="ts-where" id="ts-where"></div>' +
          '<div class="ts-meta"><span class="ts-clock" id="ts-clock"></span>' +
          '<button type="button" class="ts-pill" data-panel="wallet" id="ts-purse"></button>' +
          '<button type="button" class="ts-pill" data-panel="todo" id="ts-todo"></button>' +
          '<button type="button" class="ts-pill ts-fs" data-list aria-label="Everything here, as a list">☰</button>' +
          '<button type="button" class="ts-pill ts-fs" data-fs aria-label="Full screen">⛶</button></div></div>' +
        (EDIT ? '<div class="ts-edit" id="ts-edit"></div>' : '') +
        '<div class="ts-rain" id="ts-rain" hidden></div>' +
        '<div class="ts-caption" id="ts-caption" hidden></div>' +
        '<section class="ts-sheet" id="ts-sheet" hidden aria-live="polite"><div class="ts-sheet-head"><h3 id="ts-sheet-title"></h3><button type="button" class="ts-close" data-close aria-label="Close">✕</button></div><div class="ts-sheet-body" id="ts-sheet-body"></div></section>' +
      '</div>';
    stage = $("#ts-stage");
    $$("[data-panel]").forEach(function (b) { b.onclick = function () { b.dataset.panel === "wallet" ? walletPanel() : todoPanel(); }; });
    $("[data-close]").onclick = closeSheet;
    $("[data-list]").onclick = listPanel;
    if (TTS && window.MutationObserver) new MutationObserver(function () { speakify($("#ts-sheet-body")); }).observe($("#ts-sheet-body"), { childList: true, subtree: true });
    $("[data-fs]").onclick = function () {
      if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
    };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#ts-sheet").hidden) closeSheet(); });
  }
  function hud() {
    if (!stage) return;
    var sc = scene(), done = T.goals.filter(function (g) { return S.goals[g.id]; }).length;
    $("#ts-where").innerHTML = '<b>' + esc(sc.name) + '</b><span lang="vi">' + esc(sc.nameVi) + '</span>';
    $("#ts-clock").textContent = clock(S.time);
    $("#ts-rain").hidden = !(S.rainUntil && S.time < S.rainUntil && T.scenes[S.scene].outdoor !== false);
    $("#ts-purse").innerHTML = '<span>Wallet</span><b>' + vnd(cash()) + '</b>';
    $("#ts-todo").innerHTML = '<span>To do</span><b>' + done + '/' + T.goals.length + '</b>';
    $$(".ts-hs").forEach(function (d) {
      var o = sc.objects.find(function (x) { return x.id === d.dataset.id; }); if (!o) return;
      var f = objFlags(o); ["nav", "done", "closed"].forEach(function (c) { d.classList.toggle(c, f.indexOf(c) >= 0); });
    });
  }
  function toast(t) {
    var n = el('<div class="ts-toast" role="status">' + esc(t) + '</div>');
    (stage || document.body).appendChild(n); setTimeout(function () { n.classList.add("out"); }, 4800); setTimeout(function () { n.remove(); }, 5400);
  }
  function bubbles(lines) {
    return (lines || []).map(function (l) {
      return '<div class="ts-bubble"><span class="small">' + esc(l.who) + '</span><b lang="vi">' + esc(l.vi) + '</b><em>' + esc(l.en) + '</em></div>';
    }).join("");
  }
  function tipHtml(t) { return t ? '<div class="ts-tip"><b>Local tip</b><p>' + esc(t) + '</p></div>' : ""; }
  function linkHtml(l) { return l ? '<p><a class="more-link" href="' + esc(l.href) + '">' + esc(l.text) + '</a></p>' : ""; }
  function cont(body, label, fn) {
    var b = el('<div class="ts-acts"><button type="button" class="cta">' + esc(label || "Continue") + '</button></div>');
    body.appendChild(b); $("button", b).onclick = fn; return b;
  }
  function openSheet(title, tall) {
    var sh = $("#ts-sheet"); sh.hidden = false; sh.classList.toggle("tall", !!tall);
    $("#ts-sheet-title").textContent = title || "";
    var b = $("#ts-sheet-body"); b.innerHTML = ""; b.scrollTop = 0;
    $("#ts-caption").hidden = true;
    return b;
  }
  function closeSheet() { $("#ts-sheet").hidden = true; $("#ts-sheet-body").innerHTML = ""; if (viewer) try { viewer.startAutoRotate && 0; } catch (e) {} }

  // paint (or load) the current scene and build its hotspots
  function variantOf(sc) { return sc.objects.some(function (o) { return o.draw && o.draw.openAfter != null && S.time >= o.draw.openAfter; }) ? "open" : ""; }
  function enter(id, keepView) {
    var prevYaw = viewer && keepView ? viewer.getYaw() : null, prevPitch = viewer && keepView ? viewer.getPitch() : null;
    S.scene = id; save();
    var sc = scene(), fade = $("#ts-fade");
    fade.classList.add("on");
    var key = id + ":" + variantOf(sc);
    var src = sc.pano ? Promise.resolve(sc.pano) : window.paintScene(key, sc, S);
    src.then(function (url) {
      if (viewer) { try { viewer.destroy(); } catch (e) {} viewer = null; }
      $("#ts-pano").innerHTML = "";
      viewer = pannellum.viewer("ts-pano", {
        type: "equirectangular", panorama: url, autoLoad: true, hfov: window.innerWidth < 600 ? 85 : 100, minHfov: 60, maxHfov: 110,
        yaw: prevYaw != null ? prevYaw : (sc.yaw || 0), pitch: prevPitch != null ? prevPitch : (sc.pitch || 0),
        haov: sc.haov || 360, vaov: sc.vaov || 180, vOffset: sc.vOffset || 0, avoidShowingBackground: !!(sc.vaov && sc.vaov < 180),
        compass: false, showFullscreenCtrl: false, showZoomCtrl: false, keyboardZoom: false, mouseZoom: false, showControls: false,
        hotSpots: sc.objects.map(function (o) {
          return { pitch: o.pitch || 0, yaw: o.yaw, cssClass: "ts-hs " + objFlags(o),
            createTooltipFunc: function (d) {
              d.dataset.id = o.id; d.setAttribute("role", "button"); d.setAttribute("tabindex", "0"); d.setAttribute("aria-label", o.label);
              d.innerHTML = '<i aria-hidden="true"></i><span>' + esc(o.label) + '</span>';
              d.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(o); } });
            },
            clickHandlerFunc: function () { tap(o); } };
        })
      });
      viewer.on("load", function () { fade.classList.remove("on"); });
      if (EDIT) editMode();
      setTimeout(function () { fade.classList.remove("on"); }, 1500);
      hud();
      var ev = (T.events || []).find(function (e) {
        return !S.flags["ev_" + e.id] && e.scenes.indexOf(id) >= 0 && S.time >= (e.from || 0) && S.time < (e.to || 1440) && (!e.needs || S.flags[e.needs]);
      });
      if (!S.seen[id]) { S.seen[id] = true; save(); if (!ev) caption(sc.intro); }
      if (ev) {
        S.flags["ev_" + ev.id] = true; if (ev.rain) S.rainUntil = S.time + ev.rain; save(); hud();
        setTimeout(function () { run(ev.act, ev.title); }, 900);
      }
    });
  }
  function caption(t) {
    if (!t || EDIT) return;
    var c = $("#ts-caption"); c.hidden = false;
    c.innerHTML = '<p>' + esc(t) + '</p><button type="button" class="ts-close" aria-label="Close">✕</button>';
    $("button", c).onclick = function () { c.hidden = true; };
  }

  /* ---------------------------------------------------------------- tapping things in the world */
  function tap(o) {
    if (o.nav && (!o.navNeeds || S.flags[o.navNeeds]) && !o.act) return walk(o.nav, o.min);
    if (o.nav && o.navNeeds && S.flags[o.navNeeds]) return walk(o.nav, o.min);
    if (o.from != null && S.time < o.from) return run(Object.assign({ type: "say" }, o.closed), o.label);
    if (o.once && S.flags[o.once]) return run(Object.assign({ type: "say" }, o.done), o.label);
    if (o.needs && !S.flags[o.needs]) {
      var l = o.locked || {};
      if (l.then && T[l.then]) return run(Object.assign({}, T[l.then], { pre: l.text }), o.label);
      return run({ type: "say", text: l.text }, o.label);
    }
    if (o.act) return run(o.act, o.label);
    if (o.nav) return walk(o.nav);
  }
  function walk(id, min) { closeSheet(); S.time += min || 3; enter(id); }
  function apply(a) {
    if (!a) return;
    if (a.min) S.time += a.min;
    if (a.skill) addSkill(a.skill);
    if (a.flag) [].concat(a.flag).forEach(function (f) { S.flags[f] = true; });
    if (a.goal && !S.goals[a.goal]) { S.goals[a.goal] = true; var g = T.goals.find(function (x) { return x.id === a.goal; }); if (g) toast("✓ " + g.text); }
    save(); hud();
  }
  function after(a) {
    var sc = scene();
    if (a && a.then === "end") return report();
    if (a && a.go) return walk(a.go);
    hud();
    if (variantOf(sc) !== (stage.dataset.variant || "")) { stage.dataset.variant = variantOf(sc); enter(S.scene, true); }
    if (T.goals.every(function (g) { return S.goals[g.id]; })) report();
  }
  function run(a, title) {
    var tall = a.type === "cross" || a.type === "order" || a.type === "haggle" || a.type === "ride" || a.type === "exchange";
    var body = openSheet(title, tall);
    if (a.pre) body.insertAdjacentHTML("beforeend", '<p class="ts-text">' + esc(a.pre) + '</p>');
    var fn = M[a.type] || M.say;
    fn(a, body, function (picked) {
      var eff = picked || a;
      apply(eff);
      if (picked && picked !== a) apply({ goal: a.goal, flag: a.flag });
      closeSheet(); after(eff);
    });
  }

  var M = {};
  M.say = function (s, body, done) {
    body.insertAdjacentHTML("beforeend", bubbles(s.lines) + (s.text ? '<p class="ts-text">' + esc(s.text) + '</p>' : "") + tipHtml(s.tip) + linkHtml(s.link));
    cont(body, "OK", function () { done({}); });
  };
  M.wait = function (s, body, done) {
    if (!body.innerHTML) body.insertAdjacentHTML("beforeend", '<p class="ts-text">' + esc(s.text) + '</p>');
    var b = el('<div class="ts-acts"><button type="button" class="cta">' + esc(s.label || "Wait") + '</button><button type="button" class="btn">Not now</button></div>');
    body.appendChild(b);
    $(".cta", b).onclick = function () { done({ min: s.min }); };
    $(".btn", b).onclick = function () { done({}); };
  };
  M.choice = function (s, body, done) {
    body.insertAdjacentHTML("beforeend", bubbles(s.lines) + (s.prompt ? '<h3 class="ts-q">' + esc(s.prompt) + '</h3>' : "") + tipHtml(s.tip) + '<div class="ts-opts"></div>');
    var box = $(".ts-opts", body);
    s.options.forEach(function (o) {
      var blocked = o.needs && !S.flags[o.needs];
      var b = el('<button type="button" class="ts-opt"' + (blocked ? " disabled" : "") + '><b>' + esc(o.label) + '</b>' + (o.sub ? '<span class="small">' + esc(o.sub) + '</span>' : "") +
        (blocked && o.locked ? '<span class="small">' + esc(o.locked) + '</span>' : "") + '</button>');
      b.onclick = function () {
        if (o.card) spend(o.card.what, o.card.amount, "card");
        var bad = o.skill && Object.keys(o.skill).some(function (k) { return o.skill[k] < 0; });
        body.innerHTML = (o.result ? '<div class="ts-result ' + (bad ? "bad" : "") + '"><b>' + esc(o.label) + '</b><p>' + esc(o.result) + '</p></div>' : "");
        if (o.pay) {
          body.insertAdjacentHTML("beforeend", '<div class="ts-bubble"><span class="small">' + esc(o.pay.to) + '</span><b lang="vi">' + esc(o.pay.vi) + '</b><em>' + esc(o.pay.en) + '</em></div>');
          payUI(body, { amount: o.pay.amount, to: o.pay.to, what: o.pay.to }, function () { done(o); });
        } else if (o.result) cont(body, "Continue", function () { done(o); });
        else done(o);
      };
      box.appendChild(b);
    });
  };
  M.exchange = function (s, body, done) {
    exchangeInline(body, s.where, function () { apply({ goal: "dong" }); cont(body, "Done", function () { done({}); }); });
  };
  M.atm = function (s, body, done) {
    body.insertAdjacentHTML("beforeend", '<p class="ts-text">Take out 1,000,000 dong with your bank card? Your bank and the ATM may charge a fee.</p>');
    cont(body, "Withdraw 1,000,000 ₫", function () {
      addNotes({ 500000: 1, 100000: 4, 50000: 2 }); spend("ATM withdrawal", 1000000, "card");
      body.innerHTML = '<div class="ts-result"><b>You took out 1,000,000 ₫</b><div class="ts-fan"><span>' + noteHtml(500000) + '× 1</span><span>' + noteHtml(100000) + '× 4</span><span>' + noteHtml(50000) + '× 2</span></div><p class="small">ATMs often give 500,000 notes, which small stalls can\'t always change.</p></div>';
      apply({ goal: "dong", min: 5 });
      cont(body, "Done", function () { done({}); });
    });
  };
  M.end = function (s, body, done) { report(); };
  M.breaknote = function (s, body, done) {
    body.insertAdjacentHTML("beforeend", bubbles(s.lines));
    if (!S.notes[500000]) {
      body.insertAdjacentHTML("beforeend", '<p class="ts-text">' + esc(s.noBig) + '</p>');
      return cont(body, "OK", function () { done({}); });
    }
    body.insertAdjacentHTML("beforeend", '<p class="ts-text">' + esc(s.text) + '</p>');
    var b = el('<div class="ts-acts"><button type="button" class="cta">' + esc(s.label) + '</button><button type="button" class="btn">Not now</button></div>');
    body.appendChild(b);
    $(".btn", b).onclick = function () { done({}); };
    $(".cta", b).onclick = function () {
      S.notes[500000]--; var back = { 200000: 2, 50000: 1, 20000: 1, 10000: 2 }; // 490,000 in mixed notes
      addNotes(back); spend(s.what, s.price);
      body.innerHTML = '<div class="ts-result"><b>' + esc(s.result) + '</b><div class="ts-fan">' +
        [200000, 50000, 20000, 10000].map(function (d) { return '<span>' + noteHtml(d) + '× ' + back[d] + '</span>'; }).join("") + '</div></div>';
      apply({ skill: { money: 1 }, min: 5 });
      cont(body, "Done", function () { done({}); });
    };
  };

  // "Not enough cash" inside a payment: change money or use an ATM without leaving the payment
  function moneyHelp(box, redraw) {
    box.innerHTML = "";
    if (S.home >= 1) {
      var where = S.goals.city ? "goldshop" : "airport";
      var x = el('<div class="ts-inline"></div>'); box.appendChild(x);
      exchangeInline(x, where, function () { apply({ goal: "dong" }); redraw(); });
    } else {
      addNotes({ 500000: 1, 100000: 4, 50000: 2 }); spend("ATM withdrawal", 1000000, "card"); S.time += 10; save(); hud(); redraw();
      toast("You found an ATM and took out 1,000,000 ₫.");
    }
  }

  /* ---------------------------------------------------------------- list view (also for screen readers) */
  function listPanel() {
    var sc = scene(), body = openSheet("Here: " + sc.name);
    body.insertAdjacentHTML("beforeend", '<p class="small">Everything you can tap in this place. The same as tapping the dots in the 360° view.</p><div class="ts-opts"></div>');
    var box = $(".ts-opts", body);
    sc.objects.forEach(function (o) {
      var f = objFlags(o), walkTo = o.nav && (!o.navNeeds || S.flags[o.navNeeds]) && T.scenes[o.nav];
      var b = el('<button type="button" class="ts-opt"><b>' + (walkTo ? "Walk: " : "") + esc(o.label) + '</b><span class="small">' +
        (f.indexOf("done") >= 0 ? "Done" : f.indexOf("closed") >= 0 ? "Closed now" : walkTo ? esc(walkTo.name) : o.nav ? "Needs something first" : "Talk or look") + '</span></button>');
      b.onclick = function () { closeSheet(); tap(o); };
      box.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------- hotspot editor (?edit) */
  function editMode() {
    var box = $("#ts-edit"); if (!box || !viewer) return;
    var last = null;
    function draw() {
      box.innerHTML = '<b>Editor</b> <select aria-label="Go to scene">' + Object.keys(T.scenes).map(function (k) { return '<option value="' + k + '"' + (k === S.scene ? " selected" : "") + '>' + esc(k) + '</option>'; }).join("") + '</select>' +
        '<span>View: yaw ' + Math.round(viewer.getYaw()) + ', pitch ' + Math.round(viewer.getPitch()) + '</span>' +
        (last ? '<code>yaw: ' + last[1] + ', pitch: ' + last[0] + '</code><button type="button">Copy</button>' : '<span>Click any point to get its yaw and pitch.</span>');
      $("select", box).onchange = function () { enter(this.value); };
      var c = $("button", box); if (c) c.onclick = function () { navigator.clipboard && navigator.clipboard.writeText("yaw: " + last[1] + ", pitch: " + last[0]).catch(function () {}); };
    }
    viewer.on("mouseup", function (e) { var c = viewer.mouseEventToCoords(e); last = [Math.round(c[0]), Math.round(c[1])]; draw(); });
    viewer.on("animatefinished", draw);
    draw();
  }

  /* ---------------------------------------------------------------- sharing and real-trip links */
  function shareText(stars, n) { return "I survived my first day in Saigon on Try Saigon: " + n + "/" + T.goals.length + " things done, " + stars + " stars. Can you beat it?"; }
  function shareHtml() {
    return '<div class="ts-share"><span class="small">Share your day</span><button type="button" class="btn" data-share>Share</button>' +
      '<a class="btn" data-fb target="_blank" rel="noopener">Facebook</a><a class="btn" data-xs target="_blank" rel="noopener">X</a><span class="small" data-smsg aria-live="polite"></span></div>';
  }
  function bindShare(body, text) {
    var url = location.origin + "/try-saigon/";
    $("[data-fb]", body).href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
    $("[data-xs]", body).href = "https://x.com/intent/post?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url);
    $("[data-share]", body).onclick = function () {
      if (navigator.share) return navigator.share({ title: "Try Saigon", text: text, url: url }).catch(function () {});
      var m = $("[data-smsg]", body);
      if (navigator.clipboard) navigator.clipboard.writeText(text + " " + url).then(function () { m.textContent = "Copied. Paste it anywhere."; }).catch(function () { m.textContent = text + " " + url; });
      else m.textContent = text + " " + url;
    };
  }
  function realTripHtml() {
    var picks = (T.realTrip || []).filter(function (r) { return !r.when || r.when.some(function (f) { return S.flags[f]; }); });
    if (!picks.length) return "";
    return '<div class="ts-real"><h3 class="ts-q">Make the real day easier</h3><ul>' + picks.map(function (r) {
      return '<li><a href="' + esc(r.href) + '" target="_blank" rel="sponsored noopener">' + esc(r.text) + ' ↗</a><span class="small">' + esc(r.why) + '</span></li>';
    }).join("") + '</ul><p class="small">Affiliate links: same price for you, a small commission for HCMC Insider.</p></div>';
  }

  /* ---------------------------------------------------------------- panels */
  function walletPanel() {
    var body = openSheet("Your wallet");
    var rows = DENOMS.filter(function (d) { return S.notes[d]; }).map(function (d) {
      return '<li>' + noteHtml(d) + '<span>× ' + S.notes[d] + '</span><span class="small">' + vnd(d * S.notes[d]) + '</span></li>';
    }).join("") || '<li class="small">No dong yet. Find the exchange counter or the ATM.</li>';
    var card = S.spent.filter(function (s) { return s.how === "card"; }).reduce(function (t, s) { return t + s.vnd; }, 0);
    body.innerHTML = '<ul class="ts-notes">' + rows + '</ul>' +
      '<p class="small">Cash: <b>' + vnd(cash()) + '</b> (about ' + home(toHome(cash())) + ') · ' + home(S.home) + ' not changed yet' + (card ? ' · paid by card: ' + vnd(card) : '') + '</p>' +
      '<p class="small">Rate: 1 ' + S.cur + ' = ' + vnd(RATE.rates[S.cur]) + (RATE.live ? ' (mid-market, ' + esc(RATE.date) + ')' : ' (estimate; live rate unavailable)') + '</p>' +
      tipHtml("The 500,000 and the 20,000 notes are both blue: check the zeros before you pay.");
  }
  function todoPanel() {
    var body = openSheet("Today's plan");
    body.innerHTML = '<ul class="ts-goals">' + T.goals.map(function (g) {
      return '<li class="' + (S.goals[g.id] ? "ok" : "") + '"><i aria-hidden="true"></i>' + esc(g.text) + '</li>';
    }).join("") + '</ul><p class="small">Do them in any order. Tap people, stalls and signs in the 360° view; tap the arrows to walk.</p>';
    var b = el('<div class="ts-acts"><button type="button" class="btn">End the day and see my report</button><button type="button" class="btn" data-restart>Start over</button></div>');
    body.appendChild(b);
    $(".btn", b).onclick = report;
    $("[data-restart]", b).onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} if (viewer) viewer.destroy(); viewer = null; stage = null; intro(); };
  }

  /* ---------------------------------------------------------------- activities */
  function exchangeInline(body, where, done, cancel) {
    var r = rateLine(where), name = where === "airport" ? "Airport exchange counter" : "Jewellery shop near Ben Thanh";
    var other = rateLine(where === "airport" ? "goldshop" : "airport");
    var steps = [10, 20, 50, 100].filter(function (v) { return v <= S.home; });
    if (S.home >= 1 && steps.indexOf(Math.floor(S.home)) < 0) steps.push(Math.floor(S.home));
    var w = el('<div class="ts-x">' +
      '<h3 class="ts-q">' + name + '</h3>' +
      '<div class="ts-board"><div><span class="small">Mid-market rate</span><b>1 ' + S.cur + ' = ' + vnd(r.mid) + '</b></div>' +
      '<div><span class="small">This place buys at</span><b>' + vnd(r.buy) + '</b></div>' +
      '<div><span class="small">' + (where === "airport" ? "A jewellery shop in town" : "The airport counter") + '</span><b>' + vnd(other.buy) + '</b></div></div>' +
      '<p class="small">' + (RATE.live ? 'Live mid-market rate, ' + esc(RATE.date) + ' (<a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates by Exchange Rate API</a>).' : 'Live rate unavailable; using an estimate.') +
      ' The margins are examples: always compare the buy rates on the boards.</p>' +
      '<fieldset class="ts-amt"><legend>How much do you change? You have ' + home(S.home) + '.</legend><div class="chips">' +
      steps.map(function (v, i) { return '<label class="chip"><input type="radio" name="amt" value="' + v + '"' + (i === Math.min(1, steps.length - 1) ? " checked" : "") + '> ' + home(v) + '</label>'; }).join("") +
      '</div></fieldset>' +
      '<label class="ts-check"><input type="checkbox" id="ts-small" checked> Ask for some small notes</label>' +
      '<p class="ts-preview small" aria-live="polite"></p>' +
      '<div class="ts-acts"><button type="button" class="cta" data-go>Change money</button>' + (cancel ? '<button type="button" class="btn" data-cancel>Cancel</button>' : '') + '</div></div>');
    body.appendChild(w);
    function amt() { var c = $("input[name=amt]:checked", w); return c ? +c.value : 0; }
    function prev() { var a = amt(); $(".ts-preview", w).textContent = a ? "You get " + vnd(Math.floor(a * r.buy / 1000) * 1000) + " for " + home(a) + "." : ""; }
    $$("input", w).forEach(function (i) { i.onchange = prev; }); prev();
    if (cancel) $("[data-cancel]", w).onclick = cancel;
    $("[data-go]", w).onclick = function () {
      var a = amt(); if (!a) return;
      var got = Math.floor(a * r.buy / 1000) * 1000, notes = greedy(got, $("#ts-small", w).checked);
      S.home -= a; addNotes(notes); S.time += 8;
      if (where === "airport" && a <= 50) addSkill({ money: 1 });
      if ($("#ts-small", w).checked) addSkill({ money: 1 });
      S.exchanged = (S.exchanged || 0) + a; save(); hud();
      w.innerHTML = '<div class="ts-result"><b>You got ' + vnd(got) + '</b><div class="ts-fan">' +
        DENOMS.filter(function (d) { return notes[d]; }).map(function (d) { return '<span>' + noteHtml(d) + '× ' + notes[d] + '</span>'; }).join("") +
        '</div><p class="small">' + (where === "airport" && a > 50 ? "Airport counters are convenient but usually give a lower rate than jewellery shops and banks in town. Changing a small amount here and the rest later saves a little." : "Count your notes before you leave the counter.") + '</p></div>';
      done && done();
    };
  }
  /* ---- order */
  M.order = function (s, body, done) {
    var q = s.menu.map(function () { return 0; }), opts = {};
    body.innerHTML = bubbles(s.lines) +
      '<h3 class="ts-q">Order in Vietnamese</h3><ul class="ts-menu">' + s.menu.map(function (m, i) {
        return '<li><span><b lang="vi">' + esc(m.vi) + '</b><em>' + esc(m.en) + '</em><span class="small">' + vnd(m.price) + '</span></span>' +
          '<span class="ts-qty"><button type="button" data-i="' + i + '" data-d="-1" aria-label="One less ' + esc(m.en) + '">−</button><output>0</output>' +
          '<button type="button" data-i="' + i + '" data-d="1" aria-label="One more ' + esc(m.en) + '">+</button></span></li>';
      }).join("") + '</ul>' +
      (s.options ? '<div class="chips ts-optchips">' + s.options.map(function (o, i) { return '<button type="button" class="chip" aria-pressed="false" data-o="' + i + '"><span lang="vi">' + esc(o.vi) + '</span> · ' + esc(o.en) + '</button>'; }).join("") + '</div>' : "") +
      '<div class="ts-say"><span class="small">You say</span><b lang="vi" id="ts-sentence">…</b><em id="ts-sentence-en"></em></div>' +
      '<p class="small">' + esc(s.priceNote || "") + '</p>' + tipHtml(s.tip) +
      '<div class="ts-acts"><button type="button" class="cta" data-go disabled>Say it</button><span class="ts-total small"></span></div>';
    function update() {
      var parts = [], en = [], tot = 0;
      s.menu.forEach(function (m, i) { if (q[i]) { parts.push(viCount(q[i]) + " " + m.unit + " " + m.vi); en.push(q[i] + " × " + m.en); tot += q[i] * m.price; } });
      var o = (s.options || []).filter(function (x, i) { return opts[i]; });
      var sent = parts.length ? "Cho tôi " + parts.join(", ") + (o.length ? ", " + o.map(function (x) { return x.vi; }).join(", ") : "") + "." : "…";
      $("#ts-sentence").textContent = sent;
      $("#ts-sentence-en").textContent = parts.length ? "Can I have " + en.join(", ") + (o.length ? ", " + o.map(function (x) { return x.en; }).join(", ") : "") + "." : "Tap + to choose.";
      $(".ts-total", body).textContent = tot ? "Total " + vnd(tot) : "";
      $("[data-go]", body).disabled = !tot;
      return tot;
    }
    $$(".ts-qty button", body).forEach(function (b) {
      b.onclick = function () { var i = +b.dataset.i; q[i] = Math.max(0, Math.min(9, q[i] + +b.dataset.d)); b.parentNode.querySelector("output").textContent = q[i]; update(); };
    });
    $$("[data-o]", body).forEach(function (b) { b.onclick = function () { var i = +b.dataset.o; opts[i] = !opts[i]; b.setAttribute("aria-pressed", opts[i]); update(); }; });
    update();
    $("[data-go]", body).onclick = function () {
      var tot = update(), what = s.menu.filter(function (m, i) { return q[i]; }).map(function (m) { return m.vi; }).join(", ");
      addSkill({ food: 1 }); S.time += 20; save(); hud();
      var after = function () {
        body.innerHTML = '<div class="ts-bubble"><span class="small">' + esc(s.vendor) + '</span><b lang="vi">' + esc(cap(viMoney(tot))) + '.</b><em>' + vnd(tot) + '</em></div>';
        payUI(body, { amount: tot, to: s.vendor, what: what, smallChange: s.smallChange }, function () { done(); });
      };
      body.innerHTML = '<div class="ts-bubble"><span class="small">' + esc(s.vendor) + '</span><b lang="vi">Có liền!</b><em>Coming right up!</em></div>' +
        '<p class="ts-text">' + (s.bill ? "You eat. When you're done, wave and ask for the bill." : "It's ready in a minute.") + '</p>';
      if (s.bill) {
        var b = el('<div class="ts-acts"><button type="button" class="cta"><span lang="vi">Tính tiền!</span> (The bill, please)</button></div>');
        body.appendChild(b); $("button", b).onclick = function () { addSkill({ food: 1 }); after(); };
      } else cont(body, "Pay", after);
    };
  };
  function payUI(body, o, done) {
    var tray = {}, refused = false;
    var w = el('<div class="ts-pay"><h3 class="ts-q">Pay ' + vnd(o.amount) + ' <span class="small" lang="vi">(' + esc(viMoney(o.amount)) + ')</span></h3>' +
      '<p class="small">Tap notes from your wallet to hand them over. Tap a note in your hand to take it back.</p>' +
      '<div class="ts-wall" aria-label="Your notes"></div><div class="ts-hand" aria-label="In your hand"></div>' +
      '<div class="ts-acts"><button type="button" class="cta" data-go disabled>Hand over</button><span class="small ts-sum"></span></div>' +
      '<p class="small ts-more"></p></div>');
    body.appendChild(w);
    function sum() { return Object.keys(tray).reduce(function (t, d) { return t + d * tray[d]; }, 0); }
    function draw() {
      $(".ts-wall", w).innerHTML = DENOMS.filter(function (d) { return (S.notes[d] || 0) - (tray[d] || 0) > 0; }).map(function (d) {
        return '<button type="button" class="ts-nbtn" data-d="' + d + '" aria-label="Hand over ' + d.toLocaleString("en-US") + ' dong">' + noteHtml(d) + '<span>× ' + (S.notes[d] - (tray[d] || 0)) + '</span></button>';
      }).join("") || '<span class="small">No notes left.</span>';
      $(".ts-hand", w).innerHTML = Object.keys(tray).filter(function (d) { return tray[d]; }).sort(function (a, b) { return b - a; }).map(function (d) {
        return '<button type="button" class="ts-nbtn in" data-d="' + d + '" aria-label="Take back ' + (+d).toLocaleString("en-US") + ' dong">' + noteHtml(+d) + '<span>× ' + tray[d] + '</span></button>';
      }).join("") || '<span class="small">Your hand is empty.</span>';
      var t = sum();
      $(".ts-sum", w).textContent = "In your hand: " + vnd(t);
      $("[data-go]", w).disabled = t < o.amount;
      $$(".ts-wall .ts-nbtn", w).forEach(function (b) { b.onclick = function () { var d = +b.dataset.d; tray[d] = (tray[d] || 0) + 1; draw(); }; });
      $$(".ts-hand .ts-nbtn", w).forEach(function (b) { b.onclick = function () { var d = +b.dataset.d; tray[d]--; draw(); }; });
      var short = cash() < o.amount;
      $(".ts-more", w).innerHTML = short ? 'Not enough cash. <button type="button" class="linkbtn" data-more>Change money or use an ATM</button>' : "";
      var m = $("[data-more]", w); if (m) m.onclick = function () { moneyHelp($(".ts-more", w), draw); };
    }
    draw();
    $("[data-go]", w).onclick = function () {
      var t = sum(), change = t - o.amount;
      var hasSmaller = DENOMS.some(function (d) { return d < 500000 && (S.notes[d] || 0) - (tray[d] || 0) > 0; }) && cash() - (tray[500000] || 0) * 500000 >= o.amount;
      if (o.smallChange && tray[500000] && o.amount < 100000 && !refused) {
        refused = true;
        if (hasSmaller) {
          var mixed = S.notes[20000] && tray[500000] ? " Careful: the 500,000 and the 20,000 notes are both blue." : "";
          $(".ts-more", w).innerHTML = '<span class="ts-bubble inline"><b lang="vi">Không có tiền thối, con ơi!</b><em>I have no change for that!</em></span> Small stalls often can\'t break a 500,000 note. Pay with smaller notes.' + esc(mixed);
          tray = {}; draw(); return;
        }
        S.time += 5;
        toast("The seller has no change and runs to the shop next door to break your 500,000 note. Next time, break big notes at a convenience store or café.");
      }
      for (var d in tray) S.notes[d] -= tray[d];
      var back = greedy(change);
      addNotes(back); spend(o.what || o.to, o.amount);
      if (change === 0) addSkill({ money: 1 });
      save(); hud();
      w.innerHTML = '<div class="ts-result"><b>Paid ' + vnd(o.amount) + '</b>' +
        (change ? '<p>Your change: ' + vnd(change) + '</p><div class="ts-fan">' + DENOMS.filter(function (d) { return back[d]; }).map(function (d) { return '<span>' + noteHtml(d) + '× ' + back[d] + '</span>'; }).join("") + '</div>' : '<p>Exact money. The seller smiles.</p>') +
        '<p class="small"><span lang="vi">Cảm ơn!</span> (Thank you!)</p></div>';
      cont(body, "Continue", done);
    };
  }
  /* ---- ride-hailing app */
  M.ride = function (s, body, done) {
    var pay = "cash";
    body.innerHTML = (s.text ? '<p class="ts-text">' + esc(s.text) + '</p>' : "") +
      '<div class="ts-phone"><div class="ts-app">' +
      '<p class="small">Ride app</p><div class="ts-route"><span><i class="a"></i>' + esc(s.from) + '</span><span><i class="b"></i>' + esc(s.to) + '</span></div>' +
      '<div class="ts-ride"><b>' + (s.app === "bike" ? "Motorbike" : "Car, 4 seats") + '</b><span>' + vnd(s.fare) + '</span></div>' +
      '<div class="ts-paysel" role="radiogroup" aria-label="Payment"><label><input type="radio" name="pm" value="cash" checked> Cash</label><label><input type="radio" name="pm" value="card"> Card in the app</label></div>' +
      '<button type="button" class="cta" data-book>Book</button><p class="small">' + esc(s.fareNote) + '</p></div></div>';
    $$("input[name=pm]", body).forEach(function (i) { i.onchange = function () { pay = i.value; }; });
    $("[data-book]", body).onclick = function () {
      var app = $(".ts-app", body);
      app.innerHTML = '<p class="small">Ride app</p><p class="ts-finding">Finding a driver…</p>';
      setTimeout(function () {
        var fakes = [s.plate.replace(/\d(?=\d\.)/, function (d) { return (+d + 3) % 10; }), s.plate.replace(/^\d\d/, function (d) { return String((+d + 8) % 90 + 10); })];
        var all = [s.plate, fakes[0], fakes[1]].sort(function () { return Math.random() - 0.5; });
        app.innerHTML = '<p class="small">Ride app</p><div class="ts-driver"><b>Your driver: Anh Tuấn</b><span>' + (s.app === "bike" ? "Honda Wave, blue" : "Toyota Vios, white") + '</span><span class="ts-plate">' + esc(s.plate) + '</span></div>' +
          '<p class="ts-q">Three ' + (s.app === "bike" ? "bikes" : "cars") + ' pull up at the same time. Which one is yours?</p><div class="ts-plates">' +
          all.map(function (p) { return '<button type="button" class="ts-plate big" data-p="' + esc(p) + '">' + esc(p) + '</button>'; }).join("") + '</div><p class="small ts-pmsg" aria-live="polite"></p>';
        var wrong = false;
        $$("[data-p]", app).forEach(function (b) {
          b.onclick = function () {
            if (b.dataset.p !== s.plate) {
              b.disabled = true; if (!wrong) addSkill({ smart: -1 }); wrong = true;
              $(".ts-pmsg", app).textContent = "That's not your ride: the plate doesn't match the app. Always check the plate (and the driver's photo) before you get in.";
              return;
            }
            if (!wrong) addSkill({ smart: 1, transport: 1 });
            S.time += s.app === "bike" ? 25 : 35; save(); hud();
            app.innerHTML = '<p class="small">Ride app</p><div class="ts-going"><i></i></div><p>On the way to ' + esc(s.to) + '…</p>';
            setTimeout(function () {
              body.innerHTML = tipHtml(s.tip);
              if (pay === "card") {
                spend("Ride to " + s.to, s.fare, "card"); save(); hud();
                body.insertAdjacentHTML("afterbegin", '<div class="ts-result"><b>Arrived. ' + vnd(s.fare) + ' charged to your card in the app.</b><p class="small">No cash needed. A tip is not expected, but drivers appreciate one in the app.</p></div>');
                cont(body, "Continue", function () { done(); });
              } else {
                body.insertAdjacentHTML("afterbegin", '<div class="ts-bubble"><span class="small">Driver</span><b lang="vi">Tới rồi nha. ' + esc(viMoney(s.fare)) + '.</b><em>Here we are. ' + vnd(s.fare) + '.</em></div>');
                payUI(body, { amount: s.fare, to: "Driver", what: "Ride to " + s.to }, function () { done(); });
              }
            }, 1600);
          };
        });
      }, 1300);
    };
  };
  /* ---- haggle */
  M.haggle = function (s, body, done) {
    var ask = s.ask, offer = Math.round(s.ask * 0.4 / 5000) * 5000, mood = 0, rounds = 0, walked = 0, lastOffer = 0, soft = false;
    body.innerHTML = '<div class="ts-haggle"><div class="ts-item"><b>' + esc(s.item) + '</b> <span lang="vi">(' + esc(s.itemVi) + ')</span></div>' +
      '<div class="ts-chat" aria-live="polite"></div>' +
      '<div class="ts-offer"><button type="button" class="btn" data-m="-1" aria-label="Lower your offer">−</button><output></output><button type="button" class="btn" data-m="1" aria-label="Raise your offer">+</button></div>' +
      '<div class="chips"><button type="button" class="chip" data-say="0"><span lang="vi">Mắc quá!</span> · Too expensive!</button><button type="button" class="chip" data-say="1"><span lang="vi">Bớt chút đi chị!</span> · A little cheaper, please</button></div>' +
      '<div class="ts-acts"><button type="button" class="cta" data-offer>Offer</button><button type="button" class="btn" data-accept></button><button type="button" class="btn" data-walk>Walk away</button></div>' +
      '<p class="small">' + esc(s.note) + '</p></div>';
    var chat = $(".ts-chat", body);
    function say(who, vi, en) { chat.insertAdjacentHTML("beforeend", '<div class="ts-line ' + (who === "you" ? "you" : "") + '"><b lang="vi">' + esc(vi) + '</b><em>' + esc(en) + '</em></div>'); chat.scrollTop = chat.scrollHeight; }
    function draw() { $(".ts-offer output", body).textContent = vnd(offer); $("[data-accept]", body).textContent = "Accept " + vnd(ask); }
    function r5(v) { return Math.round(v / 5000) * 5000; }
    say("seller", cap(viMoney(ask)) + " một cái.", vnd(ask) + " each.");
    draw();
    $$("[data-m]", body).forEach(function (b) { b.onclick = function () { offer = Math.max(5000, offer + 10000 * b.dataset.m); draw(); }; });
    $$("[data-say]", body).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.say;
        say("you", i ? "Bớt chút đi chị!" : "Mắc quá!", i ? "A little cheaper, please!" : "Too expensive!");
        if (!soft) { soft = true; ask = r5(Math.max(s.floor, ask - 20000)); mood++; say("seller", "Thôi, " + viMoney(ask) + " nè.", "Okay, " + vnd(ask) + "."); draw(); }
        else say("seller", "Rẻ lắm rồi em!", "It's already cheap!");
      };
    });
    function finish(price) {
      var pts = price <= s.fair ? 2 : price <= s.fair * 1.3 ? 1 : 0;
      addSkill({ haggle: pts }); S.time += 10; save();
      body.innerHTML = '<div class="ts-result"><b>Deal: ' + vnd(price) + '</b><p>' + (pts === 2 ? "A fair local price. Well done." : pts === 1 ? "Not bad; a little above what locals pay." : "You paid the first price, or close to it. That's fine too, but you can usually get more off at stalls without price tags.") +
        ' A fair price here is about ' + vnd(s.fair) + '.</p></div>';
      payUI(body, { amount: price, to: "Hat seller", what: s.item }, function () { done(); });
    }
    $("[data-offer]", body).onclick = function () {
      rounds++; lastOffer = offer; say("you", cap(viMoney(offer)) + " được không?", "Is " + vnd(offer) + " okay?");
      if (offer >= ask) return setTimeout(function () { say("seller", "Ok, bán!", "Okay, sold!"); setTimeout(function () { finish(ask); }, 700); }, 400);
      setTimeout(function () {
        if (offer >= s.floor && (offer >= ask - 15000 || (rounds >= 3 && offer >= s.fair * 0.92))) { say("seller", "Thôi được, bán cho em!", "Fine, it's yours!"); return setTimeout(function () { finish(offer); }, 700); }
        if (offer < s.floor * 0.5) { mood--; ask = r5(Math.max(s.floor, ask - 5000)); say("seller", "Trời ơi, không được đâu em! " + viMoney(ask) + ".", "Oh no, I can't do that! " + vnd(ask) + "."); }
        else { ask = r5(Math.max(s.floor + 5000, ask - (ask - offer) * (mood > 0 ? 0.45 : 0.35))); say("seller", cap(viMoney(ask)) + ", giá chót rồi.", vnd(ask) + ", that's my last price."); }
        draw();
      }, 450);
    };
    $("[data-accept]", body).onclick = function () { say("you", "Ok, lấy cái này.", "Okay, I'll take it."); setTimeout(function () { finish(ask); }, 500); };
    $("[data-walk]", body).onclick = function () {
      walked++; say("you", "Thôi, cảm ơn chị.", "No thanks.");
      setTimeout(function () {
        if (walked === 1 && mood >= -1 && ask > s.floor) {
          ask = r5(Math.max(s.floor, (ask + Math.max(lastOffer, s.floor)) / 2));
          say("seller", "Em ơi! Quay lại! " + viMoney(ask) + " nè!", "Hey! Come back! " + vnd(ask) + "!"); draw();
        } else {
          say("seller", "Thôi được rồi.", "Okay then.");
          addSkill({ haggle: 1 }); save();
          $(".ts-acts", body).innerHTML = "";
          cont(body, "Leave without a hat", function () { done(); });
        }
      }, 600);
    };
  };
  /* ---- crossing the street */
  M.cross = function (s, body, done) {
    body.innerHTML = '<div class="ts-cross"><canvas width="420" height="520" aria-label="Street crossing game. Hold the Walk button to walk, let go to stop."></canvas>' +
      '<div class="ts-acts"><button type="button" class="cta ts-walk">Hold to walk</button><button type="button" class="btn ts-run">Run!</button></div>' +
      '<p class="small ts-cmsg" aria-live="polite">Press and hold the street, the “Hold to walk” button or the space bar. Let go to stop.</p></div>';
    var cv = $("canvas", body), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    var lanes = s.lanes || 4, top = 70, laneH = (H - 140) / lanes;
    var P, bikes, walking, running, raf, last, stops, hits, over, spawnT;
    var COLORS = ["#E2572F", "#2C6FD1", "#0E8A78", "#F4A634", "#6A4BC4", "#13212B"];
    function reset() {
      P = { x: W / 2, y: H - 40, vy: 0 }; bikes = []; walking = false; running = false; stops = 0; hits = 0; over = false; spawnT = 0; last = 0;
      for (var i = 0; i < 10; i++) spawn(Math.random() * W);
    }
    function laneY(i) { return top + laneH * i + laneH / 2; }
    function spawn(x) {
      var lane = Math.floor(Math.random() * lanes), dir = lane < lanes / 2 ? -1 : 1; // top half goes left, bottom half goes right
      var sp = 60 + Math.random() * 50;
      bikes.push({ lane: lane, y: laneY(lane) + (Math.random() - 0.5) * laneH * 0.4, x: x != null ? x : (dir > 0 ? -30 : W + 30), dir: dir, v: sp, v0: sp, c: COLORS[Math.floor(Math.random() * COLORS.length)], react: 0, plan: 0 });
    }
    function inLane(y, b) { return Math.abs(y - b.y) < laneH * 0.55; }
    function tick(t) {
      var dt = Math.min(0.05, last ? (t - last) / 1000 : 0); last = t;
      var speed = running ? 95 : walking ? 38 : 0;
      var inRoad = P.y < H - 70 && P.y > top;
      if (!speed && P.vy && inRoad) stops++;
      P.vy = speed; P.y -= speed * dt;
      spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = 0.45 + Math.random() * 0.5; }
      bikes.forEach(function (b) {
        // Riders predict where you will be if you keep doing what you do now, with a short reaction delay.
        b.react -= dt;
        if (b.react <= 0) {
          b.react = 0.3;
          var dx = (P.x - b.x) * b.dir;
          if (dx > -10 && dx < 260) {
            var tb = Math.max(0, dx) / Math.max(20, b.v), y1 = P.y - P.vy * Math.max(0, tb - 0.5), y2 = P.y - P.vy * (tb + 0.5);
            b.plan = (Math.min(y1, y2) < b.y + laneH * 0.55 && Math.max(y1, y2) > b.y - laneH * 0.55) || (inLane(P.y, b) && dx < 80) ? 1 : 0;
          } else b.plan = 0;
        }
        // A rider who can't stop in time steers to pass behind you (where you came from).
        var ddx = (P.x - b.x) * b.dir;
        if (b.plan && ddx > -5 && ddx < 110 && P.vy > 0 && P.vy < 60) b.y += Math.max(-1, Math.min(1, (P.y + 38 - b.y) / 10)) * 130 * dt;
        var target = b.plan ? 8 : b.v0;
        b.v += Math.max(-220 * dt, Math.min(110 * dt, target - b.v));
        b.x += b.v * b.dir * dt;
        if (!over && Math.abs(b.x - P.x) < 17 && Math.abs(b.y - P.y) < 11) { hit(); }
      });
      bikes = bikes.filter(function (b) { return b.x > -60 && b.x < W + 60; });
      draw();
      if (!over && P.y <= top - 30) return win();
      if (!over) raf = requestAnimationFrame(tick);
    }
    function draw() {
      var dark = matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light" || document.documentElement.dataset.theme === "dark";
      ctx.fillStyle = dark ? "#1D2A31" : "#EDF2EF"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = dark ? "#2a343a" : "#5c6770"; ctx.fillRect(0, top, W, H - 140);
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.setLineDash([16, 14]); ctx.lineWidth = 2;
      for (var i = 1; i < lanes; i++) { ctx.beginPath(); ctx.moveTo(0, top + laneH * i); ctx.lineTo(W, top + laneH * i); ctx.stroke(); }
      ctx.setLineDash([]); ctx.strokeStyle = "#F4A634"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, top + laneH * lanes / 2); ctx.lineTo(W, top + laneH * lanes / 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.7)"; for (var z = 0; z < 9; z++) ctx.fillRect(W / 2 - 50, top + 4 + z * (H - 148) / 9, 100, (H - 148) / 18);
      ctx.fillStyle = dark ? "#9FB0B3" : "#5A6B72"; ctx.font = "600 13px system-ui"; ctx.textAlign = "center";
      ctx.fillText("Ben Thanh Market", W / 2, 28); ctx.fillText("You start here", W / 2, H - 12);
      bikes.forEach(function (b) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.dir, 1);
        ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(-13, 7, 6, 0, 7); ctx.arc(13, 7, 6, 0, 7); ctx.fill();
        ctx.fillStyle = b.c; ctx.fillRect(-16, -3, 32, 9);
        ctx.fillStyle = "#F2C9A0"; ctx.beginPath(); ctx.arc(-2, -14, 6, 0, 7); ctx.fill();
        ctx.fillStyle = b.c; ctx.fillRect(-7, -9, 10, 9);
        if (b.plan) { ctx.fillStyle = "#ff3b30"; ctx.fillRect(-19, -1, 3, 4); }
        ctx.restore();
      });
      ctx.fillStyle = "#0E6655"; ctx.beginPath(); ctx.arc(P.x, P.y, 11, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 10px system-ui"; ctx.fillText("YOU", P.x, P.y + 3);
    }
    function hit() {
      hits++; over = true; cancelAnimationFrame(raf);
      $(".ts-cmsg", body).innerHTML = "<b>Beep! A rider had to brake hard.</b> " + (running ? "Running made you hard to predict." : stops ? "You stopped in the middle of the traffic, where the rider had planned to pass behind you." : "You stepped out right in front of a bike. Wait for a gap, then keep a steady pace.");
      $(".ts-acts", body).innerHTML = '<button type="button" class="cta">Try again</button>';
      $(".ts-acts button", body).onclick = start;
    }
    function win() {
      over = true; cancelAnimationFrame(raf);
      var pts = running ? 0 : stops === 0 ? 3 : stops < 3 ? 2 : 1;
      addSkill({ street: pts }); S.time += 5; save(); hud();
      $(".ts-cmsg", body).innerHTML = "<b>You made it across.</b> " + (stops === 0 && !running ? "Slow and steady, with no stops: exactly how locals do it." : "You got there. Fewer stops in the traffic make you easier to predict.");
      $(".ts-acts", body).innerHTML = "";
      cont(body, "Continue", function () { done(); });
    }
    function start() {
      reset(); $(".ts-acts", body).innerHTML = '<button type="button" class="cta ts-walk">Hold to walk</button><button type="button" class="btn ts-run">Run!</button>';
      bindKeys(); $(".ts-cmsg", body).textContent = "Press and hold the street, the “Hold to walk” button or the space bar. Let go to stop.";
      raf = requestAnimationFrame(tick);
    }
    function bindKeys() {
      var wb = $(".ts-walk", body), rb = $(".ts-run", body);
      var on = function (e) { e.preventDefault(); walking = true; }, off = function () { walking = false; };
      wb.addEventListener("pointerdown", on); wb.addEventListener("pointerup", off); wb.addEventListener("pointerleave", off); wb.addEventListener("pointercancel", off);
      wb.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      cv.onpointerdown = on; cv.onpointerup = off; cv.onpointerleave = off; cv.onpointercancel = off;
      rb.addEventListener("pointerdown", function (e) { e.preventDefault(); running = true; }); rb.addEventListener("pointerup", function () { running = false; }); rb.addEventListener("pointerleave", function () { running = false; });
    }
    function key(e) { if (e.code === "Space" && document.body.contains(cv)) { e.preventDefault(); walking = e.type === "keydown"; } }
    document.addEventListener("keydown", key); document.addEventListener("keyup", key);
    start();
  };

  /* ---------------------------------------------------------------- report */
  function report() {
    var body = openSheet("Your day in Saigon", true), total = S.spent.reduce(function (t, s) { return t + s.vnd; }, 0);
    S.done = true; save();
    var rows = S.spent.filter(function (s) { return s.vnd; }).map(function (s) {
      return '<tr><td>' + clock(s.t) + '</td><td>' + esc(s.what) + '</td><td>' + (s.how === "card" ? "card" : "cash") + '</td><td class="num">' + vnd(s.vnd) + '</td></tr>';
    }).join("");
    var nGoals = T.goals.filter(function (g) { return S.goals[g.id]; }).length;
    var totalStars = Object.keys(T.skills).reduce(function (t, k) { return t + Math.max(0, Math.min(3, S.skills[k] || 0)); }, 0);
    var skills = Object.keys(T.skills).map(function (k) {
      var p = S.skills[k] || 0, stars = Math.max(0, Math.min(3, p)), sk = T.skills[k];
      return '<li><div><b>' + esc(sk.name) + '</b> <span class="small" lang="vi">' + esc(sk.vi) + '</span></div><span class="ts-stars" aria-label="' + stars + ' of 3">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= stars ? "on" : "") + '"></i>'; }).join("") + '</span>' +
        '<p class="small">' + (stars >= 2 ? esc(sk.good) : 'Practise this one: <a href="' + esc(sk.learn) + '">read the guide</a>.') + '</p></li>';
    }).join("");
    body.innerHTML = '<p class="ts-text">It\'s ' + clock(S.time) + '. You did ' + nGoals + ' of ' + T.goals.length + ' things on your list and spent <b>' + vnd(total) + '</b>, about <b>' + home(toHome(total)) + '</b>' + (S.exchanged ? ', after changing ' + home(S.exchanged) + ' into dong' : '') + '.</p>' +
      '<ul class="ts-skills">' + skills + '</ul>' + shareHtml() +
      (rows ? '<div class="ts-table"><table><thead><tr><th>Time</th><th>What</th><th>How</th><th class="num">Dong</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') +
      realTripHtml() + '<h3 class="ts-q">Ready for the real thing?</h3><div class="chips"><a class="chip" href="/guides/saigon-itinerary/">Plan 1–3 days</a><a class="chip" href="/guides/arriving-in-saigon/">Airport to city</a><a class="chip" href="/guides/getting-around-hcmc/">Buses</a><a class="chip" href="/guides/hcmc-metro/">Metro</a><a class="chip" href="/places/sidewalk-noodles-187-huynh-man-dat/">Tonight\'s noodles</a></div>';
    bindShare(body, shareText(totalStars, nGoals));
    var b = el('<div class="ts-acts"><button type="button" class="btn" data-k>Keep exploring</button><button type="button" class="btn" data-again>Play again</button></div>');
    body.appendChild(b);
    $("[data-k]", b).onclick = closeSheet;
    $("[data-again]", b).onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} if (viewer) viewer.destroy(); viewer = null; stage = null; intro(); };
  }

  /* ---------------------------------------------------------------- start */
  function intro() {
    var saved = load();
    if (saved && (!saved.v || saved.v < 2)) saved = null; // progress from the old, step-by-step version
    root.innerHTML = '<section class="ts-card ts-intro">' +
      '<p class="kicker">360° role-play · about 15–20 minutes</p>' +
      '<h2>Step off the plane at Tan Son Nhat with ' + T.startCash + ' in cash</h2>' +
      '<p class="ts-text">Look around each place in 360°. Tap the people, counters and stalls to talk, change money at today\'s real rate, order in Vietnamese, pay with real Vietnamese notes, bargain, book a ride and cross the street. Tap the arrows to walk on. The clock runs: some stalls only open later in the day.</p>' +
      '<fieldset class="ts-amt"><legend>Which cash do you bring?</legend><div class="chips">' +
      Object.keys(CUR).map(function (c, i) { return '<label class="chip"><input type="radio" name="cur" value="' + c + '"' + (i === 0 ? " checked" : "") + '> ' + CUR[c] + T.startCash + ' ' + c + '</label>'; }).join("") +
      '</div></fieldset>' +
      '<div class="ts-acts"><button type="button" class="cta" data-start>Start the day</button>' +
      (saved && !saved.done ? '<button type="button" class="btn" data-resume>Continue (' + esc(clock(saved.time)) + ', ' + esc(T.scenes[saved.scene] ? T.scenes[saved.scene].name : "") + ')</button>' : "") + '</div>' +
      '<p class="small">Your progress stays in this browser only. Prices marked as examples are typical, not quotes. Scenes are illustrations of real places.</p></section>';
    $("[data-start]", root).onclick = function () {
      var c = $("input[name=cur]:checked", root).value;
      S = { v: 2, scene: T.start.scene, cur: c, home: T.startCash, notes: {}, time: T.start.time, skills: {}, spent: [], flags: {}, goals: {}, seen: {}, done: false };
      save(); frame(); enter(S.scene);
    };
    var r = $("[data-resume]", root);
    if (r) r.onclick = function () { S = saved; frame(); enter(S.scene); };
  }

  loadRate();
  intro();
})();
