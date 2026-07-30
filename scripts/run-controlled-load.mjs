#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

await import("./validate-environment.mjs");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.E2E_TEST_PASSWORD;

if (!url || !anonKey || !serviceRoleKey || !password) {
  throw new Error("VALIDATION_LOAD_CONFIGURATION_MISSING");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const date = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const chunk = (values, size = 250) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
};
const insertMany = async (table, rows, select = "id") => {
  const output = [];
  for (const part of chunk(rows)) {
    const { data, error } = await admin.from(table).insert(part).select(select);
    if (error) throw new Error(`LOAD_INSERT_FAILED:${table}:${error.message}`);
    output.push(...(data ?? []));
  }
  return output;
};

const { data: plan, error: planError } = await admin
  .from("planos")
  .select("id, valor_mensal_centavos, valor_anual_centavos, moeda")
  .eq("codigo", "rede")
  .single();
if (planError || !plan) throw new Error("LOAD_NETWORK_PLAN_NOT_FOUND");

const companyRows = Array.from({ length: 20 }, (_, index) => ({
  razao_social: `Carga E2E ${index + 1} ${runId}`,
  nome_fantasia: `Carga E2E ${index + 1}`,
  cnpj: `93.${String(index + 1).padStart(3, "0")}.000/0001-${String(index + 1).padStart(2, "0")}`,
  tipo_estabelecimento: "clinica",
  segmento: "carga-controlada",
  cidade: "São Paulo",
  estado: "SP",
  email_principal: `carga-${runId}-${index + 1}@conform-flow.example.test`,
  plano_id: plan.id,
  tipo_conta: "direta",
  status: "ativa",
  verification_status: "verified",
  access_status: "active",
  observacoes: "Fixture descartável do ensaio de carga local.",
}));
const companies = await insertMany("empresas", companyRows, "id, nome_fantasia");

await insertMany(
  "assinaturas_empresas",
  companies.map((company) => ({
    empresa_id: company.id,
    plano_id: plan.id,
    status: "ativa",
    ciclo: "mensal",
    valor_mensal_centavos: plan.valor_mensal_centavos,
    valor_anual_centavos: plan.valor_anual_centavos,
    moeda: plan.moeda,
    proximo_vencimento: date(30),
    observacoes_internas: "Fixture descartável do ensaio de carga local.",
  })),
  "id",
);
await insertMany(
  "limites_acesso_empresa",
  companies.map((company) => ({
    empresa_id: company.id,
    source_type: "custom",
    max_users: 10,
    max_units: 5,
    max_documents: 100,
    max_equipment: 50,
    max_pending_tasks: 100,
    max_storage_mb: 20480,
    max_reports: 100,
    allow_exports: true,
    allow_integrations: true,
    allow_bulk_import: true,
  })),
  "id",
);

const unitsByCompany = new Map();
for (const [companyIndex, company] of companies.entries()) {
  const { data: matrix, error: matrixError } = await admin
    .from("unidades")
    .select("id, empresa_id, codigo")
    .eq("empresa_id", company.id)
    .eq("is_matriz", true)
    .single();
  if (matrixError || !matrix)
    throw new Error(`LOAD_MATRIX_UNIT_FAILED:${company.id}:${matrixError?.message ?? "unknown"}`);

  const additionalUnitCount = companyIndex % 5;
  const branches = await insertMany(
    "unidades",
    Array.from({ length: additionalUnitCount }, (_, index) => index + 1).map((number) => ({
      empresa_id: company.id,
      codigo: `FILIAL-${number}`,
      nome: `Filial ${number} Carga ${companyIndex + 1}`,
      tipo: "filial",
      cidade: number === 1 ? "Campinas" : "Santos",
      estado: "SP",
      status: "ativa",
    })),
    "id, empresa_id, codigo",
  );
  unitsByCompany.set(company.id, [matrix, ...branches]);
}

const authUsers = [];
for (let companyIndex = 0; companyIndex < companies.length; companyIndex += 1) {
  for (let userIndex = 0; userIndex < 5; userIndex += 1) {
    const email = `carga-${runId}-${companyIndex + 1}-${userIndex + 1}@conform-flow.example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: `Carga ${companyIndex + 1}-${userIndex + 1}` },
    });
    if (error || !data.user) throw new Error(`LOAD_AUTH_FAILED:${email}:${error?.message ?? "unknown"}`);
    authUsers.push({ id: data.user.id, email, companyIndex });
  }
}

await insertMany(
  "usuarios",
  authUsers.map((user, index) => ({
    id: user.id,
    nome: `Carga ${user.companyIndex + 1}-${(index % 5) + 1}`,
    email: user.email,
    cargo: index % 5 === 0 ? "administrador" : "colaborador",
    status: "ativo",
    is_master: false,
  })),
  "id",
);
await insertMany(
  "usuarios_empresas",
  authUsers.map((user, index) => ({
    usuario_id: user.id,
    empresa_id: companies[user.companyIndex].id,
    perfil: index % 5 === 0 ? "administrador" : "colaborador",
    ativo: true,
  })),
  "id",
);

const restrictedLinks = [];
for (let companyIndex = 0; companyIndex < companies.length; companyIndex += 1) {
  const companyUsers = authUsers.filter((user) => user.companyIndex === companyIndex);
  const companyUnits = unitsByCompany.get(companies[companyIndex].id);
  const restrictedUsers = companyUsers.slice(1, 3);
  const { error: restrictedError } = await admin
    .from("usuarios_empresas")
    .update({ acesso_todas_unidades: false })
    .eq("empresa_id", companies[companyIndex].id)
    .in("usuario_id", restrictedUsers.map((user) => user.id));
  if (restrictedError)
    throw new Error(`LOAD_RESTRICTED_MEMBERSHIP_FAILED:${restrictedError.message}`);

  restrictedUsers.forEach((user, index) => {
    const unit = companyUnits[Math.min(index, companyUnits.length - 1)];
    restrictedLinks.push({
      empresa_id: companies[companyIndex].id,
      unidade_id: unit.id,
      usuario_id: user.id,
      ativo: true,
      principal: true,
      created_by: companyUsers[0].id,
    });
  });
}
await insertMany("usuarios_unidades", restrictedLinks, "id");

const documentRows = [];
for (let companyIndex = 0; companyIndex < companies.length; companyIndex += 1) {
  const owner = authUsers[companyIndex * 5].id;
  const companyUnits = unitsByCompany.get(companies[companyIndex].id);
  for (let index = 0; index < 50; index += 1) {
    const isCorporate = index % 4 === 0;
    documentRows.push({
      empresa_id: companies[companyIndex].id,
      nome: `Documento carga ${companyIndex + 1}-${index + 1}`,
      numero_documento: `LOAD-${runId}-${companyIndex + 1}-${index + 1}`,
      data_emissao: date(-30),
      data_vencimento: date(index % 2 === 0 ? 30 : -1),
      exige_anexo: false,
      setor_unidade: "Carga controlada",
      escopo_documento: isCorporate ? "corporativo" : "unidade",
      unidade_id: isCorporate ? null : companyUnits[index % companyUnits.length].id,
      created_by: owner,
    });
  }
}
const documents = await insertMany("documentos", documentRows, "id, empresa_id");

const equipmentRows = [];
for (let companyIndex = 0; companyIndex < companies.length; companyIndex += 1) {
  const owner = authUsers[companyIndex * 5].id;
  const companyUnits = unitsByCompany.get(companies[companyIndex].id);
  for (let index = 0; index < 25; index += 1) {
    equipmentRows.push({
      empresa_id: companies[companyIndex].id,
      nome: `Equipamento carga ${companyIndex + 1}-${index + 1}`,
      codigo_interno: `LOAD-${companyIndex + 1}-${index + 1}`,
      fabricante: "Fabricante carga",
      modelo: "Modelo carga",
      setor: "Operação",
      criticidade: index % 5 === 0 ? "alta" : "media",
      unidade_id: companyUnits[index % companyUnits.length].id,
      responsavel_id: owner,
      created_by: owner,
    });
  }
}
const equipment = await insertMany("equipamentos", equipmentRows, "id, empresa_id");

const calibrations = [];
const qualifications = [];
const maintenances = [];
for (const [companyIndex, company] of companies.entries()) {
  const companyEquipment = equipment.filter((item) => item.empresa_id === company.id);
  const owner = authUsers[companyIndex * 5].id;
  for (let index = 0; index < 50; index += 1) {
    const equipmentItem = companyEquipment[index % companyEquipment.length];
    calibrations.push({
      empresa_id: company.id,
      equipamento_id: equipmentItem.id,
      data_calibracao: date(-10),
      data_vencimento: date(index % 2 === 0 ? 45 : -1),
      numero_certificado: `LOAD-CAL-${runId}-${companyIndex + 1}-${index + 1}`,
      laboratorio_responsavel: "Lab carga",
      resultado: "aprovado",
      responsavel_id: owner,
      created_by: owner,
    });
    maintenances.push({
      empresa_id: company.id,
      equipamento_id: equipmentItem.id,
      nome_servico: `Preventiva carga ${companyIndex + 1}-${index + 1}`,
      natureza: index % 5 === 0 ? "corretiva" : "preventiva",
      tipo_servico: index % 5 === 0 ? "reparo" : "inspecao",
      status_execucao: "programada",
      data_manutencao: date(-5),
      proxima_manutencao: date(30),
      tecnico_responsavel: "Técnico carga",
      responsavel_interno_id: owner,
      exige_evidencia: false,
      created_by: owner,
    });
  }
  for (let index = 0; index < 25; index += 1) {
    const equipmentItem = companyEquipment[index];
    qualifications.push({
      empresa_id: company.id,
      equipamento_id: equipmentItem.id,
      tipo: "operacao",
      data_qualificacao: date(-10),
      data_vencimento: date(60),
      resultado: "aprovado",
      empresa_executora: "Quali carga",
      responsavel_tecnico_id: owner,
      created_by: owner,
    });
  }
}
await insertMany("calibracoes", calibrations, "id");
await insertMany("qualificacoes", qualifications, "id");
await insertMany("manutencoes", maintenances, "id");

const pendingRows = [];
for (const [companyIndex, company] of companies.entries()) {
  const companyDocuments = documents.filter((item) => item.empresa_id === company.id);
  const owner = authUsers[companyIndex * 5].id;
  for (let index = 0; index < 50; index += 1) {
    pendingRows.push({
      empresa_id: company.id,
      modulo: "documentos",
      registro_id: companyDocuments[index % companyDocuments.length].id,
      tipo: "evidencia",
      titulo: `Pendência carga ${companyIndex + 1}-${index + 1}`,
      prazo: date(7),
      responsavel_id: owner,
      created_by: owner,
    });
  }
}
await insertMany("pendencias", pendingRows, "id");

const firstCompany = companies[0];
const firstUser = authUsers[0];
const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const started = Date.now();
const { error: loginError } = await userClient.auth.signInWithPassword({ email: firstUser.email, password });
const metrics = {
  login_ms: Date.now() - started,
  unit_selector_ms: null,
  dashboard_ms: null,
  documents_ms: null,
  search_ms: null,
  assistant_context_ms: null,
};
if (loginError) throw new Error(`LOAD_LOGIN_FAILED:${loginError.message}`);
const firstCompanyUnit = unitsByCompany.get(firstCompany.id)[0];
metrics.unit_selector_ms = await measureMany(() => userClient.rpc("api_listar_unidades", {
  p_empresa_id: firstCompany.id,
}));
metrics.dashboard_ms = await measureMany(() => userClient.rpc("api_dashboard_unidade", {
  p_empresa_id: firstCompany.id,
  p_unidade_id: firstCompanyUnit.id,
}));
metrics.documents_ms = await measureMany(() => userClient.from("documentos").select("id").eq("empresa_id", firstCompany.id).limit(100));
metrics.search_ms = await measureMany(() => userClient.from("documentos").select("id, nome").eq("empresa_id", firstCompany.id).ilike("nome", "%carga%").limit(50));
metrics.assistant_context_ms = await measureMany(() => userClient.rpc("api_assistente_contexto_unidade", {
  p_empresa_id: firstCompany.id,
  p_unidade_id: firstCompanyUnit.id,
  p_pergunta: "Quais itens exigem atenção?",
  p_equipamento_id: null,
  p_setor: null,
}));

mkdirSync("artifacts/validation/performance", { recursive: true });
writeFileSync("artifacts/validation/performance/load.json", JSON.stringify({
  generated_at: new Date().toISOString(),
  environment: "local",
  counts: { companies: 20, units: 60, users: 100, documents: 1000, equipment: 500, calibrations: 1000, qualifications: 500, maintenances: 1000, pending: 1000 },
  metrics_ms: metrics,
}, null, 2));
console.log("VALIDATION_CONTROLLED_LOAD_CREATED companies=20 users=100 documents=1000 equipment=500 calibrations=1000 qualifications=500 maintenances=1000 pending=1000");

async function measureMany(operation, runs = 25) {
  const samples = [];
  let errors = 0;
  for (let index = 0; index < runs; index += 1) {
    const startedAt = performance.now();
    const { error } = await operation();
    samples.push(performance.now() - startedAt);
    if (error) errors++;
  }
  if (errors > 0) throw new Error(`LOAD_QUERY_FAILED:error_count=${errors}`);
  samples.sort((a, b) => a - b);
  const percentile = (value) =>
    Math.round(samples[Math.min(samples.length - 1, Math.ceil(value * samples.length) - 1)] * 100) /
    100;
  return {
    samples: samples.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    error_count: errors,
  };
}
