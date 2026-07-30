#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

// Importa a guarda antes de qualquer mutação. O script falha fechado fora de
// Supabase local/homologação explicitamente autorizada.
await import("./validate-environment.mjs");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.E2E_TEST_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  throw new Error("VALIDATION_BOOTSTRAP_CONFIGURATION_MISSING");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = new Date();
const dateFromNow = (days) => {
  const value = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  return value.toISOString().slice(0, 10);
};

const userDefinitions = [
  { key: "master", email: "master@conform-flow.example.test", name: "Master E2E", profile: null, master: true },
  { key: "common", email: "comum@conform-flow.example.test", name: "Usuário Comum E2E", profile: "colaborador" },
  { key: "provisionalA", email: "provisorio-a@conform-flow.example.test", name: "Admin Provisório Empresa A", profile: "administrador_provisorio" },
  { key: "adminA", email: "admin-a@conform-flow.example.test", name: "Admin Empresa A", profile: "administrador" },
  { key: "rtA", email: "rt-a@conform-flow.example.test", name: "RT Empresa A", profile: "responsavel_tecnico" },
  { key: "collabA", email: "colab-a@conform-flow.example.test", name: "Colaborador Empresa A", profile: "colaborador" },
  { key: "readonlyA", email: "leitura-a@conform-flow.example.test", name: "Leitura Empresa A", profile: "somente_leitura" },
  { key: "adminB", email: "admin-b@conform-flow.example.test", name: "Admin Empresa B", profile: "administrador" },
  { key: "collabB", email: "colab-b@conform-flow.example.test", name: "Colaborador Empresa B", profile: "colaborador" },
  { key: "partnerAdminA", email: "parceiro-a@conform-flow.example.test", name: "Parceiro A Admin", profile: "administrador" },
  { key: "partnerCollabA", email: "parceiro-a-colab@conform-flow.example.test", name: "Parceiro A Colaborador", profile: "colaborador" },
  { key: "partnerAdminB", email: "parceiro-b@conform-flow.example.test", name: "Parceiro B Admin", profile: "administrador" },
  { key: "clientA1", email: "cliente-a1@conform-flow.example.test", name: "Cliente A1", profile: "administrador" },
  { key: "clientA2", email: "cliente-a2@conform-flow.example.test", name: "Cliente A2", profile: "administrador" },
  { key: "clientB1", email: "cliente-b1@conform-flow.example.test", name: "Cliente B1", profile: "administrador" },
];

const userIds = {};
for (const definition of userDefinitions) {
  const existing = await findAuthUser(definition.email);
  const authUser = existing
    ? await updateAuthUser(existing.id, definition)
    : await createAuthUser(definition);
  userIds[definition.key] = authUser.id;

  const { error } = await admin.from("usuarios").upsert({
    id: authUser.id,
    nome: definition.name,
    email: definition.email,
    cargo: definition.profile || "admin_master",
    is_master: definition.master === true,
    status: "ativo",
    deleted_at: null,
  });
  if (error) throw new Error(`USUARIO_FIXTURE_FAILED:${definition.key}:${error.message}`);
}

const { data: directPlan, error: directPlanError } = await admin
  .from("planos")
  .select("id, valor_mensal_centavos, valor_anual_centavos, moeda")
  .eq("codigo", "profissional")
  .single();
if (directPlanError || !directPlan) throw new Error("PROFISSIONAL_PLAN_NOT_FOUND");

const { data: networkPlan, error: networkPlanError } = await admin
  .from("planos")
  .select("id, valor_mensal_centavos, valor_anual_centavos, moeda")
  .eq("codigo", "rede")
  .single();
if (networkPlanError || !networkPlan) throw new Error("NETWORK_PLAN_NOT_FOUND");

const { data: partnerPlan, error: partnerPlanError } = await admin
  .from("planos")
  .select("id, valor_mensal_centavos, valor_anual_centavos, limite_clientes, preco_cliente_extra_centavos, moeda")
  .eq("codigo", "parceiro_start")
  .single();
if (partnerPlanError || !partnerPlan) throw new Error("PARTNER_START_PLAN_NOT_FOUND");

const companyDefinitions = [
  { key: "companyA", name: "Empresa A E2E", cnpj: "91.000.001/0001-01", type: "direta", plan: networkPlan, segment: "clinica" },
  { key: "companyB", name: "Empresa B E2E", cnpj: "91.000.002/0001-02", type: "direta", plan: directPlan, segment: "farmacia" },
  { key: "partnerA", name: "Parceiro A E2E", cnpj: "91.000.003/0001-03", type: "parceira", plan: partnerPlan, segment: "consultoria" },
  { key: "partnerB", name: "Parceiro B E2E", cnpj: "91.000.004/0001-04", type: "parceira", plan: partnerPlan, segment: "consultoria" },
  { key: "clientA1", name: "Cliente A1 E2E", cnpj: "91.000.011/0001-11", type: "cliente", plan: directPlan, segment: "clinica", partner: "partnerA" },
  { key: "clientA2", name: "Cliente A2 E2E", cnpj: "91.000.012/0001-12", type: "cliente", plan: directPlan, segment: "laboratorio", partner: "partnerA" },
  { key: "clientB1", name: "Cliente B1 E2E", cnpj: "91.000.013/0001-13", type: "cliente", plan: directPlan, segment: "farmacia", partner: "partnerB" },
];

const companies = {};
for (const definition of companyDefinitions) {
  const partnerId = definition.partner ? companies[definition.partner].id : null;
  const { data, error } = await admin
    .from("empresas")
    .insert({
      razao_social: `${definition.name} Ltda.`,
      nome_fantasia: definition.name,
      cnpj: definition.cnpj,
      tipo_estabelecimento: definition.segment,
      segmento: "E2E isolado",
      cidade: "São Paulo",
      estado: "SP",
      email_principal: `${definition.key}@conform-flow.example.test`,
      responsavel_legal: definition.name,
      plano_id: definition.plan.id,
      tipo_conta: definition.type,
      parceiro_origem_id: partnerId,
      status: "ativa",
      verification_status: "verified",
      access_status: "active",
      observacoes: "Fixture descartável da validação Fase 2.",
    })
    .select("id, nome_fantasia, cnpj, tipo_conta")
    .single();
  if (error || !data) throw new Error(`EMPRESA_FIXTURE_FAILED:${definition.key}:${error?.message ?? "unknown"}`);
  companies[definition.key] = data;
}

const subscriptionDefinitions = companyDefinitions.filter(({ type }) => type !== "cliente");
for (const definition of subscriptionDefinitions) {
  const company = companies[definition.key];
  const isPartner = definition.type === "parceira";
  const { error } = await admin.from("assinaturas_empresas").insert({
    empresa_id: company.id,
    plano_id: definition.plan.id,
    status: isPartner ? "trial" : "ativa",
    ciclo: "mensal",
    valor_mensal_centavos: definition.plan.valor_mensal_centavos,
    valor_anual_centavos: definition.plan.valor_anual_centavos,
    moeda: definition.plan.moeda,
    clientes_incluidos: isPartner ? definition.plan.limite_clientes : 0,
    preco_cliente_extra_centavos: isPartner ? definition.plan.preco_cliente_extra_centavos : 0,
    cobranca_consolidada: isPartner,
    usuarios_extras: definition.key === "companyA" ? 2 : 0,
    proximo_vencimento: dateFromNow(30),
    trial_termina_em: isPartner ? dateFromNow(14) : null,
    observacoes_internas: "Assinatura fictícia da validação Fase 2.",
  });
  if (error) throw new Error(`ASSINATURA_FIXTURE_FAILED:${definition.key}:${error.message}`);
}

const memberships = [
  ["provisionalA", "companyA", "administrador_provisorio"],
  ["adminA", "companyA", "administrador"],
  ["rtA", "companyA", "responsavel_tecnico"],
  ["collabA", "companyA", "colaborador"],
  ["readonlyA", "companyA", "somente_leitura"],
  ["adminB", "companyB", "administrador"],
  ["collabB", "companyB", "colaborador"],
  ["partnerAdminA", "partnerA", "administrador"],
  ["partnerCollabA", "partnerA", "colaborador"],
  ["partnerAdminB", "partnerB", "administrador"],
  ["clientA1", "clientA1", "administrador"],
  ["clientA2", "clientA2", "administrador"],
  ["clientB1", "clientB1", "administrador"],
];
for (const [userKey, companyKey, profile] of memberships) {
  const { error } = await admin.from("usuarios_empresas").insert({
    usuario_id: userIds[userKey],
    empresa_id: companies[companyKey].id,
    perfil: profile,
    ativo: true,
  });
  if (error) throw new Error(`MEMBERSHIP_FIXTURE_FAILED:${userKey}:${error.message}`);
}

for (const [partnerKey, clientKey, userKey] of [
  ["partnerA", "clientA1", "partnerAdminA"],
  ["partnerA", "clientA2", "partnerAdminA"],
  ["partnerB", "clientB1", "partnerAdminB"],
]) {
  const { error } = await admin.from("relacionamentos_parceiro_clientes").insert({
    parceiro_empresa_id: companies[partnerKey].id,
    cliente_empresa_id: companies[clientKey].id,
    plano_servico_id: directPlan.id,
    created_by: userIds[userKey],
    status: "ativo",
  });
  if (error) throw new Error(`PARTNER_RELATION_FIXTURE_FAILED:${partnerKey}:${clientKey}:${error.message}`);
}

const operationalCompanies = ["companyA", "companyB", "clientA1", "clientB1"];
const units = {};
for (const companyKey of operationalCompanies) {
  const company = companies[companyKey];
  const { error: limitError } = await admin.from("limites_acesso_empresa").insert({
    empresa_id: company.id,
    source_type: "custom",
    max_users: 20,
    max_units: 3,
    max_documents: 500,
    max_equipment: 250,
    max_pending_tasks: 500,
    max_storage_mb: 20480,
    max_reports: 100,
    allow_exports: true,
    allow_integrations: true,
    allow_bulk_import: true,
  });
  if (limitError) throw new Error(`UNIT_LIMIT_FIXTURE_FAILED:${companyKey}:${limitError.message}`);

  const { data: matrix, error: matrixError } = await admin
    .from("unidades")
    .select("id, empresa_id, codigo, nome, is_matriz")
    .eq("empresa_id", company.id)
    .eq("is_matriz", true)
    .is("deleted_at", null)
    .single();
  if (matrixError || !matrix)
    throw new Error(`MATRIX_UNIT_FIXTURE_FAILED:${companyKey}:${matrixError?.message ?? "unknown"}`);

  const { data: branches, error: branchesError } = await admin
    .from("unidades")
    .insert([
      {
        empresa_id: company.id,
        codigo: "FILIAL-01",
        nome: `Filial Operacional ${companyKey}`,
        tipo: "filial",
        cidade: "Campinas",
        estado: "SP",
        status: "ativa",
      },
      {
        empresa_id: company.id,
        codigo: "FILIAL-02",
        nome: `Filial Apoio ${companyKey}`,
        tipo: "filial",
        cidade: "Santos",
        estado: "SP",
        status: "em_implantacao",
      },
    ])
    .select("id, empresa_id, codigo, nome, is_matriz");
  if (branchesError || !branches || branches.length !== 2)
    throw new Error(`BRANCH_UNIT_FIXTURE_FAILED:${companyKey}:${branchesError?.message ?? "unknown"}`);

  units[companyKey] = {
    matrix,
    branch1: branches.find((unit) => unit.codigo === "FILIAL-01"),
    branch2: branches.find((unit) => unit.codigo === "FILIAL-02"),
  };
}

const { error: restrictedMembershipError } = await admin
  .from("usuarios_empresas")
  .update({
    acesso_todas_unidades: false,
    unidade_principal_id: units.companyA.branch1.id,
  })
  .eq("usuario_id", userIds.collabA)
  .eq("empresa_id", companies.companyA.id);
if (restrictedMembershipError)
  throw new Error(`RESTRICTED_COMPANY_MEMBERSHIP_FAILED:${restrictedMembershipError.message}`);

const { error: collabUnitError } = await admin.from("usuarios_unidades").insert({
  empresa_id: companies.companyA.id,
  unidade_id: units.companyA.branch1.id,
  usuario_id: userIds.collabA,
  ativo: true,
  principal: true,
  created_by: userIds.adminA,
});
if (collabUnitError)
  throw new Error(`RESTRICTED_UNIT_MEMBERSHIP_FAILED:${collabUnitError.message}`);

const documents = {};
const corporateDocuments = {};
const secondaryUnitDocuments = {};
const equipmentFixtures = {};
const secondaryUnitEquipment = {};
for (const companyKey of operationalCompanies) {
  const company = companies[companyKey];
  const owner = companyKey === "companyA" ? userIds.adminA : companyKey === "companyB" ? userIds.adminB : userIds[companyKey];
  const { data: document, error: documentError } = await admin.from("documentos").insert({
    empresa_id: company.id,
    nome: `AVCB ${companyKey} E2E`,
    numero_documento: `E2E-${companyKey}-AVCB`,
    orgao_emissor: "Órgão E2E",
    data_emissao: dateFromNow(-30),
    data_vencimento: dateFromNow(companyKey === "companyA" ? -1 : 45),
    exige_anexo: false,
    escopo_documento: "unidade",
    unidade_id: units[companyKey].branch1.id,
    setor_unidade: "Operação E2E",
    created_by: owner,
  }).select("id").single();
  if (documentError || !document) throw new Error(`DOCUMENT_FIXTURE_FAILED:${companyKey}:${documentError?.message ?? "unknown"}`);
  documents[companyKey] = document;

  const { data: corporateDocument, error: corporateDocumentError } = await admin
    .from("documentos")
    .insert({
      empresa_id: company.id,
      nome: `Política corporativa ${companyKey} E2E`,
      numero_documento: `E2E-${companyKey}-CORP`,
      orgao_emissor: "Conform Flow E2E",
      data_emissao: dateFromNow(-10),
      data_vencimento: dateFromNow(180),
      exige_anexo: false,
      escopo_documento: "corporativo",
      unidade_id: null,
      setor_unidade: null,
      created_by: owner,
    })
    .select("id")
    .single();
  if (corporateDocumentError || !corporateDocument)
    throw new Error(
      `CORPORATE_DOCUMENT_FIXTURE_FAILED:${companyKey}:${corporateDocumentError?.message ?? "unknown"}`,
    );
  corporateDocuments[companyKey] = corporateDocument;

  const { data: branch2Document, error: branch2DocumentError } = await admin
    .from("documentos")
    .insert({
      empresa_id: company.id,
      nome: `Licença Filial 02 ${companyKey} E2E`,
      numero_documento: `E2E-${companyKey}-FILIAL-02`,
      orgao_emissor: "Órgão E2E",
      data_emissao: dateFromNow(-20),
      data_vencimento: dateFromNow(75),
      exige_anexo: false,
      escopo_documento: "unidade",
      unidade_id: units[companyKey].branch2.id,
      setor_unidade: "Filial 02 E2E",
      created_by: owner,
    })
    .select("id")
    .single();
  if (branch2DocumentError || !branch2Document)
    throw new Error(
      `SECONDARY_UNIT_DOCUMENT_FIXTURE_FAILED:${companyKey}:${branch2DocumentError?.message ?? "unknown"}`,
    );
  secondaryUnitDocuments[companyKey] = branch2Document;

  const { data: equipmentRecord, error: equipmentError } = await admin.from("equipamentos").insert({
    empresa_id: company.id,
    nome: `Geladeira ${companyKey} E2E`,
    codigo_interno: `EQ-${companyKey}`,
    fabricante: "Fabricante E2E",
    modelo: "Modelo E2E",
    setor: "Farmácia",
    criticidade: "alta",
    unidade_id: units[companyKey].branch1.id,
    responsavel_id: owner,
    created_by: owner,
  }).select("id").single();
  if (equipmentError || !equipmentRecord) throw new Error(`EQUIPMENT_FIXTURE_FAILED:${companyKey}:${equipmentError?.message ?? "unknown"}`);
  equipmentFixtures[companyKey] = equipmentRecord;

  const { data: branch2Equipment, error: branch2EquipmentError } = await admin
    .from("equipamentos")
    .insert({
      empresa_id: company.id,
      nome: `Freezer Filial 02 ${companyKey} E2E`,
      codigo_interno: `EQ-${companyKey}-FILIAL-02`,
      fabricante: "Fabricante E2E",
      modelo: "Modelo Unidade 02",
      setor: "Laboratório",
      criticidade: "alta",
      unidade_id: units[companyKey].branch2.id,
      responsavel_id: owner,
      created_by: owner,
    })
    .select("id")
    .single();
  if (branch2EquipmentError || !branch2Equipment)
    throw new Error(
      `SECONDARY_UNIT_EQUIPMENT_FIXTURE_FAILED:${companyKey}:${branch2EquipmentError?.message ?? "unknown"}`,
    );
  secondaryUnitEquipment[companyKey] = branch2Equipment;

  const { error: calibrationError } = await admin.from("calibracoes").insert({
    empresa_id: company.id,
    equipamento_id: equipmentRecord.id,
    data_calibracao: dateFromNow(-30),
    data_vencimento: dateFromNow(companyKey === "companyA" ? -1 : 30),
    numero_certificado: `CAL-${companyKey}-001`,
    laboratorio_responsavel: "Lab E2E",
    resultado: "aprovado",
    responsavel_id: owner,
    created_by: owner,
  });
  if (calibrationError) throw new Error(`CALIBRATION_FIXTURE_FAILED:${companyKey}:${calibrationError.message}`);

  const { error: qualificationError } = await admin.from("qualificacoes").insert({
    empresa_id: company.id,
    equipamento_id: equipmentRecord.id,
    tipo: "operacao",
    data_qualificacao: dateFromNow(-30),
    data_vencimento: dateFromNow(60),
    resultado: "aprovado",
    responsavel_tecnico_id: owner,
    empresa_executora: "Quali E2E",
    created_by: owner,
  });
  if (qualificationError) throw new Error(`QUALIFICATION_FIXTURE_FAILED:${companyKey}:${qualificationError.message}`);

  const { error: maintenanceError } = await admin.from("manutencoes").insert({
    empresa_id: company.id,
    equipamento_id: equipmentRecord.id,
    nome_servico: `Preventiva ${companyKey}`,
    natureza: "preventiva",
    tipo_servico: "inspecao",
    status_execucao: "programada",
    data_manutencao: dateFromNow(-5),
    proxima_manutencao: dateFromNow(30),
    tecnico_responsavel: "Técnico E2E",
    responsavel_interno_id: owner,
    exige_evidencia: false,
    created_by: owner,
  });
  if (maintenanceError) throw new Error(`MAINTENANCE_FIXTURE_FAILED:${companyKey}:${maintenanceError.message}`);

  const { error: pendingError } = await admin.from("pendencias").insert({
    empresa_id: company.id,
    modulo: "documentos",
    registro_id: document.id,
    tipo: "evidencia",
    titulo: `Pendência ${companyKey} E2E`,
    prazo: dateFromNow(7),
    responsavel_id: owner,
    created_by: owner,
  });
  if (pendingError) throw new Error(`PENDING_FIXTURE_FAILED:${companyKey}:${pendingError.message}`);
}

mkdirSync("artifacts/validation", { recursive: true });
writeFileSync(
  "artifacts/validation/fixtures.json",
  JSON.stringify({
    generated_at: new Date().toISOString(),
    companies,
    units,
    documents,
    corporateDocuments,
    secondaryUnitDocuments,
    equipment: equipmentFixtures,
    secondaryUnitEquipment,
    users: Object.fromEntries(
      userDefinitions.map(({ key, email, profile, master }) => [
        key,
        {
          id: userIds[key],
          email,
          profile,
          master: master === true,
        },
      ]),
    ),
  }, null, 2),
);

console.log(`VALIDATION_FIXTURES_CREATED users=${userDefinitions.length} companies=${companyDefinitions.length}`);

async function findAuthUser(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createAuthUser(definition) {
  const { data, error } = await admin.auth.admin.createUser({
    email: definition.email,
    password,
    email_confirm: true,
    user_metadata: { nome: definition.name },
  });
  if (error || !data.user) throw new Error(`AUTH_FIXTURE_FAILED:${definition.key}:${error?.message ?? "unknown"}`);
  return data.user;
}

async function updateAuthUser(id, definition) {
  const { data, error } = await admin.auth.admin.updateUserById(id, {
    password,
    email_confirm: true,
    user_metadata: { nome: definition.name },
  });
  if (error || !data.user) throw new Error(`AUTH_FIXTURE_UPDATE_FAILED:${definition.key}:${error?.message ?? "unknown"}`);
  return data.user;
}
