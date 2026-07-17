import { createClient } from "npm:@supabase/supabase-js@^2";

const origin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const cors = {
  "access-control-allow-origin": origin,
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });

const asaasBaseUrl = () =>
  Deno.env.get("ASAAS_ENV") === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asaasApiKey = Deno.env.get("ASAAS_API_KEY")!;
  const authorization = req.headers.get("authorization") ?? "";

  if (!url || !anonKey || !serviceKey || !asaasApiKey || !authorization) {
    return respond({ error: "unauthorized" }, 401);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return respond({ error: "unauthorized" }, 401);

  const { data: isMaster } = await userClient.rpc("is_master");
  if (!isMaster) return respond({ error: "forbidden" }, 403);

  const input = await req.json();
  const empresaId = String(input.empresa_id ?? "");
  const planoId = String(input.plano_id ?? "");
  const billingType = String(input.billing_type ?? "UNDEFINED");
  const nextDueDate = String(input.next_due_date ?? "");

  if (!empresaId || !planoId || !nextDueDate) return respond({ error: "invalid_payload" }, 400);

  const { data: empresa, error: empresaError } = await adminClient
    .from("empresas")
    .select("id, razao_social, nome_fantasia, cnpj, email_principal")
    .eq("id", empresaId)
    .is("deleted_at", null)
    .single();
  if (empresaError || !empresa) return respond({ error: "company_not_found" }, 404);

  const { data: plano, error: planoError } = await adminClient
    .from("planos")
    .select("id, nome, valor_mensal_centavos, moeda")
    .eq("id", planoId)
    .single();
  if (planoError || !plano) return respond({ error: "plan_not_found" }, 404);

  const customerPayload = {
    name: empresa.razao_social || empresa.nome_fantasia,
    cpfCnpj: String(empresa.cnpj).replace(/\D/g, ""),
    email: empresa.email_principal || undefined,
    externalReference: empresa.id,
  };

  const customerResponse = await fetch(`${asaasBaseUrl()}/customers`, {
    method: "POST",
    headers: { access_token: asaasApiKey, "content-type": "application/json" },
    body: JSON.stringify(customerPayload),
  });
  const customer = await customerResponse.json();
  if (!customerResponse.ok)
    return respond({ error: "asaas_customer_error", details: customer }, 400);

  const subscriptionPayload = {
    customer: customer.id,
    billingType,
    value: Number(plano.valor_mensal_centavos) / 100,
    nextDueDate,
    cycle: "MONTHLY",
    description: `Conform Flow — Plano ${plano.nome}`,
    externalReference: empresa.id,
  };

  const subscriptionResponse = await fetch(`${asaasBaseUrl()}/subscriptions`, {
    method: "POST",
    headers: { access_token: asaasApiKey, "content-type": "application/json" },
    body: JSON.stringify(subscriptionPayload),
  });
  const subscription = await subscriptionResponse.json();
  if (!subscriptionResponse.ok) {
    return respond({ error: "asaas_subscription_error", details: subscription }, 400);
  }

  const { data: assinatura, error: assinaturaError } = await userClient.rpc(
    "api_master_atualizar_assinatura",
    {
      p_empresa_id: empresa.id,
      p_payload: {
        plano_id: plano.id,
        status: "pagamento_pendente",
        ciclo: "mensal",
        valor_mensal_centavos: plano.valor_mensal_centavos,
        moeda: plano.moeda ?? "BRL",
        gateway: "asaas",
        gateway_customer_id: customer.id,
        gateway_subscription_id: subscription.id,
        proximo_vencimento: nextDueDate,
        motivo: "Assinatura recorrente criada no Asaas",
      },
    },
  );
  if (assinaturaError) return respond({ error: assinaturaError.message }, 500);

  return respond({ customer, subscription, assinatura }, 201);
});
