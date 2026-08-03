import { createClient } from "npm:@supabase/supabase-js@^2";

type JsonObject = Record<string, unknown>;

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const appUrl = normalizedAppUrl(Deno.env.get("APP_URL") ?? Deno.env.get("ALLOWED_ORIGIN"));
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey || !appUrl) {
    return respond({ error: "PAYMENT_NOT_CONFIGURED" }, 503, cors);
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return respond({ error: "UNAUTHORIZED" }, 401, cors);
  let input: JsonObject = {};
  try { input = (await request.json()) as JsonObject; } catch { return respond({ error: "INVALID_REQUEST" }, 400, cors); }
  const partnerId = text(input.parceiro_empresa_id);
  const interval = text(input.billing_interval) === "yearly" ? "yearly" : "monthly";
  if (!isUuid(partnerId)) return respond({ error: "INVALID_PARTNER" }, 422, cors);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: summary, error: summaryError } = await userClient.rpc("api_partner_resumo", {
    p_parceiro_empresa_id: partnerId,
  });
  if (summaryError || !isObject(summary)) return respond({ error: "PARTNER_ACCESS_DENIED" }, 403, cors);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const summaryObject = summary as JsonObject;
  const billingMode = text(summaryObject.modo_cobranca) === "unitario" ? "unitario" : "plano_carteira";
  const summaryPlan = isObject(summaryObject.plano) ? summaryObject.plano : {};
  const summaryPlanId = text(summaryPlan.id);
  const [{ data: company }, { data: plan }, { data: subscription }] = await Promise.all([
    admin.from("empresas").select("id, nome_fantasia, email_principal").eq("id", partnerId).eq("tipo_conta", "parceira").maybeSingle(),
    admin.from("planos").select("id, codigo, nome, moeda, stripe_monthly_price_id, stripe_yearly_price_id").eq("id", summaryPlanId).eq("tipo_plano", "parceiro").maybeSingle(),
    admin.from("assinaturas_empresas").select("gateway_subscription_id, status").eq("empresa_id", partnerId).is("deleted_at", null).maybeSingle(),
  ]);
  if (!company) return respond({ error: "PARTNER_NOT_FOUND" }, 404, cors);
  if (subscription?.gateway_subscription_id && ["ativa", "trial"].includes(text(subscription.status))) {
    return respond({ error: "PARTNER_SUBSCRIPTION_ALREADY_ACTIVE" }, 409, cors);
  }
  if (billingMode === "unitario") {
    return createUnitaryCheckout({ admin, stripeSecretKey, partnerId, company: company as JsonObject, appUrl, cors, interval });
  }
  if (!plan) return respond({ error: "PARTNER_PLAN_NOT_FOUND" }, 404, cors);
  const priceId = interval === "yearly" ? text(plan.stripe_yearly_price_id) : text(plan.stripe_monthly_price_id);
  if (!priceId) return respond({ error: "PARTNER_STRIPE_PRICE_NOT_CONFIGURED" }, 503, cors);

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", `${appUrl}/dashboard?partner_checkout=success`);
  form.set("cancel_url", `${appUrl}/master/empresas?partner_checkout=cancelled`);
  const companyEmail = text(company.email_principal);
  if (companyEmail) form.set("customer_email", companyEmail);
  form.set("metadata[partner_empresa_id]", partnerId);
  form.set("metadata[partner_plan_id]", text(plan.id));
  form.set("metadata[partner_billing_interval]", interval);
  form.set("subscription_data[metadata][partner_empresa_id]", partnerId);
  form.set("subscription_data[metadata][partner_plan_id]", text(plan.id));
  form.set("subscription_data[metadata][partner_billing_interval]", interval);
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${stripeSecretKey}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const payload = await response.json() as JsonObject;
  if (!response.ok || !text(payload.url)) return respond({ error: "STRIPE_CHECKOUT_CREATE_FAILED" }, 503, cors);
  return respond({ checkout_url: payload.url, checkout_session_id: text(payload.id), status: "checkout_pendente" }, 201, cors);
});

async function createUnitaryCheckout(input: {
  admin: ReturnType<typeof createClient>;
  stripeSecretKey: string;
  partnerId: string;
  company: JsonObject;
  appUrl: string;
  cors: Record<string, string>;
  interval: "monthly" | "yearly";
}) {
  const { admin, stripeSecretKey, partnerId, company, appUrl, cors, interval } = input;
  const { data: relations, error: relationError } = await admin
    .from("relacionamentos_parceiro_clientes")
    .select("cliente_empresa_id, plano_servico_id")
    .eq("parceiro_empresa_id", partnerId)
    .eq("status", "ativo");
  if (relationError) return respond({ error: "PARTNER_CLIENTS_LOOKUP_FAILED" }, 503, cors);
  const clientIds = (relations ?? []).map((row) => text((row as JsonObject).cliente_empresa_id)).filter(Boolean);
  if (clientIds.length === 0) return respond({ error: "PARTNER_UNIT_CLIENTS_REQUIRED" }, 409, cors);

  const { data: exemptions } = await admin
    .from("isencoes_parceiro")
    .select("cliente_empresa_id")
    .eq("parceiro_empresa_id", partnerId)
    .eq("status", "ativa")
    .gte("termina_em", new Date().toISOString().slice(0, 10))
    .in("cliente_empresa_id", clientIds);
  const exempt = new Set((exemptions ?? []).map((row) => text((row as JsonObject).cliente_empresa_id)));
  const billableRelations = (relations ?? []).filter((row) => !exempt.has(text((row as JsonObject).cliente_empresa_id)));
  if (billableRelations.length === 0) return respond({ error: "PARTNER_UNIT_CLIENTS_ALL_EXEMPT" }, 409, cors);

  const planIds = [...new Set(billableRelations.map((row) => text((row as JsonObject).plano_servico_id)).filter(Boolean))];
  const { data: plans, error: plansError } = await admin
    .from("planos")
    .select("id, codigo, nome, moeda, stripe_monthly_price_id, stripe_yearly_price_id")
    .eq("tipo_plano", "direto")
    .eq("ativo", true)
    .in("id", planIds);
  if (plansError) return respond({ error: "PARTNER_UNIT_PLANS_LOOKUP_FAILED" }, 503, cors);
  const groups = new Map<string, { plan: JsonObject; quantity: number }>();
  for (const relation of billableRelations) {
    const plan = (plans ?? []).find((candidate) => text(candidate.id) === text((relation as JsonObject).plano_servico_id));
    if (!plan) return respond({ error: "PARTNER_UNIT_PLAN_NOT_FOUND" }, 422, cors);
    const key = text(plan.id);
    const current = groups.get(key);
    groups.set(key, { plan: plan as JsonObject, quantity: (current?.quantity ?? 0) + 1 });
  }

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", `${appUrl}/dashboard?partner_checkout=success`);
  form.set("cancel_url", `${appUrl}/master/empresas?partner_checkout=cancelled`);
  const companyEmail = text(company.email_principal);
  if (companyEmail) form.set("customer_email", companyEmail);
  form.set("metadata[partner_empresa_id]", partnerId);
  form.set("metadata[partner_billing_mode]", "unitario");
  form.set("metadata[partner_billing_interval]", interval);
  form.set("subscription_data[metadata][partner_empresa_id]", partnerId);
  form.set("subscription_data[metadata][partner_billing_mode]", "unitario");
  form.set("subscription_data[metadata][partner_billing_interval]", interval);
  if (interval === "monthly") {
    // Fecha o ciclo no primeiro dia do próximo mês e cobra apenas a fração
    // entre a ativação e esse marco no primeiro invoice.
    form.set("subscription_data[billing_cycle_anchor]", String(nextMonthAnchorUnix()));
    form.set("subscription_data[proration_behavior]", "create_prorations");
  }
  let index = 0;
  for (const { plan, quantity } of groups.values()) {
    const priceId = interval === "yearly" ? text(plan.stripe_yearly_price_id) : text(plan.stripe_monthly_price_id);
    if (!priceId) return respond({ error: "PARTNER_UNIT_STRIPE_PRICE_NOT_CONFIGURED" }, 503, cors);
    form.set(`line_items[${index}][price]`, priceId);
    form.set(`line_items[${index}][quantity]`, String(quantity));
    index += 1;
  }
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${stripeSecretKey}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const payload = await response.json() as JsonObject;
  if (!response.ok || !text(payload.url)) return respond({ error: "STRIPE_CHECKOUT_CREATE_FAILED" }, 503, cors);
  return respond({ checkout_url: text(payload.url), checkout_session_id: text(payload.id), status: "checkout_pendente", billing_mode: "unitario" }, 201, cors);
}

function nextMonthAnchorUnix() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000);
}

function normalizedAppUrl(value: string | undefined) { try { const url = new URL((value ?? "").split(",")[0].trim()); return ["http:", "https:"].includes(url.protocol) ? `${url.origin}${url.pathname.replace(/\/$/, "")}` : null; } catch { return null; } }
function corsHeaders(request: Request) { const origin = request.headers.get("origin") ?? ""; const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "").split(",").map((v) => v.trim()).filter(Boolean); return { "access-control-allow-origin": configured.length === 0 ? "*" : configured.includes(origin) ? origin : configured[0], "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, OPTIONS", vary: "origin" }; }
function respond(body: unknown, status: number, cors: Record<string, string>) { return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function isObject(value: unknown): value is JsonObject { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
