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
      await handleCheckoutCompleted(admin, object);
    } else if (eventType === "invoice.payment_failed") {
      await handleInvoiceStatus(admin, object, "inadimplente");
    } else if (eventType === "invoice.paid") {
      await handleInvoiceStatus(admin, object, "ativa");
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

  const { error } = await admin
    .from("assinaturas_empresas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("gateway", "stripe")
    .eq("gateway_subscription_id", subscriptionId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("SUBSCRIPTION_STATUS_UPDATE_FAILED");
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
