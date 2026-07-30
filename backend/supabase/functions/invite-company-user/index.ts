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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = req.headers.get("authorization") ?? "";
  if (!url || !anonKey || !serviceKey || !authorization)
    return respond({ error: "unauthorized" }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return respond({ error: "unauthorized" }, 401);

  const input = await req.json();
  const empresaId = String(input.empresa_id ?? "");
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase();
  const nome = String(input.nome ?? "").trim();
  const perfil = String(input.perfil ?? "");
  const acessoTodasUnidades = input.acesso_todas_unidades !== false;
  const unidadeIds = Array.from(
    new Set(
      Array.isArray(input.unidade_ids)
        ? input.unidade_ids.map((value: unknown) => String(value)).filter(Boolean)
        : [],
    ),
  );
  const unidadePrincipalId = input.unidade_principal_id
    ? String(input.unidade_principal_id)
    : null;
  const allowedRoles = ["administrador", "responsavel_tecnico", "colaborador", "somente_leitura"];
  if (!empresaId || !email || !nome || !allowedRoles.includes(perfil))
    return respond({ error: "invalid_payload" }, 400);

  const { data: canAdmin, error: permissionError } = await userClient.rpc("can_admin_company", {
    p_empresa_id: empresaId,
  });
  if (permissionError || !canAdmin) return respond({ error: "forbidden" }, 403);
  if (!acessoTodasUnidades && unidadeIds.length === 0) {
    return respond({ error: "at_least_one_unit_required" }, 400);
  }
  for (const unidadeId of unidadeIds) {
    const { data: belongs, error: belongsError } = await userClient.rpc(
      "unit_belongs_to_company",
      { p_empresa_id: empresaId, p_unidade_id: unidadeId },
    );
    if (belongsError || !belongs) return respond({ error: "invalid_unit" }, 400);
  }
  if (
    unidadePrincipalId &&
    (acessoTodasUnidades
      ? !(await userClient.rpc("unit_belongs_to_company", {
        p_empresa_id: empresaId,
        p_unidade_id: unidadePrincipalId,
      })).data
      : !unidadeIds.includes(unidadePrincipalId))
  ) {
    return respond({ error: "invalid_primary_unit" }, 400);
  }

  const redirectTo = Deno.env.get("INVITE_REDIRECT_URL");
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { nome }, redirectTo },
  );
  if (inviteError || !invited.user)
    return respond({ error: inviteError?.message ?? "invite_failed" }, 400);

  const { error: profileError } = await adminClient.from("usuarios").upsert({
    id: invited.user.id,
    nome,
    email,
    telefone: input.telefone ?? null,
    cargo: input.cargo ?? null,
    status: "ativo",
    is_master: false,
  });
  if (profileError) return respond({ error: profileError.message }, 500);

  const { error: membershipError } = await adminClient.from("usuarios_empresas").upsert(
    {
      usuario_id: invited.user.id,
      empresa_id: empresaId,
      perfil,
      ativo: true,
      acesso_todas_unidades: acessoTodasUnidades,
      unidade_principal_id: unidadePrincipalId,
      deleted_at: null,
    },
    { onConflict: "usuario_id,empresa_id" },
  );
  if (membershipError) return respond({ error: membershipError.message }, 500);

  if (!acessoTodasUnidades) {
    const { error: unitMembershipError } = await adminClient.from("usuarios_unidades").insert(
      unidadeIds.map((unidadeId) => ({
        empresa_id: empresaId,
        unidade_id: unidadeId,
        usuario_id: invited.user.id,
        ativo: true,
        principal: unidadeId === unidadePrincipalId,
        created_by: authData.user.id,
      })),
    );
    if (unitMembershipError) return respond({ error: unitMembershipError.message }, 500);
  }

  return respond({ id: invited.user.id, email, nome, perfil, invitation_sent: true }, 201);
});
