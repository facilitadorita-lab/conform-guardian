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

const testUsers = [
  {
    nome: "Teste Administrador",
    email: "teste.admin@conformflow.local",
    senha: "Conform@Teste2026#Admin",
    perfil: "administrador",
  },
  {
    nome: "Teste Responsável Técnico",
    email: "teste.rt@conformflow.local",
    senha: "Conform@Teste2026#RT",
    perfil: "responsavel_tecnico",
  },
  {
    nome: "Teste Colaborador",
    email: "teste.colaborador@conformflow.local",
    senha: "Conform@Teste2026#Colab",
    perfil: "colaborador",
  },
  {
    nome: "Teste Somente Leitura",
    email: "teste.leitura@conformflow.local",
    senha: "Conform@Teste2026#Leitura",
    perfil: "somente_leitura",
  },
] as const;

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

  const { data: isMaster, error: masterError } = await userClient.rpc("is_master");
  if (masterError || !isMaster) return respond({ error: "master_required" }, 403);

  const { data: plano, error: planoError } = await adminClient
    .from("planos")
    .select("id, valor_mensal_centavos, valor_anual_centavos")
    .eq("codigo", "completo")
    .single();
  if (planoError || !plano) return respond({ error: "plano_completo_not_found" }, 500);

  const { data: empresa, error: empresaError } = await adminClient
    .from("empresas")
    .upsert(
      {
        razao_social: "Conform Flow Base Teste Plano Completo Ltda.",
        nome_fantasia: "Base Teste Completo",
        cnpj: "99.999.991/0001-91",
        tipo_estabelecimento: "clinica",
        segmento: "Saúde regulada",
        cidade: "São Paulo",
        estado: "SP",
        email_principal: "base.teste@conformflow.local",
        plano_id: plano.id,
        status: "ativa",
        observacoes: "Base criada automaticamente para auditoria de permissões, anexos e perfis.",
      },
      { onConflict: "cnpj" },
    )
    .select("id, razao_social, nome_fantasia, cnpj")
    .single();
  if (empresaError || !empresa)
    return respond({ error: empresaError?.message ?? "empresa_error" }, 500);

  await adminClient.from("assinaturas_empresas").upsert(
    {
      empresa_id: empresa.id,
      plano_id: plano.id,
      status: "ativa",
      ciclo: "mensal",
      valor_mensal_centavos: plano.valor_mensal_centavos,
      valor_anual_centavos: plano.valor_anual_centavos,
      moeda: "BRL",
      proximo_vencimento: "2026-08-15",
      observacoes_internas: "Assinatura de teste criada para auditoria funcional.",
      updated_by: authData.user.id,
      created_by: authData.user.id,
    },
    { onConflict: "empresa_id" },
  );

  const createdUsers = [];
  for (const item of testUsers) {
    const userId = await ensureUser(adminClient, item.email, item.senha, item.nome);

    await adminClient.from("usuarios").upsert({
      id: userId,
      nome: item.nome,
      email: item.email,
      cargo: item.perfil,
      is_master: false,
      status: "ativo",
      deleted_at: null,
    });

    await adminClient.from("usuarios_empresas").upsert(
      {
        usuario_id: userId,
        empresa_id: empresa.id,
        perfil: item.perfil,
        ativo: true,
        deleted_at: null,
      },
      { onConflict: "usuario_id,empresa_id" },
    );

    createdUsers.push({
      usuario: item.nome,
      email: item.email,
      senha_temporaria: item.senha,
      perfil: item.perfil,
    });
  }

  const categoriaId = await ensureCatalog(adminClient, "categorias_documentos", "Documento teste");
  const tipoId = await ensureCatalog(adminClient, "tipos_documentos", "Certificado teste", {
    exige_anexo: true,
  });

  const { data: existingDocument, error: docLookupError } = await adminClient
    .from("documentos")
    .select("id,nome")
    .eq("empresa_id", empresa.id)
    .eq("numero_documento", "TESTE-ANEXO-001")
    .is("deleted_at", null)
    .maybeSingle();
  if (docLookupError) return respond({ error: docLookupError.message }, 500);

  let documento = existingDocument;

  if (!documento) {
    const created = await adminClient
      .from("documentos")
      .insert({
        empresa_id: empresa.id,
        nome: "Documento Teste com Anexo",
        categoria_id: categoriaId,
        tipo_documento_id: tipoId,
        numero_documento: "TESTE-ANEXO-001",
        orgao_emissor: "Conform Flow",
        data_emissao: "2026-07-15",
        data_vencimento: "2027-07-15",
        periodicidade_meses: 12,
        exige_anexo: true,
        setor_unidade: "Base Teste",
        observacoes:
          "Documento criado para validar visualização de anexos e isolamento por empresa.",
      })
      .select("id,nome")
      .single();
    if (created.error || !created.data)
      return respond({ error: created.error?.message ?? "documento_error" }, 500);
    documento = created.data;
  }

  const path = `${empresa.id}/documentos/${documento.id}/${crypto.randomUUID()}-documento-teste.pdf`;
  const pdf = minimalPdf(
    "Conform Flow - Anexo teste",
    "Arquivo fictício para validar upload, preview e auditoria.",
  );
  const { error: uploadError } = await adminClient.storage
    .from("evidencias")
    .upload(path, new Blob([pdf], { type: "application/pdf" }), {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError && !uploadError.message.toLowerCase().includes("already exists")) {
    return respond({ error: uploadError.message }, 500);
  }

  const { data: anexo, error: anexoError } = await adminClient
    .from("anexos")
    .insert({
      empresa_id: empresa.id,
      modulo: "documentos",
      registro_id: documento.id,
      finalidade: "principal",
      storage_path: path,
      nome_original: "documento-teste.pdf",
      mime_type: "application/pdf",
      tamanho_bytes: pdf.length,
      versao: 1,
      created_by: authData.user.id,
    })
    .select("id,nome_original,storage_path")
    .single();
  if (anexoError) return respond({ error: anexoError.message }, 500);

  await adminClient.from("logs_auditoria").insert({
    empresa_id: empresa.id,
    usuario_id: authData.user.id,
    modulo: "documentos",
    acao: "setup_base_teste",
    registro_id: documento.id,
    novo_valor: {
      documento: documento.nome,
      anexo_id: anexo.id,
      usuarios_criados: createdUsers.length,
    },
  });

  return respond({
    empresa,
    plano: "Completo",
    usuarios: createdUsers,
    documento,
    anexo: {
      id: anexo.id,
      nome_original: anexo.nome_original,
    },
  });
});

async function ensureUser(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  password: string,
  nome: string,
) {
  const created = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (!created.error && created.data.user) return created.data.user.id;

  const { data } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(created.error?.message ?? `Não foi possível criar ${email}`);

  const updated = await adminClient.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (updated.error) throw updated.error;
  return existing.id;
}

async function ensureCatalog(
  adminClient: ReturnType<typeof createClient>,
  table: "categorias_documentos" | "tipos_documentos",
  nome: string,
  extra: Record<string, unknown> = {},
) {
  const { data: existing } = await adminClient
    .from(table)
    .select("id")
    .is("empresa_id", null)
    .eq("nome", nome)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await adminClient
    .from(table)
    .insert({ nome, empresa_id: null, padrao_plataforma: true, ativo: true, ...extra })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error(`Falha ao criar catálogo ${nome}`);
  return data.id;
}

function minimalPdf(title: string, text: string) {
  const body = `BT /F1 18 Tf 72 740 Td (${escapePdf(title)}) Tj /F1 11 Tf 0 -28 Td (${escapePdf(text)}) Tj ET`;
  return `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${body.length} >> stream
${body}
endstream endobj
xref
0 6
0000000000 65535 f 
trailer << /Root 1 0 R /Size 6 >>
startxref
0
%%EOF`;
}

function escapePdf(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
