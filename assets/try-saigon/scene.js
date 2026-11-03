/* Paints the 360° scenes of Try Saigon (equirectangular, 2:1) until real 360° photos are added.
   A scene = a background ("bg") + objects placed by yaw, so the clickable hotspot and the drawing
   always line up. Yaw 0 is the centre of the image; -180..180 goes all the way round.
   Every shape wraps horizontally so the left and right edges meet. */
(function () {
  const W = 4096, H = 2048, HZ = H / 2, TAU = Math.PI * 2;
  const FONT = '"Be Vietnam Pro", "BVP Fallback", system-ui, sans-serif';
  const X = (yaw) => W / 2 + (yaw / 360) * W;

  function rand(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  function wave(x, seed, oct) { let v = 0, a = 1, t = 0; oct.forEach((f, i) => { v += a * Math.sin(TAU * f * x / W + seed * (i + 1) * 1.7); t += a; a *= 0.55; }); return v / t; }
  function wrap(x, fn) { fn(x); if (x < 500) fn(x + W); if (x > W - 500) fn(x - W); }
  function grad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function round(ctx, x, y, w, h, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  function text(ctx, t, x, y, size, color, weight, align) {
    ctx.fillStyle = color; ctx.font = (weight || 800) + " " + size + "px " + FONT; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y);
  }
  function sign(ctx, x, y, w, h, bg, fg, line1, line2) {
    round(ctx, x - w / 2, y - h / 2, w, h, 10, bg);
    if (line2) { text(ctx, line1, x, y - h * 0.18, h * 0.36, fg); text(ctx, line2, x, y + h * 0.24, h * 0.22, fg, 600); }
    else text(ctx, line1, x, y, h * 0.48, fg);
  }

  /* ---------------------------------------------------------------- people and things */
  function person(ctx, x, o) {
    const s = o.scale || 1, foot = HZ + 210 * s, skin = o.skin || "#E3B48C";
    wrap(x, (x) => {
      rect(ctx, x - 26 * s, foot - 150 * s, 18 * s, 150 * s, o.pants || "#2d3640");
      rect(ctx, x + 8 * s, foot - 150 * s, 18 * s, 150 * s, o.pants || "#2d3640");
      round(ctx, x - 42 * s, foot - 300 * s, 84 * s, 160 * s, 22 * s, o.shirt || "#3b6ea5");
      rect(ctx, x - 54 * s, foot - 290 * s, 16 * s, 120 * s, o.shirt || "#3b6ea5");
      rect(ctx, x + 38 * s, foot - 290 * s, 16 * s, 120 * s, o.shirt || "#3b6ea5");
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, foot - 340 * s, 34 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = o.hair || "#1d1d1d"; ctx.beginPath(); ctx.arc(x, foot - 350 * s, 35 * s, Math.PI, TAU); ctx.fill();
      if (o.hat === "non") { ctx.fillStyle = "#e9d8a6"; ctx.beginPath(); ctx.moveTo(x - 80 * s, foot - 350 * s); ctx.lineTo(x, foot - 420 * s); ctx.lineTo(x + 80 * s, foot - 350 * s); ctx.fill(); }
      if (o.hat === "cap") { rect(ctx, x - 36 * s, foot - 385 * s, 72 * s, 22 * s, o.capColor || "#c0392b"); rect(ctx, x, foot - 368 * s, 50 * s, 8 * s, o.capColor || "#c0392b"); }
      if (o.vest) { round(ctx, x - 42 * s, foot - 300 * s, 84 * s, 70 * s, 16 * s, o.vest); }
    });
  }
  function motorbike(ctx, x, y, s, c, dir) {
    wrap(x, (x) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(dir || 1, 1);
      ctx.fillStyle = "#1b1b1b"; ctx.beginPath(); ctx.arc(-45 * s, 0, 22 * s, 0, TAU); ctx.arc(45 * s, 0, 22 * s, 0, TAU); ctx.fill();
      round(ctx, -55 * s, -40 * s, 110 * s, 34 * s, 12 * s, c);
      rect(ctx, -10 * s, -110 * s, 34 * s, 72 * s, "#34495e");
      ctx.fillStyle = "#E3B48C"; ctx.beginPath(); ctx.arc(8 * s, -125 * s, 16 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(8 * s, -132 * s, 18 * s, Math.PI, TAU); ctx.fill();
      ctx.restore();
    });
  }
  function car(ctx, x, y, s, c, roof) {
    wrap(x, (x) => {
      round(ctx, x - 150 * s, y - 80 * s, 300 * s, 70 * s, 18 * s, c);
      round(ctx, x - 95 * s, y - 135 * s, 190 * s, 60 * s, 18 * s, c);
      rect(ctx, x - 80 * s, y - 125 * s, 70 * s, 42 * s, "#9fc3d8"); rect(ctx, x + 10 * s, y - 125 * s, 70 * s, 42 * s, "#9fc3d8");
      ctx.fillStyle = "#151515"; ctx.beginPath(); ctx.arc(x - 90 * s, y - 8 * s, 28 * s, 0, TAU); ctx.arc(x + 90 * s, y - 8 * s, 28 * s, 0, TAU); ctx.fill();
      if (roof) sign(ctx, x, y - 160 * s, 110 * s, 34 * s, "#f5c518", "#222", roof);
    });
  }

  const OBJ = {
    counter(ctx, x, o) { wrap(x, (x) => {
      rect(ctx, x - 180, HZ - 60, 360, 270, o.color || "#0E6655");
      rect(ctx, x - 190, HZ - 70, 380, 26, "#e8eef0");
      rect(ctx, x - 150, HZ - 40, 300, 120, "rgba(255,255,255,.18)");
      sign(ctx, x, HZ - 190, 380, 110, o.signBg || "#0b3d33", o.signFg || "#ffd56b", o.sign, o.sign2);
      if (o.board) { round(ctx, x - 130, HZ - 30, 260, 96, 8, "#0b1612"); o.board.forEach((l, i) => text(ctx, l, x, HZ - 6 + i * 30, 22, "#ffd56b", 700)); }
    }); if (o.staff) person(ctx, x, Object.assign({ scale: 0.85 }, o.staff)); },
    atm(ctx, x) { wrap(x, (x) => { round(ctx, x - 70, HZ - 140, 140, 340, 14, "#2c3e50"); rect(ctx, x - 50, HZ - 100, 100, 70, "#7fb3d5"); rect(ctx, x - 40, HZ, 80, 50, "#95a5a6"); sign(ctx, x, HZ - 175, 140, 50, "#c0392b", "#fff", "ATM"); }); },
    door(ctx, x, o) { wrap(x, (x) => { rect(ctx, x - 160, HZ - 240, 320, 450, "#a9cce3"); rect(ctx, x - 4, HZ - 240, 8, 450, "#5d6d7e"); sign(ctx, x, HZ - 290, 360, 70, "#1f3a4d", "#fff", o.sign || "EXIT", o.sign2); }); },
    busstop(ctx, x) { wrap(x, (x) => { rect(ctx, x - 6, HZ - 260, 12, 470, "#7f8c8d"); sign(ctx, x, HZ - 300, 300, 120, "#1f5fa8", "#fff", "XE BUÝT 152", "Bến Thành · Bus stop"); rect(ctx, x - 160, HZ + 60, 320, 20, "#95a5a6"); }); person(ctx, x - 120, { shirt: "#c0392b", scale: 0.8 }); person(ctx, x + 130, { shirt: "#16a085", scale: 0.8, hair: "#5b3a29" }); },
    taxi(ctx, x) { car(ctx, x, HZ + 210, 1.3, "#f4f4f4", "TAXI"); car(ctx, x + 330, HZ + 200, 1.1, "#2e86c1", "TAXI"); wrap(x, (x) => sign(ctx, x + 120, HZ - 230, 320, 90, "#145a32", "#fff", "TAXI", "Official rank · Có đồng hồ")); },
    pickup(ctx, x) { wrap(x, (x) => { rect(ctx, x - 5, HZ - 200, 10, 410, "#7f8c8d"); sign(ctx, x, HZ - 240, 360, 110, "#0E6655", "#fff", "ĐIỂM ĐÓN XE", "Ride-app pickup"); }); motorbike(ctx, x + 200, HZ + 200, 1.2, "#1e8449", 1); },
    cart(ctx, x, o) { person(ctx, x - 20, { shirt: "#f5f5f5", hat: "non", scale: 0.95 }); wrap(x, (x) => {
      rect(ctx, x - 200, HZ - 10, 400, 180, "#c0392b");
      rect(ctx, x - 190, HZ - 150, 380, 140, "rgba(220,240,255,.75)");
      for (let i = 0; i < 7; i++) round(ctx, x - 170 + i * 50, HZ - 60, 44, 22, 10, "#d4a056");
      rect(ctx, x - 170, HZ - 120, 120, 30, "#e57373"); rect(ctx, x - 30, HZ - 120, 90, 30, "#81c784"); rect(ctx, x + 80, HZ - 120, 80, 30, "#ffb74d");
      sign(ctx, x, HZ - 200, 400, 80, "#ffd54f", "#b71c1c", o.sign || "BÁNH MÌ");
      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(x - 150, HZ + 185, 26, 0, TAU); ctx.arc(x + 150, HZ + 185, 26, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) round(ctx, x + 230 + i * 80, HZ + 120, 56, 70, 6, ["#e74c3c", "#3498db", "#2ecc71"][i]);
    }); },
    crosswalk(ctx, x) { wrap(x, (x) => { for (let i = 0; i < 6; i++) { const y = HZ + 40 + i * 70, w = 160 + i * 70; rect(ctx, x - w / 2, y, w, 30 + i * 6, "rgba(255,255,255,.85)"); } }); },
    benthanh(ctx, x) { wrap(x, (x) => {
      rect(ctx, x - 340, HZ - 170, 680, 190, "#e8d5a8");
      ctx.fillStyle = "#9a3a2a"; ctx.beginPath(); ctx.moveTo(x - 360, HZ - 170); ctx.lineTo(x, HZ - 240); ctx.lineTo(x + 360, HZ - 170); ctx.fill();
      rect(ctx, x - 55, HZ - 390, 110, 230, "#e8d5a8");
      ctx.fillStyle = "#9a3a2a"; ctx.beginPath(); ctx.moveTo(x - 70, HZ - 390); ctx.lineTo(x, HZ - 460); ctx.lineTo(x + 70, HZ - 390); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, HZ - 320, 36, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#333"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, HZ - 320); ctx.lineTo(x, HZ - 345); ctx.moveTo(x, HZ - 320); ctx.lineTo(x + 18, HZ - 320); ctx.stroke();
      text(ctx, "CHỢ BẾN THÀNH", x, HZ - 200, 34, "#7b241c");
      [-250, -60, 140].forEach((d) => rect(ctx, x + d, HZ - 100, 110, 120, "#4a3426"));
    }); },
    hats(ctx, x) { wrap(x, (x) => {
      rect(ctx, x - 230, HZ - 40, 460, 250, "#8d6e63");
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const cx = x - 190 + i * 76, cy = HZ - 170 + r * 70; ctx.fillStyle = "#ead9a8"; ctx.beginPath(); ctx.moveTo(cx - 34, cy + 22); ctx.lineTo(cx, cy - 26); ctx.lineTo(cx + 34, cy + 22); ctx.fill(); ctx.strokeStyle = "#c9b27a"; ctx.lineWidth = 2; ctx.stroke(); }
      for (let i = 0; i < 5; i++) round(ctx, x - 200 + i * 85, HZ + 10, 70, 60, 8, ["#e74c3c", "#f1c40f", "#27ae60", "#2980b9", "#8e44ad"][i]);
      sign(ctx, x, HZ - 260, 300, 60, "#6d4c41", "#ffe082", "NÓN LÁ · QUÀ LƯU NIỆM");
    }); person(ctx, x + 300, { shirt: "#e91e63", scale: 0.9, hair: "#2b1b12" }); },
    foodstalls(ctx, x) { wrap(x, (x) => {
      for (let i = 0; i < 3; i++) { const sx = x - 360 + i * 250; rect(ctx, sx, HZ - 40, 220, 220, ["#d35400", "#16a085", "#c0392b"][i]); sign(ctx, sx + 110, HZ - 90, 220, 60, "#fff8e1", "#bf360c", ["BÚN · PHỞ", "CHÈ", "CƠM TẤM"][i]); }
      for (let i = 0; i < 6; i++) round(ctx, x - 340 + i * 120, HZ + 150, 70, 60, 6, "#1565c0");
    }); },
    coffee(ctx, x) { person(ctx, x - 160, { shirt: "#6d4c41", scale: 0.9, hat: "cap", capColor: "#1b5e20" }); wrap(x, (x) => {
      rect(ctx, x - 60, HZ + 20, 260, 120, "#5d4037");
      ctx.fillStyle = "#b0bec5"; ctx.beginPath(); ctx.arc(x + 20, HZ - 10, 46, Math.PI, TAU); ctx.fill(); rect(ctx, x - 26, HZ - 10, 92, 30, "#b0bec5");
      for (let i = 0; i < 5; i++) { rect(ctx, x + 70 + i * 26, HZ - 30, 18, 46, "rgba(80,40,10,.85)"); }
      for (let i = 0; i < 4; i++) round(ctx, x - 300 + i * 120, HZ + 140, 60, 70, 6, ["#e53935", "#1e88e5", "#43a047", "#fdd835"][i]);
      sign(ctx, x + 70, HZ - 140, 300, 80, "#3e2723", "#ffcc80", "CÀ PHÊ", "Sữa đá · Đen đá");
    }); },
    noodle(ctx, x, o) { person(ctx, x + 170, { shirt: "#eceff1", scale: 0.9, apron: true }); wrap(x, (x) => {
      rect(ctx, x - 190, HZ - 20, 340, 200, "#455a64");
      ctx.fillStyle = "#b0bec5"; ctx.beginPath(); ctx.ellipse(x - 60, HZ - 30, 90, 30, 0, 0, TAU); ctx.fill(); rect(ctx, x - 150, HZ - 30, 180, 60, "#90a4ae");
      if (o.open) { ctx.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x - 90 + i * 20, HZ - 90 - i * 30, 30, 18, 0, 0, TAU); ctx.fill(); } }
      sign(ctx, x - 20, HZ - 200, 360, 100, "#b71c1c", "#ffeb3b", "HỦ TIẾU", "187 · Mở 5 giờ chiều");
      for (let i = 0; i < 4; i++) round(ctx, x - 340 + i * 110, HZ + 150, 60, 64, 6, "#e53935");
    }); },
    goldshop(ctx, x) { wrap(x, (x) => {
      rect(ctx, x - 220, HZ - 260, 440, 470, "#7b1f1f");
      rect(ctx, x - 180, HZ - 120, 360, 220, "#f3e5ab");
      for (let i = 0; i < 6; i++) rect(ctx, x - 160 + i * 56, HZ - 60, 40, 16, "#d4ac0d");
      sign(ctx, x, HZ - 200, 420, 100, "#b7950b", "#7b1f1f", "TIỆM VÀNG", "Đổi ngoại tệ · Exchange");
    }); person(ctx, x - 40, { shirt: "#fdfefe", scale: 0.8, hair: "#111" }); },
    lanterns(ctx, x) { wrap(x, (x) => { for (let i = 0; i < 9; i++) { const lx = x - 400 + i * 100, ly = HZ - 300 + Math.sin(i) * 20; ctx.strokeStyle = "#5d4037"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, ly - 60); ctx.lineTo(lx, ly - 30); ctx.stroke(); ctx.fillStyle = ["#e53935", "#fb8c00", "#fdd835"][i % 3]; ctx.beginPath(); ctx.ellipse(lx, ly, 30, 38, 0, 0, TAU); ctx.fill(); } }); },
    tout(ctx, x) { person(ctx, x, { shirt: "#263238", pants: "#111", scale: 1, hat: "cap", capColor: "#37474f" }); },
    metroentrance(ctx, x) { wrap(x, (x) => {
      rect(ctx, x - 200, HZ - 120, 400, 330, "#d5dbdb"); rect(ctx, x - 160, HZ - 60, 320, 270, "#2c3e50");
      for (let i = 0; i < 6; i++) rect(ctx, x - 150, HZ - 40 + i * 40, 300, 10, "#7f8c8d");
      ctx.fillStyle = "#e67e22"; ctx.beginPath(); ctx.arc(x, HZ - 200, 60, 0, TAU); ctx.fill(); text(ctx, "M", x, HZ - 198, 70, "#fff");
      sign(ctx, x, HZ - 90, 380, 54, "#1f3a4d", "#fff", "GA BẾN THÀNH · METRO");
    }); },
    ticketmachine(ctx, x) { wrap(x, (x) => {
      round(ctx, x - 110, HZ - 200, 220, 410, 16, "#e67e22"); rect(ctx, x - 80, HZ - 160, 160, 110, "#d6eaf8");
      text(ctx, "MUA VÉ", x, HZ - 120, 30, "#1f3a4d"); text(ctx, "Tickets", x, HZ - 82, 22, "#1f3a4d", 600);
      rect(ctx, x - 70, HZ - 20, 60, 14, "#2c3e50"); rect(ctx, x + 10, HZ - 20, 60, 50, "#2c3e50"); rect(ctx, x - 60, HZ + 60, 120, 20, "#2c3e50");
    }); },
    gates(ctx, x) { wrap(x, (x) => {
      rect(ctx, x - 420, HZ - 300, 840, 120, "#2c3e50"); text(ctx, "→ Suối Tiên · Tuyến 1 · Line 1", x, HZ - 240, 40, "#f39c12");
      for (let i = 0; i < 5; i++) { const gx = x - 300 + i * 150; round(ctx, gx - 30, HZ - 30, 60, 240, 10, "#bdc3c7"); rect(ctx, gx - 20, HZ - 10, 40, 30, "#27ae60"); rect(ctx, gx + 30, HZ + 60, 90, 16, "#e74c3c"); }
      rect(ctx, x - 420, HZ - 175, 840, 120, "#ecf0f1"); for (let i = 0; i < 6; i++) rect(ctx, x - 400 + i * 140, HZ - 160, 110, 60, "#5dade2"); rect(ctx, x - 420, HZ - 90, 840, 14, "#e67e22");
    }); },
    opera(ctx, x) { wrap(x, (x) => {
      rect(ctx, x - 360, HZ - 300, 720, 520, "#f2ece0");
      for (let i = 0; i < 3; i++) { ctx.fillStyle = "#d9cfbd"; ctx.beginPath(); ctx.arc(x - 150 + i * 150, HZ - 40, 60, Math.PI, TAU); ctx.fill(); rect(ctx, x - 210 + i * 150, HZ - 40, 120, 250, "#d9cfbd"); }
      ctx.fillStyle = "#e8dfcd"; ctx.beginPath(); ctx.moveTo(x - 380, HZ - 300); ctx.lineTo(x, HZ - 420); ctx.lineTo(x + 380, HZ - 300); ctx.fill();
      rect(ctx, x - 300, HZ - 260, 600, 40, "#c8bba3"); text(ctx, "NHÀ HÁT THÀNH PHỐ", x, HZ - 240, 30, "#6e5b3e");
      rect(ctx, x - 400, HZ + 180, 800, 40, "#c8bba3");
    }); },
    hotel(ctx, x) { wrap(x, (x) => { rect(ctx, x - 200, HZ - 420, 400, 630, "#d7ccc8"); for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) rect(ctx, x - 170 + c * 90, HZ - 390 + r * 90, 60, 60, "#90a4ae"); rect(ctx, x - 70, HZ + 40, 140, 170, "#5d4037"); sign(ctx, x, HZ - 450, 300, 60, "#3e2723", "#ffe0b2", "HOTEL · KHÁCH SẠN"); }); }
  };

  /* ---------------------------------------------------------------- backgrounds */
  const BG = {
    terminal(ctx) { // airport arrivals hall
      ctx.fillStyle = grad(ctx, 0, HZ, ["#e9eef1", "#f4f6f7", "#d6e4ec"]); ctx.fillRect(0, 0, W, HZ);
      for (let i = 0; i < 6; i++) rect(ctx, 0, 140 + i * 90, W, 10, "rgba(255,255,255,.9)");
      rect(ctx, 0, HZ - 330, W, 300, "#bcd8ea");
      for (let x = 0; x < W; x += 128) rect(ctx, x, HZ - 330, 8, 300, "#8aa1b1");
      for (let x = 64; x < W; x += 512) rect(ctx, x, 0, 60, HZ + 230, "#cfd8dc");
      ctx.fillStyle = grad(ctx, HZ, H, ["#c9cfd3", "#9aa5ac"]); ctx.fillRect(0, HZ, W, HZ);
      for (let x = 0; x < W; x += 256) rect(ctx, x, HZ, 4, HZ, "rgba(255,255,255,.25)");
      [0.08, 0.42, 0.75].forEach((p) => sign(ctx, p * W, 300, 520, 90, "#14324a", "#ffd54f", "GA ĐẾN · ARRIVALS", "Terminal 2 · Quốc tế"));
      const r = rand(3); for (let i = 0; i < 14; i++) { const px = r() * W; if (Math.abs(((px - W / 2 + W) % W) - W / 2) > 0) person(ctx, px, { shirt: ["#8e44ad", "#2980b9", "#d35400", "#7f8c8d"][i % 4], scale: 0.45 + r() * 0.15, hair: "#3b2a20" }); }
    },
    curb(ctx) { // outside arrivals: canopy, road
      ctx.fillStyle = grad(ctx, 0, HZ, ["#7fb3d5", "#d6eaf8"]); ctx.fillRect(0, 0, W, HZ);
      rect(ctx, 0, 0, W, 360, "#5d6d7e"); for (let x = 0; x < W; x += 200) rect(ctx, x, 0, 6, 360, "#4d5d6b");
      for (let x = 100; x < W; x += 600) rect(ctx, x, 300, 70, HZ, "#aab7b8");
      for (let i = 0; i < 18; i++) rect(ctx, (i * 240) % W, HZ - 260 + (i % 3) * 40, 180, 260 - (i % 3) * 40, ["#a9cce3", "#d5dbdb", "#aed6f1"][i % 3]);
      ctx.fillStyle = grad(ctx, HZ, H, ["#7b8a8b", "#4d5656"]); ctx.fillRect(0, HZ, W, HZ);
      rect(ctx, 0, HZ + 60, W, 14, "#f4d03f"); for (let x = 0; x < W; x += 160) rect(ctx, x, HZ + 300, 90, 12, "#ecf0f1");
      const r = rand(9); for (let i = 0; i < 6; i++) car(ctx, r() * W, HZ + 330, 0.9, ["#ecf0f1", "#2e86c1", "#1e8449", "#f4f4f4"][i % 4], i % 2 ? "TAXI" : null);
    },
    street(ctx) { // District 1, Le Loi
      ctx.fillStyle = grad(ctx, 0, HZ, ["#5f9fd6", "#bcdcf0", "#f6efe2"]); ctx.fillRect(0, 0, W, HZ);
      const r = rand(52);
      for (let i = 0; i < 60; i++) { const bx = r() * W, bw = 80 + r() * 90, bh = 120 + r() * 340; wrap(bx, (bx) => { rect(ctx, bx, HZ - bh, bw, bh + 4, ["#9fb2c2", "#b5c3cf", "#8ea0b0"][i % 3]); ctx.fillStyle = "rgba(255,255,255,.4)"; for (let y = HZ - bh + 14; y < HZ - 14; y += 22) for (let xx = bx + 8; xx < bx + bw - 10; xx += 18) ctx.fillRect(xx, y, 8, 10); }); }
      for (let i = 0; i < 40; i++) { const tx = r() * W; wrap(tx, (tx) => { ctx.fillStyle = "#2e7d32"; ctx.beginPath(); ctx.arc(tx, HZ - 120, 70, 0, TAU); ctx.fill(); rect(ctx, tx - 8, HZ - 60, 16, 70, "#5d4037"); }); }
      ctx.fillStyle = grad(ctx, HZ, H, ["#8d8d8a", "#4f4f4d"]); ctx.fillRect(0, HZ, W, HZ);
      rect(ctx, 0, HZ + 20, W, 40, "#b0a999");
      for (let i = 0; i < 70; i++) { const y = HZ + 110 + r() * 200; motorbike(ctx, r() * W, y, 0.45 + (y - HZ) / 900, ["#c0392b", "#2c3e50", "#2980b9", "#f39c12", "#7f8c8d"][i % 5], r() > 0.5 ? 1 : -1); }
    },
    gate(ctx) { BG.street(ctx); },
    station(ctx) { // underground concourse
      ctx.fillStyle = grad(ctx, 0, HZ, ["#dfe6e9", "#f5f6fa"]); ctx.fillRect(0, 0, W, HZ);
      for (let i = 0; i < 5; i++) rect(ctx, 0, 120 + i * 110, W, 14, "rgba(255,255,255,.95)");
      for (let x = 100; x < W; x += 420) rect(ctx, x, 0, 70, HZ + 230, "#c8d6e5");
      rect(ctx, 0, HZ - 360, W, 40, "#e67e22");
      ctx.fillStyle = grad(ctx, HZ, H, ["#d5d8dc", "#aab7b8"]); ctx.fillRect(0, HZ, W, HZ);
      for (let x = 0; x < W; x += 128) rect(ctx, x, HZ, 3, HZ, "rgba(255,255,255,.4)");
      [0.15, 0.62].forEach((p) => sign(ctx, p * W, 330, 520, 90, "#1f3a4d", "#fff", "GA BẾN THÀNH", "Ben Thanh Station · Tuyến số 1"));
      const r = rand(21); for (let i = 0; i < 12; i++) person(ctx, r() * W, { shirt: ["#16a085", "#2980b9", "#c0392b", "#f39c12"][i % 4], scale: 0.45 + r() * 0.2 });
    },
    market(ctx) { // inside Ben Thanh
      ctx.fillStyle = grad(ctx, 0, HZ, ["#3e2f25", "#6d5644", "#a1887f"]); ctx.fillRect(0, 0, W, HZ);
      for (let x = 0; x < W; x += 180) { ctx.strokeStyle = "#2b1f18"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 90, 260); ctx.lineTo(x + 180, 0); ctx.stroke(); }
      const r = rand(77);
      for (let i = 0; i < 40; i++) { const sx = (i * 103) % W; wrap(sx, (sx) => { rect(ctx, sx, HZ - 260, 96, 300, ["#c0392b", "#d68910", "#1e8449", "#7d3c98", "#2e86c1"][i % 5]); for (let k = 0; k < 6; k++) rect(ctx, sx + 8 + (k % 3) * 28, HZ - 240 + Math.floor(k / 3) * 60, 22, 44, ["#f5b7b1", "#f9e79f", "#abebc6", "#d2b4de"][(i + k) % 4]); }); }
      ctx.fillStyle = grad(ctx, HZ, H, ["#9e9e9e", "#616161"]); ctx.fillRect(0, HZ, W, HZ);
      for (let i = 0; i < 16; i++) person(ctx, r() * W, { shirt: ["#ef5350", "#42a5f5", "#66bb6a", "#ffa726"][i % 4], scale: 0.4 + r() * 0.2 });
    },
    cholon(ctx) { // old Chinatown street, afternoon
      ctx.fillStyle = grad(ctx, 0, HZ, ["#f0a95e", "#f8d49b", "#fbe9c8"]); ctx.fillRect(0, 0, W, HZ);
      const r = rand(33);
      for (let i = 0; i < 36; i++) { const hx = i * 114, hh = 260 + (i % 3) * 70; wrap(hx, (hx) => {
        rect(ctx, hx, HZ - hh, 110, hh + 4, ["#e6c27a", "#d9a46c", "#c9d6a3", "#e8b4a0"][i % 4]);
        for (let f = 0; f < 2; f++) { rect(ctx, hx + 10, HZ - hh + 30 + f * 110, 90, 60, "#5d4037"); rect(ctx, hx + 6, HZ - hh + 92 + f * 110, 98, 8, "#8d6e63"); }
        rect(ctx, hx + 12, HZ - 120, 86, 120, "#3e2723");
        if (i % 3 === 0) sign(ctx, hx + 55, HZ - 150, 100, 36, "#b71c1c", "#ffeb3b", ["TẠP HÓA", "THUỐC BẮC", "MÌ VỊT", "TRÀ"][i % 4]);
      }); }
      ctx.fillStyle = grad(ctx, HZ, H, ["#7d7364", "#4e463c"]); ctx.fillRect(0, HZ, W, HZ);
      rect(ctx, 0, HZ + 10, W, 50, "#a1887f");
      for (let i = 0; i < 34; i++) { const y = HZ + 120 + r() * 200; motorbike(ctx, r() * W, y, 0.45 + (y - HZ) / 900, ["#c0392b", "#2c3e50", "#16a085", "#f39c12"][i % 4], r() > 0.5 ? 1 : -1); }
    }
  };

  const cache = {};
  window.paintScene = function (id, scene, state) {
    const key = id + (scene.variant ? scene.variant(state) : "");
    if (cache[key]) return Promise.resolve(cache[key]);
    const ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('800 40px "Be Vietnam Pro"'), document.fonts.load('600 40px "Be Vietnam Pro"')]).catch(() => {}) : Promise.resolve();
    return ready.then(() => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      (BG[scene.bg] || BG.street)(ctx);
      (scene.objects || []).forEach((o) => { if (o.draw && OBJ[o.draw.kind]) OBJ[o.draw.kind](ctx, X(o.yaw), Object.assign({}, o.draw, { open: state && o.draw.openAfter != null && state.time >= o.draw.openAfter })); });
      return new Promise((res) => c.toBlob((b) => res(cache[key] = URL.createObjectURL(b)), "image/jpeg", 0.86));
    });
  };
})();
