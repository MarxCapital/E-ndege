// Edge Function « notify » : envoie l'e-mail lié à un changement de statut (FR/EN selon la langue de la demande).
// Déclenchée par un Database Webhook (INSERT sur booking_history). Secrets : voir README.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { render } from "./templates.mjs";

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) return new Response("forbidden", { status: 401 });
  const { record } = await req.json();
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: b } = await sb.from("bookings").select("reference,offer,ticket_price,service_fee,payment_fee,currency,provider_ticket_ref,user_id").eq("id", record.booking_id).single();
  if (!b) return new Response("skip");
  const { data: u } = await sb.auth.admin.getUserById(b.user_id);
  const to = u?.user?.email; if (!to) return new Response("skip");
  const lang = b.offer?.lang === "en" ? "en" : "fr";
  const sum = Number(b.ticket_price ?? 0) + Number(b.service_fee ?? 0) + Number(b.payment_fee ?? 0);
  const m = render(record.to_status, lang, {
    ref: b.reference, from: b.offer?.from, to: b.offer?.to, ticket: b.provider_ticket_ref,
    total: b.ticket_price != null ? new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: b.currency }).format(sum) : "",
    site: Deno.env.get("SITE_URL"), office: Deno.env.get("OFFICE_ADDRESS"), phone: Deno.env.get("OFFICE_PHONE"),
  });
  if (!m) return new Response("skip");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("MAIL_FROM"), to: [to], subject: m.subject, text: m.text, html: m.html }),
  });
  if (!r.ok) console.error("resend", r.status); // aucun contenu personnel dans les journaux
  return new Response(r.ok ? "sent" : "error", { status: r.ok ? 200 : 502 });
});
