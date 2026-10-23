/* Dinner Crown — avatar system. window.DCAvatar.render(av, opts) -> SVG string. */
(function (g) {
  "use strict";

  const OPTS = {
    skin: ["#FFE4D2", "#F6CDAE", "#E9B489", "#D19764", "#A86C44", "#72442A"],
    face: ["Tondo", "Ovale", "Squadrato"],
    hair: ["Calvo", "Rasati", "Corti", "Spettinati", "Ricci", "Afro", "Caschetto", "Lunghi", "Codini", "Chignon", "Coda"],
    hairColor: ["#2A1D1A", "#5A3825", "#8B4F33", "#B5532A", "#E08A3C", "#F2C14E", "#C9C6CF", "#F4F1EC", "#E86A9A", "#4F7BD9"],
    eyes: ["Tondi", "Grandi", "Felici", "Occhiolino", "Assonnati"],
    eyeColor: ["#3B2A24", "#3E7BC4", "#4E9A5B", "#9A6A2B"],
    brows: ["Morbide", "Folte", "Alzate", "Decise", "Nessuna"],
    nose: ["Bottone", "Tondo", "Lungo", "Piccolo"],
    mouth: ["Sorriso", "Risata", "Sorrisone", "Linguaccia", "Stupito"],
    beard: ["Nessuna", "Barbetta", "Barba", "Barbone", "Baffi", "Pizzetto"],
    glasses: ["Nessuno", "Tondi", "Quadrati", "Da sole", "Cuore"],
    glassesColor: ["#E5412F", "#2A1D1A", "#3E7BC4", "#E99C00", "#A98BD9"],
    acc: ["Nessuno", "Cerchietto", "Fiocco", "Cappellino", "Berretto", "Fiore", "Cappello da chef"],
    accColor: ["#FFB21E", "#E5412F", "#4E9A5B", "#3E7BC4", "#E86A9A", "#A98BD9"],
    shirt: ["#E5412F", "#F2B33D", "#26324F", "#4E9A5B", "#A98BD9", "#3E7BC4", "#E86A9A", "#F2EDE4", "#2A1D1A"],
    pattern: ["Tinta unita", "Righe", "Pois", "Grembiule", "Salopette"],
    bg: ["#FCE3DD", "#FFE9B8", "#D6F1E0", "#DCE8FF", "#EADFFF", "#FFDCE6"],
    freckles: ["No", "Sì"],
    blush: ["No", "Sì"]
  };
  const KEYS = Object.keys(OPTS);

  const PRESETS = [
    { name: "Mamma", av: { skin: 1, face: 0, hair: 6, hairColor: 2, eyes: 0, eyeColor: 0, brows: 0, nose: 0, mouth: 0, beard: 0, glasses: 0, glassesColor: 0, acc: 1, accColor: 0, shirt: 1, pattern: 3, bg: 0, freckles: 0, blush: 1 } },
    { name: "Papà", av: { skin: 4, face: 2, hair: 4, hairColor: 0, eyes: 0, eyeColor: 0, brows: 1, nose: 1, mouth: 2, beard: 2, glasses: 0, glassesColor: 1, acc: 0, accColor: 0, shirt: 2, pattern: 0, bg: 1, freckles: 0, blush: 1 } },
    { name: "Figlia", av: { skin: 0, face: 0, hair: 8, hairColor: 3, eyes: 0, eyeColor: 0, brows: 0, nose: 3, mouth: 0, beard: 0, glasses: 0, glassesColor: 0, acc: 0, accColor: 4, shirt: 1, pattern: 4, bg: 2, freckles: 1, blush: 1 } },
    { name: "Figlio", av: { skin: 0, face: 0, hair: 3, hairColor: 5, eyes: 0, eyeColor: 1, brows: 0, nose: 0, mouth: 1, beard: 0, glasses: 0, glassesColor: 0, acc: 6, accColor: 0, shirt: 0, pattern: 1, bg: 2, freckles: 0, blush: 1 } },
    { name: "Nonna", av: { skin: 1, face: 1, hair: 9, hairColor: 6, eyes: 0, eyeColor: 0, brows: 0, nose: 1, mouth: 0, beard: 0, glasses: 1, glassesColor: 0, acc: 0, accColor: 4, shirt: 4, pattern: 0, bg: 0, freckles: 0, blush: 1 } },
    { name: "Nonno", av: { skin: 2, face: 2, hair: 1, hairColor: 6, eyes: 2, eyeColor: 0, brows: 1, nose: 2, mouth: 0, beard: 4, glasses: 2, glassesColor: 1, acc: 0, accColor: 2, shirt: 3, pattern: 0, bg: 1, freckles: 0, blush: 1 } }
  ];

  const DEFAULT = PRESETS[0].av;
  let uid = 0;

  function clean(av) {
    const o = {};
    KEYS.forEach(k => {
      const n = Number(av && av[k]);
      o[k] = Number.isInteger(n) && n >= 0 && n < OPTS[k].length ? n : (DEFAULT[k] || 0);
    });
    return o;
  }
  function pick(n) { return Math.floor(Math.random() * n); }
  function random() {
    const a = {};
    KEYS.forEach(k => { a[k] = pick(OPTS[k].length); });
    a.hairColor = Math.random() < .85 ? pick(8) : 8 + pick(2);
    a.beard = Math.random() < .3 ? 1 + pick(5) : 0;
    a.glasses = Math.random() < .3 ? 1 + pick(4) : 0;
    a.acc = Math.random() < .35 ? 1 + pick(6) : 0;
    a.freckles = Math.random() < .25 ? 1 : 0;
    a.blush = 1;
    if (a.hair === 0 && Math.random() < .5) a.hair = 2;
    return a;
  }

  /* colour helpers */
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r) { return "#" + r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function shade(h, amt) { const c = hex2rgb(h), t = amt < 0 ? 0 : 255, p = Math.abs(amt); return rgb2hex(c.map(v => v + (t - v) * p)); }

  const FACES = [
    { L: 50, R: 150, T: 40, B: 144, ex: 20, d: "M100 40 C128 40 150 62 150 92 C150 122 128 144 100 144 C72 144 50 122 50 92 C50 62 72 40 100 40 Z" },
    { L: 55, R: 145, T: 38, B: 150, ex: 18, d: "M100 38 C125 38 145 60 145 92 C145 126 125 150 100 150 C75 150 55 126 55 92 C55 60 75 38 100 38 Z" },
    { L: 50, R: 150, T: 42, B: 146, ex: 20, d: "M50 82 C50 54 68 42 100 42 C132 42 150 54 150 82 L150 112 C150 136 130 146 100 146 C70 146 50 136 50 112 Z" }
  ];

  function render(avIn, opts) {
    opts = opts || {};
    const av = clean(avIn);
    const id = "dca" + (++uid);
    const skin = OPTS.skin[av.skin], hc = OPTS.hairColor[av.hairColor], ec = OPTS.eyeColor[av.eyeColor];
    const shirt = OPTS.shirt[av.shirt], acc = OPTS.accColor[av.accColor], gc = OPTS.glassesColor[av.glassesColor];
    const F = FACES[av.face], L = F.L, R = F.R, T = F.T, B = F.B;
    const ey = 96, exL = 100 - F.ex, exR = 100 + F.ex;
    const dark = "#2B1B1E", skinShade = shade(skin, -.14), skinDeep = shade(skin, -.28);
    const browCol = av.hair === 0 ? shade(skin, -.55) : (av.hairColor >= 6 && av.hairColor <= 7 ? shade(hc, -.35) : shade(hc, -.18));
    let s = "";

    const defs = `<defs>
<radialGradient id="${id}f" cx="42%" cy="34%" r="70%"><stop offset="0" stop-color="${shade(skin, .22)}"/><stop offset=".62" stop-color="${skin}"/><stop offset="1" stop-color="${skinShade}"/></radialGradient>
<linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hc, .2)}"/><stop offset=".55" stop-color="${hc}"/><stop offset="1" stop-color="${shade(hc, -.18)}"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(shirt, .18)}"/><stop offset="1" stop-color="${shade(shirt, -.12)}"/></linearGradient>
<linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(acc, .22)}"/><stop offset="1" stop-color="${shade(acc, -.12)}"/></linearGradient>
<clipPath id="${id}c"><circle cx="100" cy="100" r="96"/></clipPath>
<clipPath id="${id}t"><path d="M26 200 C28 166 58 150 100 150 C142 150 172 166 174 200 Z"/></clipPath>
</defs>`;

    /* torso */
    let torso = `<path d="M26 200 C28 166 58 150 100 150 C142 150 172 166 174 200 Z" fill="url(#${id}s)"/>`;
    if (av.pattern === 1) { let st = ""; for (let y = 156; y < 200; y += 12) st += `<rect x="20" y="${y}" width="160" height="6" fill="#fff" opacity=".9"/>`; torso += `<g clip-path="url(#${id}t)">${st}</g>`; }
    if (av.pattern === 2) { let st = ""; for (let y = 160; y < 200; y += 13) for (let x = 30 + (y % 26 ? 6 : 0); x < 175; x += 13) st += `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" opacity=".85"/>`; torso += `<g clip-path="url(#${id}t)">${st}</g>`; }
    if (av.pattern === 3) torso += `<g clip-path="url(#${id}t)"><path d="M70 200 L72 162 C86 168 114 168 128 162 L130 200 Z" fill="#E5412F"/><path d="M72 162 L62 150 M128 162 L138 150" stroke="#E5412F" stroke-width="6" stroke-linecap="round"/><rect x="88" y="176" width="24" height="14" rx="4" fill="${shade("#E5412F", -.12)}"/></g>`;
    if (av.pattern === 4) torso += `<g clip-path="url(#${id}t)"><path d="M68 200 L70 168 L130 168 L132 200 Z" fill="#5B86C9"/><path d="M70 168 L58 152 M130 168 L142 152" stroke="#5B86C9" stroke-width="7" stroke-linecap="round"/><circle cx="76" cy="172" r="3" fill="#F2C14E"/><circle cx="124" cy="172" r="3" fill="#F2C14E"/></g>`;
    torso += `<path d="M84 151 Q100 166 116 151" fill="none" stroke="${shade(shirt, -.25)}" stroke-width="3" stroke-linecap="round"/>`;
    const neck = `<path d="M86 126 L114 126 L116 154 Q100 164 84 154 Z" fill="${skinShade}"/>`;

    /* hair back layer */
    let back = "";
    const H = `url(#${id}h)`;
    if (av.hair === 5) { // afro
      let bumps = ""; for (let i = 0; i < 14; i++) { const a = Math.PI * (0.95 + i / 13 * 1.1) ; bumps += `<circle cx="${100 + Math.cos(a) * 66}" cy="${T + 46 + Math.sin(a) * 60}" r="18"/>`; }
      back = `<g fill="${H}"><ellipse cx="100" cy="${T + 44}" rx="70" ry="64"/>${bumps}</g>`;
    }
    if (av.hair === 6) back = `<path fill="${H}" d="M${L - 10} ${T + 40} C${L - 12} ${T - 8} ${R + 12} ${T - 8} ${R + 10} ${T + 40} L${R + 10} ${T + 92} C${R + 10} ${T + 104} ${R - 6} ${T + 106} ${R - 8} ${T + 96} L${L + 8} ${T + 96} C${L + 6} ${T + 106} ${L - 10} ${T + 104} ${L - 10} ${T + 92} Z"/>`;
    if (av.hair === 7) back = `<path fill="${H}" d="M${L - 12} ${T + 44} C${L - 14} ${T - 8} ${R + 14} ${T - 8} ${R + 12} ${T + 44} L${R + 16} ${T + 146} C${R + 10} ${T + 158} ${L - 10} ${T + 158} ${L - 16} ${T + 146} Z"/>`;
    if (av.hair === 8) back = `<g fill="${H}"><circle cx="${L - 12}" cy="${T + 74}" r="21"/><circle cx="${L - 16}" cy="${T + 96}" r="15"/><circle cx="${R + 12}" cy="${T + 74}" r="21"/><circle cx="${R + 16}" cy="${T + 96}" r="15"/></g><g fill="${acc}"><circle cx="${L - 2}" cy="${T + 58}" r="6"/><circle cx="${R + 2}" cy="${T + 58}" r="6"/></g>`;
    if (av.hair === 9) back = `<circle cx="100" cy="${T - 12}" r="22" fill="${H}"/><path d="M84 ${T - 2} Q100 ${T + 4} 116 ${T - 2}" stroke="${acc}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`;
    if (av.hair === 10) back = `<path fill="${H}" d="M${R - 12} ${T + 14} C${R + 34} ${T + 12} ${R + 38} ${T + 86} ${R + 16} ${T + 124} C${R + 22} ${T + 84} ${R + 8} ${T + 50} ${R - 16} ${T + 34} Z"/><circle cx="${R + 2}" cy="${T + 22}" r="6" fill="${acc}"/>`;
    if (av.hair === 4) back = `<g fill="${H}"><circle cx="${L - 2}" cy="${T + 62}" r="14"/><circle cx="${R + 2}" cy="${T + 62}" r="14"/></g>`;

    /* ears + head */
    const ears = `<g fill="url(#${id}f)"><ellipse cx="${L + 1}" cy="100" rx="10" ry="13"/><ellipse cx="${R - 1}" cy="100" rx="10" ry="13"/></g><g fill="${skinDeep}" opacity=".35"><ellipse cx="${L + 1}" cy="101" rx="4.5" ry="7"/><ellipse cx="${R - 1}" cy="101" rx="4.5" ry="7"/></g>`;
    const head = `<path d="${F.d}" fill="url(#${id}f)"/>` + (av.hair === 0 ? `<ellipse cx="86" cy="${T + 14}" rx="16" ry="8" fill="#fff" opacity=".28" transform="rotate(-18 86 ${T + 14})"/>` : "");

    /* face */
    let face = "";
    if (av.blush) face += `<g fill="#FF6F6F" opacity=".3"><ellipse cx="${exL - 8}" cy="116" rx="10" ry="6"/><ellipse cx="${exR + 8}" cy="116" rx="10" ry="6"/></g>`;
    if (av.freckles) { const fc = shade(skin, -.38); [[-12, 108], [-6, 112], [-16, 114], [-8, 117]].forEach(p => { face += `<circle cx="${exL + p[0] + 4}" cy="${p[1]}" r="1.5" fill="${fc}" opacity=".7"/><circle cx="${exR - p[0] - 4}" cy="${p[1]}" r="1.5" fill="${fc}" opacity=".7"/>`; }); }

    function eye(x, side) {
      const t = av.eyes;
      if (t === 2 || (t === 3 && side > 0)) return `<path d="M${x - 7} ${ey + 2} Q${x} ${ey - 7} ${x + 7} ${ey + 2}" fill="none" stroke="${dark}" stroke-width="3.4" stroke-linecap="round"/>`;
      if (t === 4) return `<ellipse cx="${x}" cy="${ey + 2}" rx="7" ry="6" fill="${ec}"/><ellipse cx="${x}" cy="${ey + 2.5}" rx="4.3" ry="4" fill="#1A1113"/><path d="M${x - 9} ${ey - 13} L${x + 9} ${ey - 13} L${x + 9} ${ey} Q${x} ${ey - 3.5} ${x - 9} ${ey} Z" fill="${skin}"/><path d="M${x - 8} ${ey} Q${x} ${ey - 3} ${x + 8} ${ey}" fill="none" stroke="${dark}" stroke-width="2.6" stroke-linecap="round"/>`;
      const big = t === 1, rx = big ? 9 : 7, ry = big ? 10.5 : 8.6;
      return `<ellipse cx="${x}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${ec}"/><ellipse cx="${x}" cy="${ey + .6}" rx="${rx * .62}" ry="${ry * .64}" fill="#1A1113"/><circle cx="${x + rx * .32}" cy="${ey - ry * .32}" r="${big ? 3.2 : 2.5}" fill="#fff"/><circle cx="${x - rx * .3}" cy="${ey + ry * .38}" r="${big ? 1.6 : 1.1}" fill="#fff" opacity=".8"/>`;
    }
    face += eye(exL, -1) + eye(exR, 1);

    function brow(x, side) {
      const by = 80, b = av.brows;
      if (b === 4) return "";
      let d;
      if (b === 2) d = `M${x - 9} ${by - 2} Q${x} ${by - 9} ${x + 9} ${by - 3}`;
      else if (b === 3) d = side < 0 ? `M${x - 9} ${by - 3} L${x + 8} ${by + 2}` : `M${x - 8} ${by + 2} L${x + 9} ${by - 3}`;
      else d = `M${x - 9} ${by + 1} Q${x} ${by - 4} ${x + 9} ${by}`;
      return `<path d="${d}" fill="none" stroke="${browCol}" stroke-width="${b === 1 ? 6 : 3.8}" stroke-linecap="round"/>`;
    }
    face += brow(exL, -1) + brow(exR, 1);

    /* nose */
    const ny = 110;
    if (av.nose === 0) face += `<ellipse cx="100" cy="${ny}" rx="5" ry="4" fill="${skinShade}"/><circle cx="98.4" cy="${ny - 1.4}" r="1.3" fill="#fff" opacity=".45"/>`;
    if (av.nose === 1) face += `<circle cx="100" cy="${ny - 1}" r="7.6" fill="${shade(skin, -.07)}"/><circle cx="97.2" cy="${ny - 4}" r="2.2" fill="#fff" opacity=".45"/>`;
    if (av.nose === 2) face += `<ellipse cx="100" cy="${ny - 3}" rx="5.2" ry="9.5" fill="${shade(skin, -.08)}"/><circle cx="98.4" cy="${ny - 7}" r="1.6" fill="#fff" opacity=".4"/>`;
    if (av.nose === 3) face += `<ellipse cx="100" cy="${ny}" rx="3.2" ry="2.5" fill="${skinShade}"/>`;

    /* beard */
    const bc = av.hair === 0 ? shade(skin, -.5) : hc;
    const BD = `url(#${id}h)`;
    if (av.beard === 1) face += `<path d="M${L + 4} 104 Q${L + 6} ${B + 1} 100 ${B + 1} Q${R - 6} ${B + 1} ${R - 4} 104 Q${R - 12} 128 100 132 Q${L + 12} 128 ${L + 4} 104 Z" fill="${shade(bc, -.05)}" opacity=".32"/>`;
    if (av.beard === 2 || av.beard === 3) {
      const ext = av.beard === 3 ? 18 : 6;
      face += `<path fill="${av.hair === 0 ? bc : BD}" d="M${L + 1} 98 C${L + 1} ${B - 6 + ext} 74 ${B + 6 + ext} 100 ${B + 6 + ext} C126 ${B + 6 + ext} ${R - 1} ${B - 6 + ext} ${R - 1} 98 C${R - 6} 112 122 116 116 119 C110 115 90 115 84 119 C78 116 ${L + 6} 112 ${L + 1} 98 Z"/>`;
      face += `<path fill="${shade(bc, -.08)}" d="M100 117 C92 112 82 114 78 121 C86 121 94 120 100 119 C106 120 114 121 122 121 C118 114 108 112 100 117 Z"/>`;
    }
    if (av.beard === 4) face += `<path fill="${bc}" d="M100 117 C92 111 80 113 76 122 C80 124 88 121 100 119 C112 121 120 124 124 122 C120 113 108 111 100 117 Z"/>`;
    if (av.beard === 5) face += `<ellipse cx="100" cy="${B - 5}" rx="12" ry="9" fill="${bc}"/><path fill="${bc}" d="M100 117 C94 114 86 115 84 120 C90 120 96 119 100 119 C104 119 110 120 116 120 C114 115 106 114 100 117 Z"/>`;

    /* mouth */
    const my = 122, MD = "#6B1F24";
    if (av.mouth === 0) face += `<path d="M88 ${my} Q100 ${my + 10} 112 ${my}" fill="none" stroke="${MD}" stroke-width="3.4" stroke-linecap="round"/>`;
    if (av.mouth === 1) face += `<path d="M86 ${my - 2} Q100 ${my - 2} 114 ${my - 2} Q112 ${my + 16} 100 ${my + 16} Q88 ${my + 16} 86 ${my - 2} Z" fill="${MD}"/><path d="M92 ${my + 11} Q100 ${my + 6} 108 ${my + 11} Q104 ${my + 16} 100 ${my + 16} Q96 ${my + 16} 92 ${my + 11} Z" fill="#F07A86"/>`;
    if (av.mouth === 2) face += `<path d="M86 ${my - 2} Q100 ${my - 2} 114 ${my - 2} Q112 ${my + 14} 100 ${my + 14} Q88 ${my + 14} 86 ${my - 2} Z" fill="${MD}"/><path d="M87 ${my - 1.5} L113 ${my - 1.5} Q112 ${my + 4} 100 ${my + 4} Q88 ${my + 4} 87 ${my - 1.5} Z" fill="#fff"/>`;
    if (av.mouth === 3) face += `<path d="M94 ${my + 4} Q94 ${my + 15} 100 ${my + 15} Q106 ${my + 15} 106 ${my + 4} Z" fill="#F07A86"/><path d="M88 ${my} Q100 ${my + 9} 112 ${my}" fill="none" stroke="${MD}" stroke-width="3.4" stroke-linecap="round"/>`;
    if (av.mouth === 4) face += `<ellipse cx="100" cy="${my + 4}" rx="5.5" ry="6.5" fill="${MD}"/>`;

    /* front hair */
    let front = "";
    const hl = `<path d="M74 ${T + 2} Q92 ${T - 6} 110 ${T}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".22"/>`;
    const capPulled = `M${L - 2} ${T + 52} C${L - 4} ${T + 4} 74 ${T - 6} 100 ${T - 6} C126 ${T - 6} ${R + 4} ${T + 4} ${R + 2} ${T + 52} C${R - 4} ${T + 30} ${R - 18} ${T + 20} 100 ${T + 18} C82 ${T + 20} ${L + 4} ${T + 30} ${L - 2} ${T + 52} Z`;
    const centerPart = `M${L - 6} ${T + 62} C${L - 8} ${T + 2} 80 ${T - 8} 100 ${T - 6} C120 ${T - 8} ${R + 8} ${T + 2} ${R + 6} ${T + 62} C${R + 2} ${T + 40} ${R - 6} ${T + 26} 112 ${T + 16} C106 ${T + 12} 102 ${T + 8} 100 ${T + 6} C98 ${T + 8} 94 ${T + 12} 88 ${T + 16} C${L + 6} ${T + 26} ${L - 2} ${T + 40} ${L - 6} ${T + 62} Z`;
    switch (av.hair) {
      case 1: front = `<path fill="${H}" opacity=".92" d="M${L - 1} ${T + 40} C${L - 2} ${T + 4} 74 ${T - 4} 100 ${T - 4} C126 ${T - 4} ${R + 2} ${T + 4} ${R + 1} ${T + 40} C${R - 6} ${T + 22} ${R - 18} ${T + 14} 100 ${T + 13} C82 ${T + 14} ${L + 6} ${T + 22} ${L - 1} ${T + 40} Z"/>`; break;
      case 2: front = `<path fill="${H}" d="M${L - 2} ${T + 56} C${L - 6} ${T + 6} 72 ${T - 8} 102 ${T - 8} C134 ${T - 8} ${R + 6} ${T + 8} ${R + 2} ${T + 56} C${R - 2} ${T + 40} ${R - 8} ${T + 30} ${R - 14} ${T + 28} C128 ${T + 20} 110 ${T + 30} 92 ${T + 24} C80 ${T + 20} 66 ${T + 30} ${L + 8} ${T + 36} C${L + 4} ${T + 42} ${L + 2} ${T + 48} ${L - 2} ${T + 56} Z"/>` + hl; break;
      case 3: front = `<path fill="${H}" stroke="${H}" stroke-width="3" stroke-linejoin="round" d="M${L - 2} ${T + 52} L${L + 2} ${T + 10} L${L + 14} ${T + 4} L${L + 12} ${T - 12} L80 ${T - 2} L86 ${T - 20} L100 ${T - 6} L112 ${T - 22} L120 ${T - 4} L${R - 10} ${T - 14} L${R - 12} ${T + 4} L${R + 4} ${T + 8} L${R + 2} ${T + 52} C${R - 4} ${T + 34} ${R - 12} ${T + 28} ${R - 20} ${T + 30} L${R - 30} ${T + 22} L118 ${T + 32} L106 ${T + 20} L96 ${T + 32} L84 ${T + 20} L74 ${T + 32} L${L + 18} ${T + 24} C${L + 8} ${T + 30} ${L + 2} ${T + 38} ${L - 2} ${T + 52} Z"/>` + hl; break;
      case 4: case 5: {
        let c = `<path fill="${H}" d="${capPulled}"/>`;
        const pts = [[L, T + 46], [L + 4, T + 28], [L + 14, T + 14], [L + 30, T + 4], [88, T - 2], [112, T - 2], [R - 30, T + 4], [R - 14, T + 14], [R - 4, T + 28], [R, T + 46]];
        pts.forEach(p => { c += `<circle cx="${p[0]}" cy="${p[1]}" r="14" fill="${H}"/>`; });
        [[L + 18, T + 26], [L + 36, T + 18], [100, T + 16], [R - 36, T + 18], [R - 18, T + 26]].forEach(p => { c += `<circle cx="${p[0]}" cy="${p[1]}" r="11" fill="${H}"/>`; });
        front = c + hl; break;
      }
      case 6: front = `<path fill="${H}" d="M${L - 6} ${T + 60} C${L - 8} ${T + 4} 76 ${T - 8} 104 ${T - 8} C136 ${T - 8} ${R + 8} ${T + 10} ${R + 4} ${T + 58} C${R - 2} ${T + 40} ${R - 6} ${T + 30} ${R - 12} ${T + 26} C122 ${T + 30} 104 ${T + 26} 88 ${T + 18} C74 ${T + 30} ${L + 10} ${T + 40} ${L + 4} ${T + 60} Z"/>` + hl; break;
      case 7: case 8: front = `<path fill="${H}" d="${centerPart}"/>` + hl; break;
      case 9: case 10: front = `<path fill="${H}" d="${capPulled}"/>` + hl; break;
    }

    /* glasses */
    let gl = "";
    if (av.glasses) {
      const temples = `<path d="M${exL - 13} ${ey - 2} L${L + 2} ${ey - 4} M${exR + 13} ${ey - 2} L${R - 2} ${ey - 4}" stroke="${gc}" stroke-width="3" stroke-linecap="round"/>`;
      const bridge = `<path d="M${exL + 12} ${ey - 1} Q100 ${ey - 6} ${exR - 12} ${ey - 1}" fill="none" stroke="${gc}" stroke-width="3" stroke-linecap="round"/>`;
      if (av.glasses === 1) gl = temples + bridge + `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="3.6"><circle cx="${exL}" cy="${ey}" r="13"/><circle cx="${exR}" cy="${ey}" r="13"/></g>`;
      if (av.glasses === 2) gl = temples + bridge + `<g fill="#fff" fill-opacity=".18" stroke="${gc}" stroke-width="3.6"><rect x="${exL - 14}" y="${ey - 11}" width="28" height="22" rx="6"/><rect x="${exR - 14}" y="${ey - 11}" width="28" height="22" rx="6"/></g>`;
      if (av.glasses === 3) gl = temples + bridge + `<g fill="#1A1113" stroke="${gc}" stroke-width="3"><rect x="${exL - 15}" y="${ey - 10}" width="30" height="21" rx="9"/><rect x="${exR - 15}" y="${ey - 10}" width="30" height="21" rx="9"/></g><g stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"><path d="M${exL - 8} ${ey - 4} L${exL - 2} ${ey - 4}"/><path d="M${exR - 8} ${ey - 4} L${exR - 2} ${ey - 4}"/></g>`;
      if (av.glasses === 4) { const hp = x => `M${x} ${ey + 11} C${x - 20} ${ey - 1} ${x - 12} ${ey - 16} ${x} ${ey - 6} C${x + 12} ${ey - 16} ${x + 20} ${ey - 1} ${x} ${ey + 11} Z`; gl = temples + bridge + `<g fill="#FF7FA8" fill-opacity=".75" stroke="${gc}" stroke-width="3" stroke-linejoin="round"><path d="${hp(exL)}"/><path d="${hp(exR)}"/></g>`; }
    }

    /* accessory */
    let ac = "", crownY = T - 18;
    const A = `url(#${id}a)`;
    const hatHidden = opts.crown && (av.acc === 3 || av.acc === 4 || av.acc === 6);
    switch (hatHidden ? 0 : av.acc) {
      case 1: ac = `<path d="M${L + 2} ${T + 34} C${L + 8} ${T - 2} ${R - 8} ${T - 2} ${R - 2} ${T + 34}" fill="none" stroke="${A}" stroke-width="9" stroke-linecap="round"/>`; break;
      case 2: ac = `<g transform="translate(${R - 20} ${T + 8}) rotate(18)"><path d="M0 0 L-17 -11 L-17 11 Z M0 0 L17 -11 L17 11 Z" fill="${A}" stroke="${shade(acc, -.2)}" stroke-width="2" stroke-linejoin="round"/><circle r="5.5" fill="${shade(acc, -.12)}"/></g>`; break;
      case 3: ac = `<path d="M${L - 2} ${T + 36} C${L - 2} ${T - 16} ${R + 2} ${T - 16} ${R + 2} ${T + 36} Z" fill="${A}"/><path d="M${L + 2} ${T + 32} Q${R + 30} ${T + 30} ${R + 34} ${T + 40} Q${R + 6} ${T + 48} ${L + 2} ${T + 40} Z" fill="${shade(acc, -.2)}"/><circle cx="100" cy="${T - 10}" r="5" fill="${shade(acc, -.2)}"/><path d="M100 ${T - 8} L100 ${T + 34}" stroke="${shade(acc, -.15)}" stroke-width="2" opacity=".6"/>`; crownY = T - 34; break;
      case 4: ac = `<path d="M${L - 4} ${T + 40} C${L - 4} ${T - 14} ${R + 4} ${T - 14} ${R + 4} ${T + 40} Z" fill="${A}"/><path d="M${L - 6} ${T + 28} Q100 ${T + 18} ${R + 6} ${T + 28} L${R + 6} ${T + 44} Q100 ${T + 34} ${L - 6} ${T + 44} Z" fill="${shade(acc, -.16)}"/><circle cx="100" cy="${T - 16}" r="11" fill="#fff"/>`; crownY = T - 40; break;
      case 5: ac = `<g transform="translate(${R - 10} ${T + 30})">${[0, 72, 144, 216, 288].map(a => `<circle cx="${Math.cos(a * Math.PI / 180) * 7}" cy="${Math.sin(a * Math.PI / 180) * 7}" r="6.5" fill="${A}"/>`).join("")}<circle r="5" fill="#FFD23F"/></g>`; break;
      case 6: ac = `<g><path d="M${L + 10} ${T + 24} L${R - 10} ${T + 24} L${R - 8} ${T + 2} L${L + 8} ${T + 2} Z" fill="#F7F3EE" stroke="#E4DDD3" stroke-width="2"/><g fill="#FFFFFF" stroke="#E9E2D8" stroke-width="2"><circle cx="${L + 20}" cy="${T - 14}" r="19"/><circle cx="${R - 20}" cy="${T - 14}" r="19"/><circle cx="84" cy="${T - 32}" r="19"/><circle cx="116" cy="${T - 32}" r="19"/><circle cx="100" cy="${T - 18}" r="22"/></g><path d="M${L + 10} ${T + 6} L${R - 10} ${T + 6}" stroke="#E9E2D8" stroke-width="2"/></g>`; crownY = T - 66; break;
    }
    let crown = "";
    if (opts.crown) crown = `<g transform="translate(100 ${crownY}) rotate(-8)"><path d="M-30 14 L-26 -12 L-12 2 L0 -18 L12 2 L26 -12 L30 14 Z" fill="#FFB21E" stroke="#E99C00" stroke-width="3" stroke-linejoin="round"/><g fill="#E5412F"><circle cx="-26" cy="-13" r="3.6"/><circle cx="0" cy="-19" r="3.6"/><circle cx="26" cy="-13" r="3.6"/></g><path d="M-26 8 L26 8" stroke="#fff" stroke-width="2.4" opacity=".5"/></g>`;

    const bg = opts.badge === false ? "" : `<circle cx="100" cy="100" r="96" fill="${OPTS.bg[av.bg]}"/><circle cx="100" cy="100" r="96" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/>`;
    const body = opts.badge === false ? `${back}${neck}${torso}` : `<g clip-path="url(#${id}c)">${back}${neck}${torso}</g>`;
    const vb = opts.tight ? "10 18 180 182" : "0 -26 200 226";
    const label = opts.label ? ` role="img" aria-label="${String(opts.label).replace(/[&<>"]/g, "")}"` : ` aria-hidden="true"`;
    s = `<svg class="${opts.cls || "av"}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"${label}>${defs}${bg}${body}${ears}${head}${face}${front}${gl}${ac}${crown}</svg>`;
    return s;
  }

  g.DCAvatar = { OPTS, KEYS, PRESETS, render, clean, random, shade };

  /* ---------- Wheel of dishes (DOM-built, so user text is never parsed as markup) ---------- */
  const WCOLS = ["#E5412F", "#FFB21E", "#2E9D5B", "#3E7BC4", "#E86A9A", "#A98BD9"];
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function short(t, n) { t = String(t || ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function wheel(labels, opts) {
    opts = opts || {};
    const n = Math.max(labels.length, 1), R = 150, C = 160;
    const svg = el("svg", { viewBox: "0 0 320 336", class: "wheel-svg", role: "img", "aria-label": opts.aria || "Ruota dei piatti" });
    const rot = el("g", { class: "wheel-rot" });
    rot.style.transformOrigin = C + "px " + C + "px";
    rot.appendChild(el("circle", { cx: C, cy: C, r: R + 8, fill: "#3A1A1F" }));
    if (!labels.length) {
      rot.appendChild(el("circle", { cx: C, cy: C, r: R, fill: "#FDF2EC" }));
    } else if (n === 1) {
      rot.appendChild(el("circle", { cx: C, cy: C, r: R, fill: WCOLS[0] }));
    } else {
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
        const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0), x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
        const col = WCOLS[(n % WCOLS.length === 1 && i === n - 1) ? 2 : i % WCOLS.length];
        rot.appendChild(el("path", { d: `M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${n === 2 ? 1 : 0} 1 ${x1} ${y1} Z`, fill: col, stroke: "#fff", "stroke-width": 3 }));
      }
    }
    labels.forEach((lab, i) => {
      const mid = ((i + .5) / n) * 360;
      const t = el("text", { x: C, y: C - R * .58, "text-anchor": "middle", "dominant-baseline": "middle", fill: (i % WCOLS.length === 1) ? "#3A1A1F" : "#fff", "font-family": "Nunito, sans-serif", "font-weight": "800", "font-size": n > 8 ? 11 : n > 5 ? 12.5 : 14, transform: `rotate(${mid} ${C} ${C}) rotate(-90 ${C} ${C - R * .58})` });
      t.textContent = short(lab, n > 8 ? 12 : 16);
      rot.appendChild(t);
    });
    for (let i = 0; i < 24; i++) { const a = i / 24 * 2 * Math.PI; rot.appendChild(el("circle", { cx: C + (R + 4) * Math.cos(a), cy: C + (R + 4) * Math.sin(a), r: 2.4, fill: i % 2 ? "#FFB21E" : "#fff" })); }
    svg.appendChild(rot);
    svg.appendChild(el("circle", { cx: C, cy: C, r: 26, fill: "#fff", stroke: "#3A1A1F", "stroke-width": 5 }));
    const crown = el("path", { d: "M-14 7 L-12 -6 L-5 1 L0 -9 L5 1 L12 -6 L14 7 Z", fill: "#FFB21E", stroke: "#E99C00", "stroke-width": 1.6, "stroke-linejoin": "round", transform: `translate(${C} ${C + 1})` });
    svg.appendChild(crown);
    svg.appendChild(el("path", { d: `M${C - 16} 2 L${C + 16} 2 L${C} 34 Z`, fill: "#FFB21E", stroke: "#3A1A1F", "stroke-width": 4, "stroke-linejoin": "round" }));
    return svg;
  }
  /* rotation (deg) that brings segment `index` under the top pointer; jitter in -0.5..0.5 of a segment */
  function angleFor(index, n, jitter, turns) {
    const seg = 360 / n, centre = (index + .5) * seg + (jitter || 0) * seg * .7;
    return (turns == null ? 6 : turns) * 360 - centre;
  }
  g.DCWheel = { wheel, angleFor, COLORS: WCOLS };
})(window);
