import { createClient } from "npm:@supabase/supabase-js@^2";

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond({ error: "SERVICE_UNAVAILABLE" }, 503, cors);

  let input: { checkout_session_id?: unknown; session_token?: unknown };
  try {
    input = await request.json();
  } catch {
    return respond({ error: "INVALID_REQUEST" }, 400, cors);
  }

  const checkoutId = String(input.checkout_session_id ?? "").trim();
  const token = String(input.session_token ?? "").trim();
  if (!checkoutId.startsWith("cs_") || token.length < 32 || token.length > 128) {
    return respond({ error: "INVALID_SIGNUP_SESSION" }, 422, cors);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error } = await admin
    .from("sessoes_contratacao")
    .select("status, email_responsavel, pagamento_confirmado_at, email_verificado_at, expira_em")
    .eq("stripe_checkout_session_id", checkoutId)
    .eq("token_hash", await sha256(token))
    .maybeSingle();

  if (error) return respond({ error: "SIGNUP_STATUS_UNAVAILABLE" }, 503, cors);
  if (!session) return respond({ error: "SIGNUP_SESSION_NOT_FOUND" }, 404, cors);

  return respond(
    {
      status: session.status,
      email_masked: maskEmail(session.email_responsavel),
      payment_confirmed: Boolean(session.pagamento_confirmado_at),
      email_verified: Boolean(session.email_verificado_at),
      can_send_otp: session.status === "email_pendente",
      ready: session.status === "provisionada",
      expires_at: session.expira_em,
    },
    200,
    cors,
  );
});

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, Math.min(2, name.length))}***@${domain}`;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((value) => value.trim())
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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
