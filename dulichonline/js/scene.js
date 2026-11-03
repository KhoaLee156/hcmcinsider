/* Vẽ cảnh 360° minh họa (equirectangular 2:1) khi điểm đến chưa có ảnh thật.
   Mọi hình đều tuần hoàn theo chiều ngang để mép trái nối liền mép phải. */
(function () {
  const W = 4096, H = 2048, HZ = H / 2;
  const TAU = Math.PI * 2;

  // Hàm nhiễu tuần hoàn: tổng các sóng sin có tần số nguyên.
  function wave(x, seed, octaves) {
    let v = 0, amp = 1, total = 0;
    for (let i = 0; i < octaves.length; i++) {
      v += amp * Math.sin(TAU * octaves[i] * x / W + seed * (i + 1) * 1.7);
      total += amp; amp *= 0.55;
    }
    return v / total;
  }
  function rand(seed) { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

  function sky(ctx, top, mid, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, HZ);
    g.addColorStop(0, top); g.addColorStop(0.7, mid); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HZ + 2);
  }
  function sun(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, color); g.addColorStop(0.25, color + "88"); g.addColorStop(1, color + "00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, TAU); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function clouds(ctx, n, color, seed) {
    const r = rand(seed); ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = HZ * (0.25 + r() * 0.5), s = 40 + r() * 70;
      for (let j = 0; j < 5; j++) {
        for (const dx of [0, -W, W]) {
          ctx.beginPath(); ctx.ellipse(x + dx + j * s * 0.8, y - Math.sin(j / 4 * Math.PI) * s * 0.5, s, s * 0.55, 0, 0, TAU); ctx.fill();
        }
      }
    }
  }
  function ridge(ctx, base, height, color, seed, oct) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, base - height * (0.5 + 0.5 * wave(x, seed, oct)));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  function ground(ctx, c1, c2) {
    const g = ctx.createLinearGradient(0, HZ, 0, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, HZ, W, H - HZ);
  }
  function water(ctx, c1, c2, seed) {
    ground(ctx, c1, c2);
    const r = rand(seed); ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3;
    for (let i = 0; i < 260; i++) {
      const y = HZ + 6 + Math.pow(r(), 1.6) * (H - HZ), x = r() * W, l = 10 + (y - HZ) * 0.12;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y); ctx.stroke();
    }
  }
  // Lặp lại hình ở x, x-W, x+W để nối mép liền mạch.
  function wrap(x, fn) { fn(x); if (x < 400) fn(x + W); if (x > W - 400) fn(x - W); }
  function boat(ctx, x, y, s, hull, sail) {
    wrap(x, (x) => {
      ctx.fillStyle = hull; ctx.beginPath();
      ctx.moveTo(x - 60 * s, y); ctx.lineTo(x + 60 * s, y); ctx.lineTo(x + 40 * s, y + 18 * s); ctx.lineTo(x - 40 * s, y + 18 * s); ctx.fill();
      if (sail) {
        ctx.fillStyle = sail; ctx.beginPath();
        ctx.moveTo(x - 4 * s, y - 4 * s); ctx.lineTo(x - 4 * s, y - 90 * s); ctx.quadraticCurveTo(x + 40 * s, y - 50 * s, x + 44 * s, y - 6 * s); ctx.fill();
      }
    });
  }
  function building(ctx, x, w, h, color, windows) {
    wrap(x, (x) => {
      ctx.fillStyle = color; ctx.fillRect(x, HZ - h, w, h + 4);
      if (windows) {
        ctx.fillStyle = windows;
        for (let yy = HZ - h + 14; yy < HZ - 14; yy += 22)
          for (let xx = x + 8; xx < x + w - 10; xx += 18) ctx.fillRect(xx, yy, 8, 10);
      }
    });
  }
  function roofHouse(ctx, x, w, h, wall, roof) {
    wrap(x, (x) => {
      ctx.fillStyle = wall; ctx.fillRect(x, HZ - h, w, h + 4);
      ctx.fillStyle = roof; ctx.beginPath();
      ctx.moveTo(x - 14, HZ - h); ctx.quadraticCurveTo(x + w / 2, HZ - h - 50, x + w + 14, HZ - h); ctx.fill();
      ctx.fillStyle = "rgba(60,30,10,.55)"; ctx.fillRect(x + w * 0.35, HZ - h * 0.55, w * 0.3, h * 0.55);
    });
  }
  function lantern(ctx, x, y, color) {
    wrap(x, (x) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40);
      g.addColorStop(0, color + "aa"); g.addColorStop(1, color + "00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40, 0, TAU); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, 12, 16, 0, 0, TAU); ctx.fill();
    });
  }
  function pine(ctx, x, h, color) {
    wrap(x, (x) => {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(x, HZ - h); ctx.lineTo(x + h * 0.22, HZ + 4); ctx.lineTo(x - h * 0.22, HZ + 4); ctx.fill();
    });
  }
  function palm(ctx, x, h, color) {
    wrap(x, (x) => {
      ctx.strokeStyle = color; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(x, HZ + 30); ctx.quadraticCurveTo(x + 30, HZ - h / 2, x + 20, HZ - h); ctx.stroke();
      ctx.lineWidth = 8;
      for (let a = 0; a < 6; a++) {
        const ang = Math.PI + a * Math.PI / 5;
        ctx.beginPath(); ctx.moveTo(x + 20, HZ - h);
        ctx.quadraticCurveTo(x + 20 + Math.cos(ang) * 60, HZ - h - 30, x + 20 + Math.cos(ang) * 110, HZ - h + 40 + Math.abs(Math.sin(ang)) * 10);
        ctx.stroke();
      }
    });
  }
  function karst(ctx, x, w, h, color) {
    wrap(x, (x) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - w / 2, HZ + 4);
      ctx.bezierCurveTo(x - w / 2, HZ - h * 0.6, x - w * 0.35, HZ - h, x, HZ - h);
      ctx.bezierCurveTo(x + w * 0.35, HZ - h, x + w / 2, HZ - h * 0.6, x + w / 2, HZ + 4); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(x - w / 2, HZ, w, 12);
    });
  }
  function bridge(ctx, x, y, w, color) {
    wrap(x, (x) => {
      ctx.strokeStyle = color; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - 70, x + w, y); ctx.stroke();
      ctx.lineWidth = 5;
      for (let i = 1; i < 10; i++) { const t = i / 10, bx = x + w * t, by = y - 140 * t * (1 - t) - 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 26); ctx.stroke(); }
    });
  }

  const PAINTERS = {
    lake(ctx) {
      sky(ctx, "#6fa8d6", "#bcd9ec", "#f3e9d2"); clouds(ctx, 9, "rgba(255,255,255,.75)", 3);
      for (let i = 0; i < 40; i++) building(ctx, (i * 103) % W, 60 + (i % 5) * 18, 60 + (i * 37) % 110, i % 2 ? "#c9b79c" : "#b49c80", "#7d6a55");
      ridge(ctx, HZ + 6, 50, "#4f7c4a", 7, [6, 13, 29]);
      water(ctx, "#5b8f86", "#2f5d58", 11);
      // Tháp Rùa ở hướng yaw 0 (giữa ảnh)
      const tx = W / 2, ty = HZ + 120;
      ctx.fillStyle = "#3c6b3a"; ctx.beginPath(); ctx.ellipse(tx, ty + 20, 140, 26, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#d8cbb0"; ctx.fillRect(tx - 40, ty - 110, 80, 130); ctx.fillRect(tx - 30, ty - 170, 60, 60); ctx.fillRect(tx - 20, ty - 210, 40, 40);
      ctx.fillStyle = "#6b5a44"; for (const [yy, ww] of [[ty - 110, 100], [ty - 170, 80], [ty - 210, 56]]) ctx.fillRect(tx - ww / 2, yy - 10, ww, 12);
      bridge(ctx, W / 2 + 820, HZ + 90, 420, "#c0392b");
    },
    bay(ctx) {
      sky(ctx, "#79b4d9", "#c8e2ef", "#eaf3f2"); clouds(ctx, 7, "rgba(255,255,255,.8)", 5);
      const r = rand(17);
      for (let i = 0; i < 30; i++) karst(ctx, r() * W, 90 + r() * 160, 80 + r() * 140, "#7d9a95");
      water(ctx, "#4f9a99", "#1f5b62", 13);
      for (let i = 0; i < 22; i++) karst(ctx, r() * W, 160 + r() * 260, 160 + r() * 280, i % 2 ? "#3e6150" : "#4c705b");
      karst(ctx, W / 2 + 228, 90, 260, "#35574a"); karst(ctx, W / 2 + 330, 80, 230, "#35574a");
      for (let i = 0; i < 6; i++) boat(ctx, r() * W, HZ + 110 + r() * 300, 0.8 + r(), "#5a3a22", "#c45a2b");
      boat(ctx, W / 2 - 680, HZ + 260, 1.6, "#4a2e1a", "#b8462a");
    },
    mountain(ctx) {
      sky(ctx, "#8fb5d4", "#d9e6ee", "#f1f1ec"); clouds(ctx, 10, "rgba(255,255,255,.85)", 9);
      ridge(ctx, HZ - 40, 380, "#7b8fa3", 2, [1, 3, 7]);
      ridge(ctx, HZ - 10, 260, "#5d7a6e", 4, [2, 5, 11]);
      ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(0, HZ - 60, W, 80);
      ground(ctx, "#7fa44c", "#3d6326");
      ctx.strokeStyle = "rgba(40,70,20,.45)"; ctx.lineWidth = 4;
      for (let k = 0; k < 40; k++) {
        ctx.beginPath(); const yb = HZ + 20 + k * 26;
        for (let x = 0; x <= W; x += 16) ctx.lineTo(x, yb + 18 * wave(x, k * 0.6, [3, 7]));
        ctx.stroke();
      }
    },
    citadel(ctx) {
      sky(ctx, "#86b3d6", "#d4e4ec", "#f4ead6"); clouds(ctx, 8, "rgba(255,255,255,.8)", 21);
      ridge(ctx, HZ, 90, "#6b8f6a", 8, [2, 5, 9]);
      ground(ctx, "#b8a77f", "#8e7a52");
      ctx.fillStyle = "#7c5a3a"; ctx.fillRect(0, HZ - 60, W, 64);
      const x = W / 2 - 360;
      ctx.fillStyle = "#8a2f25"; ctx.fillRect(x, HZ - 170, 720, 170);
      ctx.fillStyle = "#3b2a20"; for (const dx of [80, 300, 520]) ctx.fillRect(x + dx, HZ - 110, 120, 110);
      for (let t = 0; t < 2; t++) {
        const y = HZ - 170 - t * 90, w = 760 - t * 220, xx = W / 2 - w / 2;
        ctx.fillStyle = "#d9b44a"; ctx.fillRect(xx + 40, y - 60, w - 80, 60);
        ctx.fillStyle = "#c8932b"; ctx.beginPath(); ctx.moveTo(xx, y - 50); ctx.quadraticCurveTo(W / 2, y - 120, xx + w, y - 50); ctx.lineTo(xx + w - 40, y - 30); ctx.lineTo(xx + 40, y - 30); ctx.fill();
      }
      water(ctx, "#6a9fa0", "#3c6c6e", 4); ctx.globalAlpha = 1;
      ctx.fillStyle = "#b8a77f"; ctx.fillRect(W / 2 - 900, HZ, 1800, H);
      boat(ctx, W / 4 - 100, HZ + 160, 1.4, "#a33a2a", null);
    },
    oldtown(ctx) {
      sky(ctx, "#2d2a5a", "#c86a4a", "#f1b46b"); sun(ctx, W * 0.15, HZ - 60, 40, "#ffd59a");
      const r = rand(31);
      for (let i = 0; i < 40; i++) roofHouse(ctx, i * 104, 96, 120 + r() * 60, "#e8b94a", "#7a3b22");
      ground(ctx, "#6c5340", "#2c2620");
      for (let i = 0; i < 70; i++) lantern(ctx, r() * W, HZ - 220 - r() * 260, ["#e74c3c", "#f39c12", "#e84393", "#f1c40f"][i % 4]);
      // Chùa Cầu ở yaw 0
      const x = W / 2 - 200, y = HZ + 40;
      ctx.fillStyle = "#8b5a34"; ctx.fillRect(x, y - 110, 400, 110);
      ctx.fillStyle = "#5b2c1a"; ctx.beginPath(); ctx.moveTo(x - 40, y - 110); ctx.quadraticCurveTo(x + 200, y - 210, x + 440, y - 110); ctx.fill();
      ctx.fillStyle = "#3a2618"; ctx.fillRect(x + 160, y - 80, 80, 80);
      water(ctx, "#33465e", "#141c28", 33);
      ctx.globalAlpha = 0.9; for (let i = 0; i < 40; i++) lantern(ctx, r() * W, HZ + 200 + r() * 500, "#f8c471"); ctx.globalAlpha = 1;
    },
    highland(ctx) {
      sky(ctx, "#a4c3dd", "#e3ecf1", "#f7f2ea"); clouds(ctx, 9, "rgba(255,255,255,.85)", 41);
      ridge(ctx, HZ - 10, 200, "#6f8c86", 6, [2, 4, 9]);
      ridge(ctx, HZ + 10, 110, "#4d6e55", 12, [3, 8, 17]);
      for (let i = 0; i < 120; i++) pine(ctx, (i * 37.3) % W, 110 + (i * 53) % 120, "#24432f");
      water(ctx, "#7fa7b8", "#43697a", 43);
      const r = rand(44);
      ctx.fillStyle = "#3d5a35"; ctx.fillRect(0, H * 0.82, W, H);
      for (let i = 0; i < 300; i++) { ctx.fillStyle = ["#f4a6c1", "#f7e36b", "#c39bd3", "#ffffff"][i % 4]; ctx.beginPath(); ctx.arc(r() * W, H * 0.83 + r() * 120, 6 + r() * 6, 0, TAU); ctx.fill(); }
    },
    city(ctx) {
      sky(ctx, "#5f9fd6", "#bcdcf0", "#f6efe2"); clouds(ctx, 8, "rgba(255,255,255,.8)", 51);
      const r = rand(52);
      for (let i = 0; i < 70; i++) building(ctx, r() * W, 80 + r() * 90, 120 + r() * 320, ["#9fb2c2", "#b5c3cf", "#8ea0b0"][i % 3], "rgba(255,255,255,.4)");
      // Bitexco ở yaw ~110
      const bx = W / 2 + W * 110 / 360;
      ctx.fillStyle = "#6f8899"; ctx.beginPath(); ctx.moveTo(bx - 60, HZ); ctx.lineTo(bx - 40, HZ - 620); ctx.lineTo(bx + 40, HZ - 560); ctx.lineTo(bx + 60, HZ); ctx.fill();
      ctx.fillStyle = "#4e6371"; ctx.fillRect(bx - 60, HZ - 470, 70, 16);
      for (let i = 0; i < 20; i++) building(ctx, r() * W, 120 + r() * 60, 80 + r() * 90, ["#e2c79a", "#d8a46d", "#c9d5b5"][i % 3], "rgba(60,40,20,.35)");
      // Chợ Bến Thành ở yaw 0
      const x = W / 2 - 320;
      ctx.fillStyle = "#e8d5a8"; ctx.fillRect(x, HZ - 160, 640, 170);
      ctx.fillStyle = "#9a3a2a"; ctx.beginPath(); ctx.moveTo(x - 20, HZ - 160); ctx.lineTo(W / 2, HZ - 230); ctx.lineTo(x + 660, HZ - 160); ctx.fill();
      ctx.fillStyle = "#e8d5a8"; ctx.fillRect(W / 2 - 50, HZ - 360, 100, 200);
      ctx.fillStyle = "#9a3a2a"; ctx.beginPath(); ctx.moveTo(W / 2 - 64, HZ - 360); ctx.lineTo(W / 2, HZ - 420); ctx.lineTo(W / 2 + 64, HZ - 360); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(W / 2, HZ - 300, 32, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#333"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(W / 2, HZ - 300); ctx.lineTo(W / 2, HZ - 322); ctx.moveTo(W / 2, HZ - 300); ctx.lineTo(W / 2 + 16, HZ - 300); ctx.stroke();
      ctx.fillStyle = "#4a3426"; for (const dx of [60, 270, 480]) ctx.fillRect(x + dx, HZ - 90, 100, 100);
      ground(ctx, "#8d8d8a", "#4f4f4d");
      ctx.fillStyle = "#f2f2f2"; for (let i = 0; i < 60; i++) ctx.fillRect(i * 70, HZ + 260, 40, 10);
      for (let i = 0; i < 90; i++) { // xe máy
        const mx = r() * W, my = HZ + 100 + r() * 600, s = 0.6 + (my - HZ) / 600;
        wrap(mx, (mx) => { ctx.fillStyle = ["#c0392b", "#2c3e50", "#2980b9", "#f39c12"][i % 4]; ctx.fillRect(mx - 30 * s, my - 22 * s, 60 * s, 16 * s); ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(mx - 22 * s, my, 10 * s, 0, TAU); ctx.arc(mx + 22 * s, my, 10 * s, 0, TAU); ctx.fill(); ctx.fillStyle = "#f5cba7"; ctx.beginPath(); ctx.arc(mx, my - 40 * s, 10 * s, 0, TAU); ctx.fill(); });
      }
    },
    river(ctx) {
      sky(ctx, "#f2a65a", "#f8d49b", "#fbe9c8"); sun(ctx, W / 2 + 300, HZ - 120, 46, "#fff1c9");
      ridge(ctx, HZ + 4, 60, "#3f6b38", 61, [5, 11, 23]);
      for (let i = 0; i < 60; i++) palm(ctx, (i * 71.7) % W, 120 + (i * 29) % 80, "#2f4f2a");
      water(ctx, "#a07a4f", "#5c4128", 62);
      const r = rand(63);
      for (let i = 0; i < 26; i++) {
        const bx = r() * W, by = HZ + 80 + r() * 520, s = 0.7 + (by - HZ) / 420;
        boat(ctx, bx, by, s, "#3d2a1c", null);
        wrap(bx, (bx) => { ctx.strokeStyle = "#5a4330"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 150 * s); ctx.stroke();
          ctx.fillStyle = ["#7cb342", "#ff9800", "#ffeb3b", "#8d6e63"][i % 4]; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(bx + (k % 2 ? 9 : -9) * s, by - 140 * s + k * 12 * s, 9 * s, 0, TAU); ctx.fill(); } });
      }
    },
    beach(ctx) {
      sky(ctx, "#3b3f78", "#e0705a", "#f9c27a"); sun(ctx, W / 2, HZ - 30, 70, "#ffe0a3");
      ctx.fillStyle = "#2f7f8f"; ctx.fillRect(0, HZ, W, 200);
      const g = ctx.createLinearGradient(0, HZ, 0, HZ + 200); g.addColorStop(0, "#e0806a"); g.addColorStop(1, "#2c6f80");
      ctx.fillStyle = g; ctx.fillRect(0, HZ, W, 200);
      ctx.fillStyle = "rgba(255,220,160,.5)"; ctx.fillRect(W / 2 - 30, HZ + 4, 60, 190);
      ctx.fillStyle = "#e9d2a7"; ctx.fillRect(0, HZ + 200, W, H);
      const sg = ctx.createLinearGradient(0, HZ + 200, 0, H); sg.addColorStop(0, "#f1dcb1"); sg.addColorStop(1, "#c9a978");
      ctx.fillStyle = sg; ctx.fillRect(0, HZ + 200, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 6; ctx.beginPath();
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, HZ + 200 + 12 * wave(x, 2, [9, 19]));
      ctx.stroke();
      for (let i = 0; i < 18; i++) palm(ctx, W / 2 + 1100 + i * 110 + (i % 3) * 20, 260 + (i % 4) * 50, "#1e3326");
      boat(ctx, W / 2 - 500, HZ + 60, 1.1, "#222", "#333");
    },
    market(ctx) { PAINTERS.city(ctx); }
  };

  const cache = {};
  window.paintScene = function (kind) {
    if (cache[kind]) return Promise.resolve(cache[kind]);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    (PAINTERS[kind] || PAINTERS.lake)(ctx);
    return new Promise((res) => c.toBlob((b) => res(cache[kind] = URL.createObjectURL(b)), "image/jpeg", 0.85));
  };
})();
