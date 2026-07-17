import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405);
  const expected = Deno.env.get("SYSTEM_CRON_SECRET");
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !constantTimeEqual(expected, received))
    return respond({ error: "UNAUTHORIZED" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond({ error: "SERVICE_UNAVAILABLE" }, 503);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Array<{ component: string; status: string; details: Record<string, unknown> }> =
    [];
  const started = Date.now();
  const { error: databaseError } = await admin
    .from("planos")
    .select("id", { head: true, count: "exact" });
  await recordHealth(admin, "database", databaseError ? "down" : "healthy", Date.now() - started, {
    error: databaseError?.code ?? null,
  });
  results.push({ component: "database", status: databaseError ? "down" : "healthy", details: {} });

  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count: webhookFailures, error: webhookError } = await admin
    .from("eventos_webhook_pagamento")
    .select("stripe_event_id", { head: true, count: "exact" })
    .eq("processado", false)
    .lt("recebido_at", cutoff);
  const webhookStatus = webhookError
    ? "unknown"
    : (webhookFailures ?? 0) > 0
      ? "degraded"
      : "healthy";
  await recordHealth(admin, "stripe_webhooks", webhookStatus, null, {
    failures_older_than_15m: webhookFailures ?? null,
  });
  if ((webhookFailures ?? 0) > 0) {
    await upsertAlert(
      admin,
      "stripe-webhooks-stuck",
      "critical",
      "stripe_webhooks",
      "Webhooks de pagamento pendentes",
      `${webhookFailures} evento(s) aguardam processamento há mais de 15 minutos.`,
      { count: webhookFailures },
    );
  } else if (!webhookError) await resolveAlert(admin, "stripe-webhooks-stuck");

  const { count: stuckCheckouts } = await admin
    .from("sessoes_contratacao")
    .select("id", { head: true, count: "exact" })
    .eq("status", "checkout_pendente")
    .lt("updated_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  await recordHealth(admin, "checkout", (stuckCheckouts ?? 0) > 0 ? "degraded" : "healthy", null, {
    stuck_over_1h: stuckCheckouts ?? 0,
  });
  if ((stuckCheckouts ?? 0) > 0)
    await upsertAlert(
      admin,
      "checkout-stuck",
      "warning",
      "checkout",
      "Checkouts sem conclusão",
      `${stuckCheckouts} checkout(s) estão parados há mais de uma hora.`,
      { count: stuckCheckouts },
    );
  else await resolveAlert(admin, "checkout-stuck");

  const { count: exportQueue } = await admin
    .from("solicitacoes_exportacao_lgpd")
    .select("id", { head: true, count: "exact" })
    .in("status", ["pending", "processing"])
    .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
  await recordHealth(admin, "lgpd_exports", (exportQueue ?? 0) > 0 ? "degraded" : "healthy", null, {
    queue_over_30m: exportQueue ?? 0,
  });

  const { data: restoreTest } = await admin
    .from("ensaios_restauracao_backup")
    .select("status, completed_at")
    .eq("status", "passed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const restoreOutdated =
    !restoreTest?.completed_at ||
    Date.parse(restoreTest.completed_at) < Date.now() - 90 * 24 * 60 * 60 * 1000;
  await recordHealth(admin, "backup_restore", restoreOutdated ? "degraded" : "healthy", null, {
    last_passed_at: restoreTest?.completed_at ?? null,
  });
  if (restoreOutdated)
    await upsertAlert(
      admin,
      "backup-restore-test-overdue",
      "critical",
      "backup_restore",
      "Teste de restauração pendente",
      "Nenhum ensaio de restauração aprovado foi registrado nos últimos 90 dias.",
      {},
    );
  else await resolveAlert(admin, "backup-restore-test-overdue");

  const professionalChecks = [
    {
      component: "client_observability",
      table: "eventos_erro_sistema",
      statusField: "resolvido_at",
      failureValue: null,
      cutoffField: "ultima_ocorrencia_at",
      warningThreshold: 10,
    },
    {
      component: "notification_delivery",
      table: "entregas_notificacao",
      statusField: "status",
      failureValue: "failed",
      cutoffField: "created_at",
      warningThreshold: 1,
    },
    {
      component: "scheduled_reports",
      table: "execucoes_relatorios_agendados",
      statusField: "status",
      failureValue: "failed",
      cutoffField: "created_at",
      warningThreshold: 1,
    },
  ] as const;
  for (const check of professionalChecks) {
    let query = admin.from(check.table).select("id", { head: true, count: "exact" })
      .gte(check.cutoffField, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    query = check.failureValue === null
      ? query.is(check.statusField, null)
      : query.eq(check.statusField, check.failureValue);
    const { count, error } = await query;
    const status = error ? "unknown" : (count ?? 0) >= check.warningThreshold ? "degraded" : "healthy";
    await recordHealth(admin, check.component, status, null, { failures_24h: count ?? null });
    const fingerprint = `${check.component}-failures`;
    if ((count ?? 0) >= check.warningThreshold) {
      await upsertAlert(
        admin,
        fingerprint,
        (count ?? 0) >= 10 ? "critical" : "warning",
        check.component,
        `Falhas em ${check.component}`,
        `${count} ocorrencia(s) precisam de acompanhamento nas ultimas 24 horas.`,
        { count },
      );
    } else if (!error) await resolveAlert(admin, fingerprint);
  }

  const { count: dunningQueue, error: dunningError } = await admin
    .from("tentativas_cobranca")
    .select("id", { head: true, count: "exact" })
    .in("status", ["queued", "processing"])
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  await recordHealth(admin, "billing_dunning", dunningError ? "unknown" : (dunningQueue ?? 0) > 0 ? "degraded" : "healthy", null, {
    stuck_over_24h: dunningQueue ?? null,
  });

  const alertWebhook = Deno.env.get("OPERATIONS_ALERT_WEBHOOK_URL");
  if (alertWebhook) {
    const { data: criticalAlerts } = await admin
      .from("alertas_operacionais_sistema")
      .select("titulo, mensagem, componente")
      .eq("status", "open")
      .eq("severidade", "critical")
      .limit(10);
    if (criticalAlerts?.length) {
      try {
        await fetch(alertWebhook, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: "Conform Flow", alerts: criticalAlerts }),
        });
      } catch {
        console.error("operations_alert_delivery_failed");
      }
    }
  }

  return respond(
    { ok: !databaseError, checks: results.length + 8, checked_at: new Date().toISOString() },
    databaseError ? 503 : 200,
  );
});

async function recordHealth(
  admin: SupabaseClient,
  component: string,
  status: string,
  latency: number | null,
  details: Record<string, unknown>,
) {
  await admin
    .from("verificacoes_saude_sistema")
    .insert({ componente: component, status, latencia_ms: latency, detalhes_json: details });
}
async function upsertAlert(
  admin: SupabaseClient,
  fingerprint: string,
  severity: string,
  component: string,
  title: string,
  message: string,
  metadata: Record<string, unknown>,
) {
  const { data: existing } = await admin
    .from("alertas_operacionais_sistema")
    .update({
      severidade: severity,
      componente: component,
      titulo: title,
      mensagem: message,
      ultima_ocorrencia_at: new Date().toISOString(),
      metadata_json: metadata,
    })
    .eq("fingerprint", fingerprint)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (!existing) {
    await admin.from("alertas_operacionais_sistema").insert({
      fingerprint,
      severidade: severity,
      componente: component,
      titulo: title,
      mensagem: message,
      status: "open",
      metadata_json: metadata,
    });
  }
}
async function resolveAlert(admin: SupabaseClient, fingerprint: string) {
  await admin
    .from("alertas_operacionais_sistema")
    .update({
      status: "resolved",
      resolvido_at: new Date().toISOString(),
      ultima_ocorrencia_at: new Date().toISOString(),
    })
    .eq("fingerprint", fingerprint)
    .eq("status", "open");
}
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1)
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}
function respond(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
