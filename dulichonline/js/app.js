/* Logic chính: tài khoản, bản đồ, trình xem 360°, câu đố, hộ chiếu.
   Tài khoản và dấu hộ chiếu đang lưu ở localStorage (bản demo).
   Khi cần tài khoản thật: thay 3 hàm trong "store" bằng Supabase/Firebase. */
(function () {
  const $ = (s) => document.querySelector(s);
  const DEST = window.DESTINATIONS;
  const M = window.MAP_DATA;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Lưu trữ ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} }
  };
  let user = store.get("dlo_user", null);
  let stamps = {};
  const stampKey = () => "dlo_stamps_" + (user ? user.email.toLowerCase() : "guest");
  const saveStamps = () => store.set(stampKey(), stamps);

  /* ---------- Điều hướng màn hình ---------- */
  function show() {
    const logged = !!user;
    $("#screenLogin").hidden = logged;
    $("#screenMap").hidden = !logged;
    $("#userbar").hidden = !logged;
    if (logged) {
      stamps = store.get(stampKey(), {});
      $("#hello").textContent = "Xin chào, " + user.name;
      renderMap(); renderList(); updateProgress();
    }
  }

  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    user = { name: f.get("name").trim(), email: f.get("email").trim() };
    store.set("dlo_user", user);
    show();
  });
  $("#logout").addEventListener("click", () => { store.del("dlo_user"); user = null; show(); });
  $(".brand").addEventListener("click", (e) => { e.preventDefault(); if (user) selectDest(null); });

  /* ---------- Bản đồ SVG ---------- */
  const proj = (lon, lat) => [
    (lon - M.LON0) / (M.LON1 - M.LON0) * M.W,
    (M.LAT1 - lat) / (M.LAT1 - M.LAT0) * M.H
  ];
  // Quần đảo Hoàng Sa và Trường Sa (tọa độ xấp xỉ một số đảo chính)
  const ISLANDS = {
    "Quần đảo Hoàng Sa": [[111.62, 16.53], [111.75, 16.45], [112.33, 16.83], [112.27, 16.97], [111.9, 16.2], [112.73, 16.67], [111.5, 16.0]],
    "Quần đảo Trường Sa": [[114.33, 11.43], [114.28, 10.38], [114.36, 10.18], [113.85, 8.65], [115.03, 10.73], [114.48, 10.94], [115.5, 9.9], [116.0, 10.9], [112.9, 9.0], [114.1, 9.8]]
  };

  function renderMap() {
    const svg = $("#map");
    svg.setAttribute("viewBox", `0 0 ${M.W} ${M.H}`);
    let html = `<path class="neighbors" d="${M.neighbors}"/><path class="vn" d="${M.vn}"/>`;
    for (const [name, pts] of Object.entries(ISLANDS)) {
      html += `<g class="islands">` + pts.map(([lo, la]) => { const [x, y] = proj(lo, la); return `<circle cx="${x}" cy="${y}" r="2.2"/>`; }).join("") + `</g>`;
      const [lx, ly] = proj(pts[0][0] - 0.2, pts[0][1] + 0.55);
      html += `<text class="label" x="${lx}" y="${ly}">${name}</text>`;
    }
    const [sx, sy] = proj(110.6, 13.6);
    html += `<text class="label sea" x="${sx}" y="${sy}">BIỂN ĐÔNG</text>`;
    for (const d of DEST) {
      const [x, y] = proj(d.lon, d.lat);
      const left = d.labelSide === "left";
      html += `<g class="pin${stamps[d.id] ? " done" : ""}" data-id="${d.id}" tabindex="0" role="button" aria-label="${esc(d.name)}">
        <circle class="pulse" cx="${x}" cy="${y}" r="8"/>
        <circle class="dot" cx="${x}" cy="${y}" r="6.5"/>
        <text x="${left ? x - 11 : x + 11}" y="${y + 4}" text-anchor="${left ? "end" : "start"}">${esc(d.label || d.name)}</text>
      </g>`;
    }
    svg.innerHTML = html;
    svg.querySelectorAll(".pin").forEach((p) => {
      p.addEventListener("click", () => selectDest(p.dataset.id));
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDest(p.dataset.id); } });
    });
  }

  /* ---------- Danh sách và thẻ chi tiết ---------- */
  const thumbs = {};
  async function thumbFor(d) {
    if (d.pano) return d.pano;
    if (!thumbs[d.id]) thumbs[d.id] = await window.paintScene(d.scene);
    return thumbs[d.id];
  }

  function renderList() {
    const regions = ["Miền Bắc", "Miền Trung", "Miền Nam"];
    $("#list").innerHTML = regions.map((r) => {
      const items = DEST.filter((d) => d.region === r);
      if (!items.length) return "";
      return `<section class="region"><h2>${r}</h2>` + items.map((d) => `
        <button class="card" data-id="${d.id}" type="button">
          <span class="thumb" data-thumb="${d.id}"></span>
          <span><b>${esc(d.name)}</b><small>${d.hotspots.length} điểm khám phá</small></span>
          <span class="tick" aria-label="${stamps[d.id] ? "Đã có dấu" : ""}">${stamps[d.id] ? "✅" : ""}</span>
        </button>`).join("") + `</section>`;
    }).join("");
    $("#list").querySelectorAll(".card").forEach((c) => c.addEventListener("click", () => selectDest(c.dataset.id)));
    // Vẽ ảnh thu nhỏ lần lượt để không chặn giao diện
    (async () => { for (const d of DEST) { const url = await thumbFor(d); const el = document.querySelector(`[data-thumb="${d.id}"]`); if (el) el.style.backgroundImage = `url(${url})`; } })();
  }

  async function selectDest(id) {
    document.querySelectorAll(".pin").forEach((p) => p.classList.toggle("active", p.dataset.id === id));
    const box = $("#detail");
    if (!id) { box.hidden = true; return; }
    const d = DEST.find((x) => x.id === id);
    box.hidden = false;
    box.innerHTML = `
      <div class="hero"></div>
      <div class="body">
        <p class="eyebrow">${d.region}${stamps[d.id] ? " · Đã có dấu ✅" : ""}</p>
        <h2>${esc(d.name)}</h2>
        <p>${esc(d.intro)}</p>
        <div class="actions">
          <button class="btn primary" id="go" type="button">Tham quan 360°</button>
          ${d.realTrip ? `<a class="btn ghost" href="${esc(d.realTrip)}" target="_blank" rel="noopener">Muốn đến thật?</a>` : ""}
        </div>
      </div>`;
    $("#go").addEventListener("click", () => openViewer(d));
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const url = await thumbFor(d);
    box.querySelector(".hero").style.backgroundImage = `url(${url})`;
  }

  function updateProgress() {
    const n = Object.keys(stamps).length;
    $("#stampCount").textContent = n;
    $("#progressText").textContent = `${n}/${DEST.length} điểm đến đã ghé`;
    $("#progressBar").style.width = (n / DEST.length * 100) + "%";
  }

  /* ---------- Trình xem 360° ---------- */
  let viewer = null, current = null, seen = new Set(), raf = 0;

  async function openViewer(d) {
    current = d; seen = new Set();
    $("#viewer").hidden = false;
    document.body.style.overflow = "hidden";
    $("#vTitle").textContent = d.name;
    $("#vSub").textContent = "Kéo để nhìn quanh · bấm chấm đỏ để khám phá";
    renderExplore();
    const url = d.pano || await window.paintScene(d.scene);
    if (viewer) viewer.destroy();
    viewer = pannellum.viewer("pano", {
      type: "equirectangular", panorama: url, autoLoad: true, hfov: 100, yaw: 0, pitch: 0,
      autoRotate: -2, autoRotateInactivityDelay: 4000, compass: false, showFullscreenCtrl: false, showZoomCtrl: false,
      hotSpots: d.hotspots.map((h, i) => ({
        pitch: h.pitch, yaw: h.yaw, cssClass: "hs", createTooltipFunc: (div) => { div.innerHTML = `<span>${esc(h.title)}</span>`; div.dataset.i = i; },
        clickHandlerFunc: () => openNote(i)
      }))
    });
    const tick = () => { if (viewer) $("#coords").textContent = `yaw ${viewer.getYaw().toFixed(0)} · pitch ${viewer.getPitch().toFixed(0)}`; raf = requestAnimationFrame(tick); };
    cancelAnimationFrame(raf); tick();
  }

  function renderExplore() {
    const d = current;
    $("#explore").innerHTML = `<b>Đã khám phá ${seen.size}/${d.hotspots.length}</b><ul>` +
      d.hotspots.map((h, i) => `<li class="${seen.has(i) ? "seen" : ""}" data-i="${i}">${esc(h.title)}</li>`).join("") + `</ul>`;
    $("#explore").querySelectorAll("li").forEach((li) => li.addEventListener("click", () => {
      const h = d.hotspots[+li.dataset.i]; viewer && viewer.lookAt(h.pitch, h.yaw, 90, 800); openNote(+li.dataset.i);
    }));
    $("#quizBtn").textContent = stamps[d.id] ? "Xem hộ chiếu" : "Nhận dấu hộ chiếu";
  }

  function openNote(i) {
    const h = current.hotspots[i];
    seen.add(i);
    document.querySelectorAll(`#pano .hs[data-i="${i}"]`).forEach((el) => el.classList.add("seen"));
    const note = $("#note");
    note.hidden = false;
    note.innerHTML = `<h3>${esc(h.title)}</h3><p>${esc(h.text)}</p><button class="btn ghost" type="button">Tiếp tục khám phá</button>`;
    note.querySelector("button").addEventListener("click", () => { note.hidden = true; });
    renderExplore();
  }

  function closeViewer() {
    cancelAnimationFrame(raf);
    if (viewer) { viewer.destroy(); viewer = null; }
    $("#viewer").hidden = true; $("#note").hidden = true;
    document.body.style.overflow = "";
    if (current) selectDest(current.id);
  }
  $("#closeViewer").addEventListener("click", closeViewer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#viewer").hidden && !$("#dialog").open) closeViewer(); });

  /* ---------- Câu đố → dấu hộ chiếu ---------- */
  $("#quizBtn").addEventListener("click", () => {
    const d = current;
    if (stamps[d.id]) return openPassport(d.id);
    const q = d.quiz;
    openDialog(`<div class="dlg">
      <button class="btn link close" type="button" data-close>✕</button>
      <p class="eyebrow">Câu hỏi nhận dấu</p>
      <h3>${esc(q.q)}</h3>
      <div class="quiz-options">${q.options.map((o, i) => `<button type="button" data-i="${i}">${esc(o)}</button>`).join("")}</div>
      <p class="fine" id="quizMsg">Gợi ý: bấm vào các chấm đỏ trong cảnh để tìm đáp án.</p>
    </div>`);
    document.querySelectorAll(".quiz-options button").forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.i;
      if (i === q.answer) {
        b.classList.add("right");
        stamps[d.id] = new Date().toISOString(); saveStamps(); updateProgress(); renderMap(); renderList(); renderExplore();
        setTimeout(() => openPassport(d.id), 700);
      } else {
        b.classList.add("wrong"); b.disabled = true;
        $("#quizMsg").textContent = "Chưa đúng, thử lại nhé!";
      }
    }));
  });

  function openPassport(justGot) {
    const fmt = (iso) => new Date(iso).toLocaleDateString("vi-VN");
    openDialog(`<div class="passport">
      <button class="btn link close" type="button" data-close style="color:#f5e9c9">✕</button>
      <h2>Hộ chiếu du lịch Việt Nam</h2>
      <div class="owner">${esc(user.name)} · ${Object.keys(stamps).length}/${DEST.length} dấu</div>
      <div class="stamps">${DEST.map((d) => stamps[d.id]
        ? `<div class="stamp got${d.id === justGot ? " stamp-pop" : ""}">${esc(d.label || d.name)}<small>${fmt(stamps[d.id])}</small></div>`
        : `<div class="stamp">${esc(d.label || d.name)}</div>`).join("")}</div>
    </div>`);
  }
  $("#openPassport").addEventListener("click", () => openPassport());

  function openDialog(html) {
    const dlg = $("#dialog");
    $("#dialogBody").innerHTML = html;
    dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
    if (!dlg.open) dlg.showModal();
  }
  $("#dialog").addEventListener("click", (e) => { if (e.target.id === "dialog") e.target.close(); });

  show();
})();
