import { createClient } from "npm:@supabase/supabase-js@^2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!authorized(request)) return json({ error: "UNAUTHORIZED" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: generationError } = await admin.rpc("gerar_alertas_vencimento");
  if (generationError) return json({ error: "ALERT_GENERATION_FAILED" }, 503);
  const { data: alerts, error } = await admin
    .from("alertas")
    .select("id,empresa_id,usuario_id,titulo,mensagem,data_vencimento,email_status")
    .in("email_status", ["pendente", "falhou"])
    .is("deleted_at", null)
    .limit(200);
  if (error) return json({ error: "ALERT_QUEUE_UNAVAILABLE" }, 503);

  let sent = 0;
  let failed = 0;
  let inApp = 0;
  for (const alert of alerts ?? []) {
    const recipients = await loadRecipients(admin, alert.empresa_id, alert.usuario_id);
    for (const recipient of recipients) {
      const preference = recipient.preferencias_notificacao_usuario?.[0];
      const channels: string[] = preference?.canais ?? ["in_app", "email"];
      if (channels.includes("in_app")) {
        const delivery = await admin.from("entregas_notificacao").upsert({
          empresa_id: alert.empresa_id,
          alerta_id: alert.id,
          usuario_id: recipient.usuario_id,
          canal: "in_app",
          status: "sent",
          tentativa: 1,
          sent_at: new Date().toISOString(),
        }, { onConflict: "alerta_id,usuario_id,canal", ignoreDuplicates: true }).select("id");
        if (!delivery.error) {
          await admin.from("notificacoes").insert({
            empresa_id: alert.empresa_id,
            usuario_id: recipient.usuario_id,
            audience: "user",
            tipo: "expiration_alert",
            titulo: alert.titulo,
            mensagem: alert.mensagem,
            action_url: "/alertas",
            dedupe_key: `expiration:${alert.id}:${recipient.usuario_id}`,
          });
          inApp++;
        }
      }
      if (!channels.includes("email")) continue;
      const existing = await admin.from("entregas_notificacao").select("id,tentativa,status")
        .eq("alerta_id", alert.id).eq("usuario_id", recipient.usuario_id).eq("canal", "email").maybeSingle();
      if (existing.data?.status === "sent") continue;
      const deliveryId = existing.data?.id ?? (await admin.from("entregas_notificacao").insert({
        empresa_id: alert.empresa_id,
        alerta_id: alert.id,
        usuario_id: recipient.usuario_id,
        canal: "email",
        status: "sending",
        tentativa: 1,
      }).select("id").single()).data?.id;
      if (!deliveryId) { failed++; continue; }
      try {
        const emailWebhook = Deno.env.get("EMAIL_WEBHOOK_URL");
        if (!emailWebhook) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
        const response = await fetch(emailWebhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            template: "expiration-alert",
            to: recipient.usuarios.email,
            recipientName: recipient.usuarios.nome,
            subject: alert.titulo,
            message: alert.mensagem,
            dueDate: alert.data_vencimento,
            actionUrl: `${Deno.env.get("APP_URL") ?? "https://conform-guardian.lovable.app"}/alertas`,
          }),
        });
        if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
        await admin.from("entregas_notificacao").update({
          status: "sent", sent_at: new Date().toISOString(), erro_codigo: null,
        }).eq("id", deliveryId);
        sent++;
      } catch (cause) {
        const attempt = Number(existing.data?.tentativa ?? 0) + 1;
        await admin.from("entregas_notificacao").update({
          status: attempt >= 4 ? "failed" : "queued",
          tentativa: attempt,
          proxima_tentativa_at: new Date(Date.now() + Math.min(24, 2 ** attempt) * 60 * 60 * 1000).toISOString(),
          erro_codigo: safeCode(cause),
          erro_sanitizado: "Falha temporaria no provedor de notificacao.",
        }).eq("id", deliveryId);
        failed++;
      }
    }
    const pending = await admin.from("entregas_notificacao").select("id", { head: true, count: "exact" })
      .eq("alerta_id", alert.id).eq("canal", "email").in("status", ["queued", "sending", "failed"]);
    await admin.from("alertas").update({
      email_status: (pending.count ?? 0) > 0 ? "falhou" : "enviado",
      email_enviado_at: (pending.count ?? 0) > 0 ? null : new Date().toISOString(),
    }).eq("id", alert.id);
  }
  return json({ processed: alerts?.length ?? 0, in_app: inApp, email_sent: sent, failed });
});

async function loadRecipients(admin: ReturnType<typeof createClient>, companyId: string, assignedUserId: string | null) {
  let query = admin.from("usuarios_empresas")
    .select("usuario_id,perfil,usuarios!inner(nome,email,status)")
    .eq("empresa_id", companyId).eq("ativo", true).is("deleted_at", null);
  if (assignedUserId) query = query.or(`usuario_id.eq.${assignedUserId},perfil.eq.administrador`);
  else query = query.eq("perfil", "administrador");
  const { data } = await query;
  const active = (data ?? []).filter((item) => item.usuarios?.status === "ativo" && item.usuarios?.email);
  const userIds = active.map((item) => item.usuario_id);
  const { data: preferences } = userIds.length
    ? await admin.from("preferencias_notificacao_usuario").select("usuario_id,canais,severidade_minima,resumo_diario").eq("empresa_id", companyId).in("usuario_id", userIds)
    : { data: [] };
  const byUser = new Map((preferences ?? []).map((item) => [item.usuario_id, item]));
  return active.map((item) => ({ ...item, preferencias_notificacao_usuario: byUser.has(item.usuario_id) ? [byUser.get(item.usuario_id)] : [] }));
}
function authorized(request: Request) {
  const expected = Deno.env.get("SYSTEM_CRON_SECRET") ?? Deno.env.get("CRON_SECRET");
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const legacy = request.headers.get("x-cron-secret") ?? "";
  return Boolean(expected && (expected === bearer || expected === legacy));
}
function safeCode(cause: unknown) { return cause instanceof Error ? cause.message.slice(0, 120) : "UNKNOWN"; }
