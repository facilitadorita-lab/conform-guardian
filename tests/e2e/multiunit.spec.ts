import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const password = process.env.E2E_TEST_PASSWORD;
const fixtures = JSON.parse(readFileSync("artifacts/validation/fixtures.json", "utf8"));

if (!supabaseUrl || !anonKey || !password) {
  throw new Error("E2E_CONFIGURATION_MISSING");
}

// Keep authentication credentials out of trace/video artifacts. Playwright
// requires worker-scoped options at file level, not inside a describe block.
test.use({ trace: "off", video: "off" });

test.describe("isolamento multiunidade no backend", () => {
  test("colaborador visualiza somente a unidade autorizada e documentos corporativos", async () => {
    const client = await signIn(fixtures.users.collabA.email);
    const units = await client
      .from("unidades")
      .select("id,empresa_id,codigo")
      .eq("empresa_id", fixtures.companies.companyA.id);

    expect(units.error).toBeNull();
    expect(units.data?.map((unit) => unit.id)).toEqual([fixtures.units.companyA.branch1.id]);

    const documents = await client
      .from("documentos")
      .select("id,unidade_id,escopo_documento")
      .eq("empresa_id", fixtures.companies.companyA.id);
    expect(documents.error).toBeNull();
    expect(documents.data?.some((item) => item.id === fixtures.documents.companyA.id)).toBe(true);
    expect(
      documents.data?.some((item) => item.id === fixtures.corporateDocuments.companyA.id),
    ).toBe(true);
    expect(
      documents.data?.some((item) => item.id === fixtures.secondaryUnitDocuments.companyA.id),
    ).toBe(false);

    const consolidated = await client.rpc("api_dashboard_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_unidade_id: null,
    });
    expect(Boolean(consolidated.error)).toBe(true);
  });

  test("FlowIA, upload e QR recusam UUID de unidade não autorizada", async () => {
    const client = await signIn(fixtures.users.collabA.email);
    const assistant = await client.functions.invoke("assistant-query", {
      body: {
        empresa_id: fixtures.companies.companyA.id,
        unidade_id: fixtures.units.companyA.branch2.id,
        pergunta: "Mostre os documentos desta unidade.",
      },
    });
    expect(Boolean(assistant.error || assistant.data?.error)).toBe(true);

    const upload = await client.functions.invoke("create-evidence-upload", {
      body: {
        action: "prepare",
        empresa_id: fixtures.companies.companyA.id,
        modulo: "documentos",
        registro_id: fixtures.secondaryUnitDocuments.companyA.id,
        nome_original: "tentativa.pdf",
        mime_type: "application/pdf",
        tamanho_bytes: 256,
      },
    });
    expect(Boolean(upload.error || upload.data?.error === "forbidden")).toBe(true);

    const qr = await client.rpc("api_obter_qr_equipamento", {
      p_equipamento_id: fixtures.secondaryUnitEquipment.companyA.id,
    });
    expect(Boolean(qr.error)).toBe(true);
  });

  test("administrador consolida e compara unidades sem atravessar empresa", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const branch = await client.rpc("api_dashboard_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_unidade_id: fixtures.units.companyA.branch1.id,
    });
    const consolidated = await client.rpc("api_dashboard_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_unidade_id: null,
    });
    expect(branch.error).toBeNull();
    expect(consolidated.error).toBeNull();
    expect(Number(consolidated.data?.documentos?.total ?? 0)).toBeGreaterThan(
      Number(branch.data?.documentos?.total ?? 0),
    );
    expect(Array.isArray(consolidated.data?.por_unidade)).toBe(true);

    const otherCompany = await client.rpc("api_listar_unidades", {
      p_empresa_id: fixtures.companies.companyB.id,
    });
    expect(Boolean(otherCompany.error)).toBe(true);
  });

  test("parceiro acessa unidades dos próprios clientes, nunca de outro parceiro", async () => {
    const client = await signIn(fixtures.users.partnerAdminA.email);
    const portfolio = await client.rpc("api_partner_listar_clientes", {
      p_parceiro_empresa_id: fixtures.companies.partnerA.id,
    });

    expect(portfolio.error).toBeNull();
    const clients = Array.isArray(portfolio.data) ? portfolio.data : [];
    expect(clients.some((item) => item.id === fixtures.companies.clientA1.id)).toBe(true);
    expect(clients.some((item) => item.id === fixtures.companies.clientB1.id)).toBe(false);
    expect(
      clients.find((item) => item.id === fixtures.companies.clientA1.id)?.unidades?.utilizadas,
    ).toBe(3);

    const ownClientUnits = await client.rpc("api_listar_unidades", {
      p_empresa_id: fixtures.companies.clientA1.id,
    });
    const anotherPartnerUnits = await client.rpc("api_listar_unidades", {
      p_empresa_id: fixtures.companies.clientB1.id,
    });
    expect(ownClientUnits.error).toBeNull();
    expect(ownClientUnits.data?.items).toHaveLength(3);
    expect(Boolean(anotherPartnerUnits.error)).toBe(true);
  });

  test("colaborador do parceiro entra nas unidades do cliente sem visão consolidada", async () => {
    const client = await signIn(fixtures.users.partnerCollabA.email);
    const ownClientUnits = await client.rpc("api_listar_unidades", {
      p_empresa_id: fixtures.companies.clientA1.id,
    });
    expect(ownClientUnits.error).toBeNull();
    expect(ownClientUnits.data?.items).toHaveLength(3);
    expect(ownClientUnits.data?.pode_visualizar_consolidado).toBe(false);
    expect(ownClientUnits.data?.pode_administrar).toBe(false);

    const consolidated = await client.rpc("api_dashboard_unidade", {
      p_empresa_id: fixtures.companies.clientA1.id,
      p_unidade_id: null,
    });
    const anotherPartner = await client.rpc("api_listar_unidades", {
      p_empresa_id: fixtures.companies.clientB1.id,
    });
    expect(Boolean(consolidated.error)).toBe(true);
    expect(Boolean(anotherPartner.error)).toBe(true);
  });

  test("relatório executivo e IA ficam limitados à unidade selecionada", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const report = await client.rpc("api_relatorio_executivo_ia_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_unidade_id: fixtures.units.companyA.branch1.id,
    });

    expect(report.error).toBeNull();
    expect(report.data?.unidade?.id).toBe(fixtures.units.companyA.branch1.id);
    expect(report.data?.politica_ia?.leu_anexos).toBe(false);
    expect(report.data?.politica_ia?.fonte).toContain("unidade selecionada");

    const anotherCompany = await client.rpc("api_relatorio_executivo_ia_unidade", {
      p_empresa_id: fixtures.companies.companyB.id,
      p_unidade_id: fixtures.units.companyB.branch1.id,
    });
    expect(Boolean(anotherCompany.error)).toBe(true);
  });

  test("troca de unidade gera trilha de auditoria contextual", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const change = await client.rpc("api_registrar_troca_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_unidade_anterior_id: fixtures.units.companyA.matrix.id,
      p_unidade_atual_id: fixtures.units.companyA.branch2.id,
    });
    expect(change.error).toBeNull();

    const audit = await client
      .from("logs_auditoria")
      .select("empresa_id,unidade_id,acao,novo_valor")
      .eq("empresa_id", fixtures.companies.companyA.id)
      .eq("acao", "troca_unidade")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(audit.error).toBeNull();
    expect(audit.data?.unidade_id).toBe(fixtures.units.companyA.branch2.id);
    expect(audit.data?.novo_valor?.unidade_anterior_id).toBe(
      fixtures.units.companyA.matrix.id,
    );
  });

  test("administrador não vincula usuário a unidade de outra empresa", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const result = await client.rpc("api_salvar_acesso_usuario_unidades", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_usuario_id: fixtures.users.collabA.id,
      p_acesso_todas_unidades: false,
      p_unidade_ids: [fixtures.units.companyB.branch1.id],
      p_unidade_principal_id: fixtures.units.companyB.branch1.id,
    });
    expect(Boolean(result.error)).toBe(true);

    const preserved = await client.rpc("api_obter_acessos_usuarios_unidades", {
      p_empresa_id: fixtures.companies.companyA.id,
    });
    expect(preserved.error).toBeNull();
    const collab = preserved.data?.find(
      (item) => item.usuario_id === fixtures.users.collabA.id,
    );
    expect(collab?.unidade_ids).toEqual([fixtures.units.companyA.branch1.id]);
  });

  test("somente leitura não consegue criar, editar ou transferir", async () => {
    const client = await signIn(fixtures.users.readonlyA.email);
    const create = await client.rpc("api_criar_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_payload: { codigo: "NEGADA", nome: "Unidade negada", status: "ativa" },
    });
    expect(Boolean(create.error)).toBe(true);

    const update = await client.rpc("api_atualizar_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_unidade_id: fixtures.units.companyA.branch1.id,
      p_payload: { nome: "Nome indevido" },
    });
    expect(Boolean(update.error)).toBe(true);

    const transfer = await client.rpc("api_transferir_equipamento_unidade", {
      p_empresa_id: fixtures.companies.companyA.id,
      p_equipamento_id: fixtures.equipment.companyA.id,
      p_unidade_destino_id: fixtures.units.companyA.branch2.id,
      p_motivo: "Tentativa sem permissão",
      p_responsavel_id: null,
      p_data_transferencia: null,
      p_observacoes: null,
    });
    expect(Boolean(transfer.error)).toBe(true);
  });
});

test.describe("experiência multiunidade na interface", () => {
  test("colaborador entra diretamente na única unidade permitida", async ({ page }) => {
    await login(page, fixtures.users.collabA.email);
    const switcher = page.locator('select[aria-label="Selecionar unidade operacional"]:visible');
    await expect(switcher).toHaveValue(
      fixtures.units.companyA.branch1.id,
    );
    await expect(
      switcher.locator('option[value="consolidado"]'),
    ).toHaveCount(0);
  });

  test("administrador visualiza capacidade e seletor consolidado", async ({ page }) => {
    await login(page, fixtures.users.adminA.email);
    const switcher = page.locator('select[aria-label="Selecionar unidade operacional"]:visible');
    await expect(switcher).toBeVisible();
    await expect(switcher.locator('option[value="consolidado"]')).toHaveCount(1);

    await page.goto("/configuracoes/unidades");
    await expect(page.getByRole("heading", { name: "Unidades", exact: true })).toBeVisible();
    await expect(page.getByText("3 de 3", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nova unidade/i })).toBeDisabled();
  });
});

async function signIn(email: string) {
  const client = createClient(supabaseUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: password! });
  expect(error).toBeNull();
  return client;
}

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password!);
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page).toHaveURL(/\/(dashboard|master\/empresas)/);
}
