// Modèles d'e-mails FR/EN. Un e-mail ne peut affirmer que ce qui est vérifié en base.
const T = {
  fr: {
    created: ["Demande {ref} reçue", "Nous avons reçu votre demande {ref} ({from} → {to}). Un agent prépare votre tarif. Aucun billet n'est émis à ce stade."],
    awaiting_payment: ["Votre tarif est prêt — {ref}", "Votre tarif est prêt : {total}. Pour payer, présentez-vous au bureau de Dream Way Company ({office}, {phone}) avec la référence {ref}. Le billet sera émis après paiement et confirmation de la compagnie."],
    paid: ["Paiement reçu — {ref}", "Nous avons enregistré votre paiement de {total} pour la demande {ref}. Votre réservation est en cours de traitement : le billet n'est pas encore émis."],
    processing: ["Réservation en cours — {ref}", "Nous traitons votre réservation {ref} auprès de la compagnie. Vous serez informé dès la confirmation d'émission."],
    ticketed: ["Billet émis — {ref}", "La compagnie a confirmé l'émission de votre billet pour la demande {ref} (référence compagnie : {ticket}). Retrouvez votre dossier sur {site}."],
    failed: ["Demande non aboutie — {ref}", "Votre demande {ref} n'a pas pu aboutir. Aucun billet n'a été émis. Contactez-nous au {phone}."],
    expired: ["Demande expirée — {ref}", "Votre demande {ref} a expiré. Vous pouvez en faire une nouvelle sur {site}."],
    refund_pending: ["Remboursement en cours — {ref}", "Votre remboursement pour la demande {ref} est en cours de traitement."],
    refunded: ["Remboursement effectué — {ref}", "Le remboursement de la demande {ref} a été effectué."]
  },
  en: {
    created: ["Request {ref} received", "We have received your request {ref} ({from} → {to}). An agent is preparing your fare. No ticket has been issued at this stage."],
    awaiting_payment: ["Your fare is ready — {ref}", "Your fare is ready: {total}. To pay, come to the Dream Way Company office ({office}, {phone}) quoting reference {ref}. The ticket will be issued after payment and airline confirmation."],
    paid: ["Payment received — {ref}", "We have recorded your payment of {total} for request {ref}. Your booking is being processed: the ticket is not issued yet."],
    processing: ["Booking in progress — {ref}", "We are processing your booking {ref} with the airline. You will be told as soon as issue is confirmed."],
    ticketed: ["Ticket issued — {ref}", "The airline has confirmed issue of your ticket for request {ref} (airline reference: {ticket}). Find your file at {site}."],
    failed: ["Request unsuccessful — {ref}", "Your request {ref} could not be completed. No ticket has been issued. Contact us on {phone}."],
    expired: ["Request expired — {ref}", "Your request {ref} has expired. You can make a new one at {site}."],
    refund_pending: ["Refund in progress — {ref}", "Your refund for request {ref} is being processed."],
    refunded: ["Refund completed — {ref}", "The refund for request {ref} has been completed."]
  }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function render(status, lang, v) {
  const t = T[lang === "en" ? "en" : "fr"][status]; if (!t) return null;
  if (status === "ticketed" && !v.ticket) return null; // jamais de « billet émis » sans référence de la compagnie
  const fill = (s, e) => s.replace(/\{(\w+)\}/g, (_, k) => e(v[k] ?? ""));
  const text = fill(t[1], x => x) + "\n\nDream Way Company — E-NDEGE";
  return { subject: fill(t[0], x => x), text, html: `<p>${fill(t[1], esc)}</p><p>Dream Way Company — E-NDEGE</p>` };
}
export const STATUSES = Object.keys(T.fr);
