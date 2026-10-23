import { getStore } from "@netlify/blobs";
import { randomBytes, randomInt } from "node:crypto";

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
  s.members = s.members || []; s.dinners = s.dinners || {}; s.votes = s.votes || {};
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
      s.dinners[op.date] = { chefId: str(op.chefId, 40), chefName: str(op.chefName, 20), dish, note: str(op.note, 120), rsvp: prev.rsvp || {}, wheel: prev.wheel || [], spin: keepSpin ? prev.spin : null };
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
      d.dish = d.wheel[i].dish;
      return;
    }
    case "wheelReset": {
      const d = s.dinners[op.date];
      if (!d) return;
      if (d.spin && d.dish === (d.wheel || []).find((w) => w.id === d.spin.id)?.dish) d.dish = "";
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
    case "vote": {
      if (!DAY.test(op.dinner || "") || !DEV.test(op.device || "")) throw new Error("voto non valido");
      const stars = Number(op.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error("le stelle vanno da 1 a 5");
      s.votes[op.dinner + "_" + op.device] = { dinner: op.dinner, stars, comment: str(op.comment, 400) };
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
