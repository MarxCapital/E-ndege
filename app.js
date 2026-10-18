"use strict";
const C = window.ENDEGE, $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sb = window.supabase.createClient(C.supabase.url, C.supabase.anonKey);
const EL = window.EndegeLib, I18N = window.EndegeI18n, LEGALS = window.EndegeLegal, LANG = I18N.lang(), T = x => I18N.tr(x, LANG), LOC = LANG === "en" ? "en-GB" : "fr-FR";
let AIRPORTS = [["BJM", "Bujumbura", "Burundi"], ["KGL", "Kigali", "Rwanda"], ["EBB", "Entebbe", "Ouganda"], ["NBO", "Nairobi", "Kenya"], ["DAR", "Dar es Salaam", "Tanzanie"], ["ADD", "Addis-Abeba", "Éthiopie"], ["DXB", "Dubaï", "Émirats"], ["DOH", "Doha", "Qatar"], ["IST", "Istanbul", "Turquie"], ["BRU", "Bruxelles", "Belgique"], ["CDG", "Paris", "France"], ["JNB", "Johannesburg", "Afrique du Sud"]];

const DEF = { hero_title: "Des rêves à la destination", hero_text: "Demandez votre billet au départ ou à destination du Burundi. Un agent de Dream Way Company établit votre tarif et vous accompagne jusqu'à l'émission.", hero_image: "", steps_title: "Comment ça marche",
  steps: [{ t: "1. Décrivez votre voyage", d: "Trajet, dates, passagers." }, { t: "2. Recevez votre tarif", d: "Un agent vérifie auprès des compagnies et fixe le prix, frais de service inclus et détaillés." }, { t: "3. Payez et suivez", d: "Paiement au bureau avec votre référence. Le billet n'est « émis » qu'après confirmation de la compagnie." }],
  notice: "", phone: C.phone, email: C.email, address: C.officeAddress, airports: AIRPORTS.map(a => a.join("|")).join("\n") };
let CONTENT = { ...DEF }, CONTENTS = { fr: CONTENT, en: CONTENT };
const parseAp = EL.parseAp;
async function loadContent() {
  const r = await sb.from("site_content").select("key,value").in("key", ["home", "home_en"]), v = Object.fromEntries((r.data || []).map(x => [x.key, x.value]));
  const fr = { ...DEF, ...(v.home || {}) }, t = x => I18N.tr(x, "en");
  const en = { ...fr, hero_title: t(fr.hero_title), hero_text: t(fr.hero_text), steps_title: t(fr.steps_title), notice: t(fr.notice), steps: fr.steps.map(p => ({ t: t(p.t), d: t(p.d) })), ...(v.home_en || {}) };
  CONTENTS = { fr, en }; CONTENT = CONTENTS[LANG]; const ap = parseAp(fr.airports); if (ap.length > 1) AIRPORTS = ap;
  document.querySelectorAll("[data-cfg]").forEach(n => n.textContent = CONTENT[n.dataset.cfg]);
}
const apName = c => { const a = AIRPORTS.find(x => x[0] === c); return a ? `${a[1]} (${a[0]})` : esc(c); };
const { STATUS, ACTION } = EL, NEXT = EL.MANUAL;
const money = (v, c) => new Intl.NumberFormat(LOC, { style: "currency", currency: c || "USD" }).format(v);
const fdt = d => new Date(d).toLocaleString(LOC);
let me = null, role = null, query = null, nextHash = "#/";
const staff = () => role === "agent" || role === "admin";
const render = h => { $("#main").innerHTML = h; $("#main").focus({ preventScroll: true }); scrollTo(0, 0); };
const go = h => { location.hash = h; };
const fail = e => { console.error(e); return "Action impossible pour le moment. Vérifiez vos informations ou réessayez."; };
const tag = s => `<span class="tag ${s === "ticketed" || s === "refunded" ? "ok" : s === "failed" || s === "expired" ? "bad" : ""}">${STATUS[s]}</span>`;

async function loadUser() {
  const { data } = await sb.auth.getSession(); me = data.session?.user || null; role = null;
  if (me) { const r = await sb.from("profiles").select("role").eq("id", me.id).maybeSingle(); role = r.data?.role || "customer"; }
  $("#auth").innerHTML = me ? `<a href="#/account">Mes demandes</a>${staff() ? `<a href="#/admin">Agence</a>` : ""}<a href="#" id="lo">Déconnexion</a>` : `<a href="#/login">Connexion</a>`;
  const lo = $("#lo"); if (lo) lo.onclick = async e => { e.preventDefault(); await sb.auth.signOut(); };
}
const V = {};
const opts = sel => AIRPORTS.map(a => `<option value="${a[0]}" ${a[0] === sel ? "selected" : ""}>${esc(a[1])} (${a[0]}) — ${esc(a[2])}</option>`).join("");

V.home = () => {
  const t = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  render(`<section class="hero"><div class="wrap"><svg class="arc" viewBox="0 0 520 300" aria-hidden="true"><path d="M10 280C140 40 380 10 510 60" fill="none" stroke="#C9A96E" stroke-width="2" stroke-dasharray="6 8"/></svg>
<h1>${esc(CONTENT.hero_title)}</h1><p>${esc(CONTENT.hero_text)}</p></div></section>${role === "admin" ? `<div class="wrap"><a class="btn alt" href="#/content">Modifier cette page</a></div>` : ""}
<form class="search" id="sf" novalidate aria-label="Demande de vol">
<div class="seg" role="radiogroup" aria-label="Type de trajet"><label><input type="radio" name="trip" value="ow"> Aller simple</label><label><input type="radio" name="trip" value="rt" checked> Aller-retour</label></div>
<div class="grid"><div><label for="from">Départ</label><select id="from">${opts("BJM")}</select></div><div><label for="to">Destination</label><select id="to">${opts("NBO")}</select></div>
<div><label for="date">Date de départ</label><input id="date" type="date" min="${t}" value="${t}"></div><div id="rw"><label for="ret">Date de retour</label><input id="ret" type="date" min="${t}"></div>
<div><label for="ad">Adultes (12 ans et +)</label><input id="ad" type="number" min="1" max="9" value="1"></div><div><label for="ch">Enfants (2–11 ans)</label><input id="ch" type="number" min="0" max="8" value="0"></div>
<div><label for="inf">Bébés (moins de 2 ans)</label><input id="inf" type="number" min="0" max="4" value="0"></div>
<div><label for="cls">Classe</label><select id="cls"><option value="Économique">Économique</option><option value="Premium économique">Premium économique</option><option value="Affaires">Affaires</option><option value="Première">Première</option></select></div></div>
<p class="err" id="e" role="alert"></p><button class="btn" type="submit">Continuer</button></form>
${CONTENT.notice ? `<div class="wrap"><div class="banner">${esc(CONTENT.notice)}</div></div>` : ""}<div class="wrap"><h2>${esc(CONTENT.steps_title)}</h2><div class="steps">${CONTENT.steps.map(p => `<div class="card"><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></div>`).join("")}</div></div>`);
  const hi = CONTENT.hero_image; if (/^https:\/\/[^"'()\s]+$/.test(hi)) Object.assign($(".hero").style, { backgroundImage: `linear-gradient(rgba(11,31,58,.72),rgba(11,31,58,.88)),url("${hi}")`, backgroundSize: "cover", backgroundPosition: "center" });
  const upd = () => $("#rw").hidden = document.querySelector("[name=trip]:checked").value === "ow";
  document.querySelectorAll("[name=trip]").forEach(r => r.onchange = upd); upd();
  $("#sf").onsubmit = e => {
    e.preventDefault();
    const q = { from: $("#from").value, to: $("#to").value, date: $("#date").value, ret: $("#rw").hidden ? "" : $("#ret").value, ad: +$("#ad").value, ch: +$("#ch").value, inf: +$("#inf").value, cls: $("#cls").value };
    const today = new Date().toISOString().slice(0, 10), m = EL.validateSearch(q, today, !$("#rw").hidden);
    $("#e").textContent = m; if (m) return; query = q; go("#/new");
  };
};

V.new = async () => {
  if (!query) return go("#/");
  if (!me) { nextHash = "#/new"; return go("#/login"); }
  const q = query, key = crypto.randomUUID();
  const f = (await sb.from("settings").select("value").eq("key", "service_fee").maybeSingle()).data?.value;
  const kinds = [...Array(q.ad).fill("adult"), ...Array(q.ch).fill("child"), ...Array(q.inf).fill("infant")], KL = { adult: "adulte", child: "enfant", infant: "bébé" };
  const n = q.ad + q.ch, fee = f ? (f.per_ticket ? f.amount * n : f.amount) : null;
  render(`<div class="wrap"><h2>${apName(q.from)} → ${apName(q.to)}</h2><p class="mute">${esc(q.date)}${q.ret ? " → " + esc(q.ret) : ""} · ${esc(q.cls)} · ${kinds.length} passager(s)</p>
<div class="banner">Les tarifs en temps réel ne sont pas encore connectés. Envoyez cette demande : un agent vérifie la disponibilité et vous communique le prix exact.${fee != null ? ` Frais de service : ${money(fee, f.currency)}, ajoutés au prix du billet.` : ""}</div>
<form id="bf" novalidate>${kinds.map((k, i) => `<fieldset class="card"><legend>Passager ${i + 1} (${KL[k]})</legend><div class="grid"><div><label for="fn${i}">Prénom (comme sur le passeport)</label><input id="fn${i}" required maxlength="80" autocomplete="given-name"></div><div><label for="ln${i}">Nom</label><input id="ln${i}" required maxlength="80"></div><div><label for="bd${i}">Date de naissance</label><input id="bd${i}" type="date" required max="${new Date().toISOString().slice(0, 10)}"></div></div></fieldset>`).join("")}
<div class="grid"><div><label for="ph">Téléphone (WhatsApp si possible)</label><input id="ph" type="tel" required maxlength="30" autocomplete="tel"></div></div>
<label><input type="checkbox" id="ok" style="width:auto"> J'ai lu les <a href="#/legal/cgu" target="_blank">conditions</a> et les noms sont exacts.</label>
<p class="err" id="e" role="alert"></p><button class="btn" id="go" type="submit">Envoyer ma demande</button></form></div>`);
  $("#bf").onsubmit = async e => {
    e.preventDefault(); const bad = [...e.target.querySelectorAll("[required]")].some(i => !i.value.trim() || !i.checkValidity());
    if (bad) return $("#e").textContent = "Complétez tous les champs avec des valeurs valides.";
    if (!$("#ok").checked) return $("#e").textContent = "Acceptez les conditions pour continuer.";
    $("#go").disabled = true; $("#e").textContent = "";
    const pax = kinds.map((k, i) => ({ kind: k, first_name: $("#fn" + i).value.trim(), last_name: $("#ln" + i).value.trim(), birth_date: $("#bd" + i).value }));
    const trip = { ...q, lang: LANG, contact: { email: me.email, phone: $("#ph").value.trim() } };
    const { data, error } = await sb.rpc("create_booking", { p_trip: trip, p_pax: pax, p_key: key });
    if (error) { $("#e").textContent = fail(error); return $("#go").disabled = false; }
    query = null; go("#/request/" + data);
  };
};

V.login = (mode = "in") => {
  if (me) { const h = nextHash; nextHash = "#/"; return go(h); }
  render(`<div class="wrap" style="max-width:420px"><h2>${mode === "in" ? "Connexion" : "Créer un compte"}</h2><form id="lf" novalidate>
${mode === "up" ? `<label for="nm">Nom complet</label><input id="nm" required maxlength="100" autocomplete="name">` : ""}
<label for="em">E-mail</label><input id="em" type="email" required autocomplete="email"><label for="pw">Mot de passe (8 caractères minimum)</label><input id="pw" type="password" required minlength="8" autocomplete="${mode === "in" ? "current-password" : "new-password"}">
<p class="err" id="e" role="alert"></p><p class="ok-msg" id="m" role="status"></p><button class="btn" id="go" type="submit">${mode === "in" ? "Se connecter" : "Créer mon compte"}</button></form>
${mode === "in" ? `<p><a href="#/forgot">Mot de passe oublié ?</a></p>` : ""}<p><a href="#/login${mode === "in" ? "/up" : ""}">${mode === "in" ? "Pas de compte ? Créer un compte" : "Déjà inscrit ? Se connecter"}</a></p></div>`);
  $("#lf").onsubmit = async e => {
    e.preventDefault(); if (![...e.target.querySelectorAll("[required]")].every(i => i.checkValidity())) return $("#e").textContent = "Vérifiez l'e-mail et le mot de passe (8 caractères minimum).";
    $("#go").disabled = true; $("#e").textContent = ""; const em = $("#em").value.trim(), pw = $("#pw").value;
    const r = mode === "in" ? await sb.auth.signInWithPassword({ email: em, password: pw }) : await sb.auth.signUp({ email: em, password: pw, options: { data: { full_name: $("#nm").value.trim() } } });
    if (r.error) { console.error(r.error); $("#e").textContent = mode === "in" ? "E-mail ou mot de passe incorrect." : "Création impossible. Vérifiez vos informations."; return $("#go").disabled = false; }
    if (mode === "up" && r.data.user && r.data.user.identities?.length === 0) { $("#e").textContent = "Cette adresse e-mail est déjà utilisée. Connectez-vous."; return $("#go").disabled = false; }
    if (!r.data.session) { $("#m").textContent = "Compte créé. Confirmez votre e-mail via le lien reçu, puis connectez-vous."; $("#go").disabled = false; }
  };
};

const BK = "*,profiles(full_name,phone),passengers(*),booking_history(*),payments(*)";
function detail(b, adm) {
  const o = b.offer || {}, fee = Number(b.service_fee || 0), tp = b.ticket_price != null ? Number(b.ticket_price) : null;
  return `<div class="card"><p>${tag(b.status)}</p><p>${esc(ACTION[b.status])}</p><p><strong>${apName(o.from)} → ${apName(o.to)}</strong><br>${esc(o.date)}${o.ret ? " → " + esc(o.ret) : ""} · ${esc(o.cls)}</p>
${tp == null ? `<p class="mute">Tarif en cours d'établissement par un agent.</p>` : `<table><tr><td>Billet</td><td>${money(tp, b.currency)}</td></tr><tr><td>Frais de service</td><td>${money(fee, b.currency)}</td></tr><tr><th>Total</th><th>${money(tp + fee + Number(b.payment_fee || 0), b.currency)}</th></tr></table>`}
${b.provider_ticket_ref ? `<p>Référence compagnie : <strong>${esc(b.provider_ticket_ref)}</strong></p>` : ""}
${b.status === "awaiting_payment" ? `<p>Paiement au bureau : ${esc(CONTENT.address)} — ${esc(CONTENT.phone)}. Indiquez <strong>${esc(b.reference)}</strong>.</p>` : ""}</div>
<h3>Passagers</h3><div class="tw"><table>${(b.passengers || []).map(p => `<tr><td>${esc(p.first_name)} ${esc(p.last_name)}</td><td>${({ adult: "adulte", child: "enfant", infant: "bébé" })[p.kind]}</td><td>${adm ? esc(p.birth_date) : ""}</td></tr>`).join("")}</table></div>
<h3>Historique</h3><div class="tw"><table>${[...(b.booking_history || [])].sort((a, c) => new Date(a.at) - new Date(c.at)).map(h => `<tr><td>${fdt(h.at)}</td><td>${STATUS[h.to_status]}</td></tr>`).join("")}</table></div>`;
}
V.account = async () => {
  if (!me) { nextHash = "#/account"; return go("#/login"); }
  render(`<div class="wrap"><h2>Mes demandes</h2><p class="mute" role="status">Chargement…</p></div>`);
  const { data, error } = await sb.from("bookings").select("reference,status,created_at,offer").eq("user_id", me.id).order("created_at", { ascending: false });
  render(`<div class="wrap"><h2>Mes demandes</h2><p class="mute">${esc(me.email)}</p>${error ? `<p class="err">Chargement impossible. Réessayez.</p>` : data.length ? data.map(b => `<a class="card link" href="#/request/${esc(b.reference)}"><strong>${esc(b.reference)}</strong> ${tag(b.status)}<div class="mute">${apName(b.offer.from)} → ${apName(b.offer.to)} · ${fdt(b.created_at)}</div></a>`).join("") : `<p>Aucune demande. <a href="#/">Faire une recherche</a></p>`}</div>`);
};
V.request = async ref => {
  if (!me) { nextHash = "#/request/" + ref; return go("#/login"); }
  const { data: b } = await sb.from("bookings").select(BK).eq("reference", ref).maybeSingle();
  render(`<div class="wrap"><h2>Demande ${esc(ref)}</h2>${b ? detail(b, false) : `<p>Demande introuvable.</p>`}<p><a href="#/help">Contacter l'assistance</a></p></div>`);
};

V.admin = async ref => {
  if (!me) { nextHash = "#/admin"; return go("#/login"); }
  if (!staff()) return render(`<div class="wrap"><h2>Accès refusé</h2><p>Cet espace est réservé à l'équipe de ${esc(C.company)}.</p></div>`);
  if (ref) return adminDetail(ref);
  const st = sessionStorage.getItem("fs") || "";
  const { data: all = [] } = await sb.from("bookings").select("reference,status,created_at,ticket_price,currency,offer").order("created_at", { ascending: false }).limit(500);
  const cnt = s => all.filter(b => b.status === s).length, list = all.filter(b => !st || b.status === st);
  render(`<div class="wrap"><h2>Espace agence</h2><div class="grid">${["created", "awaiting_payment", "paid", "processing", "ticketed"].map(s => `<div class="card"><div class="mute">${STATUS[s]}</div><div class="times">${cnt(s)}</div></div>`).join("")}</div>
<div class="row"><select id="fs" aria-label="Filtrer par statut"><option value="">Tous les statuts</option>${Object.keys(STATUS).map(s => `<option value="${s}" ${s === st ? "selected" : ""}>${STATUS[s]}</option>`).join("")}</select><input id="q" placeholder="Rechercher une référence" aria-label="Référence"><button class="btn alt" id="csv">Exporter CSV</button>${role === "admin" ? `<a class="btn alt" href="#/settings">Paramètres et audit</a><a class="btn alt" href="#/content">Page d'accueil</a><a class="btn alt" href="#/agents">Agents</a>` : ""}</div>
<div class="tw"><table id="tb"><tr><th>Référence</th><th>Trajet</th><th>Statut</th><th>Créée</th></tr>${list.map(b => `<tr><td><a href="#/admin/${esc(b.reference)}">${esc(b.reference)}</a></td><td>${esc(b.offer.from)} → ${esc(b.offer.to)}</td><td>${STATUS[b.status]}</td><td>${fdt(b.created_at)}</td></tr>`).join("") || `<tr><td colspan="4">Aucune demande.</td></tr>`}</table></div></div>`);
  $("#fs").onchange = e => { sessionStorage.setItem("fs", e.target.value); V.admin(); };
  $("#q").oninput = e => document.querySelectorAll("#tb tr:not(:first-child)").forEach(r => r.hidden = !r.textContent.toUpperCase().includes(e.target.value.toUpperCase()));
  $("#csv").onclick = () => { const rows = [["reference", "statut", "depart", "arrivee", "prix", "devise", "creee"], ...list.map(b => [b.reference, b.status, b.offer.from, b.offer.to, b.ticket_price ?? "", b.currency, b.created_at])];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = "demandes.csv"; a.click(); };
};
async function adminDetail(ref) {
  const { data: b } = await sb.from("bookings").select(BK).eq("reference", ref).maybeSingle();
  if (!b) return render(`<div class="wrap"><p>Demande introuvable.</p><a href="#/admin">Retour</a></div>`);
  const c = b.offer.contact || {}, acts = NEXT[b.status];
  render(`<div class="wrap"><a href="#/admin">← Toutes les demandes</a><h2>${esc(b.reference)}</h2><div class="card"><strong>${esc(b.profiles?.full_name || "Client")}</strong><br>${esc(c.email)} · ${esc(c.phone)}</div>${detail(b, true)}
<h3>Actions</h3><p class="err" id="e" role="alert"></p><div class="row">
${["created", "awaiting_payment"].includes(b.status) ? `<input id="pr" type="number" min="1" step="0.01" placeholder="Prix du billet (${esc(b.currency)})" aria-label="Prix du billet"><button class="btn" data-a="quote">Enregistrer le tarif</button>` : ""}
${b.status === "awaiting_payment" && b.ticket_price ? `<button class="btn" data-a="pay">Enregistrer le paiement reçu au bureau</button>` : ""}
${b.status === "processing" ? `<input id="tr" placeholder="Référence d'émission de la compagnie" aria-label="Référence compagnie"><button class="btn" data-a="tick">Marquer comme émis</button>` : ""}
${acts.map(s => `<button class="btn alt" data-a="st" data-s="${s}">→ ${STATUS[s]}</button>`).join("")}</div></div>`);
  document.querySelectorAll("[data-a]").forEach(btn => btn.onclick = async () => {
    const a = btn.dataset.a; let r;
    if (a === "st" && !confirm(T("Confirmer le passage à : " + STATUS[btn.dataset.s] + " ?"))) return;
    btn.disabled = true;
    if (a === "quote") r = await sb.rpc("set_quote", { p_booking: b.id, p_price: +$("#pr").value });
    if (a === "pay") r = await sb.rpc("record_office_payment", { p_booking: b.id });
    if (a === "tick") r = await sb.rpc("mark_ticketed", { p_booking: b.id, p_ref: $("#tr").value });
    if (a === "st") r = await sb.rpc("change_status", { p_booking: b.id, p_to: btn.dataset.s });
    if (r.error) { $("#e").textContent = fail(r.error); btn.disabled = false; } else adminDetail(ref);
  });
  if (b.status === "paid" && !document.querySelector("[data-s=processing]")) { }
}
V.settings = async () => {
  if (role !== "admin") return render(`<div class="wrap"><h2>Accès refusé</h2></div>`);
  const f = (await sb.from("settings").select("value").eq("key", "service_fee").maybeSingle()).data?.value || { amount: 0, currency: "USD", per_ticket: true };
  const { data: log = [] } = await sb.from("audit_log").select("*").order("at", { ascending: false }).limit(50);
  render(`<div class="wrap"><a href="#/admin">← Retour</a><h2>Paramètres</h2><form id="sf" class="card"><h3>Frais de service</h3><div class="row"><div><label for="am">Montant</label><input id="am" type="number" min="0" step="0.01" value="${f.amount}"></div><div><label for="cu">Devise</label><input id="cu" maxlength="3" value="${esc(f.currency)}"></div><div><label for="pt">Calcul</label><select id="pt"><option value="1" ${f.per_ticket ? "selected" : ""}>Par billet</option><option value="" ${f.per_ticket ? "" : "selected"}>Par demande</option></select></div></div>
<p class="err" id="e" role="alert"></p><p class="ok-msg" id="m"></p><button class="btn">Enregistrer</button></form>
<h3>Journal d'audit</h3><div class="tw"><table>${log.map(l => `<tr><td>${fdt(l.at)}</td><td>${esc(l.action)}</td><td>${esc(l.target)}</td></tr>`).join("") || `<tr><td>Aucune action.</td></tr>`}</table></div></div>`);
  $("#sf").onsubmit = async e => {
    e.preventDefault(); const v = { amount: +$("#am").value, currency: $("#cu").value.toUpperCase(), per_ticket: !!$("#pt").value };
    if (!(v.amount >= 0) || v.currency.length !== 3) return $("#e").textContent = "Montant ou devise invalide.";
    const r = await sb.from("settings").upsert({ key: "service_fee", value: v });
    if (r.error) return $("#e").textContent = fail(r.error);
    await sb.from("audit_log").insert({ actor: me.id, action: "frais:" + JSON.stringify(v), target: "settings" }); $("#m").textContent = "Frais enregistrés.";
  };
};
V.content = async (el = "fr") => {
  if (role !== "admin") return render(`<div class="wrap"><h2>Accès refusé</h2></div>`);
  const en = el === "en", c = CONTENTS[el], I = (id, l, v, x = "") => `<div><label for="${id}">${l}</label><input id="${id}" value="${esc(v)}" ${x}></div>`;
  render(`<div class="wrap"><a href="#/admin">← Retour</a><h2>Modifier la page d'accueil</h2><p><a class="btn alt" href="#/content">Contenu français</a> <a class="btn alt" href="#/content/en">Contenu anglais</a></p><form id="cf" class="card">
${I("ht", "Titre principal", c.hero_title, "required maxlength=120")}<label for="hd">Texte d'introduction</label><textarea id="hd" rows="3" maxlength="400" required>${esc(c.hero_text)}</textarea>
${en ? "" : I("hi", "Image d'en-tête (adresse https, vide = aucune)", c.hero_image)}${I("nt", "Message d'information (vide = masqué)", c.notice, "maxlength=300")}${I("sh", "Titre de la section « étapes »", c.steps_title, "required")}
${c.steps.map((p, i) => `<div class="row">${I("st" + i, "Étape " + (i + 1) + " — titre", p.t, "required")}${I("sd" + i, "Étape " + (i + 1) + " — texte", p.d, "required")}</div>`).join("")}
${en ? "" : `<div class="row">${I("ph", "Téléphone", c.phone, "required")}${I("em", "E-mail", c.email, "type=email required")}${I("ad", "Adresse du bureau", c.address, "required")}</div><label for="ap">Aéroports proposés (une ligne par lieu : CODE|Ville|Pays)</label><textarea id="ap" rows="8">${esc(c.airports)}</textarea>`}
<p class="err" id="e" role="alert"></p><p class="ok-msg" id="m" role="status"></p><button class="btn">Enregistrer et publier</button> <a class="btn alt" href="#/">Voir la page</a></form></div>`);
  $("#cf").onsubmit = async e => {
    e.preventDefault(); $("#m").textContent = ""; const hi = en ? "" : $("#hi").value.trim();
    const v = { hero_title: $("#ht").value.trim(), hero_text: $("#hd").value.trim(), notice: $("#nt").value.trim(), steps_title: $("#sh").value.trim(), steps: [0, 1, 2].map(i => ({ t: $("#st" + i).value.trim(), d: $("#sd" + i).value.trim() })), ...(en ? {} : { hero_image: hi, phone: $("#ph").value.trim(), email: $("#em").value.trim(), address: $("#ad").value.trim(), airports: $("#ap").value.trim() }) };
    if (!e.target.checkValidity() || !v.hero_title || !v.hero_text || v.steps.some(p => !p.t || !p.d)) return $("#e").textContent = "Complétez tous les champs obligatoires.";
    if (hi && !/^https:\/\/[^"'()\s]+$/.test(hi)) return $("#e").textContent = "L'adresse de l'image doit commencer par https:// et ne pas contenir d'espaces.";
    if (!en && parseAp(v.airports).length < 2) return $("#e").textContent = "Indiquez au moins deux aéroports au format CODE|Ville|Pays (code de 3 lettres majuscules).";
    const r = await sb.from("site_content").upsert({ key: en ? "home_en" : "home", value: v });
    if (r.error) return $("#e").textContent = fail(r.error);
    await sb.from("audit_log").insert({ actor: me.id, action: "contenu_accueil", target: "site_content" }); await loadContent(); $("#e").textContent = ""; $("#m").textContent = "Page d'accueil mise à jour.";
  };
};
V.agents = async () => {
  if (role !== "admin") return render(`<div class="wrap"><h2>Accès refusé</h2></div>`);
  const { data: l = [] } = await sb.from("profiles").select("id,full_name,email").eq("role", "agent").order("created_at");
  render(`<div class="wrap"><a href="#/admin">← Retour</a><h2>Gestion des agents</h2><div class="tw"><table>${l.map(a => `<tr><td>${esc(a.full_name)}</td><td>${esc(a.email)}</td><td><button class="btn alt" data-id="${esc(a.id)}" data-n="${esc(a.email)}">Retirer les droits agent</button></td></tr>`).join("") || `<tr><td>Aucun agent.</td></tr>`}</table></div>
<form id="af" class="card" novalidate><h3>Créer un compte agent</h3><div class="row"><div><label for="an">Nom complet</label><input id="an" required maxlength="100"></div><div><label for="ae">E-mail</label><input id="ae" type="email" required></div></div>
<div class="row"><div><label for="apw">Mot de passe temporaire (12 caractères minimum)</label><input id="apw" required minlength="12" autocomplete="off"></div><button type="button" class="btn alt" id="gen">Générer</button></div>
<p class="err" id="e" role="alert"></p><p class="ok-msg" id="m" role="status"></p><button class="btn" id="go">Créer l'agent</button></form></div>`);
  $("#gen").onclick = () => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", r = crypto.getRandomValues(new Uint32Array(16)); $("#apw").value = [...r].map(x => c[x % c.length]).join(""); };
  document.querySelectorAll("[data-id]").forEach(b => b.onclick = async () => {
    if (!confirm(T("Retirer les droits agent de " + b.dataset.n + " ?"))) return;
    const r = await sb.rpc("revoke_agent", { p_user: b.dataset.id }); if (r.error) alert(T(fail(r.error))); else V.agents();
  });
  $("#af").onsubmit = async e => {
    e.preventDefault(); const body = { full_name: $("#an").value.trim(), email: $("#ae").value.trim(), password: $("#apw").value };
    if (!e.target.checkValidity() || !body.full_name) return $("#e").textContent = "Complétez tous les champs (mot de passe : 12 caractères minimum).";
    $("#go").disabled = true; $("#e").textContent = "";
    const r = await sb.functions.invoke("create-agent", { body });
    if (r.error || r.data?.error) { $("#go").disabled = false; return $("#e").textContent = fail(r.error || r.data); }
    await V.agents(); $("#apw").value = body.password; $("#m").textContent = "Agent créé. Communiquez-lui le mot de passe temporaire par un canal sûr : il devra le changer à sa première connexion.";
  };
};
V.password = () => {
  if (!me) return go("#/login");
  render(`<div class="wrap" style="max-width:420px"><h2>Changer mon mot de passe</h2>${me.user_metadata?.must_change_password ? `<div class="banner">Définissez un nouveau mot de passe pour continuer.</div>` : ""}<form id="pf" novalidate>
<label for="p1">Nouveau mot de passe (12 caractères minimum)</label><input id="p1" type="password" required minlength="12" autocomplete="new-password"><label for="p2">Confirmer le mot de passe</label><input id="p2" type="password" required autocomplete="new-password">
<p class="err" id="e" role="alert"></p><button class="btn" id="go">Changer mon mot de passe</button></form></div>`);
  $("#pf").onsubmit = async e => {
    e.preventDefault(); const a = $("#p1").value;
    if (a.length < 12) return $("#e").textContent = "Mot de passe trop court (12 caractères minimum).";
    if (a !== $("#p2").value) return $("#e").textContent = "Les mots de passe ne correspondent pas.";
    $("#go").disabled = true; const r = await sb.auth.updateUser({ password: a, data: { must_change_password: false } });
    if (r.error) { $("#e").textContent = fail(r.error); return $("#go").disabled = false; }
    await loadUser(); go(staff() ? "#/admin" : "#/");
  };
};
V.forgot = () => {
  if (me) return go("#/");
  const ask = () => {
    render(`<div class="wrap" style="max-width:420px"><h2>Mot de passe oublié</h2><p>Saisissez l'e-mail de votre compte. Nous vous enverrons un code à usage unique.</p><form id="ff" novalidate><label for="em">E-mail</label><input id="em" type="email" required autocomplete="email"><p class="err" id="e" role="alert"></p><button class="btn" id="go">Envoyer le code</button></form><p><a href="#/login">Se connecter</a></p></div>`);
    $("#ff").onsubmit = async e => {
      e.preventDefault(); const em = $("#em").value.trim();
      if (!em || !$("#em").checkValidity()) return $("#e").textContent = "Saisissez une adresse e-mail valide.";
      $("#go").disabled = true; await sb.auth.resetPasswordForEmail(em); code(em); // même réponse que le compte existe ou non
    };
  };
  const code = em => {
    render(`<div class="wrap" style="max-width:420px"><h2>Mot de passe oublié</h2><p class="ok-msg" role="status">Si cette adresse correspond à un compte, un code vient d'être envoyé.</p><form id="cf" novalidate>
<label for="cd">Code reçu par e-mail</label><input id="cd" required inputmode="numeric" autocomplete="one-time-code" maxlength="8"><label for="p1">Nouveau mot de passe (8 caractères minimum)</label><input id="p1" type="password" required autocomplete="new-password"><label for="p2">Confirmer le mot de passe</label><input id="p2" type="password" required autocomplete="new-password">
<p class="err" id="e" role="alert"></p><button class="btn" id="go">Réinitialiser le mot de passe</button> <button type="button" class="btn alt" id="rs" disabled>Renvoyer le code</button></form></div>`);
    const wait = () => { $("#rs").disabled = true; setTimeout(() => { const b = $("#rs"); if (b) b.disabled = false; }, 60000); }; wait();
    $("#rs").onclick = async () => { wait(); await sb.auth.resetPasswordForEmail(em); };
    $("#cf").onsubmit = async e => {
      e.preventDefault(); const c = $("#cd").value.trim(), a = $("#p1").value, err = m => { $("#e").textContent = m; $("#go").disabled = false; };
      if (!/^\d{6,8}$/.test(c)) return err("Saisissez le code reçu par e-mail.");
      if (a.length < 8) return err("Mot de passe trop court (8 caractères minimum).");
      if (a !== $("#p2").value) return err("Les mots de passe ne correspondent pas.");
      $("#go").disabled = true; resetting = true;
      try {
        const v = await sb.auth.verifyOtp({ email: em, token: c, type: "recovery" });
        if (v.error) return err("Code invalide ou expiré. Demandez un nouveau code.");
        const u = await sb.auth.updateUser({ password: a, data: { must_change_password: false } });
        if (u.error) { await sb.auth.signOut(); return err(fail(u.error)); }
      } finally { resetting = false; }
      await loadUser(); lastUid = me?.id ?? null; go(staff() ? "#/admin" : "#/");
    };
  };
  ask();
};
V.legal = k => { const D = LEGALS[LANG], d = D[k] || D.cgu; render(`<div class="wrap" style="max-width:760px"><h2>${esc(d.t)}</h2><div class="banner">${esc(D.note)}</div>${d.a.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join("")}<p class="mute">${esc(D.upd)}</p></div>`); };
V.help = () => render(`<div class="wrap"><h2>Assistance</h2><div class="card"><p>${esc(C.company)}<br>${esc(CONTENT.address)}<br>${esc(CONTENT.phone)} · ${esc(CONTENT.email)}</p></div></div>`);

async function route() {
  const [, p, a] = (location.hash || "#/").split("/"), arg = a && decodeURIComponent(a);
  if (me?.user_metadata?.must_change_password && p !== "password") return go("#/password"); // première connexion d'un agent
  const m = { "": V.home, new: V.new, login: () => V.login(arg === "up" ? "up" : "in"), account: V.account, request: () => V.request(arg), admin: () => V.admin(arg), settings: V.settings, agents: V.agents, forgot: V.forgot, password: V.password, content: () => V.content(arg === "en" ? "en" : "fr"), legal: () => V.legal(arg), help: V.help };
  try { await (m[p || ""] || V.home)(); } catch (e) { console.error(e); render(`<div class="wrap"><h2>Un problème est survenu</h2><p>Rechargez la page ou contactez l'assistance.</p></div>`); }
}
let lastUid = null, resetting = false; // ne recharge la vue que si l'utilisateur change (évite de perdre un formulaire au rafraîchissement du jeton)
sb.auth.onAuthStateChange((ev, ses) => { const uid = ses?.user?.id ?? null; if (resetting || ev === "INITIAL_SESSION" || uid === lastUid) return; lastUid = uid; loadUser().then(route); });
addEventListener("hashchange", route);
loadContent().then(() => loadUser()).then(() => { lastUid = me?.id ?? null; route(); });
I18N.init();
