import { createClient } from "npm:@supabase/supabase-js@^2";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (!authorized(request)) return json({ error: "UNAUTHORIZED" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "SERVICE_UNAVAILABLE" }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: schedules, error } = await admin
    .from("relatorios_agendados")
    .select("id,empresa_id,unidade_id,nome,tipo_relatorio,frequencia,destinatarios,filtros_json")
    .eq("ativo", true).lte("proxima_execucao_at", new Date().toISOString()).limit(50);
  if (error) return json({ error: "SCHEDULE_QUERY_FAILED" }, 503);

  let sent = 0;
  let failed = 0;
  for (const schedule of schedules ?? []) {
    const execution = await admin.from("execucoes_relatorios_agendados").insert({
      empresa_id: schedule.empresa_id,
      unidade_id: schedule.unidade_id,
      relatorio_agendado_id: schedule.id,
      status: "processing",
      destinatarios: schedule.destinatarios,
    }).select("id").single();
    if (execution.error) { failed++; continue; }
    try {
      const snapshot = await buildSnapshot(admin, schedule.empresa_id, schedule.unidade_id);
      const emailWebhook = Deno.env.get("EMAIL_WEBHOOK_URL");
      if (!emailWebhook) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
      const response = await fetch(emailWebhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          template: "scheduled-compliance-report",
          to: schedule.destinatarios,
          companyName: snapshot.empresa,
          subject: `${schedule.nome} - Conform Flow`,
          report: snapshot,
          actionUrl: `${Deno.env.get("APP_URL") ?? "https://conform-guardian.lovable.app"}/relatorios`,
        }),
      });
      if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
      await admin.from("execucoes_relatorios_agendados").update({
        status: "sent", snapshot_json: snapshot, completed_at: new Date().toISOString(),
      }).eq("id", execution.data.id);
      await admin.from("relatorios_agendados").update({
        ultima_execucao_at: new Date().toISOString(),
        proxima_execucao_at: nextRun(schedule.frequencia),
        updated_at: new Date().toISOString(),
      }).eq("id", schedule.id);
      sent++;
    } catch (cause) {
      await admin.from("execucoes_relatorios_agendados").update({
        status: "failed", erro_codigo: safeCode(cause), completed_at: new Date().toISOString(),
      }).eq("id", execution.data.id);
      await admin.from("relatorios_agendados").update({
        proxima_execucao_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }).eq("id", schedule.id);
      failed++;
    }
  }
  return json({ processed: schedules?.length ?? 0, sent, failed });
});

async function buildSnapshot(
  admin: ReturnType<typeof createClient>,
  companyId: string,
  unitId: string | null,
) {
  let documentsQuery = admin
    .from("documentos")
    .select("id,data_vencimento")
    .eq("empresa_id", companyId)
    .is("deleted_at", null);
  let equipmentQuery = admin
    .from("equipamentos")
    .select("id,status")
    .eq("empresa_id", companyId)
    .is("deleted_at", null);
  let maintenanceQuery = admin
    .from("manutencoes")
    .select("id,proxima_manutencao,status_execucao")
    .eq("empresa_id", companyId)
    .is("deleted_at", null);
  let pendingQuery = admin
    .from("pendencias")
    .select("id,status,prazo")
    .eq("empresa_id", companyId)
    .is("deleted_at", null);

  if (unitId) {
    documentsQuery = documentsQuery.or(
      `escopo_documento.eq.corporativo,unidade_id.eq.${unitId}`,
    );
    equipmentQuery = equipmentQuery.eq("unidade_id", unitId);
    maintenanceQuery = maintenanceQuery.eq("unidade_id", unitId);
    pendingQuery = pendingQuery.or(`unidade_id.is.null,unidade_id.eq.${unitId}`);
  }

  const [company, unit, documents, equipment, maintenance, pending] = await Promise.all([
    admin.from("empresas").select("nome_fantasia,cnpj").eq("id", companyId).single(),
    unitId
      ? admin.from("unidades").select("id,nome,codigo").eq("id", unitId).eq("empresa_id", companyId).single()
      : Promise.resolve({ data: null }),
    documentsQuery,
    equipmentQuery,
    maintenanceQuery,
    pendingQuery,
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return {
    empresa: company.data?.nome_fantasia ?? "Empresa",
    cnpj: company.data?.cnpj ?? null,
    unidade: unit.data?.nome ?? "Visão consolidada",
    unidade_id: unitId,
    gerado_em: new Date().toISOString(),
    documentos: {
      total: documents.data?.length ?? 0,
      vencidos: documents.data?.filter((item) => item.data_vencimento && item.data_vencimento < today).length ?? 0,
    },
    equipamentos: { total: equipment.data?.length ?? 0 },
    manutencoes: {
      total: maintenance.data?.length ?? 0,
      vencidas: maintenance.data?.filter((item) => item.proxima_manutencao && item.proxima_manutencao < today).length ?? 0,
    },
    pendencias_abertas: pending.data?.filter((item) => ["pendente", "em_andamento"].includes(item.status)).length ?? 0,
    politica_ia: { leu_anexos: false, fonte: "dados_estruturados" },
  };
}
function nextRun(frequency: string) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + (frequency === "mensal" ? 28 : 7));
  return now.toISOString();
}
function authorized(request: Request) {
  const expected = Deno.env.get("SYSTEM_CRON_SECRET");
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(expected && expected === received);
}
function safeCode(cause: unknown) { return cause instanceof Error ? cause.message.slice(0, 120) : "UNKNOWN"; }
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
