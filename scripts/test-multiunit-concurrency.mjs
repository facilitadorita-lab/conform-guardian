#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

await import("./validate-environment.mjs");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.E2E_TEST_PASSWORD;

if (!url || !anonKey || !serviceRoleKey || !password) {
  throw new Error("MULTIUNIT_CONCURRENCY_CONFIGURATION_MISSING");
}

const fixtures = JSON.parse(readFileSync("artifacts/validation/fixtures.json", "utf8"));
const companyId = fixtures.companies.companyA.id;
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const user = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: loginError } = await user.auth.signInWithPassword({
  email: fixtures.users.adminA.email,
  password,
});
if (loginError) throw new Error(`MULTIUNIT_CONCURRENCY_LOGIN_FAILED:${loginError.message}`);

const { data: limitRows, error: limitQueryError } = await admin
  .from("limites_acesso_empresa")
  .select("id,max_units")
  .eq("empresa_id", companyId)
  .eq("source_type", "custom")
  .order("effective_from", { ascending: false })
  .limit(1);
if (limitQueryError || !limitRows?.[0]) {
  throw new Error(`MULTIUNIT_CUSTOM_LIMIT_NOT_FOUND:${limitQueryError?.message ?? "unknown"}`);
}
const limitRow = limitRows[0];

const { error: increaseError } = await admin
  .from("limites_acesso_empresa")
  .update({ max_units: 4 })
  .eq("id", limitRow.id);
if (increaseError) throw new Error(`MULTIUNIT_LIMIT_PREPARE_FAILED:${increaseError.message}`);

const suffix = `${Date.now()}`.slice(-8);
const attempts = await Promise.all([
  user.rpc("api_criar_unidade", {
    p_empresa_id: companyId,
    p_payload: {
      codigo: `CONC-A-${suffix}`,
      nome: `Concorrência A ${suffix}`,
      status: "ativa",
    },
  }),
  user.rpc("api_criar_unidade", {
    p_empresa_id: companyId,
    p_payload: {
      codigo: `CONC-B-${suffix}`,
      nome: `Concorrência B ${suffix}`,
      status: "ativa",
    },
  }),
]);

const successes = attempts.filter((attempt) => !attempt.error && attempt.data?.id);
const failures = attempts.filter((attempt) => attempt.error);
const { count, error: countError } = await admin
  .from("unidades")
  .select("id", { head: true, count: "exact" })
  .eq("empresa_id", companyId)
  .in("status", ["ativa", "inativa", "em_implantacao"])
  .is("deleted_at", null);

if (countError) throw new Error(`MULTIUNIT_CONCURRENCY_COUNT_FAILED:${countError.message}`);
if (successes.length !== 1 || failures.length !== 1 || count !== 4) {
  throw new Error(
    `MULTIUNIT_CONCURRENCY_FAILED:success=${successes.length}:failed=${failures.length}:count=${count}`,
  );
}
if (!String(failures[0].error?.message ?? "").includes("UNIT_LIMIT_REACHED")) {
  throw new Error(`MULTIUNIT_CONCURRENCY_WRONG_ERROR:${failures[0].error?.message ?? "unknown"}`);
}

const createdUnitId = successes[0].data.id;
const archive = await user.rpc("api_alterar_status_unidade", {
  p_empresa_id: companyId,
  p_unidade_id: createdUnitId,
  p_status: "arquivada",
  p_motivo: "Limpeza lógica após teste de concorrência",
});
if (archive.error) throw new Error(`MULTIUNIT_CONCURRENCY_ARCHIVE_FAILED:${archive.error.message}`);

const { error: restoreError } = await admin
  .from("limites_acesso_empresa")
  .update({ max_units: limitRow.max_units })
  .eq("id", limitRow.id);
if (restoreError) throw new Error(`MULTIUNIT_LIMIT_RESTORE_FAILED:${restoreError.message}`);

mkdirSync("artifacts/validation/rls", { recursive: true });
writeFileSync(
  "artifacts/validation/rls/multiunit-concurrency.json",
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      environment: "local",
      company_id: companyId,
      initial_limit: limitRow.max_units,
      temporary_limit: 4,
      attempts: 2,
      successful_creations: successes.length,
      rejected_creations: failures.length,
      final_consuming_units_during_test: count,
      cleanup: "created unit archived; original limit restored",
    },
    null,
    2,
  ),
);

console.log("MULTIUNIT_CONCURRENCY_PASS success=1 rejected=1 consuming_units=4");
