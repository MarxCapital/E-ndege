(function (root, f) { const L = f(); if (typeof module === "object") module.exports = L; else root.EndegeLib = L; })(this, () => {
  const STATUS = { created: "Demande reçue", awaiting_payment: "En attente de paiement", paid: "Paiement confirmé", processing: "Réservation en cours de traitement", ticketed: "Billet émis", failed: "Échec", expired: "Expirée", refund_pending: "Remboursement en cours", refunded: "Remboursement effectué" };
  const ACTION = { created: "Un agent prépare votre tarif. Vous serez informé dès qu'il est prêt.", awaiting_payment: "Tarif prêt. Présentez-vous au bureau avec votre référence pour payer.", paid: "Paiement reçu. Nous traitons votre réservation ; le billet n'est pas encore émis.", processing: "Réservation en cours. L'émission n'est pas encore confirmée.", ticketed: "Votre billet est émis.", failed: "La demande n'a pas abouti. Contactez l'assistance.", expired: "Demande expirée. Faites une nouvelle recherche.", refund_pending: "Remboursement en cours de traitement.", refunded: "Remboursement effectué." };
  const TRANSITIONS = { created: ["awaiting_payment", "expired", "failed"], awaiting_payment: ["paid", "expired", "failed"], paid: ["processing", "refund_pending"], processing: ["ticketed", "failed", "refund_pending"], failed: ["refund_pending"], refund_pending: ["refunded"], ticketed: [], expired: [], refunded: [] };
  const DEDICATED = ["created>awaiting_payment", "awaiting_payment>paid", "processing>ticketed"]; // actions à part (tarif, paiement, émission)
  const MANUAL = Object.fromEntries(Object.entries(TRANSITIONS).map(([a, l]) => [a, l.filter(b => !DEDICATED.includes(a + ">" + b))]));
  const canTransition = (a, b) => (TRANSITIONS[a] || []).includes(b);
  const parseAp = t => t.split("\n").map(l => l.split("|").map(x => x.trim())).filter(a => /^[A-Z]{3}$/.test(a[0]) && a[1]);
  const validateSearch = (q, today, roundTrip) => {
    if (q.from === q.to) return "Le départ et la destination doivent être différents.";
    if (!q.date || q.date < today) return "Choisissez une date de départ à partir d'aujourd'hui.";
    if (roundTrip && (!q.ret || q.ret < q.date)) return "La date de retour doit suivre la date de départ.";
    if (!(q.ad >= 1)) return "Il faut au moins un adulte.";
    if (q.inf > q.ad) return "Chaque bébé doit voyager avec un adulte.";
    if (q.ad + q.ch > 9) return "Maximum 9 passagers par demande.";
    return "";
  };
  return { STATUS, ACTION, TRANSITIONS, MANUAL, canTransition, parseAp, validateSearch };
});
