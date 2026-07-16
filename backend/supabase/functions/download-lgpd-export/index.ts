import { createClient } from "npm:@supabase/supabase-js@^2";

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("authorization") ?? "";
  if (!url || !anon || !service || !authorization)
    return respond({ error: "UNAUTHORIZED" }, 401, cors);
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return respond({ error: "UNAUTHORIZED" }, 401, cors);
  const { data: aal2 } = await userClient.rpc("session_has_aal2");
  if (!aal2) return respond({ error: "MFA_AAL2_REQUIRED" }, 403, cors);
  let input: { request_id?: unknown };
  try {
    input = await request.json();
  } catch {
    return respond({ error: "INVALID_REQUEST" }, 400, cors);
  }
  const requestId = String(input.request_id ?? "");
  const { data: item, error } = await admin
    .from("solicitacoes_exportacao_lgpd")
    .select("id, empresa_id, status, storage_path, expira_em")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !item) return respond({ error: "EXPORT_NOT_FOUND" }, 404, cors);
  const { data: allowed } = await userClient.rpc("can_admin_company", {
    p_empresa_id: item.empresa_id,
  });
  if (!allowed) return respond({ error: "FORBIDDEN" }, 403, cors);
  if (
    item.status !== "ready" ||
    !item.storage_path ||
    !item.expira_em ||
    Date.parse(item.expira_em) <= Date.now()
  )
    return respond({ error: "EXPORT_NOT_READY" }, 409, cors);
  const { data: signed, error: signedError } = await admin.storage
    .from("lgpd-exports")
    .createSignedUrl(item.storage_path, 60);
  if (signedError || !signed?.signedUrl) return respond({ error: "EXPORT_LINK_FAILED" }, 503, cors);
  await admin.from("logs_auditoria").insert({
    usuario_id: userData.user.id,
    empresa_id: item.empresa_id,
    modulo: "lgpd",
    acao: "exportacao_baixada",
    registro_id: item.id,
    novo_valor: { expires_in: 60 },
  });
  return respond({ signed_url: signed.signedUrl, expires_in: 60 }, 200, cors);
});
function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return {
    "access-control-allow-origin":
      allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0],
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}
function respond(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
