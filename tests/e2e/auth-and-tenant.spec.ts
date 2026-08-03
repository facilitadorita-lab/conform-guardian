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

test.describe("autenticação pela interface", () => {
  // O login usa senha real de fixture; não gerar trace/vídeo que possa
  // registrar o valor digitado. Screenshots de falha continuam mascarando o
  // input do tipo password.
  test("Admin Master é direcionado ao painel global", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(fixtures.users.master.email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar na plataforma" }).click();
    await expect(page).toHaveURL(/\/master\/empresas/);
    await expect(page.getByText("Empresas", { exact: true }).first()).toBeVisible();
  });
});

test.describe("isolamento tenant no backend", () => {
  test("administrador de empresa acessa somente o próprio ambiente", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const own = await client.from("documentos").select("id, empresa_id");
    expect(own.error).toBeNull();
    expect(own.data?.length).toBeGreaterThan(0);
    expect(own.data?.every((item) => item.empresa_id === fixtures.companies.companyA.id)).toBe(
      true,
    );

    const other = await client
      .from("documentos")
      .select("id, empresa_id")
      .eq("empresa_id", fixtures.companies.companyB.id);
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);
  });

  test("somente leitura não consegue alterar registros", async () => {
    const client = await signIn(fixtures.users.readonlyA.email);
    const documentId = fixtures.documents.companyA.id;
    const result = await client
      .from("documentos")
      .update({ nome: "tentativa de alteração E2E" })
      .eq("id", documentId)
      .select("id");
    expect(result.error || result.data?.length === 0).toBeTruthy();
  });

  test("parceiro A não visualiza cliente do parceiro B", async () => {
    const client = await signIn(fixtures.users.partnerAdminA.email);
    const result = await client.from("empresas").select("id, tipo_conta, parceiro_origem_id");
    expect(result.error).toBeNull();
    const ids = new Set((result.data ?? []).map((company) => company.id));
    expect(ids.has(fixtures.companies.partnerA.id)).toBe(true);
    expect(ids.has(fixtures.companies.clientA1.id)).toBe(true);
    expect(ids.has(fixtures.companies.clientA2.id)).toBe(true);
    expect(ids.has(fixtures.companies.clientB1.id)).toBe(false);
  });

  test("cliente de parceiro não visualiza parceiro nem outro cliente", async () => {
    const client = await signIn(fixtures.users.clientA1.email);
    const result = await client.from("empresas").select("id");
    expect(result.error).toBeNull();
    const ids = new Set((result.data ?? []).map((company) => company.id));
    expect(ids.has(fixtures.companies.clientA1.id)).toBe(true);
    expect(ids.has(fixtures.companies.partnerA.id)).toBe(false);
    expect(ids.has(fixtures.companies.clientA2.id)).toBe(false);
  });
});

async function signIn(email: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return client;
}
