import { createClient } from "npm:@supabase/supabase-js@^2";

type JsonObject = Record<string, unknown>;

/**
 * Sincroniza a quantidade de clientes adicionais na assinatura Stripe do
 * parceiro. O cliente final nunca recebe uma assinatura própria.
 */
Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
    return respond({ error: "PAYMENT_NOT_CONFIGURED" }, 503, cors);
  }

  const token = request.headers.get("authorization") ?? "";
  if (!token.toLowerCase().startsWith("bearer ")) return respond({ error: "UNAUTHORIZED" }, 401, cors);

  let input: JsonObject = {};
  try {
    input = (await request.json()) as JsonObject;
  } catch {
    return respond({ error: "INVALID_REQUEST" }, 400, cors);
  }
  const partnerId = text(input.parceiro_empresa_id);
  if (!isUuid(partnerId)) return respond({ error: "INVALID_PARTNER" }, 422, cors);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return respond({ error: "UNAUTHORIZED" }, 401, cors);

  // A própria RPC verifica que o chamador é Admin Master ou administrador do parceiro.
  const { data: summary, error: summaryError } = await userClient.rpc("api_partner_resumo", {
    p_parceiro_empresa_id: partnerId,
  });
  if (summaryError) return respond({ error: "PARTNER_ACCESS_DENIED" }, 403, cors);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: subscription, error: subscriptionError } = await admin
    .from("assinaturas_empresas")
    .select(
      "id, gateway, gateway_subscription_id, status, clientes_incluidos, clientes_ativos, clientes_extras, stripe_cliente_extra_price_id, stripe_cliente_extra_subscription_item_id, plano_id, ciclo",
    )
    .eq("empresa_id", partnerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (subscriptionError || !subscription) return respond({ error: "PARTNER_SUBSCRIPTION_NOT_FOUND" }, 404, cors);
  if (subscription.gateway !== "stripe" || !subscription.gateway_subscription_id) {
    return respond({ error: "PARTNER_STRIPE_SUBSCRIPTION_NOT_CONFIGURED" }, 503, cors);
  }
  if (!["trial", "ativa", "pagamento_pendente"].includes(subscription.status)) {
    return respond({ error: "PARTNER_BILLING_NOT_ACTIVE" }, 409, cors);
  }

  const summaryObject = isObject(summary) ? summary : {};
  if (text(summaryObject.modo_cobranca) === "unitario") {
    return syncUnitaryBilling({ admin, stripeSecretKey, partnerId, subscription, cors });
  }

  const { data: plan, error: planError } = await admin
    .from("planos")
    .select("stripe_client_extra_monthly_price_id, stripe_client_extra_yearly_price_id, preco_cliente_extra_centavos")
    .eq("id", subscription.plano_id)
    .maybeSingle();
  if (planError || !plan) return respond({ error: "PARTNER_PLAN_NOT_FOUND" }, 503, cors);

  const priceId = text(subscription.stripe_cliente_extra_price_id) ||
    (subscription.ciclo === "anual" ? text(plan.stripe_client_extra_yearly_price_id) : text(plan.stripe_client_extra_monthly_price_id));
  if (!priceId) return respond({ error: "PARTNER_CLIENT_PRICE_NOT_CONFIGURED" }, 503, cors);

  const activeClients = Math.max(0, Number(summaryObject.clientes_ativos ?? subscription.clientes_ativos ?? 0));
  // Cortesias permanecem na carteira, mas não entram na quantidade cobrada.
  const billableClients = Math.max(0, Number(summaryObject.clientes_faturaveis ?? activeClients));
  const included = Math.max(0, Number(summaryObject.clientes_incluidos ?? subscription.clientes_incluidos ?? 0));
  const quantity = Math.max(0, Math.min(5000, billableClients - included));

  const stripeSubscription = await stripeRequest(stripeSecretKey, "GET", `/v1/subscriptions/${encodeURIComponent(subscription.gateway_subscription_id)}`);
  if (!stripeSubscription.ok) return respond({ error: "STRIPE_SUBSCRIPTION_LOOKUP_FAILED" }, 503, cors);
  const stripePayload = await stripeSubscription.json() as JsonObject;
  const items = isObject(stripePayload.items) && Array.isArray(stripePayload.items.data)
    ? stripePayload.items.data.filter(isObject) : [];
  const existing = items.find((item) => {
    const price = isObject(item.price) ? item.price : {};
    return text(price.id) === priceId;
  });

  let itemId = text(subscription.stripe_cliente_extra_subscription_item_id) || text(existing?.id);
  if (quantity === 0 && itemId) {
    const removed = await stripeRequest(stripeSecretKey, "POST", `/v1/subscription_items/${encodeURIComponent(itemId)}`, {
      quantity: 0,
      proration_behavior: "create_prorations",
    });
    if (!removed.ok) return respond({ error: "STRIPE_CLIENT_QUANTITY_UPDATE_FAILED" }, 503, cors);
  } else if (quantity > 0 && itemId) {
    const updated = await stripeRequest(stripeSecretKey, "POST", `/v1/subscription_items/${encodeURIComponent(itemId)}`, {
      quantity,
      proration_behavior: "create_prorations",
    });
    if (!updated.ok) return respond({ error: "STRIPE_CLIENT_QUANTITY_UPDATE_FAILED" }, 503, cors);
  } else if (quantity > 0) {
    const created = await stripeRequest(stripeSecretKey, "POST", "/v1/subscription_items", {
      subscription: subscription.gateway_subscription_id,
      price: priceId,
      quantity,
      proration_behavior: "create_prorations",
    });
    if (!created.ok) return respond({ error: "STRIPE_CLIENT_PRICE_ATTACH_FAILED" }, 503, cors);
    const createdPayload = await created.json() as JsonObject;
    itemId = text(createdPayload.id);
  }

  const { error: updateError } = await admin
    .from("assinaturas_empresas")
    .update({
      clientes_ativos: activeClients,
      clientes_extras: quantity,
      preco_cliente_extra_centavos: Number(plan.preco_cliente_extra_centavos ?? 0),
      stripe_cliente_extra_price_id: priceId,
      stripe_cliente_extra_subscription_item_id: itemId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);
  if (updateError) return respond({ error: "PARTNER_BILLING_STATE_UPDATE_FAILED" }, 503, cors);

  return respond({
    ok: true,
    parceiro_empresa_id: partnerId,
    clientes_ativos: activeClients,
    clientes_faturaveis: billableClients,
    clientes_isentos: Math.max(0, activeClients - billableClients),
    clientes_incluidos: included,
    clientes_extras: quantity,
    stripe_subscription_item_id: itemId || null,
  }, 200, cors);
});

async function stripeRequest(secret: string, method: "GET" | "POST", path: string, payload?: JsonObject) {
  const body = payload ? new URLSearchParams(Object.entries(payload).map(([key, value]) => [key, String(value)])) : undefined;
  return fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${secret}`, ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body,
  });
}

async function syncUnitaryBilling(input: {
  admin: ReturnType<typeof createClient>;
  stripeSecretKey: string;
  partnerId: string;
  subscription: JsonObject;
  cors: Record<string, string>;
}) {
  const { admin, stripeSecretKey, partnerId, subscription, cors } = input;
  const { data: relations, error: relationError } = await admin
    .from("relacionamentos_parceiro_clientes")
    .select("cliente_empresa_id, plano_servico_id")
    .eq("parceiro_empresa_id", partnerId)
    .eq("status", "ativo");
  if (relationError) return respond({ error: "PARTNER_CLIENTS_LOOKUP_FAILED" }, 503, cors);
  const clientIds = (relations ?? []).map((row) => text((row as JsonObject).cliente_empresa_id)).filter(Boolean);
  const { data: exemptions } = clientIds.length
    ? await admin.from("isencoes_parceiro").select("cliente_empresa_id").eq("parceiro_empresa_id", partnerId).eq("status", "ativa").gte("termina_em", new Date().toISOString().slice(0, 10)).in("cliente_empresa_id", clientIds)
    : { data: [] as JsonObject[] };
  const exempt = new Set((exemptions ?? []).map((row) => text((row as JsonObject).cliente_empresa_id)));
  const billableRelations = (relations ?? []).filter((row) => !exempt.has(text((row as JsonObject).cliente_empresa_id)));
  const planIds = [...new Set(billableRelations.map((row) => text((row as JsonObject).plano_servico_id)).filter(Boolean))];
  const { data: plans, error: plansError } = planIds.length
    ? await admin.from("planos").select("id, valor_mensal_centavos, valor_anual_centavos, stripe_monthly_price_id, stripe_yearly_price_id").eq("tipo_plano", "direto").eq("ativo", true).in("id", planIds)
    : { data: [] as JsonObject[], error: null };
  if (plansError) return respond({ error: "PARTNER_UNIT_PLANS_LOOKUP_FAILED" }, 503, cors);
  const isYearly = subscription.ciclo === "anual";
  const desired = new Map<string, { quantity: number; cents: number }>();
  for (const relation of billableRelations) {
    const plan = (plans ?? []).find((candidate) => text(candidate.id) === text((relation as JsonObject).plano_servico_id));
    if (!plan) return respond({ error: "PARTNER_UNIT_PLAN_NOT_FOUND" }, 422, cors);
    const priceId = isYearly ? text(plan.stripe_yearly_price_id) : text(plan.stripe_monthly_price_id);
    if (!priceId) return respond({ error: "PARTNER_UNIT_STRIPE_PRICE_NOT_CONFIGURED" }, 503, cors);
    const current = desired.get(priceId);
    desired.set(priceId, {
      quantity: (current?.quantity ?? 0) + 1,
      cents: Number(current?.cents ?? 0) + Number(isYearly ? plan.valor_anual_centavos ?? 0 : plan.valor_mensal_centavos ?? 0),
    });
  }

  const stripeSubscription = await stripeRequest(stripeSecretKey, "GET", `/v1/subscriptions/${encodeURIComponent(String(subscription.gateway_subscription_id))}`);
  if (!stripeSubscription.ok) return respond({ error: "STRIPE_SUBSCRIPTION_LOOKUP_FAILED" }, 503, cors);
  const stripePayload = await stripeSubscription.json() as JsonObject;
  const items = isObject(stripePayload.items) && Array.isArray(stripePayload.items.data) ? stripePayload.items.data.filter(isObject) : [];
  const managedPriceIds = new Set((plans ?? []).flatMap((plan) => [text(plan.stripe_monthly_price_id), text(plan.stripe_yearly_price_id)].filter(Boolean)));
  const itemByPrice = new Map<string, JsonObject>();
  for (const item of items) {
    const price = isObject(item.price) ? item.price : {};
    const priceId = text(price.id);
    if (managedPriceIds.has(priceId)) itemByPrice.set(priceId, item);
  }
  for (const [priceId, desiredItem] of desired) {
    const existing = itemByPrice.get(priceId);
    if (existing?.id) {
      const updated = await stripeRequest(stripeSecretKey, "POST", `/v1/subscription_items/${encodeURIComponent(String(existing.id))}`, {
        quantity: desiredItem.quantity,
        proration_behavior: "create_prorations",
      });
      if (!updated.ok) return respond({ error: "STRIPE_UNIT_QUANTITY_UPDATE_FAILED" }, 503, cors);
    } else {
      const created = await stripeRequest(stripeSecretKey, "POST", "/v1/subscription_items", {
        subscription: subscription.gateway_subscription_id,
        price: priceId,
        quantity: desiredItem.quantity,
        proration_behavior: "create_prorations",
      });
      if (!created.ok) return respond({ error: "STRIPE_UNIT_PRICE_ATTACH_FAILED" }, 503, cors);
    }
  }
  for (const [priceId, item] of itemByPrice) {
    if (!desired.has(priceId) && item.id) {
      const removed = await stripeRequest(stripeSecretKey, "POST", `/v1/subscription_items/${encodeURIComponent(String(item.id))}`, {
        quantity: 0,
        proration_behavior: "create_prorations",
      });
      if (!removed.ok) return respond({ error: "STRIPE_UNIT_QUANTITY_UPDATE_FAILED" }, 503, cors);
    }
  }

  const totalCents = [...desired.values()].reduce((total, item) => total + item.cents, 0);
  const activeClients = relations?.length ?? 0;
  const { error: updateError } = await admin.from("assinaturas_empresas").update({
    plano_id: null,
    clientes_incluidos: 0,
    clientes_ativos: activeClients,
    clientes_extras: billableRelations.length,
    preco_cliente_extra_centavos: 0,
    valor_mensal_centavos: isYearly ? 0 : totalCents,
    valor_anual_centavos: isYearly ? totalCents : null,
    cobranca_consolidada: true,
    updated_at: new Date().toISOString(),
  }).eq("id", subscription.id);
  if (updateError) return respond({ error: "PARTNER_BILLING_STATE_UPDATE_FAILED" }, 503, cors);
  return respond({ ok: true, parceiro_empresa_id: partnerId, clientes_ativos: activeClients, clientes_faturaveis: billableRelations.length, clientes_isentos: activeClients - billableRelations.length, clientes_incluidos: 0, clientes_extras: billableRelations.length, cobranca_modo: "unitario", prorata: true }, 200, cors);
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  return {
    "access-control-allow-origin": configured.length === 0 ? "*" : configured.includes(origin) ? origin : configured[0],
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS", vary: "origin",
  };
}

function respond(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function isObject(value: unknown): value is JsonObject { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
