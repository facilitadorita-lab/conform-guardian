import { createClient } from "npm:@supabase/supabase-js@^2";

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("authorization") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return respond({ error: "UNAUTHORIZED" }, 401, cors);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user?.email || !authData.user.email_confirmed_at) {
    return respond({ error: "EMAIL_NOT_VERIFIED" }, 401, cors);
  }

  let input: { session_token?: unknown };
  try {
    input = await request.json();
  } catch {
    return respond({ error: "INVALID_REQUEST" }, 400, cors);
  }
  const token = String(input.session_token ?? "").trim();
  if (token.length < 32 || token.length > 128)
    return respond({ error: "INVALID_SIGNUP_SESSION" }, 422, cors);

  const { data: session, error } = await admin
    .from("sessoes_contratacao")
    .select("id, email_responsavel, auth_user_id, status")
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  if (error) return respond({ error: "SIGNUP_SESSION_LOOKUP_FAILED" }, 503, cors);
  if (!session) return respond({ error: "SIGNUP_SESSION_NOT_FOUND" }, 404, cors);
  if (
    session.auth_user_id !== authData.user.id ||
    session.email_responsavel !== authData.user.email.toLowerCase()
  ) {
    return respond({ error: "SIGNUP_USER_MISMATCH" }, 403, cors);
  }

  const { data, error: confirmationError } = await admin.rpc(
    "internal_confirmar_email_contratacao",
    {
      p_sessao_id: session.id,
      p_auth_user_id: authData.user.id,
    },
  );
  if (confirmationError) {
    console.error("signup_email_confirmation_failed", confirmationError.code ?? "unknown");
    return respond({ error: "SIGNUP_CONFIRMATION_FAILED" }, 503, cors);
  }
  return respond(data, 200, cors);
});

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
