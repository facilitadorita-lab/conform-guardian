import { createClient } from "npm:@supabase/supabase-js@^2";

type Payload = {
  fingerprint?: string;
  severity?: "info" | "warning" | "error" | "fatal";
  source?: string;
  route?: string;
  message?: string;
  stack?: string;
  release?: string;
  environment?: "development" | "staging" | "production";
  companyId?: string;
  metadata?: Record<string, unknown>;
};

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);
  if (!originAllowed(request)) return respond({ error: "ORIGIN_NOT_ALLOWED" }, 403, cors);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return respond({ error: "SERVICE_UNAVAILABLE" }, 503, cors);

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return respond({ error: "INVALID_PAYLOAD" }, 400, cors);
  }

  const message = sanitizeText(payload.message, 1200);
  const source = sanitizeText(payload.source, 120) || "frontend";
  if (!message) return respond({ error: "MESSAGE_REQUIRED" }, 400, cors);
  const stackHash = payload.stack ? await sha256(String(payload.stack).slice(0, 20_000)) : null;
  const fingerprint = sanitizeToken(payload.fingerprint) ||
    await sha256(`${source}|${sanitizeText(payload.route, 300)}|${message}|${stackHash ?? ""}`);

  let userId: string | null = null;
  let companyId: string | null = null;
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.startsWith("Bearer ")) {
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData } = await userClient.auth.getUser();
    userId = authData.user?.id ?? null;
    if (userId && isUuid(payload.companyId)) {
      const { data: allowed } = await userClient.rpc("has_company_access", {
        p_empresa_id: payload.companyId,
      });
      if (allowed === true) companyId = payload.companyId!;
    }
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const environment = ["development", "staging", "production"].includes(payload.environment ?? "")
    ? payload.environment!
    : "production";
  const { data: existing } = await admin
    .from("eventos_erro_sistema")
    .select("id,ocorrencias")
    .eq("ambiente", environment)
    .eq("fingerprint", fingerprint)
    .is("resolvido_at", null)
    .maybeSingle();

  const record = {
    fingerprint,
    ambiente: environment,
    severidade: payload.severity ?? "error",
    origem: source,
    rota: sanitizeText(payload.route, 300) || null,
    mensagem_sanitizada: message,
    stack_hash: stackHash,
    release_version: sanitizeText(payload.release, 120) || null,
    empresa_id: companyId,
    usuario_id: userId,
    ultima_ocorrencia_at: new Date().toISOString(),
    metadata_json: sanitizeMetadata(payload.metadata),
  };

  const operation = existing
    ? admin.from("eventos_erro_sistema").update({ ...record, ocorrencias: existing.ocorrencias + 1 }).eq("id", existing.id)
    : admin.from("eventos_erro_sistema").insert(record);
  const { error } = await operation;
  if (error) return respond({ error: "EVENT_NOT_RECORDED" }, 503, cors);
  return respond({ accepted: true }, 202, cors);
});

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const blocked = /token|secret|password|senha|authorization|cookie|document|content|arquivo|anexo/i;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !blocked.test(key))
      .slice(0, 20)
      .map(([key, item]) => [key.slice(0, 80), sanitizeText(item, 300)]),
  );
}
function sanitizeText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "[REDACTED]")
    .replace(/\b(?:sbp_|sk_|whsec_)[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[EMAIL]")
    .slice(0, max)
    .trim();
}
function sanitizeToken(value: unknown) {
  const text = String(value ?? "").trim();
  return /^[A-Za-z0-9:_-]{8,160}$/.test(text) ? text : "";
}
function isUuid(value: unknown): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ""));
}
function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://conform-guardian.lovable.app")
    .split(",").map((item) => item.trim());
  return allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}
function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "access-control-allow-origin": originAllowed(request) ? origin || "https://conform-guardian.lovable.app" : "null",
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods": "POST,OPTIONS",
    vary: "Origin",
  };
}
function respond(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
