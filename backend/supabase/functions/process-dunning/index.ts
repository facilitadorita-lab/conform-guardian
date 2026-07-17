import { createClient } from "npm:@supabase/supabase-js@^2";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!authorized(request)) return json({ error: "UNAUTHORIZED" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: settings } = await admin.from("configuracoes_cobranca").select("*").eq("id", true).single();
  const graceDays = Number(settings?.dias_carencia ?? 3);
  const { data: subscriptions, error } = await admin
    .from("assinaturas_empresas")
    .select("id,empresa_id,status,grace_period_ends_at,gateway")
    .in("status", ["inadimplente", "pagamento_pendente"]).is("deleted_at", null).limit(500);
  if (error) return json({ error: "SUBSCRIPTION_QUERY_FAILED" }, 503);
  let graceStarted = 0;
  let blocked = 0;
  for (const subscription of subscriptions ?? []) {
    const graceEnd = subscription.grace_period_ends_at
      ? new Date(subscription.grace_period_ends_at)
      : new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
    if (!subscription.grace_period_ends_at) {
      await admin.from("assinaturas_empresas").update({ grace_period_ends_at: graceEnd.toISOString() }).eq("id", subscription.id);
      graceStarted++;
    }
    if (settings?.bloquear_apos_carencia !== false && graceEnd.getTime() <= Date.now()) {
      await admin.from("assinaturas_empresas").update({
        status: "bloqueada", bloqueada_em: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", subscription.id);
      await admin.from("empresas").update({
        status: "bloqueada", access_status: "blocked", updated_at: new Date().toISOString(),
      }).eq("id", subscription.empresa_id);
      await admin.from("notificacoes").insert({
        empresa_id: subscription.empresa_id,
        audience: "company_admin",
        tipo: "billing_blocked",
        titulo: "Acesso bloqueado por inadimplencia",
        mensagem: "O periodo de carencia terminou. Regularize a assinatura para reativar o acesso.",
        action_url: "/configuracoes",
        dedupe_key: `billing-blocked:${subscription.id}:${graceEnd.toISOString().slice(0, 10)}`,
      }).select("id");
      blocked++;
    }
  }
  return json({ subscriptions: subscriptions?.length ?? 0, grace_started: graceStarted, blocked });
});
function authorized(request: Request) {
  const expected = Deno.env.get("SYSTEM_CRON_SECRET");
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(expected && expected === received);
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
