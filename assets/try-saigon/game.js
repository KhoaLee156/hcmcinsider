/* Try Saigon engine. The story and prices live in trip.js; this file only runs them.
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
  function fill(t) { return String(t).replace("{startCash}", home(T.startCash)); }
  function chapter() { return T.chapters[S.ch]; }
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

  /* ---------------------------------------------------------------- layout */
  function frame() {
    root.innerHTML =
      '<div class="ts-hud" id="ts-hud"></div>' +
      '<section class="ts-card" id="ts-card" aria-live="polite"></section>' +
      '<div class="ts-wallet" id="ts-wallet" hidden></div>';
  }
  function hud() {
    var h = $("#ts-hud"); if (!h) return;
    var dots = T.chapters.map(function (c, i) { return '<i class="' + (i < S.ch ? "done" : i === S.ch ? "now" : "") + '" title="' + esc(c.place) + '"></i>'; }).join("");
    h.innerHTML = '<div class="ts-dots" aria-label="Chapter ' + (S.ch + 1) + ' of ' + T.chapters.length + '">' + dots + '</div>' +
      '<div class="ts-clock"><span class="small">Time</span><b>' + clock(S.time) + '</b></div>' +
      '<button type="button" class="ts-purse" id="ts-purse" aria-expanded="false"><span class="small">Wallet</span><b>' + vnd(cash()) + '</b><em>' + home(S.home) + ' cash</em></button>';
    $("#ts-purse").onclick = toggleWallet;
  }
  function toggleWallet() {
    var w = $("#ts-wallet"), b = $("#ts-purse");
    if (!w.hidden) { w.hidden = true; b.setAttribute("aria-expanded", "false"); return; }
    var rows = DENOMS.filter(function (d) { return S.notes[d]; }).map(function (d) {
      return '<li>' + noteHtml(d) + '<span>× ' + S.notes[d] + '</span><span class="small">' + vnd(d * S.notes[d]) + '</span></li>';
    }).join("") || '<li class="small">No dong yet.</li>';
    var card = S.spent.filter(function (s) { return s.how === "card"; }).reduce(function (t, s) { return t + s.vnd; }, 0);
    var where = S.ch >= 2 ? "goldshop" : "airport";
    w.innerHTML = '<div class="ts-whead"><h3>Your wallet</h3><button type="button" class="btn" data-close>Close</button></div>' +
      '<ul class="ts-notes">' + rows + '</ul>' +
      '<p class="small">Cash: <b>' + vnd(cash()) + '</b> (about ' + home(toHome(cash())) + ') · ' + home(S.home) + ' not changed yet' + (card ? ' · paid by card: ' + vnd(card) : '') + '</p>' +
      '<div class="ts-acts"><button type="button" class="btn" data-x' + (S.home < 1 ? " disabled" : "") + '>' + (where === "airport" ? "Change cash at the airport counter" : "Change cash at a jewellery shop") + '</button><button type="button" class="btn" data-atm>Use an ATM</button></div>' +
      '<p class="small">Rate: 1 ' + S.cur + ' = ' + vnd(RATE.rates[S.cur]) + (RATE.live ? ' (mid-market, ' + esc(RATE.date) + ')' : ' (estimate; live rate unavailable)') + '</p>';
    w.hidden = false; b.setAttribute("aria-expanded", "true");
    $("[data-close]", w).onclick = toggleWallet;
    var x = $("[data-x]", w); if (x) x.onclick = function () { w.hidden = true; exchangeDialog(where, function () { hud(); render(); }); };
    var a = $("[data-atm]", w); if (a) a.onclick = function () {
      addNotes({ 500000: 1, 100000: 4, 50000: 2 }); spend("ATM withdrawal", 1000000, "card");
      S.time += 10; save(); w.hidden = true; hud();
      toast("You took out 1,000,000 ₫. ATMs often give 500,000 notes; this one gave some 100,000 and 50,000 too. Your bank and the ATM may charge a fee.");
    };
  }
  function toast(t) {
    var n = el('<div class="ts-toast" role="status">' + esc(t) + '</div>');
    document.body.appendChild(n); setTimeout(function () { n.classList.add("out"); }, 5200); setTimeout(function () { n.remove(); }, 5800);
  }

  function header(c) {
    return '<p class="kicker">Chapter ' + (S.ch + 1) + ' of ' + T.chapters.length + ' · ' + clock(S.time) + '</p>' +
      '<h2>' + esc(c.place) + '</h2><p class="ts-vi" lang="vi">' + esc(c.placeVi) + '</p>';
  }
  function bubbles(lines) {
    return (lines || []).map(function (l) {
      return '<div class="ts-bubble"><span class="small">' + esc(l.who) + '</span><b lang="vi">' + esc(l.vi) + '</b><em>' + esc(l.en) + '</em></div>';
    }).join("");
  }
  function tipHtml(t) { return t ? '<div class="ts-tip"><b>Local tip</b><p>' + esc(t) + '</p></div>' : ""; }
  function linkHtml(l) { return l ? '<p><a class="more-link" href="' + esc(l.href) + '">' + esc(l.text) + '</a></p>' : ""; }

  /* ---------------------------------------------------------------- flow */
  function step() { return chapter().steps[S.st]; }
  function next(id) {
    var c = chapter();
    if (id) {
      var i = c.steps.findIndex(function (s) { return s.id === id; });
      if (i >= 0) { S.st = i; save(); return render(); }
    }
    if (S.st + 1 < c.steps.length) { S.st++; save(); return render(); }
    S.ch++; S.st = 0;
    if (S.ch >= T.chapters.length) { S.done = true; save(); return report(); }
    S.time = Math.max(S.time, chapter().time); save(); hud(); render();
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  }
  function render() {
    hud();
    var s = step(), c = chapter(), card = $("#ts-card");
    card.innerHTML = header(c) + '<div class="ts-body"></div>';
    var body = $(".ts-body", card);
    (R[s.type] || R.say)(s, body);
    var top = card.getBoundingClientRect().top;
    if (top < 0) window.scrollBy({ top: top - 160, behavior: "smooth" });
  }
  function cont(body, label, fn) {
    var b = el('<div class="ts-acts"><button type="button" class="cta">' + esc(label || "Continue") + '</button></div>');
    body.appendChild(b); $("button", b).onclick = fn; return b;
  }

  var R = {};

  R.say = function (s, body) {
    body.innerHTML = (s.text ? '<p class="ts-text">' + esc(fill(s.text)) + '</p>' : "") + bubbles(s.lines) + tipHtml(s.tip) + linkHtml(s.link);
    cont(body, "Continue", function () { next(s.next); });
  };

  R.choice = function (s, body) {
    body.innerHTML = '<h3 class="ts-q">' + esc(s.prompt) + '</h3><div class="ts-opts"></div>';
    var box = $(".ts-opts", body);
    s.options.forEach(function (o) {
      var blocked = o.needs === "online" && S.flags.offline;
      var b = el('<button type="button" class="ts-opt"' + (blocked ? " disabled" : "") + '><b>' + esc(o.label) + '</b>' +
        (o.sub ? '<span class="small">' + esc(o.sub) + '</span>' : "") + (blocked ? '<span class="small">You have no mobile data.</span>' : "") + '</button>');
      b.onclick = function () {
        S.time += o.min || 0; if (o.skill) addSkill(o.skill); if (o.flag) S.flags[o.flag] = true;
        save(); hud();
        body.innerHTML = '<h3 class="ts-q">' + esc(s.prompt) + '</h3><div class="ts-result ' + ((o.skill && Object.keys(o.skill).some(function (k) { return o.skill[k] < 0; })) ? "bad" : "") + '"><b>' + esc(o.label) + '</b><p>' + esc(o.result) + '</p></div>';
        cont(body, "Continue", function () { next(o.goto); });
      };
      box.appendChild(b);
    });
  };

  /* ---- exchange */
  R.exchange = function (s, body) {
    body.innerHTML = "";
    exchangeInline(body, s.where, function () { cont(body, "Continue", function () { next(s.next); }); });
  };
  function exchangeDialog(where, done) {
    var card = $("#ts-card");
    var box = el('<div class="ts-modal" role="dialog" aria-modal="true" aria-label="Change money"><div class="ts-modal-in"></div></div>');
    document.body.appendChild(box);
    var inner = $(".ts-modal-in", box);
    exchangeInline(inner, where, function () { box.remove(); done && done(); }, function () { box.remove(); });
  }
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
  R.order = function (s, body) {
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
        payUI(body, { amount: tot, to: s.vendor, what: what, smallChange: s.smallChange }, function () { next(s.next); });
      };
      body.innerHTML = '<div class="ts-bubble"><span class="small">' + esc(s.vendor) + '</span><b lang="vi">Có liền!</b><em>Coming right up!</em></div>' +
        '<p class="ts-text">' + (s.bill ? "You eat. When you're done, wave and ask for the bill." : "It's ready in a minute.") + '</p>';
      if (s.bill) {
        var b = el('<div class="ts-acts"><button type="button" class="cta"><span lang="vi">Tính tiền!</span> (The bill, please)</button></div>');
        body.appendChild(b); $("button", b).onclick = function () { addSkill({ food: 1 }); after(); };
      } else cont(body, "Pay", after);
    };
  };

  /* ---- pay */
  R.pay = function (s, body) {
    body.innerHTML = '<div class="ts-bubble"><span class="small">' + esc(s.to) + '</span><b lang="vi">' + esc(s.vi) + '</b><em>' + esc(s.en) + '</em></div>' +
      (s.note ? '<p class="small">' + esc(s.note) + '</p>' : "");
    payUI(body, { amount: s.amount, to: s.to, what: s.to }, function () { next(s.next); });
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
      var m = $("[data-more]", w); if (m) m.onclick = function () { toggleWallet(); };
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
  R.ride = function (s, body) {
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
                cont(body, "Continue", function () { next(s.next); });
              } else {
                body.insertAdjacentHTML("afterbegin", '<div class="ts-bubble"><span class="small">Driver</span><b lang="vi">Tới rồi nha. ' + esc(viMoney(s.fare)) + '.</b><em>Here we are. ' + vnd(s.fare) + '.</em></div>');
                payUI(body, { amount: s.fare, to: "Driver", what: "Ride to " + s.to }, function () { next(s.next); });
              }
            }, 1600);
          };
        });
      }, 1300);
    };
  };

  /* ---- haggle */
  R.haggle = function (s, body) {
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
      payUI(body, { amount: price, to: "Hat seller", what: s.item }, function () { next(s.next); });
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
          cont(body, "Leave without a hat", function () { next(s.next); });
        }
      }, 600);
    };
  };

  /* ---- 360° look-around */
  R.pano = function (s, body) {
    body.innerHTML = '<p class="ts-text">' + esc(s.text) + '</p><div class="ts-pano" id="ts-pano"></div><div class="ts-pnote" hidden></div>' + linkHtml(s.link);
    var seen = 0;
    (s.pano ? Promise.resolve(s.pano) : window.paintScene(s.scene)).then(function (url) {
      if (!window.pannellum) return;
      pannellum.viewer("ts-pano", {
        type: "equirectangular", panorama: url, autoLoad: true, hfov: 100, compass: false, showFullscreenCtrl: false, showZoomCtrl: false, mouseZoom: false,
        hotSpots: s.hotspots.map(function (h) {
          return { pitch: h.pitch, yaw: h.yaw, cssClass: "ts-hs", createTooltipFunc: function (d) { d.innerHTML = "<span>" + esc(h.title) + "</span>"; },
            clickHandlerFunc: function (e, a) { seen++; var n = $(".ts-pnote", body); n.hidden = false; n.innerHTML = "<b>" + esc(h.title) + "</b><p>" + esc(h.text) + "</p>"; } };
        })
      });
    });
    cont(body, "Walk into the market", function () { next(s.next); });
  };

  /* ---- crossing the street */
  R.cross = function (s, body) {
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
      cont(body, "Continue", function () { next(s.next); });
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
    hud();
    var card = $("#ts-card"), total = S.spent.reduce(function (t, s) { return t + s.vnd; }, 0);
    var rows = S.spent.filter(function (s) { return s.vnd; }).map(function (s) {
      return '<tr><td>' + clock(s.t) + '</td><td>' + esc(s.what) + '</td><td>' + (s.how === "card" ? "card" : "cash") + '</td><td class="num">' + vnd(s.vnd) + '</td></tr>';
    }).join("");
    var skills = Object.keys(T.skills).map(function (k) {
      var p = S.skills[k] || 0, stars = Math.max(0, Math.min(3, p)), sk = T.skills[k];
      return '<li><div><b>' + esc(sk.name) + '</b> <span class="small" lang="vi">' + esc(sk.vi) + '</span></div><span class="ts-stars" aria-label="' + stars + ' of 3">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= stars ? "on" : "") + '"></i>'; }).join("") + '</span>' +
        '<p class="small">' + (stars >= 2 ? esc(sk.good) : 'Practise this one: <a href="' + esc(sk.learn) + '">read the guide</a>.') + '</p></li>';
    }).join("");
    card.innerHTML = '<p class="kicker">Your practice day · ' + clock(S.time) + '</p><h2>You survived a day in Saigon</h2>' +
      '<p class="ts-text">You spent <b>' + vnd(total) + '</b>, about <b>' + home(toHome(total)) + '</b>' + (S.exchanged ? ', and changed ' + home(S.exchanged) + ' into dong' : '') + '.</p>' +
      '<ul class="ts-skills">' + skills + '</ul>' +
      '<div class="ts-table"><table><thead><tr><th>Time</th><th>What</th><th>How</th><th class="num">Dong</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<h3 class="ts-q">Ready for the real thing?</h3><div class="chips"><a class="chip" href="/guides/saigon-itinerary/">Plan 1–3 days</a><a class="chip" href="/guides/arriving-in-saigon/">Airport to city</a><a class="chip" href="/guides/getting-around-hcmc/">Buses</a><a class="chip" href="/guides/hcmc-metro/">Metro</a><a class="chip" href="/places/sidewalk-noodles-187-huynh-man-dat/">Tonight\'s noodles</a></div>' +
      '<div class="ts-acts"><button type="button" class="btn" data-again>Play again</button></div>';
    $("[data-again]", card).onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} intro(); };
  }

  /* ---------------------------------------------------------------- intro */
  function intro() {
    var saved = load();
    root.innerHTML = '<section class="ts-card ts-intro">' +
      '<p class="kicker">Practice day · about 15 minutes</p>' +
      '<h2>Land at Tan Son Nhat with ' + T.startCash + ' in cash and a day to fill</h2>' +
      '<p class="ts-text">Change money at today\'s real rate, get into the city, order bánh mì in Vietnamese, cross the street, bargain at Ben Thanh, check your ride\'s plate and pay for dinner at a real Cholon noodle stall. Mistakes cost play money, not real money.</p>' +
      '<fieldset class="ts-amt"><legend>Which cash do you bring?</legend><div class="chips">' +
      Object.keys(CUR).map(function (c, i) { return '<label class="chip"><input type="radio" name="cur" value="' + c + '"' + (i === 0 ? " checked" : "") + '> ' + CUR[c] + T.startCash + ' ' + c + '</label>'; }).join("") +
      '</div></fieldset>' +
      '<div class="ts-acts"><button type="button" class="cta" data-start>Start the day</button>' +
      (saved && !saved.done ? '<button type="button" class="btn" data-resume>Continue where you stopped (' + esc(T.chapters[saved.ch] ? T.chapters[saved.ch].place : "") + ')</button>' : "") + '</div>' +
      '<p class="small">Your progress stays in this browser only. Prices marked as examples are typical, not quotes.</p></section>';
    $("[data-start]", root).onclick = function () {
      var c = $("input[name=cur]:checked", root).value;
      S = { ch: 0, st: 0, cur: c, home: T.startCash, notes: {}, time: T.chapters[0].time, skills: {}, spent: [], flags: {}, done: false };
      save(); frame(); render();
    };
    var r = $("[data-resume]", root);
    if (r) r.onclick = function () { S = saved; frame(); render(); };
  }

  loadRate();
  intro();
})();
