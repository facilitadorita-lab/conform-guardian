#!/usr/bin/env node

/**
 * Read-only smoke test for the deployed Supabase REST contracts.
 * Responses and credentials are intentionally not printed.
 */
const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("STAGING_SMOKE_BLOCKED");
  console.error("- A URL e a chave protegida de homologação são obrigatórias.");
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  Accept: "application/json",
};

const requiredTables = [
  "empresas",
  "unidades",
  "usuarios_empresas",
  "documentos",
  "equipamentos",
  "manutencoes",
  "implantacoes_sistema",
];

const requiredRpcPaths = [
  "/rpc/api_listar_unidades",
  "/rpc/api_dashboard_unidade",
  "/rpc/api_listar_documentos_unidade",
  "/rpc/api_listar_equipamentos_unidade",
  "/rpc/api_listar_manutencoes_unidade",
  "/rpc/api_assistente_contexto_unidade",
];

const failures = [];

for (const table of requiredTables) {
  const endpoint = new URL(`/rest/v1/${table}`, supabaseUrl);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("limit", "1");

  try {
    const response = await fetch(endpoint, { method: "GET", headers });
    if (!response.ok)
      failures.push(`Tabela obrigatória indisponível: ${table} (${response.status}).`);
  } catch {
    failures.push(`Não foi possível consultar a tabela obrigatória: ${table}.`);
  }
}

try {
  const response = await fetch(new URL("/rest/v1/", supabaseUrl), { method: "GET", headers });
  if (!response.ok) {
    failures.push(`Contrato REST indisponível (${response.status}).`);
  } else {
    const openApi = await response.json();
    for (const rpcPath of requiredRpcPaths) {
      if (!openApi.paths?.[rpcPath]) failures.push(`RPC obrigatória ausente: ${rpcPath.slice(5)}.`);
    }
  }
} catch {
  failures.push("Não foi possível validar o contrato REST publicado.");
}

if (failures.length > 0) {
  console.error("STAGING_SMOKE_FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("STAGING_SMOKE_OK");
