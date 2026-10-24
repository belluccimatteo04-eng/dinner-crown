/* Dinner Crown · 10 minigiochi diversi (20-35 secondi, un dito solo). Espone window.DCGames */
(function () {
  "use strict";
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const btn = (cls, html, fn) => { const b = mk("button", cls, html); b.type = "button"; b.addEventListener("pointerdown", (e) => { e.preventDefault(); fn(e, b); }); return b; };
  function pctOf(ctx, el) { const r = el.getBoundingClientRect(), p = ctx.play.getBoundingClientRect(); return [((r.left + r.width / 2 - p.left) / p.width) * 100, ((r.top + r.height / 2 - p.top) / p.height) * 100]; }
  function pctXY(ctx, cx, cy) { const p = ctx.play.getBoundingClientRect(); return [((cx - p.left) / p.width) * 100, ((cy - p.top) / p.height) * 100]; }

  /* ---------- audio ---------- */
  let AC = null, muted = false;
  try { muted = localStorage.getItem("dc_mute") === "1"; } catch (e) {}
  function ac() { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } if (AC && AC.state === "suspended") AC.resume(); return AC; }
  function tone(f, t0, dur, type, vol) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || "triangle"; o.frequency.setValueAtTime(f, a.currentTime + t0);
    g.gain.setValueAtTime(0.0001, a.currentTime + t0); g.gain.exponentialRampToValueAtTime(vol || 0.18, a.currentTime + t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
  }
  function sfx(k) {
    if (muted) return;
    try {
      if (k === "ok") { tone(660, 0, 0.09); tone(880, 0.06, 0.12); }
      else if (k === "bad") { tone(220, 0, 0.14, "square", 0.08); tone(150, 0.08, 0.2, "square", 0.08); }
      else if (k === "big") { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.22)); }
      else if (k === "tick") { tone(440, 0, 0.08, "sine", 0.12); }
      else if (k === "pop") { tone(990, 0, 0.06, "sine", 0.12); }
    } catch (e) {}
  }
  function drum(secs) {
    if (muted) return;
    try { const n = Math.floor(secs / 0.055); for (let i = 0; i < n; i++) tone(90 + Math.random() * 30, i * 0.055, 0.05, "triangle", 0.05 + (i / n) * 0.2); } catch (e) {}
  }
  function fanfare() {
    if (muted) return;
    try { [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.62], [659, 0.86], [784, 0.98], [1046, 1.1]].forEach(([f, t]) => tone(f, t, t >= 1.1 ? 0.7 : 0.18, "square", 0.07)); } catch (e) {}
  }

  const G = {};

  /* ===== 1. PIZZERIA: ordine + forno ===== */
  G.pizzeria = {
    secs: 30, rate: 0.45,
    how: "Metti gli ingredienti nell'ordine del biglietto, poi sforna la pizza quando la lancetta è nel verde.",
    start(ctx) {
      const ING = { "🍅": "Sugo", "🧀": "Mozzarella", "🌿": "Basilico", "🌶️": "Piccante", "🍄": "Funghi", "🫒": "Olive", "🧄": "Aglio", "🍆": "Melanzane", "🫑": "Peperoni" };
      const ORD = [
        { n: "Margherita", i: ["🍅", "🧀", "🌿"] }, { n: "Marinara", i: ["🍅", "🧄", "🌿"] }, { n: "Diavola", i: ["🍅", "🧀", "🌶️"] },
        { n: "Funghi", i: ["🍅", "🧀", "🍄"] }, { n: "Capricciosa", i: ["🍅", "🧀", "🍄", "🫒"], lv: 2 }, { n: "Ortolana", i: ["🍅", "🧀", "🍆", "🫑"], lv: 3 },
        { n: "Della casa", i: ["🍅", "🧀", "🍄", "🌶️", "🫒"], lv: 4 }
      ];
      const root = mk("div", "pz"), ticket = mk("div", "pz-ticket"), stage = mk("div", "pz-stage"), dough = mk("div", "pz-dough"), pad = mk("div", "pz-pad"), oven = mk("div", "pz-oven");
      stage.append(dough); root.append(ticket, stage, pad, oven); ctx.play.append(root);
      Object.keys(ING).forEach((k) => pad.append(btn("pz-b", "<span>" + k + "</span><small>" + ING[k] + "</small>", (e, b) => tap(k, b))));
      let cur = null, step = 0, phase = "top", heat = 0, made = 0, needle = null, Z = null, last = null;
      function newOrder() {
        const pool = ORD.filter((o) => (!o.lv || o.lv <= ctx.lv) && o !== last);
        cur = pick(pool); last = cur; step = 0; phase = "top";
        dough.replaceChildren(); dough.className = "pz-dough"; dough.style.filter = "";
        renderTicket(); pad.hidden = false; oven.hidden = true;
      }
      function renderTicket() {
        ticket.innerHTML = "<small>Ordine n. " + (made + 1) + "</small><b>" + cur.n + "</b><div class=\"pz-seq\">" + cur.i.map((k, i) => "<span class=\"" + (i < step ? "ok" : i === step ? "nx" : "") + "\">" + k + "</span>").join("<i>›</i>") + "</div>";
      }
      function tap(k, b) {
        if (phase !== "top" || !ctx.alive()) return;
        const [x, y] = pctOf(ctx, b);
        if (k === cur.i[step]) { step++; ctx.add(1, x, y - 6); ctx.sfx("ok"); sprinkle(k); renderTicket(); if (step === cur.i.length) { phase = "wait"; ctx.later(startOven, 380); } }
        else { ctx.add(-1, x, y - 6); ctx.sfx("bad"); ctx.say(cur.i.indexOf(k) >= 0 && cur.i.indexOf(k) < step ? "L'hai già messo!" : cur.i.indexOf(k) >= 0 ? "Non ancora: segui l'ordine!" : "Non c'è nell'ordine!"); b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); }
      }
      function sprinkle(k) {
        if (k === "🍅") { dough.classList.add("sauce"); return; }
        const n = k === "🧀" ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 30;
          const s = mk("span", k === "🧀" ? "pz-moz" : "pz-t", k === "🧀" ? "" : k);
          s.style.left = 50 + Math.cos(a) * r + "%"; s.style.top = 50 + Math.sin(a) * r + "%"; s.style.setProperty("--rot", ((Math.random() * 360) | 0) + "deg");
          dough.append(s);
        }
      }
      function startOven() {
        pad.hidden = true; oven.hidden = false; heat = 0; phase = "oven";
        const pw = Math.max(0.09, 0.2 - 0.025 * (ctx.lv - 1)), c = 0.64;
        Z = { na: c - pw / 2 - 0.09, a: c - pw / 2, b: c + pw / 2, nb: c + pw / 2 + 0.08 };
        const seg = (l, r, col) => "<i style=\"left:" + l * 100 + "%;width:" + (r - l) * 100 + "%;background:" + col + "\"></i>";
        const bar = mk("div", "pz-bar", seg(0, Z.na, "#EADCC4") + seg(Z.na, Z.a, "#FFD27A") + seg(Z.a, Z.b, "#3DBE72") + seg(Z.b, Z.nb, "#FFA45C") + seg(Z.nb, 1, "#4A3434"));
        needle = mk("span", "pz-needle"); bar.append(needle);
        oven.replaceChildren(mk("div", "pz-ov-h", "🔥 In forno! Sforna nel <b>verde</b>"), bar, mk("div", "pz-lbl", "<span>Cruda</span><span>Perfetta</span><span>Bruciata</span>"), btn("btn red pz-go", "🍕 Sforna!", takeOut));
        dough.classList.add("baking");
      }
      ctx.loop((dt) => {
        if (phase !== "oven" || !needle) return;
        heat += dt * 0.42 * (1 + 0.13 * (ctx.lv - 1));
        needle.style.left = Math.min(100, heat * 100) + "%";
        dough.style.filter = "brightness(" + (1.06 - heat * 0.38) + ") saturate(" + (1 + heat * 0.5) + ")";
        if (heat >= 1) takeOut();
      });
      function takeOut() {
        if (phase !== "oven") return; phase = "done";
        let pts = 0, msg;
        if (heat >= Z.a && heat <= Z.b) { pts = 3; msg = "Perfetta! 🤌"; ctx.sfx("big"); }
        else if (heat >= Z.na && heat <= Z.nb) { pts = 1; msg = heat < Z.a ? "Un po' cruda…" : "Un po' cotta…"; ctx.sfx("ok"); }
        else { msg = heat < Z.na ? "Cruda! 😬" : "Bruciata! 🔥"; ctx.sfx("bad"); }
        if (pts) ctx.add(pts, 50, 38);
        ctx.say(msg); made++;
        dough.classList.add("out");
        ctx.later(newOrder, 650);
      }
      newOrder();
    }
  };

  /* ===== 2. LAVANDERIA: bianchi o colorati ===== */
  G.lavanderia = {
    secs: 25, rate: 0.42,
    how: "Bianchi a sinistra, colorati a destra. Trascina il capo o tocca la cesta giusta: più veloce sei, più ne lavi!",
    start(ctx) {
      const SH = {
        maglia: "M30 16 L44 10 Q50 19 56 10 L70 16 L88 33 L76 45 L70 39 L70 90 L30 90 L30 39 L24 45 L12 33 Z",
        pantaloni: "M28 10 L72 10 L77 90 L57 90 L50 42 L43 90 L23 90 Z",
        calzino: "M38 8 L62 8 L62 56 Q62 68 75 74 Q88 80 84 91 Q79 99 62 94 L44 88 Q35 84 38 70 Z",
        vestito: "M40 8 L60 8 L58 28 L80 90 L20 90 L42 28 Z",
        asciugamano: "M18 20 L82 20 L82 84 L18 84 Z"
      };
      const WH = ["#FFFFFF", "#F8F6F1", "#EEF2F6"], CO = ["#E5412F", "#2E9D5B", "#3E7BC4", "#FFB21E", "#A98BD9", "#E86A9A", "#26324F", "#F28C28"];
      const root = mk("div", "lv"), area = mk("div", "lv-area"), item = mk("div", "lv-item"), ring = mk("div", "lv-ring", "<span></span>");
      const bL = btn("lv-bk l", "<span class=\"lv-b\">🧺</span><b>Bianchi</b><small>⚪ chiari</small>", () => sort(true));
      const bR = btn("lv-bk r", "<span class=\"lv-b\">🧺</span><b>Colorati</b><small>🌈 colori</small>", () => sort(false));
      area.append(ring, item); root.append(area, mk("div", "lv-row"), bL, bR); root.querySelector(".lv-row").append(bL, bR); ctx.play.append(root);
      let white = false, t0 = 0, limit = 0, busy = false, sx = null;
      function svg(kind, col) {
        const det = kind === "maglia" ? "<path d=\"M44 10 Q50 19 56 10\" fill=\"none\" stroke=\"#3A1A1F\" stroke-width=\"3\"/>" : kind === "asciugamano" ? "<path d=\"M18 72 L82 72\" stroke=\"rgba(58,26,31,.35)\" stroke-width=\"4\"/>" : "";
        return "<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\"><path d=\"" + SH[kind] + "\" fill=\"" + col + "\" stroke=\"#3A1A1F\" stroke-width=\"3\" stroke-linejoin=\"round\"/>" + det + "</svg>";
      }
      function next() {
        white = Math.random() < 0.5;
        item.innerHTML = svg(pick(Object.keys(SH)), white ? pick(WH) : pick(CO));
        item.className = "lv-item in"; item.style.transform = "";
        t0 = ctx.now(); limit = ctx.lv >= 2 ? Math.max(1.05, 2.7 - 0.32 * (ctx.lv - 1)) : 0;
        ring.hidden = !limit; busy = false;
      }
      function sort(toWhite) {
        if (!ctx.alive() || busy) return; busy = true;
        const ok = toWhite === white;
        ctx.add(ok ? 1 : -1, toWhite ? 25 : 75, 62); ctx.sfx(ok ? "ok" : "bad");
        if (!ok) ctx.say(white ? "Quello era bianco!" : "Hai macchiato i bianchi! 🩷");
        const b = toWhite ? bL : bR; b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit");
        item.className = "lv-item fly " + (toWhite ? "l" : "r"); item.style.transform = "";
        ctx.later(next, 200);
      }
      item.addEventListener("pointerdown", (e) => { e.preventDefault(); sx = e.clientX; item.setPointerCapture(e.pointerId); });
      item.addEventListener("pointermove", (e) => { if (sx == null) return; item.style.transform = "translateX(" + (e.clientX - sx) + "px) rotate(" + (e.clientX - sx) / 12 + "deg)"; });
      const up = (e) => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) sort(dx < 0); else item.style.transform = ""; };
      item.addEventListener("pointerup", up); item.addEventListener("pointercancel", () => { sx = null; item.style.transform = ""; });
      ctx.loop(() => {
        if (!limit || busy) return;
        const p = (ctx.now() - t0) / limit;
        ring.firstChild.style.width = Math.max(0, 100 - p * 100) + "%";
        if (p >= 1) { busy = true; ctx.add(-1, 50, 30); ctx.say("Troppo lento! 🐢"); ctx.sfx("bad"); item.className = "lv-item fly d"; ctx.later(next, 220); }
      });
      next();
    }
  };

  /* ===== 3. SERRA: tieni premuto e fermati nel verde ===== */
  G.serra = {
    secs: 25, rate: 0.5,
    how: "Tieni premuto sul vaso per annaffiare e lascia quando l'acqua è nella fascia verde. Se trabocca, la pianta si allaga!",
    start(ctx) {
      const ST = ["🌱", "🌿", "🪴", "🌷", "🌻"];
      const root = mk("div", "sr"); ctx.play.append(root);
      const pots = [0, 1, 2].map(() => {
        const el = mk("div", "sr-pot", "<div class=\"sr-tube\"><div class=\"sr-band\"></div><div class=\"sr-water\"></div></div><div class=\"sr-plant\">🌱</div><div class=\"sr-vase\"></div><small>Tieni premuto</small>");
        root.append(el);
        const p = { el, band: el.querySelector(".sr-band"), water: el.querySelector(".sr-water"), plant: el.querySelector(".sr-plant"), lv: 0, lo: 0, hi: 0, hold: false, st: 0 };
        el.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!ctx.alive()) return; p.hold = true; el.classList.add("on"); try { el.setPointerCapture(e.pointerId); } catch (x) {} });
        const rel = () => { if (!p.hold) return; p.hold = false; el.classList.remove("on"); release(p); };
        el.addEventListener("pointerup", rel); el.addEventListener("pointercancel", rel);
        target(p); return p;
      });
      function target(p) {
        const bh = Math.max(0.1, 0.22 - 0.03 * (ctx.lv - 1));
        p.lo = rnd(0.35, 0.92 - bh); p.hi = p.lo + bh; p.lv = 0;
        p.band.style.bottom = p.lo * 100 + "%"; p.band.style.height = bh * 100 + "%"; p.water.style.height = "0%";
      }
      function release(p) {
        const [x, y] = pctOf(ctx, p.el);
        if (p.lv >= p.lo && p.lv <= p.hi) {
          ctx.add(2, x, y - 20); ctx.sfx("ok");
          p.st++;
          if (p.st >= ST.length) { p.st = 0; ctx.add(1, x, y - 30); ctx.say("Fiorita! 🌻 +1"); ctx.sfx("big"); }
          p.plant.textContent = ST[p.st]; p.plant.classList.remove("grow"); void p.plant.offsetWidth; p.plant.classList.add("grow");
          target(p);
        } else if (p.lv > 0 && p.lv < p.lo) ctx.say("Ancora un po'…");
      }
      function spill(p) {
        p.hold = false; p.el.classList.remove("on");
        const [x, y] = pctOf(ctx, p.el); ctx.add(-1, x, y - 20); ctx.sfx("bad"); ctx.say("Trabocca! 💦");
        p.el.classList.remove("wet"); void p.el.offsetWidth; p.el.classList.add("wet");
        target(p);
      }
      ctx.loop((dt) => {
        pots.forEach((p) => {
          if (p.hold) { p.lv += dt * (0.5 + 0.08 * (ctx.lv - 1)); if (p.lv > p.hi + 0.015) spill(p); }
          else if (p.lv > 0) p.lv = Math.max(0, p.lv - dt * 0.03);
          p.water.style.height = Math.min(100, p.lv * 100) + "%";
          p.water.classList.toggle("ok", p.lv >= p.lo && p.lv <= p.hi);
        });
      });
      return { stop() { pots.forEach((p) => { p.hold = false; }); } };
    }
  };

  /* ===== 4. GELATERIA: torre di gelato ===== */
  G.gelateria = {
    secs: 30, rate: 0.6,
    how: "Tocca per far cadere la pallina sul cono. Impila più gusti che puoi senza farli cadere: hai 3 vite.",
    start(ctx) {
      const FL = ["#F7E7B4", "#7B4A2E", "#F59BB3", "#A8D672", "#7FD0F2", "#FFB86B"];
      const root = mk("div", "gl"), world = mk("div", "gl-world"), cone = mk("div", "gl-cone"), mov = mk("div", "gl-scoop gl-mov"), hearts = mk("div", "gl-hearts"), hgt = mk("div", "gl-h");
      world.append(cone); root.append(world, mov, hearts, hgt); ctx.play.append(root);
      const SW = 74, SH = 46, BASE = 96;
      let W = root.clientWidth || 360, H = root.clientHeight || 500, x = SW, dir = 1, speed = 150 + 22 * ctx.lv, topX = W / 2, n = 0, off = 0, lives = 3, fall = null, col = pick(FL);
      function hud() { hearts.textContent = "❤️".repeat(lives) + "🤍".repeat(3 - lives); hgt.textContent = "Torre: " + n; }
      function paint(el, c) { el.style.background = "radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 40%), " + c; }
      paint(mov, col); hud();
      cone.style.left = W / 2 + "px";
      root.addEventListener("pointerdown", (e) => {
        e.preventDefault(); if (!ctx.alive() || fall) return;
        const el = mk("div", "gl-scoop"); paint(el, col); el.style.left = x + "px";
        const b = H - 70 - SW * 0.86; el.style.bottom = b + "px"; root.append(el);
        fall = { el, x, b, c: col }; mov.hidden = true; ctx.sfx("pop");
      });
      ctx.loop((dt) => {
        W = root.clientWidth || W; H = root.clientHeight || H;
        if (!fall) {
          x += dir * speed * dt;
          if (x > W - SW / 2 - 6) { x = W - SW / 2 - 6; dir = -1; } if (x < SW / 2 + 6) { x = SW / 2 + 6; dir = 1; }
          mov.style.left = x + "px";
          return;
        }
        const target = BASE + n * SH - off;
        fall.b -= 1100 * dt; fall.el.style.bottom = Math.max(fall.b, target) + "px";
        if (fall.b <= target) land(target);
      });
      function land(target) {
        const f = fall, dx = f.x - topX, [px, py] = pctXY(ctx, root.getBoundingClientRect().left + f.x, root.getBoundingClientRect().bottom - target - 30);
        if (Math.abs(dx) < SW * 0.55) {
          const perfect = Math.abs(dx) < SW * 0.13;
          const lx = perfect ? topX : f.x;
          f.el.remove(); const s = mk("div", "gl-scoop gl-st"); paint(s, f.c); s.style.left = lx + "px"; s.style.bottom = BASE + n * SH + "px"; world.append(s);
          topX = lx; n++; ctx.add(perfect ? 2 : 1, px, py); ctx.sfx(perfect ? "big" : "ok"); if (perfect) ctx.say("Perfetto! ✨");
          speed *= 1.06;
          if (n > 4) { off = (n - 4) * SH; world.style.transform = "translateY(" + off + "px)"; }
        } else {
          f.el.classList.add("drop", dx > 0 ? "r" : "l"); setTimeout(() => f.el.remove(), 600);
          lives--; ctx.sfx("bad"); ctx.say("Splat! 🍦");
          if (lives <= 0) ctx.later(() => ctx.end(), 650);
        }
        fall = null; hud(); col = pick(FL); paint(mov, col); mov.hidden = false;
      }
    }
  };

  /* ===== 5. PORTO: riflessi ===== */
  G.porto = {
    secs: 25, rate: 0.5,
    how: "Aspetta che il galleggiante vada giù e compaia il ❗, poi tocca subito: più sei veloce, più grosso è il pesce. Se passa lo squalo 🦈, non toccare!",
    start(ctx) {
      const root = mk("div", "pt", "<div class=\"pt-sky\"></div><div class=\"pt-sea\"></div><div class=\"pt-dock\">🧑‍🦱</div>");
      const line = mk("div", "pt-line"), bob = mk("div", "pt-bob"), ex = mk("div", "pt-ex", "❗"), fin = mk("div", "pt-fin", "🦈"), st = mk("div", "pt-st", ""), bucket = mk("div", "pt-bucket", "<b>🪣</b>");
      root.append(line, bob, ex, fin, st, bucket); ctx.play.append(root);
      let state = "idle", tok = 0, biteAt = 0;
      const sharkP = Math.min(0.35, 0.18 + 0.04 * (ctx.lv - 1)), win = Math.max(0.45, 0.95 - 0.1 * (ctx.lv - 1));
      function set(s, t) { state = s; st.textContent = t || ""; root.dataset.s = s; }
      function cast() { tok++; const my = tok; set("wait", "Aspetta…"); bob.className = "pt-bob float"; ex.hidden = true; ctx.later(() => { if (my === tok) event(); }, rnd(0.8, 2.4) * 1000); }
      function event() {
        const my = ++tok;
        if (Math.random() < sharkP) {
          set("shark", "Fermo! 🦈"); fin.className = "pt-fin go";
          ctx.later(() => { if (my === tok) { fin.className = "pt-fin"; set("wait", "Aspetta…"); ctx.later(() => { if (my === tok) event(); }, rnd(0.5, 1.4) * 1000); } }, 1500);
          return;
        }
        set("bite", "ORA!"); biteAt = ctx.now(); bob.className = "pt-bob dip"; ex.hidden = false; ctx.sfx("tick");
        ctx.later(() => { if (my === tok && state === "bite") { tok++; ex.hidden = true; bob.className = "pt-bob float"; set("pause", "È scappato! 💨"); ctx.later(cast, 650); } }, win * 1000);
      }
      root.addEventListener("pointerdown", (e) => {
        e.preventDefault(); if (!ctx.alive()) return;
        if (state === "idle") { cast(); return; }
        if (state === "wait") { tok++; ctx.add(-1, 50, 45); ctx.sfx("bad"); set("pause", "Troppo presto! Il pesce è scappato"); bob.className = "pt-bob"; ctx.later(cast, 800); return; }
        if (state === "shark") { tok++; fin.className = "pt-fin"; ctx.add(-2, 50, 45); ctx.sfx("bad"); set("pause", "Lo squalo ti ha rubato l'esca! 🦈"); ctx.later(cast, 900); return; }
        if (state === "bite") {
          tok++; const rt = ctx.now() - biteAt, f = rt < 0.3 ? ["🐡", 4] : rt < 0.5 ? ["🐠", 3] : ["🐟", 2];
          ex.hidden = true; bob.className = "pt-bob";
          ctx.add(f[1], 50, 42); ctx.sfx(f[1] >= 4 ? "big" : "ok");
          set("pause", f[0] + " preso! " + Math.round(rt * 1000) + " ms");
          const s = mk("span", "pt-fish", f[0]); bucket.append(s); if (bucket.children.length > 9) bucket.children[1].remove();
          ctx.later(cast, 700);
        }
      });
      ctx.later(cast, 300);
    }
  };

  /* ===== 6. BIBLIOTECA: memoria ===== */
  G.biblioteca = {
    secs: 35, rate: 0.5,
    how: "Guarda l'ordine dei libri sullo scaffale, poi rimettili nello stesso ordine toccando i colori.",
    start(ctx) {
      const COL = [["#E5412F", "rosso"], ["#2E9D5B", "verde"], ["#3E7BC4", "blu"], ["#FFB21E", "giallo"], ["#A98BD9", "viola"]];
      const nc = ctx.lv >= 4 ? 5 : 4;
      const root = mk("div", "bb"), stEl = mk("div", "bb-st", ""), shelf = mk("div", "bb-shelf"), pal = mk("div", "bb-pal");
      root.append(stEl, shelf, pal); ctx.play.append(root);
      const pbs = COL.slice(0, nc).map((c, i) => { const b = btn("bb-book", "<i></i>", () => tap(i, b)); b.style.setProperty("--c", c[0]); b.setAttribute("aria-label", "Libro " + c[1]); pal.append(b); return b; });
      let len = ctx.lv >= 3 ? 4 : 3, seq = [], inp = 0, phase = "show";
      const gap = Math.max(300, 560 - 45 * (ctx.lv - 1));
      function round() {
        seq = Array.from({ length: len }, () => (Math.random() * nc) | 0); inp = 0; phase = "show";
        stEl.textContent = "Guarda bene… (" + len + " libri)";
        shelf.replaceChildren(); const slots = seq.map(() => { const s = mk("div", "bb-slot"); shelf.append(s); return s; });
        pbs.forEach((b) => b.disabled = true);
        seq.forEach((c, i) => ctx.later(() => { slots[i].style.setProperty("--c", COL[c][0]); slots[i].className = "bb-slot show"; ctx.sfx("tick"); }, 250 + i * gap));
        ctx.later(() => { slots.forEach((s) => { s.className = "bb-slot hid"; s.textContent = "?"; }); phase = "input"; stEl.textContent = "Tocca a te! Rimettili in ordine"; pbs.forEach((b) => b.disabled = false); }, 250 + len * gap + Math.max(350, 900 - 90 * ctx.lv));
      }
      function tap(c, b) {
        if (phase !== "input" || !ctx.alive()) return;
        const slot = shelf.children[inp];
        b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit");
        if (c === seq[inp]) {
          slot.textContent = ""; slot.style.setProperty("--c", COL[c][0]); slot.className = "bb-slot show"; inp++; ctx.sfx("pop");
          if (inp === len) { phase = "pause"; const [x, y] = pctOf(ctx, shelf); ctx.add(len, x, y); ctx.sfx("big"); ctx.say("Bravo! Scaffale perfetto 📚"); len = Math.min(9, len + 1); ctx.later(round, 750); }
        } else {
          phase = "pause"; slot.textContent = "✕"; slot.style.setProperty("--c", COL[seq[inp]][0]); slot.className = "bb-slot show bad";
          const [x, y] = pctOf(ctx, slot); ctx.add(-1, x, y); ctx.sfx("bad"); ctx.say("Era il " + COL[seq[inp]][1] + "!");
          ctx.later(round, 1000);
        }
      }
      round();
    }
  };

  /* ===== 7. OFFICINA: tempismo sul cerchio ===== */
  G.officina = {
    secs: 25, rate: 0.5,
    how: "La chiave gira intorno alla ruota: tocca quando passa sulla zona arancione per stringere il bullone. Al centro della zona vale doppio!",
    start(ctx) {
      const NS = "http://www.w3.org/2000/svg", C = 150, R = 112;
      const root = mk("div", "of"), cnt = mk("div", "of-cnt", "🔩 0 bulloni stretti");
      let spokes = ""; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; spokes += "<line x1=\"150\" y1=\"150\" x2=\"" + (C + Math.sin(a) * 96) + "\" y2=\"" + (C - Math.cos(a) * 96) + "\" stroke=\"#B9BEC8\" stroke-width=\"3\"/>"; }
      root.innerHTML = "<svg class=\"of-svg\" viewBox=\"0 0 300 300\" aria-hidden=\"true\"><circle cx=\"150\" cy=\"150\" r=\"140\" fill=\"#3D4350\"/><circle cx=\"150\" cy=\"150\" r=\"124\" fill=\"#5F6773\"/><circle cx=\"150\" cy=\"150\" r=\"100\" fill=\"#E6E8EC\"/>" + spokes +
        "<path class=\"of-zone\" fill=\"none\" stroke=\"#FF9F43\" stroke-width=\"26\" stroke-linecap=\"butt\"/><path class=\"of-core\" fill=\"none\" stroke=\"#FFD23F\" stroke-width=\"26\"/><g class=\"of-ptr\"><line x1=\"150\" y1=\"150\" x2=\"150\" y2=\"44\" stroke=\"#3A1A1F\" stroke-width=\"7\" stroke-linecap=\"round\"/><text x=\"150\" y=\"40\" font-size=\"34\" text-anchor=\"middle\" dominant-baseline=\"middle\">🔧</text></g><circle cx=\"150\" cy=\"150\" r=\"22\" fill=\"#3A1A1F\"/><text x=\"150\" y=\"152\" font-size=\"24\" text-anchor=\"middle\" dominant-baseline=\"middle\">🔩</text></svg>";
      root.append(cnt, mk("div", "of-tap", "Tocca ovunque quando la 🔧 è nell'arancione"));
      ctx.play.append(root);
      const zone = root.querySelector(".of-zone"), core = root.querySelector(".of-core"), ptr = root.querySelector(".of-ptr");
      const base = 150 + 18 * ctx.lv; let ang = 0, dir = 1, speed = base, zc = 180, zw = Math.max(26, 58 - 6 * (ctx.lv - 1)), bolts = 0;
      const pt = (a) => [C + R * Math.sin((a * Math.PI) / 180), C - R * Math.cos((a * Math.PI) / 180)];
      function arc(el, c, w) { const a = pt(c - w / 2), b = pt(c + w / 2); el.setAttribute("d", "M" + a[0] + " " + a[1] + " A" + R + " " + R + " 0 0 1 " + b[0] + " " + b[1]); }
      function placeZone() { arc(zone, zc, zw); arc(core, zc, zw * 0.3); }
      placeZone();
      ctx.loop((dt) => { ang = (ang + dir * speed * dt + 360) % 360; ptr.setAttribute("transform", "rotate(" + ang + " 150 150)"); });
      root.addEventListener("pointerdown", (e) => {
        e.preventDefault(); if (!ctx.alive()) return;
        let d = Math.abs(ang - zc) % 360; if (d > 180) d = 360 - d;
        const [x, y] = pctOf(ctx, root.querySelector(".of-svg"));
        if (d <= zw / 2) {
          const p = d <= zw * 0.15 ? 2 : 1; ctx.add(p, x, y - 10); ctx.sfx(p === 2 ? "big" : "ok"); if (p === 2) ctx.say("Preciso! ⚙️");
          bolts++; cnt.textContent = "🔩 " + bolts + (bolts === 1 ? " bullone stretto" : " bulloni stretti");
          zc = (ang + rnd(100, 260)) % 360; speed *= 1.05; if (Math.random() < 0.35) dir *= -1; placeZone();
        } else { ctx.add(-1, x, y - 10); ctx.sfx("bad"); ctx.say("Mancato!"); speed = Math.max(base, speed * 0.93); }
      });
    }
  };

  /* ===== 8. CUCINA: strofina i piatti ===== */
  G.cucina = {
    secs: 25, rate: 0.7,
    how: "Strofina il piatto col dito finché non brilla. Ogni piatto pulito vale 2 punti, e i piatti si sporcano sempre di più!",
    start(ctx) {
      const root = mk("div", "ck"), plate = mk("div", "ck-plate"), cv = mk("canvas", "ck-dirt"), sp = mk("div", "ck-sp", "🧽"), pile = mk("div", "ck-pile", "");
      plate.append(cv); root.append(pile, plate, sp); ctx.play.append(root);
      const c = cv.getContext("2d");
      let S = 300, init = 1, rub = false, last = null, chk = 0, washed = 0, busy = false;
      function size() { const w = root.clientWidth || 340, h = root.clientHeight || 480; S = Math.round(Math.min(w * 0.86, h * 0.66)); plate.style.width = plate.style.height = S + "px"; cv.width = cv.height = S; }
      function count() { const d = c.getImageData(0, 0, S, S).data; let n = 0; for (let y = 0; y < S; y += 6) for (let x = 0; x < S; x += 6) if (d[(y * S + x) * 4 + 3] > 40) n++; return n; }
      function dirty() {
        c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, S, S);
        const cols = ["#B5452B", "#8A5A2B", "#C9772F", "#6B4A2A", "#A33A2A"], n = 4 + ctx.lv * 2 + Math.min(4, washed);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * S * 0.3, cx = S / 2 + Math.cos(a) * r, cy = S / 2 + Math.sin(a) * r, rad = S * rnd(0.05, 0.1);
          c.fillStyle = pick(cols); c.globalAlpha = 0.88;
          for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(cx + rnd(-rad, rad) * 0.7, cy + rnd(-rad, rad) * 0.7, rad * rnd(0.45, 0.9), 0, 7); c.fill(); }
        }
        c.globalAlpha = 1; c.fillStyle = "#5A3A20"; for (let i = 0; i < 26; i++) { const a = Math.random() * 7, r = Math.random() * S * 0.33; c.beginPath(); c.arc(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r, rnd(2, 4.5), 0, 7); c.fill(); }
        init = Math.max(1, count()); plate.className = "ck-plate in"; busy = false;
      }
      function pos(e) { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * S, ((e.clientY - r.top) / r.height) * S]; }
      function scrub(p) {
        c.globalCompositeOperation = "destination-out"; c.lineCap = "round"; c.lineWidth = S * (0.13 - 0.01 * (ctx.lv - 1));
        c.beginPath(); c.moveTo(last ? last[0] : p[0], last ? last[1] : p[1]); c.lineTo(p[0] + 0.1, p[1] + 0.1); c.stroke(); last = p;
      }
      function moveSp(e) { const r = root.getBoundingClientRect(); sp.style.left = e.clientX - r.left + "px"; sp.style.top = e.clientY - r.top + "px"; }
      cv.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!ctx.alive() || busy) return; rub = true; last = null; try { cv.setPointerCapture(e.pointerId); } catch (x) {} sp.classList.add("on"); moveSp(e); scrub(pos(e)); });
      cv.addEventListener("pointermove", (e) => {
        if (!rub || busy || !ctx.alive()) return; moveSp(e); scrub(pos(e));
        const t = performance.now(); if (t - chk > 140) { chk = t; if (count() / init < 0.05) clean(); }
      });
      const stop = () => { rub = false; last = null; sp.classList.remove("on"); };
      cv.addEventListener("pointerup", stop); cv.addEventListener("pointercancel", stop);
      function clean() {
        busy = true; rub = false; sp.classList.remove("on"); washed++;
        c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, S, S);
        const [x, y] = pctOf(ctx, plate); ctx.add(2, x, y); ctx.sfx("big"); ctx.say("✨ Splendente!");
        pile.textContent = "🍽️ ".repeat(Math.min(8, washed)).trim();
        plate.className = "ck-plate out"; ctx.later(dirty, 380);
      }
      size(); dirty();
    }
  };

  /* ===== 9. CAMERETTA: trascina nella scatola giusta ===== */
  G.cameretta = {
    secs: 25, rate: 0.45,
    how: "Trascina ogni oggetto nella scatola giusta: giochi, vestiti o libri. Se la camera è tutta in ordine prendi un bonus!",
    start(ctx) {
      const CAT = { giochi: { icon: "🧸", label: "Giochi", it: ["🧸", "🪀", "🚗", "🧩", "⚽", "🪁", "🎲", "🤖"] }, vestiti: { icon: "👕", label: "Vestiti", it: ["🧦", "👕", "👟", "🧢", "👗", "🩳", "🧤", "🧣"] }, libri: { icon: "📚", label: "Libri", it: ["📕", "📘", "📗", "📙", "📒", "📓"] } };
      const root = mk("div", "cm"), floor = mk("div", "cm-floor"), boxes = mk("div", "cm-boxes"); root.append(floor, boxes); ctx.play.append(root);
      let sel = null;
      const bx = Object.keys(CAT).map((k) => { const b = btn("cm-box", "<span>" + CAT[k].icon + "</span><b>" + CAT[k].label + "</b>", () => { if (sel) drop(sel, k); }); b.dataset.cat = k; boxes.append(b); return b; });
      function mess() {
        const n = 5 + ctx.lv, cells = shuffle(Array.from({ length: 12 }, (_, i) => i)).slice(0, n);
        cells.forEach((cell) => {
          const k = pick(Object.keys(CAT)), e = mk("div", "cm-it", pick(CAT[k].it));
          e.dataset.cat = k; const cx = (cell % 3) * 30 + 20 + rnd(-7, 7), cy = Math.floor(cell / 3) * 15 + 12 + rnd(-4, 4);
          e.dataset.x = cx; e.dataset.y = cy; e.style.left = cx + "%"; e.style.top = cy + "%"; e.style.setProperty("--rot", rnd(-25, 25) + "deg");
          hook(e); root.append(e);
        });
      }
      function hook(e) {
        let sx = 0, sy = 0, moved = false;
        e.addEventListener("pointerdown", (ev) => { ev.preventDefault(); if (!ctx.alive()) return; sx = ev.clientX; sy = ev.clientY; moved = false; try { e.setPointerCapture(ev.pointerId); } catch (x) {} e.classList.add("drag"); });
        e.addEventListener("pointermove", (ev) => {
          if (!e.classList.contains("drag")) return;
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
          if (!moved) return;
          const r = root.getBoundingClientRect(); e.style.left = ((ev.clientX - r.left) / r.width) * 100 + "%"; e.style.top = ((ev.clientY - r.top) / r.height) * 100 + "%";
          bx.forEach((b) => { const q = b.getBoundingClientRect(); b.classList.toggle("over", ev.clientX >= q.left && ev.clientX <= q.right && ev.clientY >= q.top && ev.clientY <= q.bottom); });
        });
        e.addEventListener("pointerup", (ev) => {
          if (!e.classList.contains("drag")) return; e.classList.remove("drag"); bx.forEach((b) => b.classList.remove("over"));
          if (!moved) { if (sel) sel.classList.remove("sel"); sel = sel === e ? null : e; if (sel) { sel.classList.add("sel"); ctx.say("Ora tocca la scatola giusta"); } return; }
          const hit = bx.find((b) => { const q = b.getBoundingClientRect(); return ev.clientX >= q.left && ev.clientX <= q.right && ev.clientY >= q.top && ev.clientY <= q.bottom; });
          if (hit) drop(e, hit.dataset.cat); else back(e);
        });
      }
      function back(e) { e.style.left = e.dataset.x + "%"; e.style.top = e.dataset.y + "%"; }
      function drop(e, k) {
        if (!ctx.alive()) return;
        if (sel) { sel.classList.remove("sel"); sel = null; }
        const b = bx.find((x) => x.dataset.cat === k), [x, y] = pctOf(ctx, b);
        if (e.dataset.cat === k) {
          ctx.add(1, x, y - 8); ctx.sfx("ok"); e.classList.add("gone"); setTimeout(() => e.remove(), 250);
          b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit");
          if (!root.querySelectorAll(".cm-it:not(.gone)").length) { ctx.add(3, 50, 30); ctx.sfx("big"); ctx.say("Camera in ordine! ✨ +3"); ctx.later(mess, 500); }
        } else { ctx.add(-1, x, y - 8); ctx.sfx("bad"); ctx.say("Quello va in " + CAT[e.dataset.cat].label.toLowerCase() + "!"); back(e); }
      }
      mess();
    }
  };

  /* ===== 10. LUNA PARK: tiro a segno ===== */
  G.lunapark = {
    secs: 25, rate: 0.45,
    how: "Spara alle paperelle 🦆 che passano. La stella ⭐ vale 3, il clown 🤡 toglie 2. Hai 10 colpi per caricatore: non sprecarli!",
    start(ctx) {
      const root = mk("div", "lp"), ammo = mk("div", "lp-ammo"); root.append(ammo);
      const lanes = [18, 42, 66].map((top, i) => { const l = mk("div", "lp-lane"); l.style.top = top + "%"; root.insertBefore(l, ammo); return { top, dir: i % 2 ? -1 : 1 }; });
      ctx.play.append(root);
      let shots = 10, reload = false, ts = [], spawnT = 0;
      function hud() { ammo.innerHTML = reload ? "<b>🔄 Ricarico…</b>" : "<span>" + "●".repeat(shots) + "</span><i>" + "○".repeat(10 - shots) + "</i>"; }
      function spawn() {
        const L = pick(lanes), r = Math.random(), kind = r < 0.1 ? "star" : r < 0.28 ? "clown" : "duck";
        const e = mk("div", "lp-t " + kind + (kind === "duck" && L.dir > 0 ? " flip" : ""), kind === "star" ? "⭐" : kind === "clown" ? "🤡" : "🦆");
        const v = (16 + 4 * ctx.lv + rnd(0, 9)) * L.dir * (kind === "star" ? 1.5 : 1);
        const t = { e, x: L.dir > 0 ? -8 : 108, v, kind }; e.style.top = L.top + 9 + "%"; root.append(e); ts.push(t);
      }
      ctx.loop((dt) => {
        spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 0.85 - 0.08 * ctx.lv) * rnd(0.7, 1.2); }
        ts = ts.filter((t) => { t.x += t.v * dt; t.e.style.left = t.x + "%"; if (t.x < -12 || t.x > 112) { t.e.remove(); return false; } return true; });
      });
      root.addEventListener("pointerdown", (e) => {
        e.preventDefault(); if (!ctx.alive()) return;
        if (reload) { ctx.say("Ricarico… aspetta!"); return; }
        shots--; const [px, py] = pctXY(ctx, e.clientX, e.clientY);
        const boom = mk("div", "lp-boom", "💥"); const rr = root.getBoundingClientRect(); boom.style.left = e.clientX - rr.left + "px"; boom.style.top = e.clientY - rr.top + "px"; root.append(boom); setTimeout(() => boom.remove(), 400);
        const hitEl = e.target.closest ? e.target.closest(".lp-t") : null, t = hitEl && ts.find((x) => x.e === hitEl);
        if (t && !t.hit) {
          t.hit = true; const p = t.kind === "star" ? 3 : t.kind === "clown" ? -2 : 1;
          ctx.add(p, px, py - 6); ctx.sfx(p < 0 ? "bad" : p > 1 ? "big" : "ok"); if (t.kind === "clown") ctx.say("Povero clown! 🤡"); if (t.kind === "star") ctx.say("Stella! ⭐ +3");
          t.e.classList.add("down"); ts = ts.filter((x) => x !== t); setTimeout(() => t.e.remove(), 350);
        } else ctx.sfx("tick");
        if (shots <= 0) { reload = true; hud(); ctx.later(() => { shots = 10; reload = false; hud(); }, 900); }
        hud();
      });
      hud(); spawn();
    }
  };

  window.DCGames = Object.assign(G, {
    sfx, drum, fanfare, unlock: () => { try { ac(); } catch (e) {} },
    muted: () => muted, toggleMute: () => { muted = !muted; try { localStorage.setItem("dc_mute", muted ? "1" : "0"); } catch (e) {} return muted; }
  });
})();
