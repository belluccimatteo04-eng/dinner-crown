import { getStore } from "@netlify/blobs";
import { randomBytes, randomInt } from "node:crypto";

/* ===== REGOLE CONDIVISE: questo blocco è identico nell'app e nel server ===== */
const R_JOBS_BASE = ["pizzeria", "lavanderia", "officina", "biblioteca", "serra", "cucina", "cameretta"];
const R_JOB_LABEL = { pizzeria: "Lavora in pizzeria", lavanderia: "Lavora in lavanderia", officina: "Lavora in officina", biblioteca: "Lavora in biblioteca", serra: "Lavora nella serra", cucina: "Lava i piatti a casa", cameretta: "Metti in ordine la cameretta" };
const R_SECRETS = ["Zafferano", "Tartufo", "Cioccolato fondente", "Pistacchio", "Peperoncino", "Cannella", "Limone", "Menta", "Miele", "Rosmarino", "Cocco", "Lime"];
const R_WEAR = {
  cowboy: { slot: "hat", name: "Cappello da cowboy", price: 40 },
  pirata: { slot: "hat", name: "Cappello da pirata", price: 50 },
  elica: { slot: "hat", name: "Cappellino con l'elica", price: 35 },
  gatto: { slot: "hat", name: "Orecchie da gatto", price: 30 },
  coniglio: { slot: "hat", name: "Orecchie da coniglio", price: 30 },
  fiori: { slot: "hat", name: "Corona di fiori", price: 45 },
  mago: { slot: "hat", name: "Cappello da mago", price: 60 },
  vichingo: { slot: "hat", name: "Elmo vichingo", price: 70 },
  zucca: { slot: "hat", name: "Cappello a zucca", price: 35, event: "halloween" },
  babbo: { slot: "hat", name: "Cappello di Babbo Natale", price: 35, event: "natale" },
  paglia: { slot: "hat", name: "Cappello di paglia", price: 35, event: "estate" },
  tiara: { slot: "hat", name: "Tiara delle stelle", price: 0, reward: true },
  stelle: { slot: "face", name: "Occhiali a stella", price: 30 },
  baffi: { slot: "face", name: "Baffoni finti", price: 20 },
  clown: { slot: "face", name: "Naso da clown", price: 15 },
  maschera: { slot: "face", name: "Maschera da supereroe", price: 40 },
  cane: { slot: "pet", name: "Cagnolino", price: 80 },
  micio: { slot: "pet", name: "Gattino", price: 80 },
  coniglietto: { slot: "pet", name: "Coniglietto", price: 70 },
  pappagallo: { slot: "pet", name: "Pappagallo", price: 90 },
  tartaruga: { slot: "pet", name: "Tartaruga", price: 60 }
};
const R_STREAK = { 3: 10, 7: 25, 14: 50 };
const R_UNLOCKS = [{ k: "gelateria", need: 2 }, { k: "lunapark", need: 4 }, { k: "porto", need: 6 }];
function rHash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rRng(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function rEvent(day) { const md = String(day).slice(5); if (md >= "10-15" && md <= "11-02") return "halloween"; if (md >= "12-01" || md <= "01-06") return "natale"; if (md >= "06-15" && md <= "09-15") return "estate"; return null; }
function rMissions(day, mid, nMembers) {
  const r = rRng(rHash(day + "|" + mid));
  const coins = [3, 5, 8][Math.floor(r() * 3)];
  const job = R_JOBS_BASE[Math.floor(r() * R_JOBS_BASE.length)];
  const others = ["w2", "e20", "w3"].concat(nMembers > 1 ? ["g1"] : []);
  return ["c" + coins, "j_" + job, others[Math.floor(r() * others.length)]];
}
function rMissionText(k) {
  if (k === "c8") return "Trova tutte le 8 monete di oggi";
  if (/^c\d$/.test(k)) return "Trova " + k.slice(1) + " monete in città";
  if (k.indexOf("j_") === 0) return R_JOB_LABEL[k.slice(2)] || "Fai un lavoretto";
  return { w2: "Fai 2 lavoretti", w3: "Fai 3 lavoretti", e20: "Guadagna 20 monete oggi", g1: "Fai un regalo a un parente" }[k] || "";
}
function rMissionProgress(k, st) {
  if (/^c\d$/.test(k)) { const n = Number(k.slice(1)); return [Math.min(st.picks, n), n]; }
  if (k.indexOf("j_") === 0) return [st.jobs.indexOf(k.slice(2)) >= 0 ? 1 : 0, 1];
  if (k === "w2") return [Math.min(st.n, 2), 2];
  if (k === "w3") return [Math.min(st.n, 3), 3];
  if (k === "e20") return [Math.min(st.earned, 20), 20];
  if (k === "g1") return [Math.min(st.gifts, 1), 1];
  return [0, 1];
}
function rVoteTime(time) {
  /* telefoni giù per 90 minuti: poi si vota tutti insieme a tavola e parte la rivelazione */
  const p = String(time || "20:00").split(":").map(Number), t = p[0] * 60 + (p[1] || 0);
  const v = Math.min(t + 90, 23 * 60 + 59);
  return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
}
function rDayState(s, mid, today) {
  const pk = s.picks && s.picks[mid] && s.picks[mid].day === today ? s.picks[mid].ids : [];
  const w = s.work && s.work[mid] && s.work[mid].day === today ? s.work[mid] : { n: 0, jobs: [] };
  const dl = s.dl && s.dl[mid] && s.dl[mid].day === today ? s.dl[mid] : { earned: 0, gifts: 0, claimed: [] };
  return { picks: pk.length, jobs: w.jobs || [], n: w.n || 0, earned: dl.earned || 0, gifts: dl.gifts || 0, claimed: dl.claimed || [] };
}
function rDinnersDone(s, today) { return Object.keys(s.dinners || {}).filter((id) => id <= today && s.dinners[id] && s.dinners[id].dish).length; }
function rAddDays(day, n) { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
/* ===== FINE REGOLE CONDIVISE ===== */


// ===== CODICI DEL KIT =====
// Il codice stampato nel PDF. Serve per creare una famiglia.
// Per cambiarlo senza toccare questo file: variabile DC_KIT_CODES su Netlify (separati da virgola).
const DEFAULT_CODES = ["CHEFCROWN"];
// ==========================

const norm = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const codes = () => (process.env.DC_KIT_CODES ? process.env.DC_KIT_CODES.split(",") : DEFAULT_CODES).map(norm).filter(Boolean);

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FID = /^[a-z0-9]{10}$/;
const MID = /^[a-z0-9]{3,40}$/i;
const DEV = /^[a-z0-9]{6,40}$/i;
const AV_KEYS = ["skin", "face", "hair", "hairColor", "eyes", "eyeColor", "brows", "nose", "mouth", "beard", "glasses", "glassesColor", "acc", "accColor", "shirt", "pattern", "bg", "freckles", "blush"];
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const keyOf = (f) => "family/" + f;

// ===== GIOCO DELLA CASA =====
const JOBS_PER_DAY = 4;      // lavoretti al giorno per persona (ogni posto paga una volta al giorno)
const COINS_PER_DAY = 8;     // monete da trovare in città al giorno
const COIN_VALUE = 2;        // valore di ogni moneta trovata
const COIN_SPOTS = 16;       // posti possibili delle monete
const MAX_REWARD = 10;       // monete massime per lavoretto
const MAX_ITEMS = 10;        // ingredienti massimi nella lista della spesa
const HELP_COINS = 3;        // monete a chi compra davvero un ingrediente per lo chef
const CATS_V = [{ k: "g", w: 2 }, { k: "a", w: 1 }, { k: "f", w: 1 }];
function romeNow() {
  const p = {};
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
  return { day: p.year + "-" + p.month + "-" + p.day, hm: (p.hour === "24" ? "00" : p.hour) + ":" + p.minute };
}
const romeDay = () => romeNow().day;
const weekdayOf = (day) => new Date(day + "T12:00:00Z").getUTCDay();
function nextDinner(s) {
  const n = romeNow(), day = Number.isInteger(s.day) ? s.day : 3;
  let diff = (day - weekdayOf(n.day) + 7) % 7;
  if (diff === 0 && n.hm >= (s.time || "20:00")) diff = 7;
  return rAddDays(n.day, diff);
}
function dlOf(s, mid, today) { if (!s.dl[mid] || s.dl[mid].day !== today) s.dl[mid] = { day: today, earned: 0, gifts: 0, claimed: [] }; return s.dl[mid]; }
function earn(s, mid, amount) {
  if (!amount) return;
  s.coins[mid] = (s.coins[mid] || 0) + amount;
  dlOf(s, mid, romeDay()).earned += amount;
  const wk = nextDinner(s);
  s.wk[wk] = s.wk[wk] || {};
  s.wk[wk][mid] = (s.wk[wk][mid] || 0) + amount;
  const keys = Object.keys(s.wk).sort();
  while (keys.length > 10) delete s.wk[keys.shift()];
}
function own(s, mid, item) { const w = s.wear[mid] || (s.wear[mid] = { own: [], on: {} }); w.own = w.own || []; w.on = w.on || {}; if (!w.own.includes(item)) w.own.push(item); }
function streakTouch(s, mid) {
  const today = romeDay(), st = s.st[mid] || { last: "", n: 0, best: 0 };
  if (st.last === today) return;
  st.n = st.last === rAddDays(today, -1) ? st.n + 1 : 1;
  st.last = today; st.best = Math.max(st.best || 0, st.n); s.st[mid] = st;
  if (R_STREAK[st.n]) earn(s, mid, R_STREAK[st.n]);
  if (st.n === 14) own(s, mid, "tiara");
}
const isMember = (s, id) => MID.test(id || "") && s.members.some((m) => m.id === id);
function needMember(s, id) { if (!isMember(s, id)) throw new Error("chi sei? scegli il tuo personaggio"); }
export function priceOf(name) {
  const n = String(name || "").toLowerCase();
  let h = 0;
  for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const step = h % 5;
  if (/(sale|pepe|acqua|zucchero|aglio|basilico|rosmarino|lievito|olio|prezzemolo|cipolla)/.test(n)) return 8 + step * 2;
  if (/(carne|manzo|salmone|tonno|pesce|gamber|tartufo|guanciale|pecorino|parmigiano|pollo|funghi|ragù|ragu)/.test(n)) return 35 + step * 5;
  return 15 + step * 5;
}
function refundShop(s, d) { d.shop = []; }   // piatto cambiato: la lista riparte da zero
function addItem(d, name) {
  const n = str(name, 30);
  if (!n) throw new Error("scrivi un ingrediente");
  d.shop = d.shop || [];
  if (d.shop.length >= MAX_ITEMS) throw new Error("la lista è piena (10 ingredienti)");
  if (d.shop.some((it) => it.name.toLowerCase() === n.toLowerCase())) throw new Error("c'è già nella lista");
  d.shop.push({ id: "i" + randomBytes(4).toString("hex"), name: n, by: null, done: false });
}
function shopOpen(op, s) {
  if (!DAY.test(op.date || "")) throw new Error("data non valida");
  const d = s.dinners[op.date];
  if (!d || !d.dish) throw new Error("prima va deciso il piatto");
  if (op.date < romeDay()) throw new Error("la spesa per questa cena è chiusa");
  return d;
}

function newId() {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  const b = randomBytes(10);
  let s = "";
  for (let i = 0; i < 10; i++) s += abc[b[i] % abc.length];
  return s;
}
function cleanAv(av) {
  const o = {};
  AV_KEYS.forEach((k) => { const n = Number(av && av[k]); o[k] = Number.isInteger(n) && n >= 0 && n <= 20 ? n : 0; });
  return o;
}
function cleanMember(m) {
  const id = str(m && m.id, 40), name = str(m && m.name, 20);
  if (!MID.test(id) || !name) throw new Error("personaggio non valido");
  return { id, name, av: cleanAv(m.av) };
}

export function apply(s, op) {
  s.members = s.members || []; s.dinners = s.dinners || {}; s.votes = s.votes || {}; s.coins = s.coins || {}; s.work = s.work || {}; s.picks = s.picks || {};
  s.wear = s.wear || {}; s.dl = s.dl || {}; s.wk = s.wk || {}; s.st = s.st || {}; s.gifts = s.gifts || []; s.secret = s.secret || {}; s.pen = s.pen || {};
  s.rec = s.rec || {}; s.lv = s.lv || {}; s.best = s.best || {};
  switch (op && op.op) {
    case "settings": {
      const d = Number(op.day);
      if (Number.isInteger(d) && d >= 0 && d <= 6) s.day = d;
      if (typeof op.time === "string" && /^\d{2}:\d{2}$/.test(op.time)) s.time = op.time;
      if (typeof op.name === "string" && op.name.trim()) s.name = str(op.name, 30);
      return;
    }
    case "member": {
      const m = cleanMember(op.member);
      const i = s.members.findIndex((x) => x.id === m.id);
      if (i >= 0) s.members[i] = m;
      else { if (s.members.length >= 16) throw new Error("massimo 16 persone a tavola"); s.members.push(m); }
      return;
    }
    case "removeMember": {
      s.members = s.members.filter((x) => x.id !== op.id);
      return;
    }
    case "dinner": {
      if (!DAY.test(op.date || "")) throw new Error("data non valida");
      const dish = str(op.dish, 60);
      if (!dish) throw new Error("manca il piatto");
      const prev = s.dinners[op.date] || {};
      const keepSpin = prev.spin && prev.dish === dish;
      if (prev.dish && prev.dish !== dish) refundShop(s, prev);
      s.dinners[op.date] = Object.assign({}, prev, { chefId: str(op.chefId, 40), chefName: str(op.chefName, 20), dish, note: str(op.note, 120), rsvp: prev.rsvp || {}, wheel: prev.wheel || [], spin: keepSpin ? prev.spin : null, shop: prev.shop || [] });
      return;
    }
    case "chefOnly": {
      if (!DAY.test(op.date || "")) throw new Error("data non valida");
      const d = s.dinners[op.date] || (s.dinners[op.date] = { rsvp: {}, wheel: [] });
      d.chefId = str(op.chefId, 40); d.chefName = str(op.chefName, 20); d.note = str(op.note, 120);
      return;
    }
    case "wheelAdd": {
      if (!DAY.test(op.date || "") || !MID.test(op.mid || "")) throw new Error("proposta non valida");
      const dish = str(op.dish, 40);
      if (!dish) throw new Error("scrivi un piatto");
      const d = s.dinners[op.date] || (s.dinners[op.date] = { rsvp: {}, wheel: [] });
      d.wheel = d.wheel || [];
      if (d.spin) throw new Error("la ruota ha già girato");
      if (d.wheel.length >= 12) throw new Error("la ruota è piena (12 piatti)");
      if (d.wheel.filter((w) => w.by === op.mid).length >= 2) throw new Error("puoi proporre al massimo 2 piatti");
      if (d.wheel.some((w) => w.dish.toLowerCase() === dish.toLowerCase())) throw new Error("questo piatto è già sulla ruota");
      d.wheel.push({ id: "w" + randomBytes(4).toString("hex"), dish, by: op.mid });
      return;
    }
    case "wheelRemove": {
      const d = s.dinners[op.date];
      if (!d || !d.wheel) return;
      if (d.spin) throw new Error("la ruota ha già girato");
      d.wheel = d.wheel.filter((w) => w.id !== op.id);
      return;
    }
    case "spin": {
      if (!DAY.test(op.date || "")) throw new Error("data non valida");
      const d = s.dinners[op.date];
      if (!d || !d.wheel || d.wheel.length < 2) throw new Error("servono almeno 2 piatti sulla ruota");
      if (d.spin) throw new Error("la ruota ha già girato");
      const i = randomInt(0, d.wheel.length);
      d.spin = { id: d.wheel[i].id, at: new Date().toISOString(), jitter: (randomInt(0, 1001) / 1000) - 0.5, by: str(op.mid, 40) };
      if (d.dish && d.dish !== d.wheel[i].dish) refundShop(s, d);
      d.dish = d.wheel[i].dish;
      return;
    }
    case "wheelReset": {
      const d = s.dinners[op.date];
      if (!d) return;
      if (d.spin && d.dish === (d.wheel || []).find((w) => w.id === d.spin.id)?.dish) { d.dish = ""; refundShop(s, d); }
      d.spin = null;
      return;
    }
    case "rsvp": {
      if (!DAY.test(op.date || "") || !MID.test(op.mid || "")) throw new Error("risposta non valida");
      const d = s.dinners[op.date] || (s.dinners[op.date] = { rsvp: {} });
      d.rsvp = d.rsvp || {};
      if (op.v === 1 || op.v === 0) d.rsvp[op.mid] = op.v; else delete d.rsvp[op.mid];
      return;
    }
    case "work": {
      needMember(s, op.mid);
      const today = romeDay(), job = str(op.job, 20);
      if (!/^[a-z]{3,20}$/.test(job)) throw new Error("lavoro non valido");
      const lock = R_UNLOCKS.find((u) => u.k === job);
      if (lock && rDinnersDone(s, today) < lock.need) throw new Error("questo posto apre dopo " + lock.need + " cene insieme");
      const w = s.work[op.mid] && s.work[op.mid].day === today ? s.work[op.mid] : { day: today, n: 0, jobs: [] };
      w.jobs = w.jobs || [];
      const practice = !!op.practice;
      if (!practice) {
        if (w.n >= JOBS_PER_DAY) throw new Error("hai finito i lavoretti di oggi, torna domani");
        if (w.jobs.includes(job)) throw new Error("qui hai già lavorato oggi: prova un altro posto");
        w.n += 1; w.jobs.push(job); s.work[op.mid] = w;
      }
      const raw = Math.max(0, Math.min(999, Math.floor(Number(op.raw) || 0)));
      const plays = (s.lv[op.mid] || {})[job] || 0, lv = Math.min(5, 1 + Math.floor(plays / 3));
      let coins = practice ? 0 : Math.max(0, Math.min(8 + 2 * lv, Math.floor(Number(op.score) || 0)));
      const rec = s.rec[job];
      if (raw > 0 && (!rec || raw > rec.score)) {
        s.rec[job] = { mid: op.mid, score: raw, at: new Date().toISOString(), prev: rec ? { mid: rec.mid, score: rec.score } : null };
        if (!practice && rec && rec.mid !== op.mid) coins += 5;   // record rubato a un parente
      }
      s.best[op.mid] = s.best[op.mid] || {};
      if (raw > (s.best[op.mid][job] || 0)) s.best[op.mid][job] = raw;
      s.lv[op.mid] = s.lv[op.mid] || {}; s.lv[op.mid][job] = plays + 1;
      if (coins) earn(s, op.mid, coins);
      if (!practice) streakTouch(s, op.mid);
      return;
    }
    case "pick": {
      if (!MID.test(op.mid || "") || !s.members.some((m) => m.id === op.mid)) throw new Error("chi sei? scegli il tuo personaggio");
      const m = /^c(\d{1,2})$/.exec(op.spot || "");
      if (!m || Number(m[1]) >= COIN_SPOTS) throw new Error("moneta non valida");
      const today = romeDay();
      const pk = s.picks[op.mid] && s.picks[op.mid].day === today ? s.picks[op.mid] : { day: today, ids: [] };
      if (pk.ids.includes(op.spot)) throw new Error("questa moneta l'hai già presa");
      if (pk.ids.length >= COINS_PER_DAY) throw new Error("per oggi hai trovato tutte le monete");
      pk.ids.push(op.spot);
      s.picks[op.mid] = pk;
      earn(s, op.mid, COIN_VALUE);
      streakTouch(s, op.mid);
      return;
    }
    case "mission": {
      needMember(s, op.mid);
      const today = romeDay(), idx = Number(op.idx);
      if (![0, 1, 2].includes(idx)) throw new Error("missione non valida");
      const keys = rMissions(today, op.mid, s.members.length), st = rDayState(s, op.mid, today), pr = rMissionProgress(keys[idx], st);
      const dl = dlOf(s, op.mid, today);
      if (dl.claimed.includes(idx)) throw new Error("premio già ritirato");
      if (pr[0] < pr[1]) throw new Error("missione non ancora completata");
      dl.claimed.push(idx);
      earn(s, op.mid, 5);
      if (dl.claimed.length === 3) earn(s, op.mid, 10);
      return;
    }
    case "gift": {
      needMember(s, op.mid); needMember(s, op.to);
      if (op.mid === op.to) throw new Error("non puoi fare un regalo a te stesso");
      const amount = Number(op.amount);
      if (![5, 10, 20].includes(amount)) throw new Error("regalo non valido");
      if ((s.coins[op.mid] || 0) < amount) throw new Error("non hai abbastanza monete");
      s.coins[op.mid] -= amount;
      s.coins[op.to] = (s.coins[op.to] || 0) + amount;
      dlOf(s, op.mid, romeDay()).gifts += 1;
      s.gifts.unshift({ from: op.mid, to: op.to, coins: amount, at: new Date().toISOString() });
      s.gifts = s.gifts.slice(0, 30);
      return;
    }
    case "buyWear": {
      needMember(s, op.mid);
      const it = R_WEAR[op.item], to = op.to || op.mid;
      needMember(s, to);
      if (!it || it.reward) throw new Error("questo oggetto non è in vendita");
      if (it.event && rEvent(romeDay()) !== it.event) throw new Error("si compra solo durante l'evento");
      const w = s.wear[to];
      if (w && w.own && w.own.includes(op.item)) throw new Error(to === op.mid ? "ce l'hai già" : "ce l'ha già");
      if ((s.coins[op.mid] || 0) < it.price) throw new Error("non hai abbastanza monete");
      s.coins[op.mid] -= it.price;
      own(s, to, op.item);
      if (to !== op.mid) {
        dlOf(s, op.mid, romeDay()).gifts += 1;
        s.gifts.unshift({ from: op.mid, to, item: op.item, at: new Date().toISOString() });
        s.gifts = s.gifts.slice(0, 30);
      } else s.wear[to].on[it.slot] = op.item;
      return;
    }
    case "wear": {
      needMember(s, op.mid);
      const w = s.wear[op.mid] || (s.wear[op.mid] = { own: [], on: {} });
      w.on = w.on || {};
      const slot = ["hat", "face", "pet"].includes(op.slot) ? op.slot : null;
      if (!slot) throw new Error("posto non valido");
      if (!op.item) { delete w.on[slot]; return; }
      const it = R_WEAR[op.item];
      if (!it || it.slot !== slot || !(w.own || []).includes(op.item)) throw new Error("non ce l'hai ancora");
      w.on[slot] = op.item;
      return;
    }
    case "secret": {
      needMember(s, op.mid);
      if (!DAY.test(op.week || "") || op.week < romeDay()) throw new Error("ingrediente non valido");
      if (s.secret[op.week]) throw new Error("l'ingrediente segreto l'ha già trovato qualcuno");
      s.secret[op.week] = { by: op.mid, name: R_SECRETS[rHash(op.week) % R_SECRETS.length] };
      earn(s, op.mid, 15);
      const ks = Object.keys(s.secret).sort(); while (ks.length > 12) delete s.secret[ks.shift()];
      return;
    }
    case "penalty": {
      needMember(s, op.mid);
      const n = romeNow(), time = s.time || "20:00";
      if (weekdayOf(n.day) !== (Number.isInteger(s.day) ? s.day : 3) || n.hm < time || n.hm >= rVoteTime(time)) return;
      s.pen[n.day] = s.pen[n.day] || [];
      if (s.pen[n.day].includes(op.mid)) return;
      s.pen[n.day].push(op.mid);
      s.coins[op.mid] = Math.floor((s.coins[op.mid] || 0) / 2);
      const ks = Object.keys(s.pen).sort(); while (ks.length > 10) delete s.pen[ks.shift()];
      return;
    }
    case "shopAdd": {
      const d = shopOpen(op, s);
      addItem(d, op.name);
      return;
    }
    case "shopFill": {
      const d = shopOpen(op, s);
      if ((d.shop || []).length) throw new Error("la lista c'è già");
      (Array.isArray(op.names) ? op.names : []).slice(0, MAX_ITEMS).forEach((n) => { try { addItem(d, n); } catch (e) {} });
      return;
    }
    case "shopRemove": {
      const d = shopOpen(op, s);
      const it = (d.shop || []).find((x) => x.id === op.id);
      if (it && it.done) throw new Error("questo ingrediente è già stato preso");
      d.shop = (d.shop || []).filter((x) => x.id !== op.id);
      return;
    }
    case "claim": {
      const d = shopOpen(op, s);
      needMember(s, op.mid);
      const it = (d.shop || []).find((x) => x.id === op.id);
      if (!it) throw new Error("ingrediente non trovato");
      if (it.done) throw new Error("l'hanno già preso");
      it.by = it.by === op.mid ? null : op.mid;
      return;
    }
    case "buy": {
      const d = shopOpen(op, s);
      needMember(s, op.mid);
      const it = (d.shop || []).find((x) => x.id === op.id);
      if (!it) throw new Error("ingrediente non trovato");
      if (it.done) throw new Error("l'ha già preso qualcun altro");
      it.done = true; it.by = op.mid;
      earn(s, op.mid, HELP_COINS);   // aiutare in casa paga
      return;
    }
    case "pred": {
      needMember(s, op.mid);
      if (!DAY.test(op.date || "")) throw new Error("data non valida");
      const n = romeNow();
      if (op.date < n.day || (op.date === n.day && n.hm >= (s.time || "20:00"))) throw new Error("il pronostico si chiude quando inizia la cena");
      const d = s.dinners[op.date] || (s.dinners[op.date] = { rsvp: {}, wheel: [] });
      d.pred = d.pred || {};
      d.pred[op.mid] = Math.round(Math.max(1, Math.min(5, Number(op.v) || 0)) * 10) / 10;
      return;
    }
    case "predAward": {
      if (!DAY.test(op.date || "")) throw new Error("data non valida");
      const d = s.dinners[op.date];
      if (!d || d.predWin || !d.pred) return;
      const n = romeNow();
      if (op.date > n.day || (op.date === n.day && n.hm < rVoteTime(s.time || "20:00"))) return;
      const vs = Object.values(s.votes).filter((v) => v.dinner === op.date && v.stars >= 1 && v.stars <= 5);
      if (!vs.length) return;
      const avg = vs.reduce((a, v) => a + v.stars, 0) / vs.length;
      let best = null;
      Object.keys(d.pred).forEach((mid) => { const df = Math.abs(d.pred[mid] - avg); if (isMember(s, mid) && (!best || df < best.d)) best = { mid, v: d.pred[mid], d: df }; });
      if (!best) return;
      d.predWin = { mid: best.mid, v: best.v, avg };
      earn(s, best.mid, 10);
      return;
    }
    case "recipe": {
      if (!DAY.test(op.date || "")) throw new Error("data non valida");
      const d = s.dinners[op.date];
      if (!d) throw new Error("cena non trovata");
      d.recipe = { ing: String(op.ing || "").slice(0, 800), steps: String(op.steps || "").slice(0, 2000) };
      return;
    }
    case "photoSet": {   // usato dal server dopo aver salvato l'immagine
      const d = s.dinners[op.date] || (s.dinners[op.date] = { rsvp: {} });
      d.photo = typeof op.url === "string" && /^\/api\?ph=[a-z0-9]{10}_\d{4}-\d{2}-\d{2}&v=[a-z0-9]+$/.test(op.url) ? op.url : null;
      return;
    }
    case "vote": {
      if (!DAY.test(op.dinner || "") || !DEV.test(op.device || "")) throw new Error("voto non valido");
      let cat = null;
      if (op.cat && typeof op.cat === "object") {
        cat = {};
        for (const c of CATS_V) { const v = Number(op.cat[c.k]); if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error("dai un voto da 1 a 5 a ogni categoria"); cat[c.k] = v; }
      }
      const stars = cat ? Math.round(CATS_V.reduce((a, c) => a + c.w * cat[c.k], 0) / CATS_V.reduce((a, c) => a + c.w, 0) * 10) / 10 : Number(op.stars);
      if (!(stars >= 1 && stars <= 5)) throw new Error("le stelle vanno da 1 a 5");
      s.votes[op.dinner + "_" + op.device] = { dinner: op.dinner, stars, comment: str(op.comment, 400), cat };
      return;
    }
    default:
      throw new Error("azione sconosciuta");
  }
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req) => {
  try {
    const store = getStore({ name: "dinner-crown", consistency: "strong" });

    if (req.method === "GET") {
      const ph = new URL(req.url).searchParams.get("ph") || "";
      if (ph) {
        const pm = /^([a-z0-9]{10})_(\d{4}-\d{2}-\d{2})$/.exec(ph);
        if (!pm) return json({ error: "foto non valida" }, 400);
        const got = await store.getWithMetadata("photo/" + pm[1] + "/" + pm[2], { type: "arrayBuffer" });
        if (!got || !got.data) return new Response("", { status: 404 });
        return new Response(got.data, { headers: { "content-type": (got.metadata && got.metadata.type) || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
      }
      const f = (new URL(req.url).searchParams.get("f") || "").toLowerCase();
      if (!FID.test(f)) return json({ error: "link di famiglia non valido" }, 400);
      const s = await store.get(keyOf(f), { type: "json" });
      if (!s) return json({ error: "famiglia non trovata" }, 404);
      return json(s);
    }
    if (req.method !== "POST") return json({ error: "metodo non consentito" }, 405);

    let op;
    try { op = await req.json(); } catch { return json({ error: "richiesta non valida" }, 400); }

    if (op && op.op === "create") {
      const name = str(op.name, 30);
      if (!name) return json({ error: "manca il nome della famiglia" }, 400);
      if (!codes().includes(norm(op.code))) return json({ error: "Codice del kit non valido. Lo trovi a pagina 2 del kit" }, 403);
      for (let i = 0; i < 5; i++) {
        const id = newId();
        const state = { name, members: [], day: 3, time: "20:00", dinners: {}, votes: {}, created: new Date().toISOString() };
        const res = await store.setJSON(keyOf(id), state, { onlyIfNew: true });
        if (res && res.modified !== false) return json({ id });
      }
      return json({ error: "non sono riuscito a creare la famiglia, riprova" }, 500);
    }

    const f = String((op && op.f) || "").toLowerCase();
    if (!FID.test(f)) return json({ error: "link di famiglia non valido" }, 400);
    const key = keyOf(f);

    // Foto del piatto: l'immagine si salva a parte, nella famiglia resta solo il link
    if (op.op === "photo") {
      if (!DAY.test(op.date || "")) return json({ error: "data non valida" }, 400);
      if (!(await store.get(key))) return json({ error: "famiglia non trovata" }, 404);
      const pk = "photo/" + f + "/" + op.date;
      if (op.data) {
        const pm = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(op.data));
        if (!pm) return json({ error: "foto non valida" }, 400);
        const buf = Buffer.from(pm[2], "base64");
        if (buf.length > 1500000) return json({ error: "foto troppo grande" }, 400);
        await store.set(pk, new Blob([buf]), { metadata: { type: "image/" + pm[1] } });
        op = { op: "photoSet", date: op.date, url: "/api?ph=" + f + "_" + op.date + "&v=" + Date.now().toString(36) };
      } else {
        await store.delete(pk);
        op = { op: "photoSet", date: op.date, url: null };
      }
    }

    // Scrittura sicura: se due persone salvano nello stesso istante, si rilegge e si riprova.
    for (let i = 0; i < 8; i++) {
      const cur = await store.getWithMetadata(key, { type: "json" });
      if (!cur || !cur.data) return json({ error: "famiglia non trovata" }, 404);
      const s = cur.data;
      try { apply(s, op); } catch (e) { return json({ error: e.message }, 400); }
      let res;
      try {
        res = cur.etag ? await store.setJSON(key, s, { onlyIfMatch: cur.etag }) : await store.setJSON(key, s);
      } catch (e) {
        console.error("scrittura condizionata non riuscita", e);
        res = { modified: false };
      }
      if (res && res.modified !== false) return json(s);
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 320));
    }

    const last = await store.get(key, { type: "json" });
    if (!last) return json({ error: "famiglia non trovata" }, 404);
    apply(last, op);
    await store.setJSON(key, last);
    return json(last);
  } catch (e) {
    console.error(e);
    return json({ error: "database non raggiungibile (" + (e && e.message ? e.message : "errore sconosciuto") + ")" }, 500);
  }
};

export const config = { path: "/api" };
