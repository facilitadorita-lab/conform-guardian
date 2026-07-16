import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2";

const exportTables = [
  "documentos",
  "equipamentos",
  "calibracoes",
  "qualificacoes",
  "manutencoes",
  "pendencias",
  "tratativas_pendencias",
  "anexos",
  "alertas",
  "logs_auditoria",
] as const;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405);
  const secret = Deno.env.get("SYSTEM_CRON_SECRET");
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !constantTimeEqual(secret, received))
    return respond({ error: "UNAUTHORIZED" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond({ error: "SERVICE_UNAVAILABLE" }, 503);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: requests, error } = await admin
    .from("solicitacoes_exportacao_lgpd")
    .select("id, empresa_id, solicitante_id, escopo_json")
    .eq("status", "pending")
    .order("created_at")
    .limit(3);
  if (error) return respond({ error: "EXPORT_QUEUE_UNAVAILABLE" }, 503);

  let completed = 0;
  for (const item of requests ?? []) {
    const claimed = await claim(admin, item.id);
    if (!claimed) continue;
    try {
      const payload = await buildExport(admin, item.empresa_id, item.id);
      const serialized = JSON.stringify(payload, null, 2);
      const hash = await sha256(serialized);
      const path = `${item.empresa_id}/${item.id}/conform-flow-export.json`;
      const { error: uploadError } = await admin.storage
        .from("lgpd-exports")
        .upload(path, new Blob([serialized], { type: "application/json" }), {
          upsert: false,
          contentType: "application/json",
          cacheControl: "no-store",
        });
      if (uploadError) throw new Error("EXPORT_UPLOAD_FAILED");
      const { error: updateError } = await admin
        .from("solicitacoes_exportacao_lgpd")
        .update({
          status: "ready",
          storage_path: path,
          arquivo_hash: hash,
          processed_at: new Date().toISOString(),
          expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", item.id)
        .eq("status", "processing");
      if (updateError) throw new Error("EXPORT_STATUS_UPDATE_FAILED");
      completed += 1;
    } catch (caught) {
      console.error(
        "lgpd_export_failed",
        item.id,
        caught instanceof Error ? caught.message : "unknown",
      );
      await admin
        .from("solicitacoes_exportacao_lgpd")
        .update({
          status: "failed",
          erro_codigo: caught instanceof Error ? caught.message.slice(0, 100) : "unknown",
          processed_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
  }
  return respond({ processed: requests?.length ?? 0, completed }, 200);
});

async function claim(admin: SupabaseClient, id: string) {
  const { data } = await admin
    .from("solicitacoes_exportacao_lgpd")
    .update({ status: "processing" })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

async function buildExport(admin: SupabaseClient, companyId: string, requestId: string) {
  const { data: company, error: companyError } = await admin
    .from("empresas")
    .select("*")
    .eq("id", companyId)
    .single();
  if (companyError || !company) throw new Error("COMPANY_NOT_FOUND");
  const data: Record<string, unknown> = { empresa: sanitizeCompany(company) };
  for (const table of exportTables) {
    const { data: rows, error } = await admin
      .from(table)
      .select("*")
      .eq("empresa_id", companyId)
      .limit(10000);
    if (error) throw new Error(`EXPORT_TABLE_FAILED:${table}`);
    data[table] = rows ?? [];
  }
  const { data: links, error: linksError } = await admin
    .from("usuarios_empresas")
    .select(
      "perfil, ativo, created_at, usuarios(id, nome, email, telefone, cargo, status, ultimo_acesso)",
    )
    .eq("empresa_id", companyId);
  if (linksError) throw new Error("EXPORT_USERS_FAILED");
  data.usuarios = links ?? [];
  return {
    manifest: {
      format: "conform-flow-portability-v1",
      request_id: requestId,
      company_id: companyId,
      generated_at: new Date().toISOString(),
      attachment_binaries_included: false,
      note: "Metadados e trilhas dos anexos estão incluídos; binários confidenciais permanecem no cofre privado.",
    },
    data,
  };
}

function sanitizeCompany(company: Record<string, unknown>) {
  const copy = { ...company };
  delete copy.observacoes;
  return copy;
}
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function respond(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
