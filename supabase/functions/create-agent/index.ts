// Crée un compte agent. Réservé aux administrateurs (vérifié ici, côté serveur, via le JWT de l'appelant).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return out({ error: "auth" }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return out({ error: "forbidden" }, 403);

  const { email, full_name, password } = await req.json().catch(() => ({}));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "") || !full_name?.trim() || (password ?? "").length < 12) return out({ error: "invalid" }, 400);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: full_name.trim(), must_change_password: true } });
  if (error || !data.user) return out({ error: "create_failed" }, 400);
  const { error: e2 } = await admin.from("profiles").upsert({ id: data.user.id, full_name: full_name.trim(), email, role: "agent" });
  if (e2) { await admin.auth.admin.deleteUser(data.user.id); return out({ error: "profile_failed" }, 500); } // pas de compte à moitié créé
  await admin.from("audit_log").insert({ actor: user.id, action: "agent_cree", target: data.user.id });
  return out({ ok: true });
});
