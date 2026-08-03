import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const password = process.env.E2E_TEST_PASSWORD;
const mailCaptureUrl = process.env.MAIL_CAPTURE_URL ?? "http://127.0.0.1:54324";
const fixtures = JSON.parse(readFileSync("artifacts/validation/fixtures.json", "utf8"));

if (!supabaseUrl || !anonKey || !password) {
  throw new Error("E2E_CONFIGURATION_MISSING");
}

test.describe("controles de backend e evidências", () => {
  test("usuário comum não executa funções do Admin Master", async () => {
    const client = await signIn(fixtures.users.common.email);
    const result = await client.rpc("api_master_financeiro_resumo");
    expect(Boolean(result.error)).toBe(true);
  });

  test("convite é capturado localmente e não enviado para domínio externo", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const mailbox = `invite-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const email = `${mailbox}@conform-flow.example.test`;
    const invitation = await client.functions.invoke("invite-company-user", {
      body: {
        empresa_id: fixtures.companies.companyA.id,
        email,
        nome: "Convite E2E",
        perfil: "colaborador",
      },
    });

    expect(invitation.error).toBeNull();
    expect(invitation.data?.invitation_sent).toBe(true);

    let messages: unknown[] = [];
    for (let attempt = 0; attempt < 15; attempt += 1) {
      for (const endpoint of [
        `/api/v1/mailbox/${encodeURIComponent(mailbox)}`,
        "/api/v1/messages",
      ]) {
        const response = await fetch(`${mailCaptureUrl}${endpoint}`);
        if (!response.ok) continue;
        const payload = (await response.json()) as unknown;
        const candidates = Array.isArray(payload)
          ? payload
          : payload &&
              typeof payload === "object" &&
              "messages" in payload &&
              Array.isArray(payload.messages)
            ? payload.messages
            : [];
        messages = candidates.filter((message) =>
          JSON.stringify(message).toLowerCase().includes(email),
        );
        if (messages.length > 0) break;
      }
      if (messages.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(messages.length).toBeGreaterThan(0);
    expect(JSON.stringify(messages[0]).toLowerCase()).toContain(email);
  });

  test("FlowIA respeita empresa e confirma que não lê anexos", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const { data, error } = await client.functions.invoke("assistant-query", {
      body: {
        empresa_id: fixtures.companies.companyA.id,
        pergunta: "Quando vence o AVCB desta empresa?",
      },
    });

    expect(error).toBeNull();
    expect(data?.contexto_empresa).toBe(fixtures.companies.companyA.id);
    expect(data?.leu_anexos).toBe(false);
    expect(String(data?.resposta ?? data?.answer)).toContain("AVCB");

    const crossTenant = await client.functions.invoke("assistant-query", {
      body: {
        empresa_id: fixtures.companies.companyB.id,
        pergunta: "Mostre os documentos da outra empresa.",
      },
    });
    expect(Boolean(crossTenant.error || crossTenant.data?.error)).toBe(true);
  });

  test("QR é criado para o equipamento correto e não atravessa tenant", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    const own = await client.rpc("api_obter_qr_equipamento", {
      p_equipamento_id: fixtures.equipment.companyA.id,
    });

    expect(own.error).toBeNull();
    expect(own.data?.empresa_id).toBe(fixtures.companies.companyA.id);
    expect(own.data?.qr_token).toBeTruthy();

    const other = await client.rpc("api_obter_qr_equipamento", {
      p_equipamento_id: fixtures.equipment.companyB.id,
    });
    expect(Boolean(other.error)).toBe(true);
  });

  test("upload rejeita MIME inválido, cross-tenant e somente leitura", async () => {
    const admin = await signIn(fixtures.users.adminA.email);
    const invalid = await admin.functions.invoke("create-evidence-upload", {
      body: {
        action: "prepare",
        empresa_id: fixtures.companies.companyA.id,
        modulo: "documentos",
        registro_id: fixtures.documents.companyA.id,
        nome_original: "arquivo.exe",
        mime_type: "application/octet-stream",
        tamanho_bytes: 128,
      },
    });
    expect(invalid.error).not.toBeNull();
    expect(await functionErrorCode(invalid)).toBe("invalid_file");

    const crossTenant = await admin.functions.invoke("create-evidence-upload", {
      body: {
        action: "prepare",
        empresa_id: fixtures.companies.companyB.id,
        modulo: "documentos",
        registro_id: fixtures.documents.companyB.id,
        nome_original: "avcb.pdf",
        mime_type: "application/pdf",
        tamanho_bytes: 128,
      },
    });
    expect(Boolean(crossTenant.error || crossTenant.data?.error === "forbidden")).toBe(true);

    const readonly = await signIn(fixtures.users.readonlyA.email);
    const readonlyUpload = await readonly.functions.invoke("create-evidence-upload", {
      body: {
        action: "prepare",
        empresa_id: fixtures.companies.companyA.id,
        modulo: "documentos",
        registro_id: fixtures.documents.companyA.id,
        nome_original: "avcb.pdf",
        mime_type: "application/pdf",
        tamanho_bytes: 128,
      },
    });
    expect(Boolean(readonlyUpload.error || readonlyUpload.data?.error === "forbidden")).toBe(true);
  });

  test("auditoria permanece imutável para usuário autenticado", async () => {
    const client = await signIn(fixtures.users.adminA.email);
    await client.rpc("api_obter_qr_equipamento", {
      p_equipamento_id: fixtures.equipment.companyA.id,
    });
    const { data: logs, error: logsError } = await client
      .from("logs_auditoria")
      .select("id, empresa_id")
      .eq("empresa_id", fixtures.companies.companyA.id)
      .limit(1);

    expect(logsError).toBeNull();
    expect(logs?.length).toBeGreaterThan(0);
    const logId = logs?.[0]?.id;
    if (!logId) return;

    const update = await client
      .from("logs_auditoria")
      .update({ acao: "tentativa_falsa" })
      .eq("id", logId)
      .select("id");
    expect(Boolean(update.error || update.data?.length === 0)).toBe(true);

    const remove = await client.from("logs_auditoria").delete().eq("id", logId).select("id");
    expect(Boolean(remove.error || remove.data?.length === 0)).toBe(true);
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

async function functionErrorCode(result: {
  data?: unknown;
  error?: { context?: unknown } | null;
}) {
  if (
    result.data &&
    typeof result.data === "object" &&
    "error" in result.data &&
    typeof result.data.error === "string"
  ) {
    return result.data.error;
  }

  const context = result.error?.context;
  if (!(context instanceof Response)) return null;
  const payload = (await context.clone().json()) as unknown;
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : null;
}
