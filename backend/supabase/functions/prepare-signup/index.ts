import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2";
import { isValidCnpj, normalizeCnpj } from "../lookup-company-registration/cnpj.ts";
import {
  CompanyRegistrationProviderError,
  type NormalizedCompanyRegistration,
} from "../lookup-company-registration/provider.ts";
import { BrasilApiCompanyRegistrationProvider } from "../lookup-company-registration/providers/brasil-api.ts";

type JsonObject = Record<string, unknown>;

interface PrepareSignupInput {
  plan_code?: unknown;
  billing_interval?: unknown;
  responsible?: unknown;
  company?: unknown;
  terms?: unknown;
  turnstile_token?: unknown;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors);
  if (Number(request.headers.get("content-length") ?? 0) > 24 * 1024) {
    return respond({ error: "REQUEST_TOO_LARGE" }, 413, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond({ error: "SERVICE_UNAVAILABLE" }, 503, cors);

  let input: PrepareSignupInput;
  try {
    input = (await request.json()) as PrepareSignupInput;
  } catch {
    return respond({ error: "INVALID_REQUEST" }, 400, cors);
  }

  const parsed = parseInput(input);
  if (!parsed.ok) return respond({ error: parsed.error }, 422, cors);

  const turnstile = await verifyTurnstile(input.turnstile_token, request);
  if (!turnstile.ok) return respond({ error: turnstile.error }, 422, cors);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rateLimit = await enforceRateLimit(admin, request, parsed.value.email);
  if (!rateLimit.ok) {
    return respond({ error: rateLimit.error }, rateLimit.status, {
      ...cors,
      ...(rateLimit.retryAfter ? { "retry-after": rateLimit.retryAfter } : {}),
    });
  }

  try {
    const now = new Date().toISOString();
    const [
      { data: existingCompany, error: companyError },
      { data: pendingSignup, error: pendingError },
    ] = await Promise.all([
      admin
        .from("empresas")
        .select("id")
        .eq("cnpj_normalizado", parsed.value.cnpj)
        .is("deleted_at", null)
        .maybeSingle(),
      admin
        .from("sessoes_contratacao")
        .select("id")
        .eq("cnpj_normalizado", parsed.value.cnpj)
        .in("status", [
          "pre_analisada",
          "checkout_pendente",
          "pagamento_confirmado",
          "email_pendente",
        ])
        .gt("expira_em", now)
        .limit(1)
        .maybeSingle(),
    ]);

    if (companyError || pendingError) throw new Error("PREANALYSIS_AVAILABILITY_FAILED");
    if (existingCompany) return respond({ error: "COMPANY_ALREADY_REGISTERED" }, 409, cors);
    if (pendingSignup) return respond({ error: "SIGNUP_ALREADY_IN_PROGRESS" }, 409, cors);

    const [
      { data: plan, error: planError },
      { data: commercialConfig, error: commercialConfigError },
    ] = await Promise.all([
      admin
        .from("planos")
        .select(
          "id, codigo, nome, descricao, valor_mensal_centavos, valor_anual_centavos, moeda, limite_usuarios, limite_unidades, limite_documentos, limite_equipamentos, limite_storage_mb, recursos, stripe_monthly_price_id, stripe_yearly_price_id",
        )
        .eq("codigo", parsed.value.planCode)
        .eq("ativo", true)
        .eq("disponivel_venda", true)
        .maybeSingle(),
      admin
        .from("configuracoes_comerciais")
        .select("termos_versao, politica_privacidade_versao")
        .eq("id", true)
        .maybeSingle(),
    ]);

    if (planError) throw new Error("PLAN_LOOKUP_FAILED");
    if (!plan) return respond({ error: "PLAN_NOT_AVAILABLE" }, 422, cors);
    if (commercialConfigError || !commercialConfig) {
      throw new Error("COMMERCIAL_CONFIGURATION_LOOKUP_FAILED");
    }
    if (
      parsed.value.termsVersion !== commercialConfig.termos_versao ||
      parsed.value.privacyVersion !== commercialConfig.politica_privacidade_versao
    ) {
      return respond({ error: "LEGAL_TERMS_OUTDATED" }, 409, cors);
    }

    const priceId =
      parsed.value.interval === "yearly"
        ? plan.stripe_yearly_price_id
        : plan.stripe_monthly_price_id;
    const priceCents =
      parsed.value.interval === "yearly" ? plan.valor_anual_centavos : plan.valor_mensal_centavos;

    if (!priceId || priceCents === null || priceCents === undefined) {
      return respond({ error: "PLAN_PAYMENT_NOT_CONFIGURED" }, 503, cors);
    }

    const registration = await lookupRegistration(admin, parsed.value.cnpj);
    const registrationActive = normalizeStatus(registration.data.registration_status) === "ATIVA";
    if (!registrationActive) {
      return respond(
        {
          error: "REGISTRATION_NOT_ACTIVE",
          registration_status: registration.data.registration_status,
        },
        422,
        cors,
      );
    }

    const rawToken = randomToken();
    const tokenHash = await sha256(rawToken);
    const responsible = {
      nome: parsed.value.name,
      email: parsed.value.email,
      telefone: parsed.value.phone,
      cargo: parsed.value.role,
      departamento: parsed.value.department,
      relacao: parsed.value.relationship,
    };
    const company = {
      cnpj: parsed.value.cnpj,
      nome_fantasia: parsed.value.tradeName,
      tipo_estabelecimento: parsed.value.establishmentType,
      segmento: parsed.value.segment,
    };
    const risk = analyzeRisk(registration.data, parsed.value.email, parsed.value.relationship);
    const preAnalysis = {
      approved: true,
      risk_level: risk.level,
      reasons: risk.reasons,
      provider: registration.provider,
      cache_hit: registration.cacheHit,
      checked_at: new Date().toISOString(),
      company_exists: false,
      registration_active: true,
    };
    const limits = {
      usuarios: plan.limite_usuarios,
      unidades: plan.limite_unidades,
      documentos: plan.limite_documentos,
      equipamentos: plan.limite_equipamentos,
      storage_mb: plan.limite_storage_mb,
    };
    const snapshotCore = {
      plan_id: plan.id,
      plan_code: plan.codigo,
      plan_name: plan.nome,
      interval: parsed.value.interval,
      price_cents: priceCents,
      currency: plan.moeda,
      stripe_price_id: priceId,
      limits,
      features: plan.recursos,
      responsible,
      company,
      registration: registration.data,
      terms_version: parsed.value.termsVersion,
      privacy_version: parsed.value.privacyVersion,
    };

    const { data: session, error: sessionError } = await admin
      .from("sessoes_contratacao")
      .insert({
        token_hash: tokenHash,
        plano_id: plan.id,
        periodicidade: parsed.value.interval,
        cnpj_normalizado: parsed.value.cnpj,
        email_responsavel: parsed.value.email,
        responsavel_json: responsible,
        empresa_informada_json: company,
        consulta_cnpj_json: registration.data,
        pre_analise_json: preAnalysis,
        termos_aceitos: true,
        termos_versao: parsed.value.termsVersion,
        politica_privacidade_versao: parsed.value.privacyVersion,
      })
      .select("id, expira_em")
      .single();

    if (sessionError || !session) throw new Error("SIGNUP_SESSION_CREATE_FAILED");

    const { error: snapshotError } = await admin.from("fotografias_contratacao").insert({
      sessao_contratacao_id: session.id,
      versao: 1,
      plano_id: plan.id,
      plano_codigo: plan.codigo,
      plano_nome: plan.nome,
      periodicidade: parsed.value.interval,
      valor_centavos: priceCents,
      moeda: plan.moeda,
      stripe_price_id: priceId,
      limites_json: limits,
      recursos_json: plan.recursos,
      responsavel_json: responsible,
      empresa_json: company,
      consulta_cnpj_json: registration.data,
      termos_versao: parsed.value.termsVersion,
      politica_privacidade_versao: parsed.value.privacyVersion,
      fotografia_hash: await sha256(JSON.stringify(snapshotCore)),
    });

    if (snapshotError) {
      await admin.from("sessoes_contratacao").update({ status: "cancelada" }).eq("id", session.id);
      throw new Error("CONTRACT_SNAPSHOT_CREATE_FAILED");
    }

    await admin.from("eventos_contratacao").insert({
      sessao_contratacao_id: session.id,
      tipo: "pre_analise_aprovada",
      status_novo: "pre_analisada",
      origem: "edge_function",
      metadata_json: { provider: registration.provider, cache_hit: registration.cacheHit },
    });

    return respond(
      {
        session_id: session.id,
        session_token: rawToken,
        expires_at: session.expira_em,
        status: "pre_analisada",
        pre_analysis: preAnalysis,
        plan: {
          code: plan.codigo,
          name: plan.nome,
          billing_interval: parsed.value.interval,
          price_cents: priceCents,
          currency: plan.moeda,
          limits,
          features: plan.recursos,
        },
        company: {
          cnpj: registration.data.cnpj,
          legal_name: registration.data.legal_name,
          trade_name: registration.data.trade_name,
          registration_status: registration.data.registration_status,
        },
      },
      201,
      cors,
    );
  } catch (error) {
    if (error instanceof CompanyRegistrationProviderError) {
      return respond({ error: error.code }, error.status, cors);
    }
    console.error("prepare_signup_failed", safeErrorCode(error));
    return respond({ error: "PREANALYSIS_UNAVAILABLE" }, 503, cors);
  }
});

function parseInput(input: PrepareSignupInput) {
  const responsible = isObject(input.responsible) ? input.responsible : {};
  const company = isObject(input.company) ? input.company : {};
  const terms = isObject(input.terms) ? input.terms : {};
  const planCode = text(input.plan_code).toLowerCase();
  const interval = text(input.billing_interval);
  const cnpj = normalizeCnpj(company.cnpj);
  const email = text(responsible.email).toLowerCase();
  const name = text(responsible.name);
  const role = text(responsible.role);
  const relationship = text(responsible.relationship) || "administrador";
  const accepted = terms.accepted === true;
  const termsVersion = text(terms.terms_version);
  const privacyVersion = text(terms.privacy_version);

  if (!/^[a-z0-9-]{2,40}$/.test(planCode)) return { ok: false as const, error: "INVALID_PLAN" };
  if (interval !== "monthly" && interval !== "yearly")
    return { ok: false as const, error: "INVALID_BILLING_INTERVAL" };
  if (!isValidCnpj(cnpj)) return { ok: false as const, error: "INVALID_CNPJ" };
  if (name.length < 3 || name.length > 160)
    return { ok: false as const, error: "INVALID_RESPONSIBLE_NAME" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false as const, error: "INVALID_EMAIL" };
  }
  if (!role || role.length > 120) return { ok: false as const, error: "INVALID_RESPONSIBLE_ROLE" };
  if (!accepted || !termsVersion || !privacyVersion)
    return { ok: false as const, error: "TERMS_REQUIRED" };
  if (
    ![
      "socio",
      "administrador",
      "responsavel_tecnico",
      "diretor",
      "gerente",
      "colaborador_autorizado",
      "consultor",
      "outro",
    ].includes(relationship)
  ) {
    return { ok: false as const, error: "INVALID_RESPONSIBLE_RELATIONSHIP" };
  }

  return {
    ok: true as const,
    value: {
      planCode,
      interval: interval as "monthly" | "yearly",
      cnpj,
      email,
      name,
      role,
      relationship,
      phone: optionalText(responsible.phone, 30),
      department: optionalText(responsible.department, 120),
      tradeName: optionalText(company.trade_name, 200),
      establishmentType: optionalText(company.establishment_type, 120),
      segment: optionalText(company.segment, 120),
      termsVersion,
      privacyVersion,
    },
  };
}

async function lookupRegistration(admin: SupabaseClient, cnpj: string) {
  const provider = new BrasilApiCompanyRegistrationProvider(
    Deno.env.get("CNPJ_PROVIDER_BASE_URL") ?? "https://brasilapi.com.br/api",
    boundedInteger(Deno.env.get("CNPJ_PROVIDER_TIMEOUT_MS"), 8_000, 2_000, 15_000),
  );
  const { data: cached, error } = await admin
    .from("cache_consultas_cnpj")
    .select("dados_normalizados")
    .eq("cnpj_normalizado", cnpj)
    .eq("provedor", provider.name)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error("CACHE_READ_FAILED");
  if (cached?.dados_normalizados) {
    return {
      data: cached.dados_normalizados as NormalizedCompanyRegistration,
      provider: provider.name,
      cacheHit: true,
    };
  }

  const registration = await provider.lookup(cnpj);
  const now = new Date();
  const { error: writeError } = await admin.from("cache_consultas_cnpj").upsert(
    {
      cnpj_normalizado: cnpj,
      provedor: provider.name,
      dados_normalizados: registration,
      response_fingerprint: await sha256(JSON.stringify(registration)),
      consultado_em: now.toISOString(),
      expira_em: new Date(now.getTime() + 168 * 60 * 60 * 1000).toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "cnpj_normalizado" },
  );
  if (writeError) throw new Error("CACHE_WRITE_FAILED");
  return { data: registration, provider: provider.name, cacheHit: false };
}

async function enforceRateLimit(admin: SupabaseClient, request: Request, email: string) {
  const salt =
    Deno.env.get("SIGNUP_RATE_LIMIT_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ip = getClientIp(request) ?? "unknown";
  const scopes = [
    { scope: `signup:ip:${await sha256(`${salt}|${ip}`)}`, limit: 12, window: 3600 },
    { scope: `signup:email:${await sha256(`${salt}|${email}`)}`, limit: 5, window: 3600 },
  ];
  for (const item of scopes) {
    const { data, error } = await admin.rpc("consume_company_registration_lookup_limit", {
      p_scope: item.scope,
      p_limit: item.limit,
      p_window_seconds: item.window,
    });
    if (error) return { ok: false as const, error: "RATE_LIMIT_UNAVAILABLE", status: 503 };
    const result = data as { allowed?: boolean; reset_at?: string };
    if (!result?.allowed) {
      const resetAt = Date.parse(result?.reset_at ?? "");
      return {
        ok: false as const,
        error: "RATE_LIMIT_EXCEEDED",
        status: 429,
        retryAfter: Number.isFinite(resetAt)
          ? String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)))
          : "3600",
      };
    }
  }
  return { ok: true as const };
}

async function verifyTurnstile(token: unknown, request: Request) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const required = (Deno.env.get("SIGNUP_REQUIRE_TURNSTILE") ?? "false").toLowerCase() === "true";
  if (!secret)
    return required
      ? { ok: false as const, error: "ANTI_BOT_NOT_CONFIGURED" }
      : { ok: true as const };
  if (!text(token)) return { ok: false as const, error: "ANTI_BOT_REQUIRED" };

  const body = new URLSearchParams({ secret, response: text(token) });
  const ip = getClientIp(request);
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success
      ? { ok: true as const }
      : { ok: false as const, error: "ANTI_BOT_FAILED" };
  } catch {
    return { ok: false as const, error: "ANTI_BOT_UNAVAILABLE" };
  }
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const selected = allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "access-control-allow-origin": selected,
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}

function respond(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, ...jsonHeaders } });
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    null
  );
}

function normalizeStatus(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function analyzeRisk(
  registration: NormalizedCompanyRegistration,
  email: string,
  relationship: string,
) {
  const reasons: string[] = [];
  const publicDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com"];
  const emailDomain = email.split("@")[1] ?? "";
  if (publicDomains.includes(emailDomain)) reasons.push("responsible_uses_public_email");
  if (!registration.official_email) reasons.push("official_registration_email_missing");
  if (["consultor", "outro"].includes(relationship)) reasons.push("external_or_other_relationship");
  if (registration.opened_at) {
    const openedAt = Date.parse(registration.opened_at);
    if (Number.isFinite(openedAt) && openedAt > Date.now() - 90 * 24 * 60 * 60 * 1000) {
      reasons.push("company_opened_less_than_90_days_ago");
    }
  }
  return { level: reasons.length >= 2 ? "atencao" : "normal", reasons };
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function optionalText(value: unknown, maxLength: number) {
  const normalized = text(value);
  return normalized ? normalized.slice(0, maxLength) : null;
}

function safeErrorCode(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 100) : "unknown";
}
