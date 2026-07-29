import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2";

type JsonObject = Record<string, unknown>;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret)
    return json({ error: "SERVICE_UNAVAILABLE" }, 503);

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!(await verifyStripeSignature(rawBody, signature, webhookSecret))) {
    return json({ error: "INVALID_SIGNATURE" }, 400);
  }

  let event: JsonObject;
  try {
    event = JSON.parse(rawBody) as JsonObject;
  } catch {
    return json({ error: "INVALID_PAYLOAD" }, 400);
  }

  const eventId = text(event.id);
  const eventType = text(event.type);
  if (!eventId || !eventType) return json({ error: "INVALID_EVENT" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const object = isObject(event.data) && isObject(event.data.object) ? event.data.object : {};
  const signupId = signupSessionId(object);

  const { error: eventInsertError } = await admin.from("eventos_webhook_pagamento").insert({
    stripe_event_id: eventId,
    stripe_event_type: eventType,
    sessao_contratacao_id: isUuid(signupId) ? signupId : null,
    payload_hash: await sha256(rawBody),
  });
  if (eventInsertError?.code === "23505") {
    const { data: previousEvent, error: previousEventError } = await admin
      .from("eventos_webhook_pagamento")
      .select("processado")
      .eq("stripe_event_id", eventId)
      .maybeSingle();
    if (previousEventError) return json({ error: "WEBHOOK_DEDUPLICATION_UNAVAILABLE" }, 503);
    if (previousEvent?.processado) return json({ received: true, duplicate: true }, 200);
  } else if (eventInsertError) {
    return json({ error: "WEBHOOK_DEDUPLICATION_UNAVAILABLE" }, 503);
  }

  try {
    if (eventType === "checkout.session.completed") {
      if (text(isObject(object.metadata) ? object.metadata.partner_empresa_id : "")) {
        await handlePartnerCheckoutCompleted(admin, object);
      } else {
        await handleCheckoutCompleted(admin, object);
      }
    } else if (eventType === "invoice.payment_failed") {
      await handleInvoiceStatus(admin, object, "inadimplente");
    } else if (eventType === "invoice.payment_action_required") {
      await handleInvoiceStatus(admin, object, "inadimplente");
    } else if (eventType === "invoice.paid") {
      await handleInvoiceStatus(admin, object, "ativa");
    } else if (eventType === "customer.subscription.updated") {
      await handleSubscriptionUpdated(admin, object);
    } else if (eventType === "customer.subscription.paused") {
      await handleSubscriptionUpdated(admin, { ...object, status: "paused" });
    } else if (eventType === "customer.subscription.resumed") {
      await handleSubscriptionUpdated(admin, { ...object, status: "active" });
    } else if (eventType === "customer.subscription.deleted") {
      await handleSubscriptionCanceled(admin, object);
    }

    await admin
      .from("eventos_webhook_pagamento")
      .update({
        processado: true,
        processado_at: new Date().toISOString(),
        erro_codigo: null,
      })
      .eq("stripe_event_id", eventId);
    return json({ received: true }, 200);
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("stripe_webhook_processing_failed", eventType, code);
    await admin
      .from("eventos_webhook_pagamento")
      .update({
        erro_codigo: code,
        processado_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", eventId);
    return json({ error: "WEBHOOK_PROCESSING_FAILED" }, 500);
  }
});

async function handleCheckoutCompleted(admin: SupabaseClient, checkout: JsonObject) {
  const signupId = signupSessionId(checkout);
  const checkoutId = text(checkout.id);
  const paymentStatus = text(checkout.payment_status);
  if (!isUuid(signupId) || !checkoutId) throw new Error("INVALID_CHECKOUT_REFERENCE");
  if (!["paid", "no_payment_required"].includes(paymentStatus))
    throw new Error("PAYMENT_NOT_CONFIRMED");

  const { data: signup, error } = await admin
    .from("sessoes_contratacao")
    .select(
      "id, status, email_responsavel, responsavel_json, stripe_checkout_session_id, auth_user_id",
    )
    .eq("id", signupId)
    .maybeSingle();
  if (error || !signup) throw new Error("SIGNUP_SESSION_NOT_FOUND");
  if (signup.stripe_checkout_session_id !== checkoutId)
    throw new Error("CHECKOUT_REFERENCE_MISMATCH");
  if (signup.status === "provisionada" || signup.status === "email_pendente") return;
  if (!["checkout_pendente", "pagamento_confirmado"].includes(signup.status))
    throw new Error("SIGNUP_SESSION_INVALID_STATUS");

  const email = signup.email_responsavel;
  let authUserId = signup.auth_user_id as string | null;
  if (!authUserId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { nome: text(signup.responsavel_json?.nome) || "Responsável" },
    });
    if (createError) {
      const { data: existingId, error: lookupError } = await admin.rpc(
        "internal_auth_user_id_por_email",
        {
          p_email: email,
        },
      );
      if (lookupError || !existingId) throw new Error("AUTH_USER_CREATE_FAILED");
      authUserId = String(existingId);
    } else {
      authUserId = created.user.id;
    }
  }

  const customerId = stripeId(checkout.customer);
  const subscriptionId = stripeId(checkout.subscription);
  if (!customerId || !subscriptionId) throw new Error("STRIPE_SUBSCRIPTION_REFERENCE_MISSING");

  if (signup.status === "checkout_pendente") {
    const { data: paymentUpdate, error: statusError } = await admin
      .from("sessoes_contratacao")
      .update({
        status: "pagamento_confirmado",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        pagamento_confirmado_at: new Date().toISOString(),
        auth_user_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signupId)
      .eq("status", "checkout_pendente")
      .select("id")
      .maybeSingle();
    if (statusError || !paymentUpdate) throw new Error("PAYMENT_STATUS_UPDATE_FAILED");
  }

  const { error: provisionError } = await admin.rpc("internal_provisionar_contratacao_paga", {
    p_sessao_id: signupId,
    p_auth_user_id: authUserId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
  });
  if (provisionError) throw new Error(`PROVISIONING_FAILED:${provisionError.code ?? "unknown"}`);
  await syncProvisionedAddons(admin, signupId);
}

async function handlePartnerCheckoutCompleted(admin: SupabaseClient, checkout: JsonObject) {
  const metadata = isObject(checkout.metadata) ? checkout.metadata : {};
  const partnerId = text(metadata.partner_empresa_id);
  const planId = text(metadata.partner_plan_id);
  const billingMode = text(metadata.partner_billing_mode) === "unitario" ? "unitario" : "plano_carteira";
  const subscriptionId = stripeId(checkout.subscription);
  const customerId = stripeId(checkout.customer);
  if (!isUuid(partnerId) || !subscriptionId || !customerId || (billingMode === "plano_carteira" && !isUuid(planId))) {
    throw new Error("INVALID_PARTNER_CHECKOUT_REFERENCE");
  }
  if (!['paid', 'no_payment_required'].includes(text(checkout.payment_status))) {
    throw new Error("PARTNER_PAYMENT_NOT_CONFIRMED");
  }
  const { data: plan, error: planError } = await admin
    .from("planos")
    .select("id, tipo_plano, valor_mensal_centavos, valor_anual_centavos, preco_cliente_extra_centavos, limite_clientes")
    .eq("id", planId)
    .eq("tipo_plano", "parceiro")
    .maybeSingle();
  if (billingMode === "plano_carteira" && (planError || !plan)) throw new Error("PARTNER_PLAN_NOT_FOUND");
  const interval = text(metadata.partner_billing_interval) === "yearly" ? "anual" : "mensal";
  const { error } = await admin
    .from("assinaturas_empresas")
    .update({
      plano_id: billingMode === "unitario" ? null : plan?.id,
      status: "ativa",
      ciclo: interval,
      valor_mensal_centavos: billingMode === "unitario" ? 0 : interval === "mensal" ? plan?.valor_mensal_centavos : 0,
      valor_anual_centavos: billingMode === "unitario" ? null : interval === "anual" ? plan?.valor_anual_centavos : null,
      gateway: "stripe",
      gateway_customer_id: customerId,
      gateway_subscription_id: subscriptionId,
      clientes_incluidos: billingMode === "unitario" ? 0 : plan?.limite_clientes,
      preco_cliente_extra_centavos: billingMode === "unitario" ? 0 : plan?.preco_cliente_extra_centavos,
      cobranca_consolidada: true,
      updated_at: new Date().toISOString(),
    })
    .eq("empresa_id", partnerId);
  if (error) throw new Error("PARTNER_SUBSCRIPTION_UPDATE_FAILED");
  await admin.from("empresas").update({ access_status: "active", status: "ativa", parceiro_cobranca_modo: billingMode, updated_at: new Date().toISOString() }).eq("id", partnerId);
  await syncPartnerClientAccess(admin, partnerId, "ativa");
}

async function syncProvisionedAddons(admin: SupabaseClient, signupId: string) {
  const [{ data: signup, error: signupError }, { data: snapshot, error: snapshotError }] =
    await Promise.all([
      admin.from("sessoes_contratacao").select("assinatura_id").eq("id", signupId).maybeSingle(),
      admin
        .from("fotografias_contratacao")
        .select("usuarios_extras, unidades_extras, valor_addons_centavos")
        .eq("sessao_contratacao_id", signupId)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (signupError || snapshotError || !signup?.assinatura_id || !snapshot) return;
  await admin
    .from("assinaturas_empresas")
    .update({
      usuarios_extras: Number(snapshot.usuarios_extras ?? 0),
      unidades_extras: Number(snapshot.unidades_extras ?? 0),
      valor_addons_centavos: Number(snapshot.valor_addons_centavos ?? 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", signup.assinatura_id);
}

async function handleInvoiceStatus(
  admin: SupabaseClient,
  invoice: JsonObject,
  status: "ativa" | "inadimplente",
) {
  const subscriptionId =
    stripeId(invoice.subscription) ||
    stripeId(
      isObject(invoice.parent) && isObject(invoice.parent.subscription_details)
        ? invoice.parent.subscription_details.subscription
        : null,
    );
  if (!subscriptionId) return;

    const { data: subscription, error } = await admin
    .from("assinaturas_empresas")
    .update({
      status,
      grace_period_ends_at: status === "ativa" ? null : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      ultimo_pagamento_em: status === "ativa" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("gateway", "stripe")
    .eq("gateway_subscription_id", subscriptionId)
    .select("id,empresa_id")
    .maybeSingle();
  if (error) throw new Error("SUBSCRIPTION_STATUS_UPDATE_FAILED");
  if (subscription) {
    const amount = Math.round(Number(invoice.amount_due ?? invoice.amount_paid ?? 0));
    await admin.from("tentativas_cobranca").insert({
      empresa_id: subscription.empresa_id,
      assinatura_id: subscription.id,
      gateway: "stripe",
      gateway_event_id: text(invoice.id) || null,
      status: status === "ativa" ? "succeeded" : "failed",
      valor_centavos: Number.isFinite(amount) ? amount : null,
      erro_codigo: status === "ativa" ? null : "INVOICE_PAYMENT_FAILED",
      completed_at: new Date().toISOString(),
    });
    await syncPartnerClientAccess(admin, subscription.empresa_id, status);
  }
}

async function handleSubscriptionUpdated(admin: SupabaseClient, subscription: JsonObject) {
  const subscriptionId = text(subscription.id);
  if (!subscriptionId) return;

  const { data: subscriptionOwner } = await admin
    .from("assinaturas_empresas")
    .select("id, empresa_id")
    .eq("gateway", "stripe")
    .eq("gateway_subscription_id", subscriptionId)
    .maybeSingle();
  if (subscriptionOwner) {
    const { data: partner } = await admin
      .from("empresas")
      .select("id, tipo_conta, parceiro_cobranca_modo")
      .eq("id", subscriptionOwner.empresa_id)
      .maybeSingle();
    if (partner?.tipo_conta === "parceira" && partner.parceiro_cobranca_modo === "unitario") {
      await updateUnitaryPartnerSubscription(admin, subscriptionOwner.id, subscriptionOwner.empresa_id, subscription, subscriptionId);
      return;
    }
  }

  const items = Array.isArray((subscription.items as JsonObject | undefined)?.data)
    ? ((subscription.items as JsonObject).data as unknown[]).filter(isObject)
    : [];
  const primaryItem = items[0] ?? {};
  const primaryPrice = isObject(primaryItem.price) ? primaryItem.price : {};
  const primaryPriceId = text(primaryPrice.id);
  const interval = text(isObject(primaryPrice.recurring) ? primaryPrice.recurring.interval : "");
  const quantityByPrice = new Map(
    items.map((item) => {
      const price = isObject(item.price) ? item.price : {};
      return [text(price.id), boundedQuantity(item.quantity)] as const;
    }),
  );

  const [{ data: plans, error: plansError }, { data: config, error: configError }] = await Promise.all([
    admin
      .from("planos")
      .select("id, codigo, tipo_plano, limite_clientes, valor_mensal_centavos, valor_anual_centavos, preco_cliente_extra_centavos, stripe_monthly_price_id, stripe_yearly_price_id, stripe_client_extra_monthly_price_id, stripe_client_extra_yearly_price_id")
      .eq("ativo", true),
    admin
      .from("configuracoes_comerciais")
      .select(
        "preco_usuario_extra_centavos, preco_unidade_extra_centavos, stripe_usuario_extra_monthly_price_id, stripe_usuario_extra_yearly_price_id, stripe_unidade_extra_monthly_price_id, stripe_unidade_extra_yearly_price_id",
      )
      .eq("id", true)
      .maybeSingle(),
  ]);
  if (plansError || configError) throw new Error("STRIPE_CATALOG_LOOKUP_FAILED");

  const plan = (plans ?? []).find((candidate) =>
    items.some((item) => {
      const price = isObject(item.price) ? item.price : {};
      const priceId = text(price.id);
      return candidate.stripe_monthly_price_id === priceId || candidate.stripe_yearly_price_id === priceId;
    }),
  );
  if (!plan) throw new Error("STRIPE_PRICE_NOT_MAPPED");

  const isYearly = plan.stripe_yearly_price_id === primaryPriceId || interval === "year";
  const isPartnerPlan = plan.tipo_plano === "parceiro";
  const userPriceId = isYearly
    ? config?.stripe_usuario_extra_yearly_price_id
    : config?.stripe_usuario_extra_monthly_price_id;
  const unitPriceId = isYearly
    ? config?.stripe_unidade_extra_yearly_price_id
    : config?.stripe_unidade_extra_monthly_price_id;
  const usersExtra = userPriceId ? quantityByPrice.get(userPriceId) ?? 0 : 0;
  const unitsExtra = unitPriceId ? quantityByPrice.get(unitPriceId) ?? 0 : 0;
  const clientExtraPriceId = isYearly
    ? plan.stripe_client_extra_yearly_price_id
    : plan.stripe_client_extra_monthly_price_id;
  const clientsExtra = clientExtraPriceId ? quantityByPrice.get(clientExtraPriceId) ?? 0 : 0;
  const addonMultiplier = isYearly ? 10 : 1;
  const addonsCents = isPartnerPlan
    ? clientsExtra * Number(plan.preco_cliente_extra_centavos ?? 0) * addonMultiplier
    : usersExtra * Number(config?.preco_usuario_extra_centavos ?? 0) * addonMultiplier +
      unitsExtra * Number(config?.preco_unidade_extra_centavos ?? 0) * addonMultiplier;
  const stripeStatus = text(subscription.status);
  const status = subscriptionStatus(stripeStatus);
  const currentPeriodEnd = Number(subscription.current_period_end ?? 0);
  const nextDueDate = Number.isFinite(currentPeriodEnd) && currentPeriodEnd > 0
    ? new Date(currentPeriodEnd * 1000).toISOString().slice(0, 10)
    : null;

  const updatePayload: Record<string, unknown> = {
    plano_id: plan.id,
    status,
    ciclo: isYearly ? "anual" : "mensal",
    valor_mensal_centavos: isYearly ? 0 : Number(plan.valor_mensal_centavos ?? 0) + addonsCents,
    valor_anual_centavos: isYearly ? Number(plan.valor_anual_centavos ?? 0) + addonsCents : null,
    usuarios_extras: usersExtra,
    unidades_extras: unitsExtra,
    valor_addons_centavos: addonsCents,
    clientes_extras: isPartnerPlan ? clientsExtra : 0,
    clientes_ativos: isPartnerPlan ? Number(plan.limite_clientes ?? 0) + clientsExtra : 0,
    clientes_incluidos: isPartnerPlan ? Number(plan.limite_clientes ?? 0) : 0,
    preco_cliente_extra_centavos: isPartnerPlan ? Number(plan.preco_cliente_extra_centavos ?? 0) : 0,
    stripe_cliente_extra_price_id: isPartnerPlan ? clientExtraPriceId : null,
    cobranca_consolidada: isPartnerPlan,
    proximo_vencimento: nextDueDate,
    updated_at: new Date().toISOString(),
  };
  if (status === "ativa") updatePayload.grace_period_ends_at = null;
  if (status === "inadimplente") {
    updatePayload.grace_period_ends_at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  }

  const { error } = await admin
    .from("assinaturas_empresas")
    .update(updatePayload)
    .eq("gateway", "stripe")
    .eq("gateway_subscription_id", subscriptionId);
  if (error) throw new Error("SUBSCRIPTION_UPDATE_FAILED");
  if (isPartnerPlan) await syncPartnerClientAccess(admin, subscriptionId, status, true);
}

async function updateUnitaryPartnerSubscription(
  admin: SupabaseClient,
  subscriptionRecordId: string,
  partnerId: string,
  subscription: JsonObject,
  subscriptionId: string,
) {
  const items = Array.isArray((subscription.items as JsonObject | undefined)?.data)
    ? ((subscription.items as JsonObject).data as unknown[]).filter(isObject)
    : [];
  const primaryItem = items[0] ?? {};
  const primaryPrice = isObject(primaryItem.price) ? primaryItem.price : {};
  const isYearly = text(isObject(primaryPrice.recurring) ? primaryPrice.recurring.interval : "") === "year";
  const { data: relations } = await admin
    .from("relacionamentos_parceiro_clientes")
    .select("cliente_empresa_id, plano_servico_id")
    .eq("parceiro_empresa_id", partnerId)
    .eq("status", "ativo");
  const clientIds = (relations ?? []).map((row) => text(row.cliente_empresa_id)).filter(Boolean);
  const { data: exemptions } = clientIds.length
    ? await admin.from("isencoes_parceiro").select("cliente_empresa_id").eq("parceiro_empresa_id", partnerId).eq("status", "ativa").gte("termina_em", new Date().toISOString().slice(0, 10)).in("cliente_empresa_id", clientIds)
    : { data: [] as JsonObject[] };
  const exempt = new Set((exemptions ?? []).map((row) => text(row.cliente_empresa_id)));
  const billable = (relations ?? []).filter((row) => !exempt.has(text(row.cliente_empresa_id)));
  const planIds = [...new Set(billable.map((row) => text(row.plano_servico_id)).filter(Boolean))];
  const { data: plans } = planIds.length
    ? await admin.from("planos").select("id, valor_mensal_centavos, valor_anual_centavos").eq("tipo_plano", "direto").in("id", planIds)
    : { data: [] as JsonObject[] };
  const total = billable.reduce((sum, relation) => {
    const plan = (plans ?? []).find((candidate) => text(candidate.id) === text(relation.plano_servico_id));
    return sum + Number(isYearly ? plan?.valor_anual_centavos ?? 0 : plan?.valor_mensal_centavos ?? 0);
  }, 0);
  const stripeStatus = text(subscription.status);
  const status = subscriptionStatus(stripeStatus);
  const periodEnd = Number(subscription.current_period_end ?? 0);
  const nextDueDate = Number.isFinite(periodEnd) && periodEnd > 0 ? new Date(periodEnd * 1000).toISOString().slice(0, 10) : null;
  const { error } = await admin.from("assinaturas_empresas").update({
    plano_id: null,
    status,
    ciclo: isYearly ? "anual" : "mensal",
    valor_mensal_centavos: isYearly ? 0 : total,
    valor_anual_centavos: isYearly ? total : null,
    clientes_incluidos: 0,
    clientes_ativos: relations?.length ?? 0,
    clientes_extras: billable.length,
    preco_cliente_extra_centavos: 0,
    valor_addons_centavos: 0,
    cobranca_consolidada: true,
    proximo_vencimento: nextDueDate,
    updated_at: new Date().toISOString(),
  }).eq("id", subscriptionRecordId).eq("gateway_subscription_id", subscriptionId);
  if (error) throw new Error("UNITARY_SUBSCRIPTION_UPDATE_FAILED");
  await syncPartnerClientAccess(admin, subscriptionId, status, true);
}

async function handleSubscriptionCanceled(admin: SupabaseClient, subscription: JsonObject) {
  const subscriptionId = text(subscription.id);
  if (!subscriptionId) return;
  const { error } = await admin
    .from("assinaturas_empresas")
    .update({
      status: "cancelada",
      cancelada_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("gateway", "stripe")
    .eq("gateway_subscription_id", subscriptionId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("SUBSCRIPTION_CANCEL_FAILED");
  await syncPartnerClientAccess(admin, subscriptionId, "cancelada", true);
}

async function syncPartnerClientAccess(
  admin: SupabaseClient,
  empresaIdOrSubscriptionId: string,
  status: "ativa" | "pagamento_pendente" | "inadimplente" | "bloqueada" | "cancelada",
  bySubscriptionId = false,
) {
  let partnerId = empresaIdOrSubscriptionId;
  if (bySubscriptionId) {
    const { data } = await admin
      .from("assinaturas_empresas")
      .select("empresa_id, plano_id")
      .eq("gateway", "stripe")
      .eq("gateway_subscription_id", empresaIdOrSubscriptionId)
      .maybeSingle();
    if (!data) return;
    const { data: owner } = await admin.from("empresas").select("tipo_conta, parceiro_cobranca_modo").eq("id", data.empresa_id).maybeSingle();
    if (!owner || owner.tipo_conta !== "parceira") return;
    partnerId = data.empresa_id;
  } else {
    const { data } = await admin
      .from("assinaturas_empresas")
      .select("empresa_id, plano_id")
      .eq("empresa_id", empresaIdOrSubscriptionId)
      .maybeSingle();
    if (!data) return;
    const { data: owner } = await admin.from("empresas").select("tipo_conta, parceiro_cobranca_modo").eq("id", data.empresa_id).maybeSingle();
    if (!owner || owner.tipo_conta !== "parceira") return;
    partnerId = data.empresa_id;
  }
  const blocked = status !== "ativa";
  const { data: relations } = await admin
    .from("relacionamentos_parceiro_clientes")
    .select("cliente_empresa_id")
    .eq("parceiro_empresa_id", partnerId)
    .eq("status", "ativo");
  const clientIds = (relations ?? []).map((relation) => text(relation.cliente_empresa_id)).filter(Boolean);
  if (clientIds.length === 0) return;
  await admin
    .from("empresas")
    .update({
      access_status: blocked ? (status === "inadimplente" ? "restricted" : "blocked") : "active",
      status: blocked ? "bloqueada" : "ativa",
      updated_at: new Date().toISOString(),
    })
    .in("id", clientIds)
    .eq("tipo_conta", "cliente")
    .is("deleted_at", null);
}

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((item) => item.trim());
  const timestamp = parts.find((item) => item.startsWith("t="))?.slice(2);
  const signatures = parts.filter((item) => item.startsWith("v1=")).map((item) => item.slice(3));
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return signatures.some((candidate) => constantTimeEqual(expected, candidate));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function signupSessionId(object: JsonObject) {
  const metadata = isObject(object.metadata) ? object.metadata : {};
  return text(metadata.signup_session_id) || text(object.client_reference_id);
}

function stripeId(value: unknown) {
  if (typeof value === "string") return value;
  return isObject(value) ? text(value.id) : "";
}

function boundedQuantity(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : 0;
}

function subscriptionStatus(value: string) {
  if (["active", "trialing"].includes(value)) return "ativa";
  if (["past_due"].includes(value)) return "inadimplente";
  if (["unpaid"].includes(value)) return "bloqueada";
  if (["canceled", "incomplete_expired"].includes(value)) return "cancelada";
  return "pagamento_pendente";
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeErrorCode(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 180) : "unknown";
}
