/* Dinner Crown · La città — mini gioco top-down (canvas). Espone window.DCCity */
(function () {
  "use strict";
  const T = 48;                       // px per tile (css)
  const SPEED = 4.2;                  // tile al secondo
  const COINS_PER_DAY = 8;            // monete attive al giorno per persona

  /* ---------- utils ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function grid(w, h, v) { return Array.from({ length: h }, () => Array(w).fill(v)); }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function shade(hex, p) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = (c) => clamp(Math.round(p < 0 ? c * (1 + p) : c + (255 - c) * p), 0, 255); return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }

  /* ---------- buildings ---------- */
  const B = {
    pizzeria:   { name: "Pizzeria",     icon: "🍕", wall: "#FFE3C2", roof: "#C0392B", job: "pizzeria" },
    serra:      { name: "Serra",        icon: "🌱", wall: "#DDF6E4", roof: "#4FAE5C", job: "serra" },
    lavanderia: { name: "Lavanderia",   icon: "🧺", wall: "#E2F1FF", roof: "#4C7FE0", job: "lavanderia" },
    casa:       { name: "Casa",         icon: "🏠", wall: "#FFF1DC", roof: "#E5412F", home: true },
    market:     { name: "Supermercato", icon: "🛒", wall: "#FFFFFF", roof: "#2E9D5B", shop: true },
    officina:   { name: "Officina",     icon: "🔧", wall: "#E6E8EC", roof: "#5F6773", job: "officina" },
    biblioteca: { name: "Biblioteca",   icon: "📚", wall: "#F2E8FF", roof: "#8559CF", job: "biblioteca" },
    boutique:   { name: "Boutique",     icon: "👗", wall: "#FFE6F0", roof: "#E86A9A", boutique: true },
    gelateria:  { name: "Gelateria",    icon: "🍦", wall: "#FFF4E0", roof: "#3FB7B7", job: "gelateria" },
    lunapark:   { name: "Luna Park",    icon: "🎡", wall: "#FFF0F6", roof: "#9B59D0", job: "lunapark" },
    porto:      { name: "Porto",        icon: "⚓", wall: "#EAF4FF", roof: "#2F6FB3", job: "porto" }
  };
  const LOCKS = { gelateria: { x: 34, y: 0, w: 9, h: 9 }, lunapark: { x: 34, y: 11, w: 9, h: 8 }, porto: { x: 34, y: 21, w: 9, h: 7 } };

  /* ---------- city map ---------- */
  function buildCity() {
    const W = 43, H = 28, g = grid(W, H, "G"), solid = grid(W, H, false);
    const fill = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (j >= 0 && j < H && i >= 0 && i < W) g[j][i] = t; };
    fill(0, 9, W, 2, "R"); fill(0, 19, W, 2, "R"); fill(10, 0, 2, H, "R"); fill(21, 0, 2, H, "R"); fill(32, 0, 2, H, "R");
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (g[j][i] === "R") continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g[j + b] && g[j + b][i + a] === "R");
      if (nb) g[j][i] = "S";
    }
    fill(12, 21, 9, 7, "P");                       // piazza
    fill(1, 12, 8, 6, "C");                        // campo da calcio
    fill(13, 4, 4, 3, "W");                        // laghetto
    fill(12, 0, 9, 1, "F"); fill(13, 7, 3, 1, "F"); fill(19, 5, 1, 3, "F"); fill(14, 17, 5, 1, "F");
    fill(2, 6, 5, 1, "F"); fill(25, 6, 4, 1, "F"); fill(25, 26, 4, 1, "F");
    fill(40, 21, 3, 7, "W"); fill(39, 21, 1, 7, "B"); fill(36, 6, 4, 1, "F");
    const blds = [
      { k: "pizzeria", x: 2, y: 2, w: 6, h: 4 }, { k: "serra", x: 17, y: 1, w: 3, h: 3 }, { k: "lavanderia", x: 24, y: 2, w: 6, h: 4 },
      { k: "casa", x: 13, y: 12, w: 7, h: 5 }, { k: "market", x: 24, y: 12, w: 7, h: 5 },
      { k: "officina", x: 2, y: 22, w: 6, h: 4 }, { k: "biblioteca", x: 24, y: 22, w: 6, h: 4 },
      { k: "boutique", x: 18, y: 21, w: 3, h: 3 },
      { k: "gelateria", x: 35, y: 2, w: 6, h: 4, lock: "gelateria" }, { k: "lunapark", x: 35, y: 12, w: 7, h: 5, lock: "lunapark" }, { k: "porto", x: 35, y: 22, w: 4, h: 4, lock: "porto" }
    ];
    const doors = [];
    blds.forEach((b) => {
      b.def = B[b.k]; b.dx = b.x + Math.floor(b.w / 2); b.dy = b.y + b.h - 1;
      for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) solid[j][i] = true;
      solid[b.dy][b.dx] = false; doors.push(b);
    });
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (g[j][i] === "W") solid[j][i] = true;
    const trees = [[12, 1], [12, 3], [12, 6], [16, 2], [20, 4], [20, 7], [17, 7], [13, 8 - 1], [0, 0], [0, 2], [0, 4], [9, 0], [9, 3], [23, 0], [31, 0], [31, 4], [23, 7],
      [0, 11], [9, 11], [0, 18], [9, 18], [12, 11], [20, 11], [12, 15], [20, 15], [23, 11], [31, 11], [31, 18], [23, 18],
      [0, 21], [0, 27], [9, 21], [9, 27], [12, 27], [20, 27], [23, 21], [31, 21], [31, 27], [23, 27], [35, 7], [41, 7], [42, 0], [35, 17], [42, 13], [42, 17]]
      .filter(([x, y]) => g[y][x] !== "R" && g[y][x] !== "S" && !solid[y][x]);
    trees.forEach(([x, y]) => { solid[y][x] = true; });
    const props = [
      { t: "fountain", x: 15, y: 23, w: 3, h: 3 }, { t: "bench", x: 13, y: 22 }, { t: "bench", x: 14, y: 26 }, { t: "bench", x: 14, y: 3 },
      { t: "lamp", x: 12, y: 24 }, { t: "lamp", x: 20, y: 25 }, { t: "goalL", x: 1, y: 14 }, { t: "goalR", x: 8, y: 14 },
      { t: "bush", x: 1, y: 7 }, { t: "bush", x: 8, y: 7 }, { t: "bush", x: 13, y: 18 }, { t: "bush", x: 19, y: 18 }, { t: "bush", x: 30, y: 7 }, { t: "bush", x: 24, y: 18 }
    ];
    props.forEach((p) => { if (p.t === "lamp" || p.t === "goalL" || p.t === "goalR") return; for (let j = p.y; j < p.y + (p.h || 1); j++) for (let i = p.x; i < p.x + (p.w || 1); i++) solid[j][i] = true; });
    const coinSpots = [[13, 1], [19, 7], [8, 1], [30, 1], [2, 17], [7, 12], [13, 17], [20, 13], [31, 16], [13, 26], [20, 26], [1, 26], [30, 26], [16, 8], [27, 10], [11, 24]];
    const friends = [[5, 7], [18, 18], [27, 18], [15, 21], [4, 18], [27, 7], [4, 26], [27, 26], [16, 9]];
    const walkers = [{ a: [2, 9.6], b: [41, 9.6] }, { a: [10.6, 1], b: [10.6, 27] }, { a: [21.6, 27], b: [21.6, 1] }, { a: [41, 19.6], b: [1, 19.6] }, { a: [32.6, 1], b: [32.6, 27] }];
    const secretSpots = [[1, 1], [19, 4], [8, 26], [29, 17], [16, 27], [24, 27], [2, 12]];
    return { id: "city", name: "Città", W, H, g, solid, doors, trees, props, coinSpots, friends, walkers, secretSpots, spawn: [16.5, 17.7] };
  }

  /* ---------- home interior ---------- */
  function buildHome() {
    const W = 12, H = 10, g = grid(W, H, "O"), solid = grid(W, H, false);
    for (let i = 0; i < W; i++) { g[0][i] = "X"; g[1][i] = "X"; g[H - 1][i] = "X"; solid[0][i] = solid[1][i] = solid[H - 1][i] = true; }
    for (let j = 0; j < H; j++) { g[j][0] = "X"; g[j][W - 1] = "X"; solid[j][0] = solid[j][W - 1] = true; }
    g[H - 1][6] = "D"; solid[H - 1][6] = false;
    fill2(solid, 1, 2, 4, 1); fill2(solid, 5, 2, 1, 1);           // cucina + frigo
    fill2(solid, 8, 2, 1, 1); fill2(solid, 9, 2, 2, 2);           // cesta giochi + letto
    fill2(solid, 4, 5, 4, 2);                                     // tavolo
    fill2(solid, 1, 6, 1, 2);                                     // pianta/libreria
    fill2(solid, 10, 6, 1, 2);                                    // divano
    const spots = [
      { x: 2, y: 3, label: "Lava i piatti", job: "cucina" },
      { x: 5, y: 3, label: "Leggi la lista della spesa", list: true },
      { x: 8, y: 3, label: "Metti in ordine i giochi", job: "cameretta" }
    ];
    return { id: "home", name: "Casa", W, H, g, solid, doors: [{ exit: true, dx: 6, dy: H - 1 }], spots, trees: [], props: [], coinSpots: [], friends: [], walkers: [], spawn: [6.5, 7.9] };
  }
  function fill2(s, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) s[j][i] = true; }

  /* ---------- painting static layers ---------- */
  function paint(map, dpr, ev) {
    dpr = Math.min(1.5, dpr);
    const cv = document.createElement("canvas"); cv.width = map.W * T * dpr; cv.height = map.H * T * dpr;
    const c = cv.getContext("2d"); c.scale(dpr, dpr);
    const R = rng(hash(map.id));
    if (map.id === "city") { paintCity(c, map, R); paintEvent(c, map, ev); } else paintHome(c, map, ev);
    return cv;
  }
  function paintEvent(c, m, ev) {
    if (ev === "halloween") {
      m.doors.forEach((b) => { em(c, "🎃", (b.dx - .55) * T, (b.dy + 1.25) * T, 24); em(c, "🎃", (b.dx + 1.55) * T, (b.dy + 1.25) * T, 20); });
      [[12, 1], [16, 2], [0, 4], [23, 11]].forEach(([x, y]) => em(c, "🕸️", x * T + T * .5, y * T + T * .3, 22));
      em(c, "👻", 3.5 * T, 15 * T, 30); em(c, "🧙", 16.5 * T, 26.4 * T, 26);
    } else if (ev === "natale") {
      m.doors.forEach((b) => { c.fillStyle = "#fff"; rr(c, b.x * T - 6, b.y * T - 6, b.w * T + 12, 14, 7); c.fill(); for (let k = 0; k < b.w * 2; k++) { c.beginPath(); c.arc(b.x * T + k * T / 2 + 12, b.y * T + 8, 6, 0, 7); c.fill(); } });
      em(c, "🎄", 13.5 * T, 24 * T, 46); em(c, "⛄", 4.5 * T, 15 * T, 34); em(c, "🎁", 14.3 * T, 24.6 * T, 18);
    } else if (ev === "estate") {
      em(c, "⛱️", 39.5 * T, 22.5 * T, 30); em(c, "🏖️", 39.5 * T, 26 * T, 26); em(c, "🍉", 14.5 * T, 26.6 * T, 22);
    }
  }
  function paintCity(c, m, R) {
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
      const t = m.g[j][i], x = i * T, y = j * T;
      if (t === "G" || t === "F") {
        c.fillStyle = (i + j) % 2 ? "#92D585" : "#8ACF7D"; c.fillRect(x, y, T, T);
        c.strokeStyle = "#76BD68"; c.lineWidth = 2; c.lineCap = "round";
        for (let k = 0; k < 2; k++) { const tx = x + 8 + R() * (T - 16), ty = y + 10 + R() * (T - 18); c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx - 2, ty - 5); c.moveTo(tx + 3, ty); c.lineTo(tx + 4, ty - 5); c.stroke(); }
        if (t === "F") { const cols = ["#FF8FA8", "#FFD54A", "#FFFFFF", "#C79BFF"]; for (let k = 0; k < 5; k++) { const fx = x + 6 + R() * (T - 12), fy = y + 6 + R() * (T - 12); c.fillStyle = cols[(R() * 4) | 0]; c.beginPath(); c.arc(fx, fy, 3.4, 0, 7); c.fill(); c.fillStyle = "#FFB21E"; c.beginPath(); c.arc(fx, fy, 1.3, 0, 7); c.fill(); } }
      } else if (t === "R") { c.fillStyle = "#5E6573"; c.fillRect(x, y, T, T); }
      else if (t === "S") { c.fillStyle = "#ECE3D4"; c.fillRect(x, y, T, T); c.strokeStyle = "#D9CDB9"; c.lineWidth = 1.5; c.strokeRect(x + .75, y + .75, T / 2, T / 2); c.strokeRect(x + T / 2 + .75, y + T / 2 + .75, T / 2 - 1.5, T / 2 - 1.5); }
      else if (t === "P") { c.fillStyle = (i + j) % 2 ? "#F3DDBB" : "#EDD3AC"; c.fillRect(x, y, T, T); c.strokeStyle = "rgba(160,110,60,.18)"; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, T - 1, T - 1); }
      else if (t === "C") { c.fillStyle = Math.floor(i / 1) % 2 ? "#6CC160" : "#63B757"; c.fillRect(x, y, T, T); }
      else if (t === "W") { c.fillStyle = "#62C2EE"; c.fillRect(x, y, T, T); }
      else if (t === "B") { c.fillStyle = "#F4DE9E"; c.fillRect(x, y, T, T); c.fillStyle = "rgba(200,160,80,.35)"; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + 8 + R() * (T - 16), y + 8 + R() * (T - 16), 2, 0, 7); c.fill(); } }
    }
    // mare del porto
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 3; for (let k = 0; k < 10; k++) { const wx = 40.2 * T + R() * 2.4 * T, wy = 21.3 * T + R() * 6.4 * T; c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + 8, wy - 5, wx + 16, wy); c.stroke(); }
    em(c, "⛵", 41.4 * T, 23.2 * T, 34); em(c, "🚤", 41.2 * T, 26.2 * T, 26);
    c.fillStyle = "#A8743E"; c.fillRect(39 * T, 24.35 * T, 2.6 * T, .5 * T); c.strokeStyle = "#7E5329"; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(39 * T + k * 20, 24.35 * T); c.lineTo(39 * T + k * 20, 24.85 * T); c.stroke(); }
    // laghetto bordi e riflessi
    c.strokeStyle = "#D8CDB6"; c.lineWidth = 5; rr(c, 13 * T + 2, 4 * T + 2, 4 * T - 4, 3 * T - 4, 18); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 3; for (let k = 0; k < 6; k++) { const wx = 13.4 * T + R() * 3 * T, wy = 4.5 * T + R() * 2 * T; c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + 8, wy - 5, wx + 16, wy); c.stroke(); }
    c.font = "26px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("🦆", 15.8 * T, 5.4 * T);
    // campo: linee
    c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 3; c.strokeRect(1 * T + 6, 12 * T + 6, 8 * T - 12, 6 * T - 12);
    c.beginPath(); c.moveTo(5 * T, 12 * T + 6); c.lineTo(5 * T, 18 * T - 6); c.stroke(); c.beginPath(); c.arc(5 * T, 15 * T, T * .9, 0, 7); c.stroke();
    // strisce stradali
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 3; c.setLineDash([14, 14]);
    [10, 20].forEach((row) => { c.beginPath(); c.moveTo(0, row * T); c.lineTo(m.W * T, row * T); c.stroke(); });
    [11, 22, 33].forEach((col) => { c.beginPath(); c.moveTo(col * T, 0); c.lineTo(col * T, m.H * T); c.stroke(); });
    c.setLineDash([]);
    // incroci
    [[10, 9], [21, 9], [10, 19], [21, 19], [32, 9], [32, 19]].forEach(([x, y]) => { c.fillStyle = "#5E6573"; c.fillRect(x * T, y * T, 2 * T, 2 * T); c.fillStyle = "rgba(255,255,255,.9)"; for (let k = 0; k < 4; k++) { c.fillRect(x * T - 10, y * T + 6 + k * 23, 8, 14); c.fillRect((x + 2) * T + 2, y * T + 6 + k * 23, 8, 14); c.fillRect(x * T + 6 + k * 23, y * T - 10, 14, 8); c.fillRect(x * T + 6 + k * 23, (y + 2) * T + 2, 14, 8); } });
    // props
    m.props.forEach((p) => drawProp(c, p));
    m.trees.forEach(([x, y]) => drawTree(c, x * T, y * T, R));
    m.doors.forEach((b) => drawBuilding(c, b));
  }
  function drawTree(c, x, y, R) {
    c.fillStyle = "rgba(40,80,30,.25)"; c.beginPath(); c.ellipse(x + T / 2, y + T * .86, T * .38, T * .12, 0, 0, 7); c.fill();
    c.fillStyle = "#8A5A35"; rr(c, x + T * .42, y + T * .55, T * .16, T * .32, 4); c.fill();
    const g = c.createRadialGradient(x + T * .4, y + T * .25, 4, x + T / 2, y + T * .38, T * .5);
    g.addColorStop(0, "#7BD06A"); g.addColorStop(1, "#3E9A47");
    c.fillStyle = g; c.beginPath(); c.arc(x + T * .5, y + T * .36, T * .4, 0, 7); c.arc(x + T * .3, y + T * .48, T * .24, 0, 7); c.arc(x + T * .7, y + T * .48, T * .24, 0, 7); c.fill();
    if (R() < .4) { c.fillStyle = "#FF5A4E"; [[.35, .3], [.62, .42], [.48, .55]].forEach(([a, b]) => { c.beginPath(); c.arc(x + T * a, y + T * b, 3.2, 0, 7); c.fill(); }); }
  }
  function drawProp(c, p) {
    const x = p.x * T, y = p.y * T;
    if (p.t === "fountain") {
      const cx = x + p.w * T / 2, cy = y + p.h * T / 2;
      c.fillStyle = "#C9BBA4"; c.beginPath(); c.arc(cx, cy, T * 1.45, 0, 7); c.fill();
      c.fillStyle = "#62C2EE"; c.beginPath(); c.arc(cx, cy, T * 1.2, 0, 7); c.fill();
      c.fillStyle = "#E6DCC9"; c.beginPath(); c.arc(cx, cy, T * .42, 0, 7); c.fill();
      c.fillStyle = "#9BE0FF"; c.beginPath(); c.arc(cx, cy - 6, T * .22, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = 3; [0.75, 0.95].forEach((r) => { c.beginPath(); c.arc(cx, cy, T * r, 3.6, 5.2); c.stroke(); });
    } else if (p.t === "bench") {
      c.fillStyle = "rgba(0,0,0,.15)"; c.fillRect(x + 4, y + T * .7, T - 8, 6);
      c.fillStyle = "#B4703E"; rr(c, x + 4, y + T * .3, T - 8, T * .18, 4); c.fill(); rr(c, x + 4, y + T * .52, T - 8, T * .16, 4); c.fill();
      c.fillStyle = "#5A4030"; c.fillRect(x + 8, y + T * .66, 4, 10); c.fillRect(x + T - 12, y + T * .66, 4, 10);
    } else if (p.t === "lamp") {
      c.fillStyle = "#3D4350"; c.fillRect(x + T / 2 - 2, y + 4, 4, T * .8); c.fillStyle = "#FFE08A"; c.beginPath(); c.arc(x + T / 2, y + 6, 7, 0, 7); c.fill();
    } else if (p.t === "goalL" || p.t === "goalR") {
      c.strokeStyle = "#fff"; c.lineWidth = 4; const gx = p.t === "goalL" ? x + 6 : x + T - 6;
      c.beginPath(); c.moveTo(gx, y); c.lineTo(gx, y + T * 2); c.stroke();
      c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(gx, y + k * T / 3); c.lineTo(gx + (p.t === "goalL" ? -6 : 6), y + k * T / 3); c.stroke(); }
      if (p.t === "goalL") { c.font = "22px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("⚽", x + T * 2.4, y + T * 1.1); }
    } else if (p.t === "bush") {
      c.fillStyle = "#4FA552"; c.beginPath(); c.arc(x + T * .32, y + T * .58, T * .26, 0, 7); c.arc(x + T * .62, y + T * .52, T * .3, 0, 7); c.arc(x + T * .5, y + T * .7, T * .26, 0, 7); c.fill();
      c.fillStyle = "#FF8FA8"; [[.4, .5], [.66, .44], [.55, .7]].forEach(([a, b]) => { c.beginPath(); c.arc(x + T * a, y + T * b, 3, 0, 7); c.fill(); });
    }
  }
  function drawBuilding(c, b) {
    const d = b.def, x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
    const roofH = Math.round(h * .46);
    c.fillStyle = "rgba(40,30,20,.22)"; rr(c, x + 6, y + 10, w, h, 10); c.fill();
    // muri
    c.fillStyle = d.wall; rr(c, x + 2, y + roofH - 6, w - 4, h - roofH + 4, 6); c.fill();
    c.strokeStyle = shade(d.wall, -.12); c.lineWidth = 2; c.stroke();
    // finestre
    const wy = y + roofH + 10, wh = Math.min(T * .6, h - roofH - 26);
    for (let i = 0; i < b.w; i++) {
      if (b.x + i === b.dx || Math.abs(b.x + i - b.dx) === 1 && b.w <= 3) continue;
      const wx = x + i * T + 8;
      c.fillStyle = "#fff"; rr(c, wx - 2, wy - 2, T - 12, wh + 4, 6); c.fill();
      c.fillStyle = "#9FD7FF"; rr(c, wx, wy, T - 16, wh, 4); c.fill();
      c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(wx + 4, wy + 3, 5, wh - 6);
      if (d.shop) { c.font = "16px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(["🍎", "🥖", "🧀", "🥕", "🍅", "🥛", "🍋"][(b.x + i) % 7], wx + (T - 16) / 2, wy + wh / 2 + 1); }
    }
    // tetto
    c.fillStyle = d.roof; rr(c, x - 6, y, w + 12, roofH, 10); c.fill();
    if (d.shop) { const st = 16; for (let k = 0; k * st < w + 12; k++) if (k % 2) { c.fillStyle = "#fff"; c.fillRect(x - 6 + k * st, y + roofH * .55, st, roofH * .45); } c.fillStyle = d.roof; for (let k = 0; k * st < w + 12; k++) { c.beginPath(); c.arc(x - 6 + k * st + st / 2, y + roofH, st / 2, 0, Math.PI); c.fillStyle = k % 2 ? "#fff" : d.roof; c.fill(); } }
    else { c.strokeStyle = shade(d.roof, -.18); c.lineWidth = 2; for (let k = 1; k < 4; k++) { const ly = y + roofH * k / 4; c.beginPath(); c.moveTo(x - 4, ly); c.lineTo(x + w + 4, ly); c.stroke(); } }
    c.fillStyle = "rgba(255,255,255,.22)"; rr(c, x - 6, y, w + 12, 8, 6); c.fill();
    if (d.home) { c.fillStyle = "#B4532F"; c.fillRect(x + w - T * 1.4, y - T * .45, T * .45, T * .6); }
    if (d.job === "lunapark") { const cx = x + w * .78, cy = y - T * .3; c.strokeStyle = "#E86A9A"; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, T * 1.15, 0, 7); c.stroke(); c.lineWidth = 2; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * T * 1.15, cy + Math.sin(a) * T * 1.15); c.stroke(); c.fillStyle = ["#FFD23F", "#5CC8FF", "#FF6F91", "#7BD06A"][k % 4]; c.beginPath(); c.arc(cx + Math.cos(a) * T * 1.15, cy + Math.sin(a) * T * 1.15, 7, 0, 7); c.fill(); } em(c, "🎪", x + T * .9, y - T * .1, 34); }
    if (d.job === "gelateria") em(c, "🍦", x + w - T * .7, y - T * .2, 40);
    if (d.boutique) { em(c, "🎀", x + w / 2, y + 6, 22); }
    if (d.job === "serra") { c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2; for (let k = 1; k < b.w * 2; k++) { c.beginPath(); c.moveTo(x - 6 + k * T / 2, y + 2); c.lineTo(x - 6 + k * T / 2, y + roofH - 2); c.stroke(); } }
    // porta
    const dx = b.dx * T, dy = b.dy * T;
    c.fillStyle = "#7A4A2A"; rr(c, dx + 9, dy + 6, T - 18, T - 6, 8); c.fill();
    c.fillStyle = "#5C3620"; c.fillRect(dx + 9, dy + T - 6, T - 18, 6);
    c.fillStyle = "#FFD54A"; c.beginPath(); c.arc(dx + T - 15, dy + T * .58, 2.6, 0, 7); c.fill();
    c.fillStyle = "#E8DCC8"; c.fillRect(dx + 4, dy + T - 3, T - 8, 5);
    // insegna
    c.font = "800 13px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const label = d.icon + " " + d.name, tw = c.measureText(label).width + 22, sx = x + w / 2 - tw / 2, sy = y + roofH - 14;
    c.fillStyle = "rgba(58,26,31,.18)"; rr(c, sx + 2, sy + 3, tw, 26, 13); c.fill();
    c.fillStyle = "#fff"; rr(c, sx, sy, tw, 26, 13); c.fill();
    c.fillStyle = "#3A1A1F"; c.fillText(label, x + w / 2, sy + 14);
  }
  function paintHome(c, m, ev) {
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
      const x = i * T, y = j * T, t = m.g[j][i];
      if (t === "O") { c.fillStyle = (i % 2) ? "#E6B482" : "#DDA874"; c.fillRect(x, y, T, T); c.strokeStyle = "rgba(120,70,30,.18)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + ((i * 17) % T)); c.lineTo(x + T, y + ((i * 17) % T)); c.stroke(); }
      else { c.fillStyle = "#7E4A33"; c.fillRect(x, y, T, T); }
    }
    // carta da parati
    c.fillStyle = "#FFE7D6"; c.fillRect(T, 0, (m.W - 2) * T, 2 * T - 6);
    c.fillStyle = "rgba(229,65,47,.15)"; for (let i = 1; i < m.W - 1; i++) for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(i * T + T / 2, 12 + k * 30, 4, 0, 7); c.fill(); }
    c.fillStyle = "#C98B5A"; c.fillRect(T, 2 * T - 8, (m.W - 2) * T, 8);
    // finestre
    [[3, 0], [7, 0]].forEach(([i]) => { c.fillStyle = "#fff"; rr(c, i * T + 4, 14, T * 1.6, T * .95, 8); c.fill(); c.fillStyle = "#9BD8FF"; rr(c, i * T + 9, 19, T * 1.6 - 10, T * .95 - 10, 5); c.fill(); c.fillStyle = "#FF8FA8"; c.fillRect(i * T + 2, 12, 10, T); c.fillRect(i * T + T * 1.6 - 4, 12, 10, T); });
    // tappeto
    c.fillStyle = "#E5412F"; rr(c, 3.4 * T, 4.4 * T, 5.2 * T, 3.2 * T, 18); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)"; for (let k = 0; k < 6; k++) { c.fillRect(3.6 * T + k * 0.85 * T, 4.6 * T, 0.4 * T, 2.8 * T); }
    // cucina
    c.fillStyle = "#fff"; rr(c, T, 2 * T - 4, 4 * T, T + 4, 6); c.fill(); c.fillStyle = "#E9E2D8"; c.fillRect(T, 2 * T - 4, 4 * T, 10);
    c.fillStyle = "#9FC7DE"; rr(c, 2 * T + 8, 2 * T + 10, T - 16, T * .5, 6); c.fill();
    em(c, "🍽️", 2.5 * T, 2.2 * T, 18); em(c, "🍳", 3.5 * T, 2.45 * T, 22); em(c, "🧂", 1.5 * T, 2.4 * T, 18); em(c, "🫖", 4.5 * T, 2.4 * T, 20);
    // frigo
    c.fillStyle = "#BFE6F7"; rr(c, 5 * T + 4, T + 4, T - 8, 2 * T - 6, 8); c.fill(); c.fillStyle = "#9CC9E0"; c.fillRect(5 * T + 4, 2 * T - 6, T - 8, 3);
    c.fillStyle = "#FFF4B8"; c.fillRect(5 * T + 12, 2 * T + 6, 22, 18); em(c, "📝", 5.5 * T, 1.55 * T, 16);
    // cameretta
    c.fillStyle = "#C98B5A"; rr(c, 8 * T + 4, 2 * T + 2, T - 8, T - 8, 6); c.fill(); em(c, "🧸", 8.5 * T, 2.4 * T, 24);
    c.fillStyle = "#fff"; rr(c, 9 * T + 2, 1.6 * T, 2 * T - 4, 2.3 * T, 10); c.fill(); c.fillStyle = "#FF8FA8"; rr(c, 9 * T + 2, 2.4 * T, 2 * T - 4, 1.5 * T, 10); c.fill();
    c.fillStyle = "#fff"; rr(c, 9 * T + 10, 1.75 * T, 2 * T - 20, .5 * T, 10); c.fill();
    // tavolo
    c.fillStyle = "rgba(0,0,0,.15)"; rr(c, 4 * T + 6, 5 * T + 10, 4 * T, 2 * T, 14); c.fill();
    c.fillStyle = "#fff"; rr(c, 4 * T, 5 * T, 4 * T, 2 * T, 14); c.fill();
    c.save(); rr(c, 4 * T, 5 * T, 4 * T, 2 * T, 14); c.clip(); c.fillStyle = "rgba(229,65,47,.45)"; for (let k = 0; k < 16; k++) { c.fillRect(4 * T + k * 12, 5 * T, 6, 2 * T); c.fillRect(4 * T, 5 * T + k * 12, 4 * T, 6); } c.restore();
    em(c, "🍝", 6 * T, 6 * T, 30); em(c, "🍽️", 4.6 * T, 5.5 * T, 18); em(c, "🍽️", 7.4 * T, 6.5 * T, 18); em(c, "🥖", 5 * T, 6.5 * T, 18); em(c, "🍷", 7.1 * T, 5.5 * T, 16);
    // libreria, divano, pianta
    c.fillStyle = "#8A5A35"; rr(c, T + 4, 6 * T, T - 8, 2 * T - 4, 6); c.fill(); em(c, "📚", 1.5 * T, 6.5 * T, 20); em(c, "🪴", 1.5 * T, 7.4 * T, 22);
    c.fillStyle = "#5B8DEF"; rr(c, 10 * T + 2, 6 * T, T - 6, 2 * T - 4, 12); c.fill(); c.fillStyle = "#4A77D0"; rr(c, 10 * T + 2, 6 * T, 12, 2 * T - 4, 6); c.fill();
    // tappetino porta
    c.fillStyle = "#2E9D5B"; rr(c, 5.6 * T, 8.1 * T, 1.8 * T, .8 * T, 8); c.fill();
    c.fillStyle = "#fff"; c.font = "800 11px Nunito, system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ESCI", 6.5 * T, 8.5 * T);
    if (ev === "halloween") { em(c, "🎃", 9.5 * T, 7.5 * T, 28); em(c, "🦇", 6 * T, .9 * T, 22); }
    if (ev === "natale") { em(c, "🎄", 9.4 * T, 6.6 * T, 52); em(c, "🧦", 3.2 * T, 1.3 * T, 20); }
    if (ev === "estate") { em(c, "🍉", 6.6 * T, 5.5 * T, 18); }
  }
  function em(c, e, x, y, s) { c.font = s + "px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e, x, y); }

  /* ---------- sprites ---------- */
  const spriteCache = {};
  function sprite(key, svg) {
    if (spriteCache[key]) return spriteCache[key];
    const img = new Image(); const s = { img, ok: false };
    img.onload = () => { s.ok = true; }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    spriteCache[key] = s; return s;
  }
  function drawChar(c, ch, x, y, t, opts) {
    const w = T * 1.12, hh = w * 226 / 200, legH = T * .24, moving = ch.moving;
    const ph = moving ? Math.sin(t * 14) : 0;
    c.fillStyle = "rgba(30,20,10,.22)"; c.beginPath(); c.ellipse(x, y, T * .3, T * .1, 0, 0, 7); c.fill();
    c.fillStyle = "#3E4A78";
    rr(c, x - w * .17, y - legH - (ph > 0 ? ph * 4 : 0), w * .14, legH, 5); c.fill();
    rr(c, x + w * .03, y - legH - (ph < 0 ? -ph * 4 : 0), w * .14, legH, 5); c.fill();
    c.fillStyle = "#2B1B1E"; rr(c, x - w * .19, y - 6 - (ph > 0 ? ph * 4 : 0), w * .17, 7, 3); c.fill(); rr(c, x + w * .02, y - 6 - (ph < 0 ? -ph * 4 : 0), w * .17, 7, 3); c.fill();
    const bob = moving ? Math.abs(Math.sin(t * 14)) * 3 : Math.sin(t * 2.4 + (ch.seed || 0)) * 1.2;
    const top = y - legH + 4 - hh - bob;
    if (ch.sp && ch.sp.ok) {
      c.save();
      if (ch.face < 0) { c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); }
      c.drawImage(ch.sp.img, x - w / 2, top, w, hh);
      c.restore();
    }
    if (opts && opts.tag) {
      c.font = "800 11px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      const tw = c.measureText(opts.tag).width + 12;
      c.fillStyle = opts.me ? "#FFB21E" : "rgba(255,255,255,.95)"; rr(c, x - tw / 2, top - 4, tw, 17, 8); c.fill();
      c.fillStyle = "#3A1A1F"; c.fillText(opts.tag, x, top + 4.5);
    }
  }
  function bubble(c, x, y, text) {
    c.font = "800 13px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const tw = Math.min(220, c.measureText(text).width + 22), bx = x - tw / 2, by = y - 34;
    c.fillStyle = "rgba(58,26,31,.15)"; rr(c, bx + 2, by + 3, tw, 28, 14); c.fill();
    c.fillStyle = "#fff"; rr(c, bx, by, tw, 28, 14); c.fill();
    c.beginPath(); c.moveTo(x - 6, by + 27); c.lineTo(x, by + 35); c.lineTo(x + 6, by + 27); c.fill();
    c.fillStyle = "#3A1A1F"; c.fillText(text, x, by + 14.5, tw - 12);
  }
  function drawCoin(c, x, y, t, seed) {
    const bob = Math.sin(t * 3 + seed) * 4, sx = Math.abs(Math.cos(t * 2.2 + seed)) * .65 + .35, r = T * .27;
    const gl = c.createRadialGradient(x, y + bob, 2, x, y + bob, r * 2.2); gl.addColorStop(0, "rgba(255,230,120,.55)"); gl.addColorStop(1, "rgba(255,230,120,0)"); c.fillStyle = gl; c.beginPath(); c.arc(x, y + bob, r * 2.2, 0, 7); c.fill();
    c.fillStyle = "rgba(30,20,10,.18)"; c.beginPath(); c.ellipse(x, y + T * .32, r * .9, r * .3, 0, 0, 7); c.fill();
    c.save(); c.translate(x, y + bob); c.scale(sx, 1);
    c.fillStyle = "#E99C00"; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.fillStyle = "#FFC93C"; c.beginPath(); c.arc(0, -1, r * .82, 0, 7); c.fill();
    c.fillStyle = "#FFE48A"; c.font = "900 " + Math.round(r * 1.1) + "px Nunito, system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("★", 0, 0);
    c.restore();
    if ((t * 2 + seed) % 2 < .3) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x + r, y - r + bob, 2.5, 0, 7); c.fill(); }
  }

  /* ---------- game ---------- */
  const FRIEND_LINES = ["Ciao! 👋", "Hai trovato monete?", "Ci vediamo a cena!", "Il supermercato è a destra →", "Io ho lavorato in pizzeria!", "Chi cucina stasera?", "In biblioteca pagano bene!", "Cerca vicino al laghetto 😉"];
  let S = null;

  function open(api) {
    if (S) close();
    const root = document.getElementById("city-root");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const maps = { city: buildCity(), home: buildHome() };
    const ev = api.event();
    Object.values(maps).forEach((m) => { m.layer = paint(m, dpr, ev); });
    const me = api.me();
    S = { api, root, dpr, maps, map: maps.home, ev, t: 0, particles: [], last: performance.now(), keys: {}, pad: null, raf: 0, modal: null, fx: [], toastT: 0,
      p: { x: maps.home.spawn[0], y: maps.home.spawn[1], face: 1, moving: false, sp: sprite("me" + JSON.stringify(me.av) + api.crown(me.id), api.svg(me)) },
      prevTile: null, near: null, msg: null, msgT: 0 };
    // altri personaggi
    const fam = api.members().filter((m) => m.id !== me.id);
    const day = api.today();
    const R = rng(hash(day + me.id));
    const fspots = maps.city.friends.slice().sort(() => R() - .5);
    S.friends = fam.slice(0, fspots.length).map((m, i) => ({ m, x: fspots[i][0] + .5, y: fspots[i][1] + .8, face: 1, seed: i * 1.7, lines: (api.friendLines && api.friendLines(m)) || FRIEND_LINES, sp: sprite("f" + m.id + JSON.stringify(m.av) + api.crown(m.id), api.svg(m)) }));
    S.walkers = maps.city.walkers.map((w, i) => ({ x: w.a[0], y: w.a[1], a: w.a, b: w.b, dir: 1, face: 1, moving: true, seed: i, sp: sprite("w" + i, api.svgRandom(i)) }));
    // monete attive oggi
    const CR = rng(hash("coins" + day + me.id));
    S.locks = Object.keys(LOCKS).filter((k) => !api.unlocked(k)).map((k) => Object.assign({ k }, LOCKS[k]));
    const sec = api.secretInfo();
    S.secret = sec && !sec.found ? { x: maps.city.secretSpots[sec.seed % maps.city.secretSpots.length][0] + .5, y: maps.city.secretSpots[sec.seed % maps.city.secretSpots.length][1] + .6 } : null;
    for (let i = 0; i < 40; i++) S.particles.push({ x: Math.random(), y: Math.random(), s: .4 + Math.random() * .8, o: Math.random() * 6 });
    S.activeCoins = maps.city.coinSpots.map((p, i) => ({ id: "c" + i, x: p[0] + .5, y: p[1] + .6, r: CR() })).sort((a, b) => a.r - b.r).slice(0, COINS_PER_DAY);
    buildDom();
    resize();
    S.onResize = () => resize(); window.addEventListener("resize", S.onResize);
    S.onKey = (e) => onKey(e, true); S.onKeyUp = (e) => onKey(e, false);
    window.addEventListener("keydown", S.onKey); window.addEventListener("keyup", S.onKeyUp);
    document.body.style.overflow = "hidden";
    say(api.firstTime() ? "Tocca un punto per camminare. Esci di casa e cerca le monete!" : "Bentornato! Tocca dove vuoi andare", 4);
    S.raf = requestAnimationFrame(loop);
    S.chk = setInterval(() => { if (S && S.api.closedNow()) { close(); } }, 15000);
    refresh();
  }
  function close() {
    if (!S) return;
    cancelAnimationFrame(S.raf); clearInterval(S.chk);
    window.removeEventListener("resize", S.onResize); window.removeEventListener("keydown", S.onKey); window.removeEventListener("keyup", S.onKeyUp);
    S.root.replaceChildren(); document.body.style.overflow = "";
    const api = S.api; S = null; api.onClose && api.onClose();
  }
  function buildDom() {
    const r = S.root;
    const wrap = el("div", "city");
    const cv = el("canvas", "city-cv"); wrap.append(cv); S.cv = cv; S.ctx = cv.getContext("2d");
    cv.addEventListener("pointerdown", (e) => {
      if (!S || S.modal) return;
      const r = cv.getBoundingClientRect(), cam = S.cam || [0, 0];
      goTo((e.clientX - r.left + cam[0]) / T, (e.clientY - r.top + cam[1]) / T);
    });
    const top = el("div", "city-hud");
    const x = el("button", "ch-btn", "✕"); x.type = "button"; x.setAttribute("aria-label", "Esci dal gioco"); x.onclick = close;
    S.place = el("span", "ch-place", "");
    S.wallet = el("span", "ch-wallet", "");
    S.jobs = el("span", "ch-jobs", "");
    const mapb = el("button", "ch-btn", "🗺️"); mapb.type = "button"; mapb.setAttribute("aria-label", "Mappa della città"); mapb.onclick = openMap;
    const misb = el("button", "ch-btn", "📋"); misb.type = "button"; misb.setAttribute("aria-label", "Missioni di oggi"); misb.onclick = () => { if (!S.modal) modal("missions"); };
    top.append(x, S.place, el("span", "ch-sp"), S.wallet, S.jobs, misb, mapb);
    S.msgEl = el("div", "ch-msg"); S.msgEl.hidden = true;
    // pad
    const pad = el("div", "ch-pad", '<span class="u">▲</span><span class="d">▼</span><span class="l">◀</span><span class="r">▶</span><i></i>');
    pad.setAttribute("aria-label", "Frecce per muovere il personaggio"); pad.setAttribute("role", "group");
    const setDir = (e) => {
      const b = pad.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      if (Math.hypot(dx, dy) < 10) { S.pad = null; return; }
      S.pad = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u");
      pad.dataset.dir = S.pad;
    };
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); pad.setPointerCapture(e.pointerId); setDir(e); });
    pad.addEventListener("pointermove", (e) => { if (S.pad !== null || e.buttons) setDir(e); });
    const stop = () => { S.pad = null; delete pad.dataset.dir; };
    pad.addEventListener("pointerup", stop); pad.addEventListener("pointercancel", stop); pad.addEventListener("lostpointercapture", stop);
    // tasto azione
    S.abtn = el("button", "ch-a", "A"); S.abtn.type = "button"; S.abtn.disabled = true; S.abtn.setAttribute("aria-label", "Azione");
    S.abtn.onclick = act;
    S.alabel = el("div", "ch-alabel", ""); S.alabel.hidden = true;
    S.modalEl = el("div", "ch-modal"); S.modalEl.hidden = true;
    wrap.append(top, S.msgEl, pad, S.alabel, S.abtn, S.modalEl);
    r.replaceChildren(wrap);
  }
  function resize() {
    const cv = S.cv, w = innerWidth, h = innerHeight;
    cv.width = w * S.dpr; cv.height = h * S.dpr; cv.style.width = w + "px"; cv.style.height = h + "px";
    S.vw = w; S.vh = h;
  }
  function onKey(e, down) {
    if (!S || S.modal) return;
    const k = { ArrowUp: "u", ArrowDown: "d", ArrowLeft: "l", ArrowRight: "r", w: "u", s: "d", a: "l", d: "r", W: "u", S: "d", A: "l", D: "r" }[e.key];
    if (k) { S.keys[k] = down; e.preventDefault(); }
    if (down && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); act(); }
    if (down && e.key === "Escape") close();
  }
  /* percorso più breve (BFS su caselle libere) fino al punto toccato; un edificio porta alla sua porta */
  function goTo(wx, wy) {
    const m = S.map; let ti = Math.floor(wx), tj = Math.floor(wy);
    if (m.id === "city") { const b = m.doors.find((b) => b.def && ti >= b.x - 1 && ti <= b.x + b.w && tj >= b.y - 1 && tj <= b.y + b.h - 1); if (b && !(S.locks || []).some((l) => l.k === b.k)) { ti = b.dx; tj = b.dy; } }
    S.pathAct = false;
    if (m.spots) { const sp = m.spots.find((s) => Math.abs(s.x - ti) <= 1 && tj >= s.y - 2 && tj <= s.y + 1); if (sp) { ti = sp.x; tj = sp.y; S.pathAct = true; } }
    if (m.id === "home" && tj >= m.H - 2 && ti >= 5 && ti <= 7) { ti = 6; tj = m.H - 1; }
    const free = (i, j) => i >= 0 && j >= 0 && i < m.W && j < m.H && !isSolid(m, i + .5, j + .5);
    const si = Math.floor(S.p.x), sj = Math.floor(S.p.y - .05);
    const prev = new Map(), key = (i, j) => j * 1000 + i, q = [[si, sj]]; prev.set(key(si, sj), null);
    let best = [si, sj], bd = Math.hypot(si - ti, sj - tj);
    while (q.length) {
      const [i, j] = q.shift();
      const d = Math.hypot(i - ti, j - tj); if (d < bd) { bd = d; best = [i, j]; } if (d === 0) break;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + b; if (prev.has(key(ni, nj)) || !free(ni, nj)) continue; prev.set(key(ni, nj), [i, j]); q.push([ni, nj]); }
    }
    const path = []; let cur = best;
    while (cur && !(cur[0] === si && cur[1] === sj)) { path.unshift([cur[0] + .5, cur[1] + .75]); cur = prev.get(key(cur[0], cur[1])); }
    S.path = path.length ? path : null;
  }
  function say(text, secs) { S.msg = text; S.msgT = secs || 2.6; S.msgEl.textContent = text; S.msgEl.hidden = false; }

  function isSolid(m, x, y) {
    const i = Math.floor(x), j = Math.floor(y);
    if (i < 0 || j < 0 || i >= m.W || j >= m.H) return true;
    if (m.id === "city" && S && S.locks.some((l) => i >= l.x && i < l.x + l.w && j >= l.y && j < l.y + l.h)) return true;
    return m.solid[j][i];
  }
  function blocked(m, x, y) {
    const hw = .27, top = .28;
    return isSolid(m, x - hw, y - top) || isSolid(m, x + hw, y - top) || isSolid(m, x - hw, y - .02) || isSolid(m, x + hw, y - .02);
  }
  function loop(now) {
    if (!S) return;
    const dt = Math.min(.05, (now - S.last) / 1000); S.last = now; S.t += dt;
    if (!S.modal) update(dt);
    draw();
    S.raf = requestAnimationFrame(loop);
  }
  function update(dt) {
    const p = S.p, m = S.map;
    let dx = 0, dy = 0;
    const k = S.keys, d = S.pad;
    if (k.l || d === "l") dx -= 1; if (k.r || d === "r") dx += 1; if (k.u || d === "u") dy -= 1; if (k.d || d === "d") dy += 1;
    if (dx && dy) { dx *= .7071; dy *= .7071; }
    if (dx || dy) S.path = null;
    /* tocca-e-cammina: segue il percorso calcolato */
    if (!dx && !dy && S.path && S.path.length) {
      const g = S.path[0], vx = g[0] - p.x, vy = g[1] - p.y, dist = Math.hypot(vx, vy), st = SPEED * 1.15 * dt;
      if (dist <= st) { p.x = g[0]; p.y = g[1]; S.path.shift(); if (!S.path.length && S.pathAct) { S.pathAct = false; S.arrive = true; } }
      else { p.x += vx / dist * st; p.y += vy / dist * st; }
      if (Math.abs(vx) > .05) p.face = Math.sign(vx);
      p.moving = true;
    } else p.moving = !!(dx || dy);
    if (dx) p.face = dx;
    const sp = SPEED * dt;
    if (dx) {
      const nx = p.x + dx * sp;
      if (!blocked(m, nx, p.y)) p.x = nx;
      else if (!dy) { const cy = Math.floor(p.y - .05) + .75; if (Math.abs(cy - p.y) < .5 && !blocked(m, nx, cy)) p.y += Math.sign(cy - p.y) * Math.min(sp, Math.abs(cy - p.y)); }
    }
    if (dy) {
      const ny = p.y + dy * sp;
      if (!blocked(m, p.x, ny)) p.y = ny;
      else if (!dx) { const cx = Math.floor(p.x) + .5; for (const tx of [cx, cx - 1, cx + 1]) { if (Math.abs(tx - p.x) < .55 && !blocked(m, tx, ny)) { p.x += Math.sign(tx - p.x) * Math.min(sp, Math.abs(tx - p.x)); break; } } }
    }
    // porte
    const ti = Math.floor(p.x), tj = Math.floor(p.y - .05), key = m.id + ti + "," + tj;
    if (key !== S.prevTile) {
      S.prevTile = key;
      const door = m.doors.find((b) => b.dx === ti && b.dy === tj);
      if (door) enterDoor(door);
    }
    // monete
    if (m.id === "city") {
      const picked = S.api.picked();
      S.activeCoins.forEach((c) => {
        if (picked.includes(c.id) || c.taking) return;
        if (Math.hypot(c.x - p.x, c.y - (p.y - .3)) < .55) {
          c.taking = true;
          S.fx.push({ x: c.x, y: c.y, t: 0, text: "+2 🪙" });
          S.api.pick(c.id).then(() => { c.taking = false; refresh(); const left = S && S.activeCoins.filter((x) => !S.api.picked().includes(x.id)).length; if (S) say(left ? "Moneta trovata! Ne restano " + left + " in città" : "Hai trovato tutte le monete di oggi! 🎉"); }).catch((e) => { c.taking = false; if (S) say(e.message); });
        }
      });
      if (S.secret && !S.secret.taking && Math.hypot(S.secret.x - p.x, S.secret.y - (p.y - .3)) < .6) {
        S.secret.taking = true;
        S.api.findSecret().then((name) => { if (!S) return; S.fx.push({ x: S.secret.x, y: S.secret.y, t: 0, text: "+15 🪙" }); S.secret = null; refresh(); say("🎁 Ingrediente segreto: " + name + "! Lo chef dovrà usarlo a cena", 5); })
          .catch((e) => { if (!S) return; S.secret = null; say(e.message); });
      }
      S.walkers.forEach((w) => {
        const tx = w.dir > 0 ? w.b : w.a, vx = tx[0] - w.x, vy = tx[1] - w.y, dist = Math.hypot(vx, vy), st = 1.5 * dt;
        if (dist < st) w.dir *= -1; else { w.x += vx / dist * st; w.y += vy / dist * st; if (Math.abs(vx) > .01) w.face = Math.sign(vx); }
      });
    }
    // interazioni casa
    S.near = null;
    if (m.spots) S.near = m.spots.find((s) => Math.abs(p.x - (s.x + .5)) < .7 && Math.abs(p.y - (s.y + .8)) < .7) || null;
    if (m.id === "city") { const f = S.friends.find((f) => Math.hypot(f.x - p.x, f.y - p.y) < 1.4); S.nearFriend = f || null; }
    if (S.arrive) { S.arrive = false; if (S.near) setTimeout(act, 120); }
    const lab = S.near ? S.near.label : "";
    if (lab !== S.alabel.textContent) { S.alabel.textContent = lab; S.alabel.hidden = !lab; S.abtn.disabled = !lab; S.abtn.classList.toggle("on", !!lab); }
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) S.msgEl.hidden = true; }
    S.fx = S.fx.filter((f) => (f.t += dt) < 1);
  }
  function camera() {
    const m = S.map, mw = m.W * T, mh = m.H * T, p = S.p;
    const cx = mw <= S.vw ? (mw - S.vw) / 2 : clamp(p.x * T - S.vw / 2, 0, mw - S.vw);
    const cy = mh <= S.vh - 40 ? (mh - S.vh) / 2 + 10 : clamp(p.y * T - S.vh * .52, -60, mh - S.vh + 150);
    return [Math.round(cx), Math.round(cy)];
  }
  function draw() {
    const c = S.ctx, m = S.map, [cx, cy] = camera(), t = S.t; S.cam = [cx, cy];
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.fillStyle = m.id === "city" ? "#6FBF63" : "#3A1A1F"; c.fillRect(0, 0, S.vw, S.vh);
    c.drawImage(m.layer, 0, 0, m.layer.width, m.layer.height, -cx, -cy, m.W * T, m.H * T);
    c.save(); c.translate(-cx, -cy);
    const ents = [];
    if (m.id === "city") {
      const picked = S.api.picked();
      S.activeCoins.forEach((co, i) => { if (!picked.includes(co.id) && !co.taking) ents.push({ y: co.y, d: () => drawCoin(c, co.x * T, co.y * T - T * .2, t, i) }); });
      S.friends.forEach((f) => ents.push({ y: f.y, d: () => { drawChar(c, f, f.x * T, f.y * T, t, { tag: f.m.name }); } }));
      S.walkers.forEach((w) => ents.push({ y: w.y, d: () => drawChar(c, w, w.x * T, w.y * T, t) }));
      if (S.secret) { const sx = S.secret.x * T, sy = S.secret.y * T - T * .2 + Math.sin(t * 3) * 3; ents.push({ y: S.secret.y, d: () => { const gl = c.createRadialGradient(sx, sy, 2, sx, sy, T * .8); gl.addColorStop(0, "rgba(190,120,255,.6)"); gl.addColorStop(1, "rgba(190,120,255,0)"); c.fillStyle = gl; c.beginPath(); c.arc(sx, sy, T * .8, 0, 7); c.fill(); em(c, "🎁", sx, sy, 30); if ((t * 1.5) % 2 < .4) em(c, "✨", sx + 14, sy - 16, 14); } }); }
      S.locks.forEach((l) => ents.push({ y: l.y + l.h, d: () => drawLock(c, l) }));
    }
    if (m.spots) m.spots.forEach((s) => ents.push({ y: s.y + .5, d: () => { const bx = (s.x + .5) * T, by = (s.y + .2) * T + Math.sin(t * 3) * 3; c.fillStyle = s.list ? "#5B8DEF" : "#FFB21E"; c.beginPath(); c.arc(bx, by, 11, 0, 7); c.fill(); c.fillStyle = "#fff"; c.font = "900 14px Nunito, system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s.list ? "i" : "!", bx, by + 1); } }));
    ents.push({ y: S.p.y, d: () => drawChar(c, S.p, S.p.x * T, S.p.y * T, t, { tag: "Tu", me: true }) });
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
    if (S.nearFriend && m.id === "city") { const f = S.nearFriend; bubble(c, f.x * T, f.y * T - T * 1.55, f.lines[Math.floor(S.t / 3.2 + f.seed) % f.lines.length]); }
    if (S.path && S.path.length) { const g = S.path[S.path.length - 1], gx = g[0] * T, gy = g[1] * T; c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = 3; c.beginPath(); c.ellipse(gx, gy - 2, 14 + Math.sin(t * 6) * 2, 6, 0, 0, 7); c.stroke(); }
    S.fx.forEach((f) => { c.globalAlpha = 1 - f.t; c.font = "400 20px 'Bagel Fat One', system-ui"; c.textAlign = "center"; c.fillStyle = "#E99C00"; c.strokeStyle = "#fff"; c.lineWidth = 4; const y = f.y * T - T * .6 - f.t * 40; c.strokeText(f.text, f.x * T, y); c.fillText(f.text, f.x * T, y); c.globalAlpha = 1; });
    c.restore();
    if (m.id === "city") drawWeather(c, t);
  }
  function drawLock(c, l) {
    const x = l.x * T, y = l.y * T, w = l.w * T, h = l.h * T;
    c.fillStyle = "rgba(90,70,50,.55)"; c.fillRect(x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.strokeStyle = "rgba(255,190,40,.55)"; c.lineWidth = 14; for (let k = -h; k < w + h; k += 44) { c.beginPath(); c.moveTo(x + k, y); c.lineTo(x + k + h, y + h); c.stroke(); }
    c.restore();
    c.strokeStyle = "#FFB21E"; c.lineWidth = 5; c.setLineDash([16, 10]); c.strokeRect(x + 4, y + 4, w - 8, h - 8); c.setLineDash([]);
    const need = S.api.lockNeed(l.k), have = S.api.dinners(), name = B[l.k].icon + " " + B[l.k].name;
    c.font = "800 15px Nunito, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    const l1 = "🚧 " + name + " in costruzione", l2 = "Apre dopo " + need + " cene insieme (" + have + "/" + need + ")";
    const tw = Math.max(c.measureText(l1).width, c.measureText(l2).width) + 30;
    const [cx, cy] = S.cam || [0, 0], vx0 = Math.max(x, cx), vx1 = Math.min(x + w, cx + S.vw), vy0 = Math.max(y, cy + 80), vy1 = Math.min(y + h, cy + S.vh - 190);
    if (vx1 - vx0 < 40 || vy1 - vy0 < 40) return;
    const mx = clamp((vx0 + vx1) / 2, cx + tw / 2 + 8, cx + S.vw - tw / 2 - 8), by = (vy0 + vy1) / 2 - 30;
    c.fillStyle = "rgba(58,26,31,.25)"; rr(c, mx - tw / 2 + 2, by + 4, tw, 60, 16); c.fill();
    c.fillStyle = "#fff"; rr(c, mx - tw / 2, by, tw, 60, 16); c.fill();
    c.fillStyle = "#3A1A1F"; c.fillText(l1, mx, by + 20); c.font = "700 13px Nunito, system-ui, sans-serif"; c.fillStyle = "#8C6B6F"; c.fillText(l2, mx, by + 41);
  }
  function drawWeather(c, t) {
    const ev = S.ev;
    if (ev === "halloween") {
      c.fillStyle = "rgba(70,30,110,.16)"; c.fillRect(0, 0, S.vw, S.vh);
      for (let i = 0; i < 4; i++) { const pp = S.particles[i], x = ((pp.x * S.vw + t * 40 * pp.s) % (S.vw + 60)) - 30, y = 120 + pp.y * S.vh * .5 + Math.sin(t * 3 + pp.o) * 18; em(c, "🦇", x, y, 22); }
    } else if (ev === "natale") {
      c.fillStyle = "rgba(255,255,255,.9)";
      S.particles.forEach((pp) => { const x = (pp.x * S.vw + Math.sin(t + pp.o) * 20 + S.vw) % S.vw, y = (pp.y * S.vh + t * 40 * pp.s) % S.vh; c.beginPath(); c.arc(x, y, 2 + pp.s * 2.5, 0, 7); c.fill(); });
    } else if (ev === "estate") {
      const g = c.createRadialGradient(S.vw, 0, 10, S.vw, 0, S.vw); g.addColorStop(0, "rgba(255,230,120,.28)"); g.addColorStop(1, "rgba(255,230,120,0)"); c.fillStyle = g; c.fillRect(0, 0, S.vw, S.vh);
    }
  }

  /* ---------- porte, azioni, modali ---------- */
  function placeBelow(door) { S.p.x = door.dx + .5; S.p.y = door.dy + 1.75; S.prevTile = null; }
  function enterDoor(door) {
    S.keys = {}; S.pad = null; S.path = null;
    if (door.exit) { switchMap("city", [16.5, 17.75], "Sei uscito di casa!"); return; }
    const d = door.def;
    if (d.home) { switchMap("home", S.maps.home.spawn.slice(), "Sei a casa"); return; }
    if (d.shop) { modal("shop", door); return; }
    if (d.boutique) { modal("boutique", door); return; }
    if (d.job) { modal("job", door); return; }
  }
  function switchMap(id, pos, text) {
    S.map = S.maps[id]; S.p.x = pos[0]; S.p.y = pos[1]; S.path = null; S.prevTile = Math.floor(pos[0]) + "," + Math.floor(pos[1]);
    S.prevTile = S.map.id + Math.floor(S.p.x) + "," + Math.floor(S.p.y - .05);
    S.root.querySelector(".city").classList.remove("fade"); void S.root.offsetWidth; S.root.querySelector(".city").classList.add("fade");
    refresh(); if (text) say(text);
  }
  function act() {
    if (!S || S.modal || !S.near) return;
    const s = S.near;
    if (s.list) { modal("list"); return; }
    if (s.job) modal("job", { def: { name: s.job === "cucina" ? "Cucina" : "Cameretta", icon: s.job === "cucina" ? "🍽️" : "🧸", job: s.job }, inside: true });
  }
  function modal(kind, door) {
    S.modal = { kind, door }; S.keys = {}; S.pad = null; S.path = null;
    renderModal();
  }
  function closeModal() {
    if (!S || !S.modal) return;
    const door = S.modal.door; S.modal = null; S.modalEl.hidden = true; S.modalEl.replaceChildren();
    if (door && !door.inside) placeBelow(door);
    refresh();
  }
  function renderModal() {
    if (!S || !S.modal) return;
    const api = S.api, mm = S.modal, box = el("div", "ch-sheet");
    const head = el("div", "ch-sh-head");
    const xb = el("button", "ch-btn", "✕"); xb.type = "button"; xb.setAttribute("aria-label", "Esci"); xb.onclick = closeModal;
    if (mm.kind === "job") {
      const d = mm.door.def, j = api.jobDef(d.job), done = api.jobDone(d.job), left = api.jobsLeft(), info = api.jobInfo(d.job), paid = !done && left > 0;
      head.append(el("div", "ch-sh-title", "<span>" + d.icon + "</span><div><b>" + d.name + "</b><small>" + j.job + " · " + j.title + " liv. " + info.lv + "</small></div>"), xb);
      box.append(head, el("p", "ch-sh-p", info.how));
      box.append(el("div", "ch-recs", "<span>🏆 Record di famiglia<b>" + (info.rec ? info.rec.score : "—") + "</b><small>" + (info.recName || "Fallo tu!") + "</small></span><span>👤 Il tuo record<b>" + (info.best || "—") + "</b><small>" + (paid ? "paga fino a " + info.cap + " 🪙" : "allenamento") + "</small></span>"));
      const b = el("button", "btn " + (paid ? "red" : "gold") + " block", paid ? "▶ Inizia a lavorare" : "🎯 Allenati (il record vale!)");
      b.type = "button";
      b.onclick = () => { api.startJob(d.job, () => { if (S) { closeModal(); say(paid ? "Lavoro finito! Monete in tasca 🪙" : "Bell'allenamento!"); } }, { practice: !paid }); };
      box.append(b);
      if (!paid) box.append(el("p", "ch-sh-p", left > 0 ? "Qui hai già lavorato oggi: prova un altro posto per guadagnare monete." : "Per oggi hai finito i lavori pagati. Torna domani, intanto cerca le monete 🪙 in giro!"));
    } else if (mm.kind === "shop") {
      head.append(el("div", "ch-sh-title", "<span>🛒</span><div><b>Supermercato</b><small>La lista della spesa per la cena</small></div>"), xb);
      box.append(head, api.shopEl(true));
    } else if (mm.kind === "boutique") {
      head.append(el("div", "ch-sh-title", "<span>👗</span><div><b>Boutique</b><small>Vestiti e animaletti per il tuo personaggio</small></div>"), xb);
      box.append(head, api.boutiqueEl());
    } else if (mm.kind === "missions") {
      head.append(el("div", "ch-sh-title", "<span>📋</span><div><b>Missioni di oggi</b><small>Completale per avere monete extra</small></div>"), xb);
      box.append(head, api.missionsEl());
    } else if (mm.kind === "list") {
      head.append(el("div", "ch-sh-title", "<span>📝</span><div><b>Lista della spesa</b><small>Attaccata al frigo</small></div>"), xb);
      box.append(head, api.shopEl(false));
    }
    S.modalEl.replaceChildren(box); S.modalEl.hidden = false;
  }
  function refresh() {
    if (!S) return;
    const api = S.api;
    S.wallet.textContent = "🪙 " + api.coins();
    S.jobs.textContent = "💼 " + api.jobsLeft();
    S.jobs.title = "Lavori rimasti oggi";
    S.place.textContent = S.map.id === "city" ? "📍 Città" : "🏠 Casa";
    if (S.modal && ["shop", "list", "boutique", "missions"].includes(S.modal.kind)) renderModal();
    const me = api.me(); if (me) { const k = "me" + JSON.stringify(me.av) + api.crown(me.id) + JSON.stringify(api.wear(me.id)); if (k !== S.p.key) { S.p.key = k; S.p.sp = sprite(k, api.svg(me)); } }
  }
  function openMap() {
    if (!S || S.modal) return;
    const m = S.maps.city, box = el("div", "ch-sheet");
    const head = el("div", "ch-sh-head"); const xb = el("button", "ch-btn", "✕"); xb.type = "button"; xb.onclick = () => { S.modal = null; S.modalEl.hidden = true; };
    head.append(el("div", "ch-sh-title", "<span>🗺️</span><div><b>La città</b><small>Monete trovate oggi: " + S.activeCoins.filter((c) => S.api.picked().includes(c.id)).length + " su " + S.activeCoins.length + "</small></div>"), xb);
    const mc = el("canvas", "ch-mapcv"), W = Math.min(520, innerWidth - 48), H = W * m.H / m.W;
    mc.width = W * S.dpr; mc.height = H * S.dpr; mc.style.width = W + "px"; mc.style.height = H + "px";
    const c = mc.getContext("2d"); c.scale(S.dpr, S.dpr); c.drawImage(m.layer, 0, 0, W, H);
    const k = W / (m.W * T), px = (S.map.id === "city" ? S.p.x : 16.5) * T * k, py = (S.map.id === "city" ? S.p.y : 16.5) * T * k;
    c.fillStyle = "#E5412F"; c.strokeStyle = "#fff"; c.lineWidth = 3; c.beginPath(); c.arc(px, py - 4, 7, 0, 7); c.fill(); c.stroke();
    box.append(head, mc, el("p", "ch-sh-p", "Il puntino rosso sei tu. Ogni giorno le monete cambiano posto: esplora per trovarle!"));
    S.modal = { kind: "map" }; S.modalEl.replaceChildren(box); S.modalEl.hidden = false;
  }

  window.DCCity = { open, close, refresh, isOpen: () => !!S, preview, _tp: (x, y) => { if (S) { S.p.x = x; S.p.y = y; } }, pos: () => S && { x: S.p.x, y: S.p.y, map: S.map.id, modal: S.modal && S.modal.kind } };

  /* anteprima statica per la scheda Casa */
  function preview(cv, ev) {
    const m = buildCity(), dpr = Math.min(2, window.devicePixelRatio || 1), layer = paint(m, 1, ev);
    const w = cv.clientWidth || 340, h = cv.clientHeight || 200;
    cv.width = w * dpr; cv.height = h * dpr; const c = cv.getContext("2d"); c.scale(dpr, dpr);
    const sx = 10.2 * T, sy = 8.4 * T, sw = 14 * T, sh = sw * h / w;
    c.drawImage(layer, sx, sy, sw, sh, 0, 0, w, h);
  }
})();
