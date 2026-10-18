// Configuration publique (aucun secret ici). Modifiez avant le lancement.
window.ENDEGE = {
  company: "Dream Way Company",
  phone: "+257 00 00 00 00",            // À REMPLACER
  email: "contact@exemple.com",          // À REMPLACER
  officeAddress: "Adresse du bureau à renseigner",
  currency: "USD",
  serviceFee: { amount: 40, currency: "USD", perTicket: true }, // configurable; à valider selon accords fournisseurs
  supabase: { url: "https://erlmpgzomhqpgdarhapx.supabase.co", anonKey: "sb_publishable_XPHZU7jYnO3ogPSzwBQJ4A_XMNpyAog" }, // clé publique uniquement
  providers: { live: false }             // true seulement quand un fournisseur réel est branché
};
