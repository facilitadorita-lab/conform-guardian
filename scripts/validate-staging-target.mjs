#!/usr/bin/env node

/**
 * Fail-closed guard for the remote homologation deployment.
 * It never prints credentials or the target project reference.
 */
const PRODUCTION_PROJECT_REF = "tvtpxgzwhakpypjdzphe";

const confirmation = (process.env.CONFIRM_STAGING_DEPLOY ?? "").trim();
const testEnvironment = (process.env.CONFORM_TEST_ENV ?? "").trim().toLowerCase();
const supabaseEnvironment = (process.env.SUPABASE_ENVIRONMENT ?? "").trim().toLowerCase();
const allowRemoteTests = process.env.CONFORM_ALLOW_REMOTE_TESTS === "1";
const stripeMode = (process.env.STRIPE_MODE ?? "").trim().toLowerCase();
const projectRef = (process.env.PROJECT_ID ?? "").trim().toLowerCase();
const supabaseUrl = (process.env.SUPABASE_URL ?? "").trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const databasePassword = process.env.SUPABASE_DB_PASSWORD ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const failures = [];

if (confirmation !== "HOMOLOGAR") {
  failures.push("A confirmação manual de homologação não foi informada corretamente.");
}
if (testEnvironment !== "staging" || supabaseEnvironment !== "staging") {
  failures.push("O ambiente deve estar explicitamente definido como staging.");
}
if (!allowRemoteTests) {
  failures.push("A validação remota de homologação não foi autorizada explicitamente.");
}
if (stripeMode !== "test") {
  failures.push("A homologação deve usar exclusivamente o Stripe em modo de teste.");
}
if (!/^[a-z0-9]{20}$/.test(projectRef)) {
  failures.push("A referência do projeto Supabase de homologação é inválida.");
}
if (projectRef === PRODUCTION_PROJECT_REF) {
  failures.push("O projeto Supabase de produção foi bloqueado neste fluxo.");
}
if (!accessToken || !databasePassword || !serviceRoleKey) {
  failures.push("As credenciais protegidas obrigatórias de homologação não estão configuradas.");
}

if (!supabaseUrl) {
  failures.push("A URL do Supabase de homologação não está configurada.");
} else {
  try {
    const url = new URL(supabaseUrl);
    const expectedHostname = `${projectRef}.supabase.co`;

    if (url.protocol !== "https:") {
      failures.push("A URL de homologação deve usar HTTPS.");
    }
    if (url.hostname !== expectedHostname) {
      failures.push("A URL e a referência do projeto Supabase não correspondem.");
    }
    if (url.hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`) {
      failures.push("A URL do Supabase de produção foi bloqueada neste fluxo.");
    }
    if (url.pathname !== "/" || url.search || url.hash) {
      failures.push("A URL do Supabase deve conter somente a origem do projeto.");
    }
  } catch {
    failures.push("A URL do Supabase de homologação é inválida.");
  }
}

if (failures.length > 0) {
  console.error("STAGING_TARGET_BLOCKED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("STAGING_TARGET_OK");
