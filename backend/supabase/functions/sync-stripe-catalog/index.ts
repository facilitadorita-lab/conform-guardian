import { createClient } from "npm:@supabase/supabase-js@^2";

type JsonObject = Record<string, unknown>;

type PlanRow = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo_plano: "direto" | "parceiro";
  moeda: string;
  valor_mensal_centavos: number;
  valor_anual_centavos: number | null;
  preco_cliente_extra_centavos: number | null;
  stripe_product_id: string | null;
  stripe_monthly_price_id: string | null;
  stripe_yearly_price_id: string | null;
  stripe_client_extra_monthly_price_id: string | null;
  stripe_client_extra_yearly_price_id: string | null;
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
    return json({ error: "CATALOG_SYNC_NOT_CONFIGURED" }, 503);
  }

  const authorizedServiceCredential = serviceRoleCredential(request, serviceRoleKey, supabaseUrl);
  if (!authorizedServiceCredential) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  let input: JsonObject = {};
  try {
    input = (await request.json()) as JsonObject;
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }

  if (text(input.confirmation) !== "SINCRONIZAR-CATALOGO") {
    return json({ error: "CONFIRMATION_REQUIRED" }, 422);
  }

  const expectedMode = text(input.expected_mode);
  const actualMode = stripeMode(stripeSecretKey);
  if (!["test", "live"].includes(expectedMode) || actualMode !== expectedMode) {
    return json(
      { error: "STRIPE_MODE_MISMATCH", expected_mode: expectedMode, actual_mode: actualMode },
      409,
    );
  }

  const admin = createClient(supabaseUrl, authorizedServiceCredential, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: plansData, error: plansError } = await admin
    .from("planos")
    .select(
      "id,codigo,nome,descricao,tipo_plano,moeda,valor_mensal_centavos,valor_anual_centavos,preco_cliente_extra_centavos,stripe_product_id,stripe_monthly_price_id,stripe_yearly_price_id,stripe_client_extra_monthly_price_id,stripe_client_extra_yearly_price_id",
    )
    .in("codigo", [
      "essencial",
      "profissional",
      "rede",
      "parceiro_start",
      "parceiro_pro",
      "parceiro_enterprise",
    ])
    .eq("ativo", true);

  if (plansError || !plansData || plansData.length !== 6) {
    return json({ error: "COMMERCIAL_CATALOG_INCOMPLETE" }, 503);
  }

  let createdProducts = 0;
  let createdPrices = 0;

  try {
    for (const rawPlan of plansData) {
      const plan = rawPlan as PlanRow;
      const product = await ensureProduct(stripeSecretKey, plan);
      if (product.created) createdProducts += 1;

      const monthly = await ensurePrice(stripeSecretKey, {
        currentId: plan.stripe_monthly_price_id,
        productId: product.id,
        amount: plan.valor_mensal_centavos,
        currency: plan.moeda,
        interval: "month",
        code: `${plan.codigo}_monthly`,
        label: `${plan.nome} mensal`,
      });
      const yearly = await ensurePrice(stripeSecretKey, {
        currentId: plan.stripe_yearly_price_id,
        productId: product.id,
        amount: requiredPositiveAmount(plan.valor_anual_centavos, `${plan.codigo}_yearly`),
        currency: plan.moeda,
        interval: "year",
        code: `${plan.codigo}_yearly`,
        label: `${plan.nome} anual`,
      });
      if (monthly.created) createdPrices += 1;
      if (yearly.created) createdPrices += 1;

      const updates: JsonObject = {
        stripe_product_id: product.id,
        stripe_monthly_price_id: monthly.id,
        stripe_yearly_price_id: yearly.id,
        updated_at: new Date().toISOString(),
      };

      if (plan.tipo_plano === "parceiro") {
        const extraMonthlyAmount = requiredPositiveAmount(
          plan.preco_cliente_extra_centavos,
          `${plan.codigo}_client_extra_monthly`,
        );
        const extraMonthly = await ensurePrice(stripeSecretKey, {
          currentId: plan.stripe_client_extra_monthly_price_id,
          productId: product.id,
          amount: extraMonthlyAmount,
          currency: plan.moeda,
          interval: "month",
          code: `${plan.codigo}_client_extra_monthly`,
          label: `${plan.nome} - cliente adicional mensal`,
        });
        const extraYearly = await ensurePrice(stripeSecretKey, {
          currentId: plan.stripe_client_extra_yearly_price_id,
          productId: product.id,
          amount: extraMonthlyAmount * 10,
          currency: plan.moeda,
          interval: "year",
          code: `${plan.codigo}_client_extra_yearly`,
          label: `${plan.nome} - cliente adicional anual`,
        });
        if (extraMonthly.created) createdPrices += 1;
        if (extraYearly.created) createdPrices += 1;
        updates.stripe_client_extra_monthly_price_id = extraMonthly.id;
        updates.stripe_client_extra_yearly_price_id = extraYearly.id;
      }

      const { error: updateError } = await admin.from("planos").update(updates).eq("id", plan.id);
      if (updateError) throw new Error(`PLAN_UPDATE_FAILED:${plan.codigo}:${updateError.code}`);
    }

    const { data: config, error: configError } = await admin
      .from("configuracoes_comerciais")
      .select(
        "preco_usuario_extra_centavos,preco_unidade_extra_centavos,stripe_usuario_extra_monthly_price_id,stripe_usuario_extra_yearly_price_id,stripe_unidade_extra_monthly_price_id,stripe_unidade_extra_yearly_price_id",
      )
      .eq("id", true)
      .maybeSingle();
    if (configError) throw new Error(`COMMERCIAL_CONFIGURATION_QUERY_FAILED:${configError.code}`);
    if (!config) throw new Error("COMMERCIAL_CONFIGURATION_NOT_FOUND");

    const userExtra = await syncAddon(stripeSecretKey, {
      name: "Conform Flow - usuario adicional",
      code: "usuario_extra",
      monthlyAmount: requiredPositiveAmount(config.preco_usuario_extra_centavos, "usuario_extra"),
      monthlyPriceId: text(config.stripe_usuario_extra_monthly_price_id),
      yearlyPriceId: text(config.stripe_usuario_extra_yearly_price_id),
    });
    const unitExtra = await syncAddon(stripeSecretKey, {
      name: "Conform Flow - unidade adicional",
      code: "unidade_extra",
      monthlyAmount: requiredPositiveAmount(config.preco_unidade_extra_centavos, "unidade_extra"),
      monthlyPriceId: text(config.stripe_unidade_extra_monthly_price_id),
      yearlyPriceId: text(config.stripe_unidade_extra_yearly_price_id),
    });
    createdProducts += Number(userExtra.productCreated) + Number(unitExtra.productCreated);
    createdPrices += userExtra.createdPrices + unitExtra.createdPrices;

    const { error: configUpdateError } = await admin
      .from("configuracoes_comerciais")
      .update({
        stripe_usuario_extra_monthly_price_id: userExtra.monthlyPriceId,
        stripe_usuario_extra_yearly_price_id: userExtra.yearlyPriceId,
        stripe_unidade_extra_monthly_price_id: unitExtra.monthlyPriceId,
        stripe_unidade_extra_yearly_price_id: unitExtra.yearlyPriceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (configUpdateError) {
      throw new Error(`COMMERCIAL_CONFIGURATION_UPDATE_FAILED:${configUpdateError.code}`);
    }
  } catch (error) {
    const reason = safeFailureReason(error);
    console.error("stripe_catalog_sync_failed", reason);
    return json({ error: "STRIPE_CATALOG_SYNC_FAILED", reason }, 502);
  }

  return json({
    ok: true,
    stripe_mode: actualMode,
    plans_synced: plansData.length,
    products_created: createdProducts,
    prices_created: createdPrices,
    implementation_fee_centavos: 0,
  });
});

async function syncAddon(
  secret: string,
  input: {
    name: string;
    code: string;
    monthlyAmount: number;
    monthlyPriceId: string;
    yearlyPriceId: string;
  },
) {
  const existingMonthly = await retrievePrice(secret, input.monthlyPriceId);
  let productId = productIdFromPrice(existingMonthly);
  let productCreated = false;
  if (!productId || !(await productIsActive(secret, productId))) {
    const product = await createProduct(secret, input.name, input.code, null);
    productId = text(product.id);
    productCreated = true;
  }
  const monthly = await ensurePrice(secret, {
    currentId: input.monthlyPriceId,
    productId,
    amount: input.monthlyAmount,
    currency: "BRL",
    interval: "month",
    code: `${input.code}_monthly`,
    label: `${input.name} mensal`,
  });
  const yearly = await ensurePrice(secret, {
    currentId: input.yearlyPriceId,
    productId,
    amount: input.monthlyAmount * 10,
    currency: "BRL",
    interval: "year",
    code: `${input.code}_yearly`,
    label: `${input.name} anual`,
  });
  return {
    monthlyPriceId: monthly.id,
    yearlyPriceId: yearly.id,
    productCreated,
    createdPrices: Number(monthly.created) + Number(yearly.created),
  };
}

async function ensureProduct(secret: string, plan: PlanRow) {
  if (plan.stripe_product_id && (await productIsActive(secret, plan.stripe_product_id))) {
    return { id: plan.stripe_product_id, created: false };
  }
  const product = await createProduct(secret, `Conform Flow - ${plan.nome}`, plan.codigo, plan.descricao);
  return { id: text(product.id), created: true };
}

async function createProduct(secret: string, name: string, code: string, description: string | null) {
  const form = new URLSearchParams();
  form.set("name", name);
  if (description) form.set("description", description);
  form.set("metadata[catalog_code]", code);
  form.set("metadata[source]", "conform_flow_backend");
  return stripePost(secret, "/v1/products", form, `conform-flow-product-${code}`);
}

async function productIsActive(secret: string, productId: string) {
  if (!/^prod_[A-Za-z0-9]+$/.test(productId)) return false;
  const response = await fetch(`https://api.stripe.com/v1/products/${encodeURIComponent(productId)}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("STRIPE_PRODUCT_LOOKUP_FAILED");
  const product = (await response.json()) as JsonObject;
  return product.active === true;
}

async function ensurePrice(
  secret: string,
  input: {
    currentId: string | null;
    productId: string;
    amount: number;
    currency: string;
    interval: "month" | "year";
    code: string;
    label: string;
  },
) {
  const current = await retrievePrice(secret, input.currentId);
  if (
    current &&
    current.active === true &&
    Number(current.unit_amount) === input.amount &&
    text(current.currency).toLowerCase() === input.currency.toLowerCase() &&
    text((current.recurring as JsonObject | undefined)?.interval) === input.interval &&
    productIdFromPrice(current) === input.productId
  ) {
    return { id: text(current.id), created: false };
  }

  const form = new URLSearchParams();
  form.set("product", input.productId);
  form.set("unit_amount", String(input.amount));
  form.set("currency", input.currency.toLowerCase());
  form.set("recurring[interval]", input.interval);
  form.set("nickname", input.label);
  form.set("metadata[catalog_code]", input.code);
  form.set("metadata[source]", "conform_flow_backend");
  const price = await stripePost(
    secret,
    "/v1/prices",
    form,
    `conform-flow-price-${input.code}-${input.amount}`,
  );
  return { id: text(price.id), created: true };
}

async function retrievePrice(secret: string, priceId: string | null) {
  if (!priceId || !/^price_[A-Za-z0-9]+$/.test(priceId)) return null;
  const response = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("STRIPE_PRICE_LOOKUP_FAILED");
  return (await response.json()) as JsonObject;
}

async function stripePost(secret: string, path: string, form: URLSearchParams, idempotencyKey: string) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": idempotencyKey,
    },
    body: form,
  });
  const payload = (await response.json()) as JsonObject;
  if (!response.ok || !text(payload.id)) {
    throw new Error(
      `STRIPE_CREATE_FAILED:${text((payload.error as JsonObject | undefined)?.code) || response.status}`,
    );
  }
  return payload;
}

function productIdFromPrice(price: JsonObject | null) {
  if (!price) return "";
  if (typeof price.product === "string") return price.product;
  return text((price.product as JsonObject | undefined)?.id);
}

function requiredPositiveAmount(value: unknown, label: string) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`INVALID_AMOUNT:${label}`);
  return amount;
}

function stripeMode(secret: string) {
  if (/^(sk|rk)_test_/.test(secret)) return "test";
  if (/^(sk|rk)_live_/.test(secret)) return "live";
  return "unknown";
}

function serviceRoleCredential(
  request: Request,
  internalServiceKey: string,
  supabaseUrl: string,
) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  // New Supabase secret keys are available to the function through the runtime,
  // while CI may still use the legacy, gateway-verified service_role JWT.
  if (token === internalServiceKey) return internalServiceKey;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(decodeBase64Url(parts[0])) as JsonObject;
    const claims = JSON.parse(decodeBase64Url(parts[1])) as JsonObject;
    const expectedRef = new URL(supabaseUrl).hostname.split(".")[0];
    const expiresAt = Number(claims.exp);
    const valid = (
      text(header.alg) === "HS256" &&
      text(claims.iss) === "supabase" &&
      text(claims.role) === "service_role" &&
      text(claims.ref) === expectedRef &&
      Number.isFinite(expiresAt) &&
      expiresAt * 1000 > Date.now()
    );
    return valid ? token : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(`${normalized}${padding}`);
}

function safeFailureReason(error: unknown) {
  const raw = error instanceof Error ? error.message : "UNKNOWN";
  const safe = raw.toUpperCase().replace(/[^A-Z0-9_:.-]/g, "_").slice(0, 160);
  return safe || "UNKNOWN";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
