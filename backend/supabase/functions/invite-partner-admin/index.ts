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

/** Sends a secure first-access invitation to a partner administrator. */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization") ?? "";
  if (!url || !anonKey || !serviceKey || !authorization) {
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

  const { data: requester, error: requesterError } = await adminClient
    .from("usuarios")
    .select("id, is_master, status, deleted_at")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (
    requesterError ||
    !requester?.is_master ||
    requester.status !== "ativo" ||
    requester.deleted_at !== null
  ) {
    return respond({ error: "forbidden" }, 403);
  }

  let input: { parceiro_empresa_id?: unknown };
  try {
    input = (await req.json()) as { parceiro_empresa_id?: unknown };
  } catch {
    return respond({ error: "invalid_payload" }, 400);
  }
  const partnerId = String(input.parceiro_empresa_id ?? "").trim();
  if (!partnerId) return respond({ error: "invalid_payload" }, 400);

  const { data: partner, error: partnerError } = await adminClient
    .from("empresas")
    .select("id, nome_fantasia, razao_social, email_principal, tipo_conta, deleted_at")
    .eq("id", partnerId)
    .maybeSingle();
  if (partnerError || !partner || partner.tipo_conta !== "parceira" || partner.deleted_at !== null) {
    return respond({ error: "partner_not_found" }, 404);
  }

  const email = String(partner.email_principal ?? "").trim().toLowerCase();
  if (!email) return respond({ error: "partner_email_missing" }, 422);

  const redirectTo =
    Deno.env.get("INVITE_REDIRECT_URL") ?? "https://conform-guardian.lovable.app/definir-senha";
  const partnerName = partner.nome_fantasia || partner.razao_social || "sua empresa";
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: {
        nome: `Administrador de ${partnerName}`,
        empresa_nome: partnerName,
        tipo_conta: "parceira",
        primeiro_acesso: true,
      },
    },
  );

  if (inviteError || !invited.user) {
    const message = inviteError?.message?.toLowerCase() ?? "";
    return respond(
      {
        error: message.includes("already") ? "partner_user_already_registered" : "invite_failed",
      },
      message.includes("already") ? 409 : 400,
    );
  }

  const { error: profileError } = await adminClient.from("usuarios").upsert({
    id: invited.user.id,
    nome: `Administrador de ${partnerName}`,
    email,
    status: "ativo",
    is_master: false,
  });
  if (profileError) return respond({ error: "partner_profile_failed" }, 500);

  const { error: membershipError } = await adminClient.from("usuarios_empresas").upsert(
    {
      usuario_id: invited.user.id,
      empresa_id: partnerId,
      perfil: "administrador",
      ativo: true,
      deleted_at: null,
    },
    { onConflict: "usuario_id,empresa_id" },
  );
  if (membershipError) return respond({ error: "partner_membership_failed" }, 500);

  await adminClient.from("logs_auditoria").insert({
    empresa_id: partnerId,
    usuario_id: authData.user.id,
    modulo: "parceiros",
    acao: "convite_primeiro_acesso_enviado",
    registro_id: invited.user.id,
    novo_valor: { email, redirect_to: redirectTo, tipo_conta: "parceira" },
  });

  return respond(
    { ok: true, invite_sent: true, user_id: invited.user.id, email, redirect_to: redirectTo },
    201,
  );
});
