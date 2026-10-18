-- Correctif : un client ne doit jamais écrire directement dans bookings/passengers (prix, frais, statut).
-- Les créations passent uniquement par create_booking() côté serveur.
drop policy if exists b_ins on bookings;
drop policy if exists pa_ins on passengers;
