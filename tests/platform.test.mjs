import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import { createRequire } from "node:module";
import { render, STATUSES } from "../supabase/functions/notify/templates.mjs";
const require = createRequire(import.meta.url), L = require("../lib.js"), I = require("../i18n.js"), G = require("../legal.js");
const q = { from: "BJM", to: "NBO", date: "2030-01-10", ret: "", ad: 1, ch: 0, inf: 0 };

test("recherche : cas valides et invalides", () => {
  assert.equal(L.validateSearch(q, "2030-01-01", false), "");
  assert.match(L.validateSearch({ ...q, to: "BJM" }, "2030-01-01", false), /différents/);
  assert.match(L.validateSearch({ ...q, date: "2029-12-31" }, "2030-01-01", false), /date de départ/);
  assert.match(L.validateSearch(q, "2030-01-01", true), /retour/);
  assert.match(L.validateSearch({ ...q, ret: "2030-01-05" }, "2030-01-01", true), /retour/);
  assert.match(L.validateSearch({ ...q, ad: 0 }, "2030-01-01", false), /adulte/);
  assert.match(L.validateSearch({ ...q, inf: 2 }, "2030-01-01", false), /bébé/);
  assert.match(L.validateSearch({ ...q, ad: 9, ch: 1 }, "2030-01-01", false), /Maximum 9/);
});
test("statuts : transitions interdites et états finaux", () => {
  assert.ok(L.canTransition("awaiting_payment", "paid")); assert.ok(!L.canTransition("ticketed", "paid"));
  assert.ok(!L.canTransition("created", "ticketed")); assert.ok(!L.canTransition("paid", "ticketed"));
  for (const s of ["ticketed", "expired", "refunded"]) assert.equal(L.TRANSITIONS[s].length, 0);
  assert.ok(!L.MANUAL.processing.includes("ticketed")); // l'émission exige la référence compagnie
});
test("les transitions du client correspondent à celles de la base SQL", () => {
  const sql = fs.readFileSync("supabase/001_schema.sql", "utf8"), body = sql.match(/ok := \(cur,p_to\) in \((.+?)\);/s)[1];
  const pairs = [...body.matchAll(/\('(\w+)','(\w+)'\)/g)].map(m => m[1] + ">" + m[2]).sort();
  const js = Object.entries(L.TRANSITIONS).flatMap(([a, l]) => l.map(b => a + ">" + b)).sort();
  assert.deepEqual(pairs, js);
});
test("traduction : statuts, actions, motifs dynamiques", () => {
  for (const k of Object.keys(L.STATUS)) { assert.notEqual(I.tr(L.STATUS[k], "en"), L.STATUS[k], k); assert.notEqual(I.tr(L.ACTION[k], "en"), L.ACTION[k], k); }
  assert.equal(I.tr("Passager 2 (enfant)", "en"), "Passenger 2 (child)");
  assert.equal(I.tr("Dubaï (DXB) — Émirats", "en"), "Dubai (DXB) — Emirates");
  assert.equal(I.tr("2030-01-10 · Économique · 2 passager(s)", "en"), "2030-01-10 · Economy · 2 passenger(s)");
  assert.match(I.tr("Les tarifs en temps réel ne sont pas encore connectés. Envoyez cette demande : un agent vérifie la disponibilité et vous communique le prix exact. Frais de service : 40,00 $US, ajoutés au prix du billet.", "en"), /^Live fares.+Service fee: 40,00 \$US, added/);
  assert.equal(I.tr("Texte inconnu", "en"), "Texte inconnu"); assert.equal(I.tr("Vols", "fr"), "Vols");
  for (const k of ["Maximum 9 passagers par demande.", "Il faut au moins un adulte."]) assert.notEqual(I.tr(k, "en"), k);
});
test("e-mails : FR/EN pour chaque statut, sans variable non remplie", () => {
  const v = { ref: "END-1", from: "BJM", to: "NBO", total: "100 $", ticket: "ABC123", site: "https://x", office: "Bureau", phone: "+257" };
  for (const lang of ["fr", "en"]) for (const s of STATUSES) { const m = render(s, lang, v); assert.ok(m, `${lang}/${s}`); assert.ok(!/[{}]/.test(m.subject + m.text), `${lang}/${s}`); assert.ok(m.text.includes("END-1")); }
  assert.notEqual(render("paid", "fr", v).text, render("paid", "en", v).text);
});
test("e-mails : jamais de billet émis sans référence compagnie; HTML échappé", () => {
  assert.equal(render("ticketed", "fr", { ref: "END-1" }), null);
  for (const s of STATUSES.filter(s => s !== "ticketed")) { assert.ok(!/Billet émis|Ticket issued/.test(render(s, "fr", {}).subject + render(s, "en", {}).subject)); }
  assert.ok(!render("created", "en", { ref: "<script>x</script>" }).html.includes("<script>"));
});
test("textes légaux : 4 documents, mêmes articles en FR et EN", () => {
  for (const k of ["cgu", "privacy", "refund", "mentions"]) { assert.ok(G.fr[k].a.length >= 5); assert.equal(G.fr[k].a.length, G.en[k].a.length, k); }
});
test("sécurité : aucun secret ni donnée de démonstration dans le client", () => {
  for (const f of ["app.js", "config.js", "index.html", "lib.js", "i18n.js", "legal.js"]) { const s = fs.readFileSync(f, "utf8"); assert.ok(!/service_role|sb_secret_|RESEND_API_KEY/.test(s), f); assert.ok(!/Démonstration|DemoProvider|demoMode/.test(s), f); }
  assert.match(fs.readFileSync("config.js", "utf8"), /sb_publishable_/);
});
test("parseAp : lignes valides uniquement", () => assert.deepEqual(L.parseAp("BJM|Bujumbura|Burundi\nxx|Bad|X\nNBO|Nairobi|Kenya"), [["BJM", "Bujumbura", "Burundi"], ["NBO", "Nairobi", "Kenya"]]));

test("auth : le client n'écrit jamais directement dans les tables sensibles", () => {
  const app = fs.readFileSync("app.js", "utf8");
  assert.ok(!/from\("(bookings|passengers|payments|profiles)"\)\s*\.(insert|update|upsert|delete)/.test(app));
  assert.match(fs.readFileSync("supabase/004_security.sql", "utf8"), /drop policy if exists b_ins on bookings/);
  assert.match(fs.readFileSync("supabase/002_backend.sql", "utf8"), /revoke execute on function create_booking[^;]+from public,anon/);
  assert.match(fs.readFileSync("app.js", "utf8"), /ev === "INITIAL_SESSION" \|\| uid === lastUid/);
});

test("agents : création réservée à l'admin côté serveur, jamais de rôle depuis le client", () => {
  const fn = fs.readFileSync("supabase/functions/create-agent/index.ts", "utf8"), app = fs.readFileSync("app.js", "utf8");
  assert.match(fn, /me\?\.role !== "admin"/); assert.match(fn, /role: "agent"/); assert.match(fn, /deleteUser/);
  assert.ok(!/service_role|SERVICE_ROLE/.test(app));
  for (const f of fs.readdirSync("supabase").filter(f => f.endsWith(".sql"))) assert.ok(!/raw_user_meta_data->>'role'/.test(fs.readFileSync("supabase/" + f, "utf8")), f);
  assert.ok(!/signUp\([^)]*role/.test(app));
  assert.match(fs.readFileSync("supabase/005_agents.sql", "utf8"), /is_admin\(\)/);
  for (const k of ["Gestion des agents", "Créer l'agent", "Les mots de passe ne correspondent pas."]) assert.notEqual(I.tr(k, "en"), k);
  assert.equal(I.tr("Retirer les droits agent de a@b.c ?", "en"), "Remove agent access for a@b.c?");
});

test("mot de passe oublié : code OTP par e-mail, sans révéler si le compte existe", () => {
  const app = fs.readFileSync("app.js", "utf8"), tpl = fs.readFileSync("supabase/email-templates/recovery.html", "utf8");
  assert.match(app, /resetPasswordForEmail/); assert.match(app, /verifyOtp\(\{ email: em, token: c, type: "recovery" \}\)/);
  assert.match(app, /resetting \|\| ev === "INITIAL_SESSION"/); assert.match(app, /href="#\/forgot"/);
  assert.ok(!/resetPasswordForEmail[^;]*\.error/.test(app)); // l'erreur n'est jamais affichée
  assert.ok(tpl.includes("{{ .Token }}") && !tpl.includes("ConfirmationURL") && /Password reset/.test(tpl) && /Réinitialisation/.test(tpl));
  for (const k of ["Mot de passe oublié", "Envoyer le code", "Code invalide ou expiré.", "Renvoyer le code"]) assert.notEqual(I.tr(k, "en"), k);
});
