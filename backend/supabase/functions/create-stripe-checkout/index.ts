import { createClient } from "npm:@supabase/supabase-js@^2";

type JsonObject = Record<string, unknown>;

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const appUrl = normalizedAppUrl(Deno.env.get("APP_URL") ?? Deno.env.get("ALLOWED_ORIGIN"));
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !appUrl) {
    return respond({ error: "PAYMENT_NOT_CONFIGURED" }, 503, cors);
  }

  let input: JsonObject;
  try {
    input = (await request.json()) as JsonObject;
  } catch {
    return respond({ error: "INVALID_REQUEST" }, 400, cors);
  }

  const sessionToken = String(input.session_token ?? "").trim();
  if (sessionToken.length < 32 || sessionToken.length > 128) {
    return respond({ error: "INVALID_SIGNUP_SESSION" }, 422, cors);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tokenHash = await sha256(sessionToken);
  const { data: signup, error: signupError } = await admin
    .from("sessoes_contratacao")
    .select("id, status, email_responsavel, expira_em, stripe_checkout_session_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (signupError) return respond({ error: "SIGNUP_SESSION_LOOKUP_FAILED" }, 503, cors);
  if (!signup) return respond({ error: "SIGNUP_SESSION_NOT_FOUND" }, 404, cors);
  if (new Date(signup.expira_em).getTime() <= Date.now()) {
    await admin
      .from("sessoes_contratacao")
      .update({ status: "expirada", updated_at: new Date().toISOString() })
      .eq("id", signup.id);
    return respond({ error: "SIGNUP_SESSION_EXPIRED" }, 410, cors);
  }
  if (signup.status === "checkout_pendente" && signup.stripe_checkout_session_id) {
    try {
      const existingResponse = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(signup.stripe_checkout_session_id)}`,
        { headers: { authorization: `Bearer ${stripeSecretKey}` } },
      );
      const existing = (await existingResponse.json()) as JsonObject;
      if (existingResponse.ok && existing.status === "open" && existing.url) {
        return respond(
          {
            checkout_url: existing.url,
            checkout_session_id: existing.id,
            status: "checkout_pendente",
            resumed: true,
          },
          200,
          cors,
        );
      }
    } catch {
      return respond({ error: "PAYMENT_PROVIDER_UNAVAILABLE" }, 503, cors);
    }
    return respond({ error: "CHECKOUT_ALREADY_COMPLETED_OR_EXPIRED" }, 409, cors);
  }
  if (signup.status !== "pre_analisada") {
    return respond({ error: "SIGNUP_SESSION_INVALID_STATUS" }, 409, cors);
  }

  const { data: snapshot, error: snapshotError } = await admin
    .from("fotografias_contratacao")
    .select("id, stripe_price_id, plano_nome, periodicidade, valor_centavos, moeda")
    .eq("sessao_contratacao_id", signup.id)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError || !snapshot)
    return respond({ error: "CONTRACT_SNAPSHOT_NOT_FOUND" }, 503, cors);

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", snapshot.stripe_price_id);
  form.set("line_items[0][quantity]", "1");
  form.set("customer_email", signup.email_responsavel);
  form.set("client_reference_id", signup.id);
  form.set("metadata[signup_session_id]", signup.id);
  form.set("subscription_data[metadata][signup_session_id]", signup.id);
  form.set("success_url", `${appUrl}/checkout/sucesso?checkout_session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${appUrl}/cadastro?checkout=cancelled`);
  form.set("locale", "auto");
  form.set("billing_address_collection", "auto");
  form.set("allow_promotion_codes", "true");

  const headers: Record<string, string> = {
    authorization: `Bearer ${stripeSecretKey}`,
    "content-type": "application/x-www-form-urlencoded",
    "idempotency-key": `conform-flow-checkout-${signup.id}-v1`,
  };
  const stripeVersion = Deno.env.get("STRIPE_API_VERSION");
  if (stripeVersion) headers["stripe-version"] = stripeVersion;

  let stripeResponse: Response;
  try {
    stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers,
      body: form,
    });
  } catch {
    return respond({ error: "PAYMENT_PROVIDER_UNAVAILABLE" }, 503, cors);
  }

  const checkout = (await stripeResponse.json()) as JsonObject;
  if (!stripeResponse.ok || !checkout.id || !checkout.url) {
    console.error(
      "stripe_checkout_create_failed",
      String((checkout.error as JsonObject | undefined)?.code ?? "unknown"),
    );
    return respond({ error: "CHECKOUT_CREATE_FAILED" }, 502, cors);
  }

  const { data: updated, error: updateError } = await admin
    .from("sessoes_contratacao")
    .update({
      status: "checkout_pendente",
      stripe_checkout_session_id: String(checkout.id),
      updated_at: new Date().toISOString(),
    })
    .eq("id", signup.id)
    .eq("status", "pre_analisada")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) return respond({ error: "CHECKOUT_STATE_CONFLICT" }, 409, cors);

  await admin.from("eventos_contratacao").insert({
    sessao_contratacao_id: signup.id,
    tipo: "checkout_stripe_criado",
    status_anterior: "pre_analisada",
    status_novo: "checkout_pendente",
    origem: "edge_function",
    metadata_json: { checkout_session_id: checkout.id, snapshot_id: snapshot.id },
  });

  return respond(
    {
      checkout_url: checkout.url,
      checkout_session_id: checkout.id,
      status: "checkout_pendente",
    },
    201,
    cors,
  );
});

function normalizedAppUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.split(",")[0].trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function corsHeaders(request: Request): Record<string, string> {
  const requestOrigin = request.headers.get("origin") ?? "";
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigin =
    configured.length === 0
      ? "*"
      : configured.includes(requestOrigin)
        ? requestOrigin
        : configured[0];
  return {
    "access-control-allow-origin": allowedOrigin,
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
