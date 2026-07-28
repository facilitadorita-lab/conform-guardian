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
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !appUrl) {
    return respond({ error: "PAYMENT_NOT_CONFIGURED" }, 503, cors);
  }
  if (!accessToken) return respond({ error: "AUTH_REQUIRED" }, 401, cors);

  let input: JsonObject = {};
  try {
    input = (await request.json()) as JsonObject;
  } catch {
    // Empresa selecionada pode ser omitida para usuários com uma única empresa.
  }
  const companyId = text(input.empresa_id);
  if (!isUuid(companyId)) return respond({ error: "COMPANY_REQUIRED" }, 422, cors);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authUser, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !authUser.user) return respond({ error: "AUTH_REQUIRED" }, 401, cors);

  const [{ data: user, error: userError }, { data: membership, error: membershipError }] = await Promise.all([
    admin.from("usuarios").select("is_master, status, deleted_at").eq("id", authUser.user.id).maybeSingle(),
    admin
      .from("usuarios_empresas")
      .select("empresa_id, ativo, deleted_at")
      .eq("usuario_id", authUser.user.id)
      .eq("empresa_id", companyId)
      .maybeSingle(),
  ]);
  if (userError || membershipError || !user || user.status !== "ativo" || user.deleted_at) {
    return respond({ error: "FORBIDDEN" }, 403, cors);
  }
  if (!user.is_master && (!membership || !membership.ativo || membership.deleted_at)) {
    return respond({ error: "FORBIDDEN" }, 403, cors);
  }

  const { data: subscription, error: subscriptionError } = await admin
    .from("assinaturas_empresas")
    .select("gateway_customer_id, status")
    .eq("empresa_id", companyId)
    .eq("gateway", "stripe")
    .is("deleted_at", null)
    .maybeSingle();
  if (subscriptionError) return respond({ error: "SUBSCRIPTION_LOOKUP_FAILED" }, 503, cors);
  if (!subscription?.gateway_customer_id) {
    return respond({ error: "STRIPE_CUSTOMER_NOT_FOUND" }, 404, cors);
  }

  const form = new URLSearchParams();
  form.set("customer", subscription.gateway_customer_id);
  form.set("return_url", `${appUrl}/configuracoes?billing=updated`);
  const stripeResponse = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const portal = (await stripeResponse.json()) as JsonObject;
  if (!stripeResponse.ok || !text(portal.url)) {
    return respond({ error: "PORTAL_CREATE_FAILED" }, 502, cors);
  }
  return respond({ portal_url: text(portal.url), status: subscription.status }, 200, cors);
});

function normalizedAppUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.split(",")[0].trim());
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    "access-control-allow-origin": allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0],
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}

function respond(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
