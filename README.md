# E-NDEGE — Dream Way Company
« Des rêves à la destination ». Site statique (sans build) prêt pour Cloudflare Pages.

## Déploiement
GitHub → Cloudflare Pages → *Create project* → dépôt → framework : None, build command : vide, output directory : `/`.

## État réel
- Connecté à Supabase (URL et clé **publique** dans `config.js`). Aucune donnée de démonstration.
- Sans fournisseur aérien branché, le client envoie une **demande** ; un agent fixe le tarif dans l'espace agence, enregistre le paiement au bureau, puis marque « émis » avec la référence de la compagnie.
- Non connecté : tarifs temps réel, paiement en ligne (Lumicash, cartes), e-mails/notifications.

## Mise en route Supabase
1. SQL Editor : exécutez `supabase/001_schema.sql` puis `supabase/002_backend.sql`, puis `supabase/003_content.sql` (contenu de l'accueil modifiable).
2. Authentication → URL Configuration : ajoutez l'URL Cloudflare Pages (Site URL).
3. Créez un compte sur le site, puis dans le SQL Editor : `update profiles set role='admin' where id=(select id from auth.users where email='VOTRE_EMAIL');`
4. Agents : même commande avec `role='agent'`.
Ne mettez jamais la clé `service_role` dans le dépôt.

## Modifier la page d'accueil
Connecté en administrateur : bouton « Modifier cette page » sur l'accueil, ou Agence → Page d'accueil. Textes, image (https), étapes, message, coordonnées et aéroports sont enregistrés dans Supabase (`site_content`) et publiés immédiatement, sans redéploiement.

## Modifier la page d'accueil
Administrateur connecté : bouton « Modifier cette page » sur l'accueil, ou Agence → Page d'accueil. Textes, image (https), étapes, message, coordonnées et aéroports sont enregistrés dans Supabase (`site_content`) et publiés sans redéploiement.

## Tests
`npm test` (Node 20+, aucune dépendance) : validation de recherche, transitions de statuts (identiques à la base SQL), traduction FR/EN, e-mails, textes légaux, absence de secrets/démo.

## Langues
Bouton FR/EN dans l'en-tête (mémorisé). Interface : `i18n.js`. Accueil : éditable séparément en FR et EN (Agence → Page d'accueil). Textes légaux : `legal.js`. E-mails : langue choisie par le client au moment de sa demande.

## Notifications e-mail (Resend)
1. Compte Resend, domaine d'envoi vérifié.
2. `supabase functions deploy notify --no-verify-jwt`
3. `supabase secrets set RESEND_API_KEY=... MAIL_FROM="E-NDEGE <no-reply@votre-domaine>" WEBHOOK_SECRET=<aléatoire> SITE_URL=https://... OFFICE_ADDRESS="..." OFFICE_PHONE="..."`
4. Dashboard → Database → Webhooks → table `booking_history`, événement INSERT, Edge Function `notify`, en-tête `x-webhook-secret` = WEBHOOK_SECRET.
5. E-mails d'authentification (confirmation de compte) : traduisez-les dans Authentication → Email Templates.

## Vérifier l'authentification et les droits
1. Exécutez `supabase/tests/rls_check.sql` dans l'éditeur SQL : chaque ligne doit commencer par `OK` (le message d'erreur final est volontaire, tout est annulé).
2. Authentication → Providers → Email : choisissez si la confirmation d'e-mail est obligatoire. Authentication → URL Configuration : Site URL = votre domaine Cloudflare.
3. Production : configurez un SMTP personnalisé (Authentication → SMTP). Le service d'e-mail par défaut de Supabase est très limité.

## Comptes agents (Agence → Agents)
- Seul l'administrateur crée un compte agent : `supabase functions deploy create-agent` (aucun secret à ajouter : les clés sont fournies par Supabase). Le premier administrateur reste créé par SQL.
- L'agent reçoit un mot de passe temporaire (à lui transmettre par un canal sûr) et doit le changer à sa première connexion.
- Les inscriptions publiques créent uniquement des clients.

## Mot de passe oublié (code OTP par e-mail)
1. Authentication → Email Templates → « Reset Password » : collez `supabase/email-templates/recovery.html` (il contient `{{ .Token }}`, le code). Sans cela, Supabase enverrait un lien et non un code.
2. Authentication → Providers → Email : fixez « Email OTP Expiration » à 600 secondes (valeur recommandée) et « Email OTP Length » à 6.
3. SMTP personnalisé indispensable en production (limite d'envoi du service par défaut).
Parcours : Connexion → « Mot de passe oublié ? » → e-mail → code reçu + nouveau mot de passe. Le site affiche la même réponse que le compte existe ou non.
