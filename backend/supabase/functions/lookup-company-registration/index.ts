import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2"
import { isValidCnpj, normalizeCnpj } from "./cnpj.ts"
import {
  CompanyRegistrationProviderError,
  type CompanyRegistrationProvider,
  type NormalizedCompanyRegistration,
} from "./provider.ts"
import { BrasilApiCompanyRegistrationProvider } from "./providers/brasil-api.ts"

type JsonObject = Record<string, unknown>

interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset_at: string
}

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }

Deno.serve(async (request: Request) => {
  const cors = corsHeaders(request)
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })
  if (request.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405, cors)

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > 16 * 1024) return respond({ error: "REQUEST_TOO_LARGE" }, 413, cors)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const authorization = request.headers.get("authorization") ?? ""

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return respond({ error: "UNAUTHORIZED" }, 401, cors)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return respond({ error: "UNAUTHORIZED" }, 401, cors)

  let input: JsonObject
  try {
    input = await request.json() as JsonObject
  } catch {
    return respond({ error: "INVALID_REQUEST" }, 400, cors)
  }

  const cnpj = normalizeCnpj(input.cnpj)
  if (!isValidCnpj(cnpj)) return respond({ error: "INVALID_CNPJ" }, 422, cors)

  const rateLimit = await enforceRateLimits(
    adminClient,
    request,
    authData.user.id,
    Deno.env.get("CNPJ_LOOKUP_RATE_LIMIT_SALT") ?? serviceRoleKey,
  )
  if (!rateLimit.ok) {
    return respond(
      { error: rateLimit.error },
      rateLimit.status,
      { ...cors, ...(rateLimit.retryAfter ? { "retry-after": rateLimit.retryAfter } : {}) },
    )
  }

  try {
    const { data: existingCompany, error: companyError } = await adminClient
      .from("empresas")
      .select("id")
      .eq("cnpj_normalizado", cnpj)
      .is("deleted_at", null)
      .maybeSingle()

    if (companyError) throw new Error("COMPANY_AVAILABILITY_CHECK_FAILED")
    if (existingCompany) {
      await writeAudit(adminClient, authData.user.id, cnpj, "not_called", false, "already_registered")
      return respond({
        data: null,
        provider: null,
        cache_hit: false,
        checked_at: new Date().toISOString(),
        company_exists: true,
        registration_active: null,
        can_create: false,
        availability: "already_registered",
      }, 200, cors)
    }

    const provider = createProvider()
    const cacheTtlHours = boundedInteger(Deno.env.get("CNPJ_CACHE_TTL_HOURS"), 168, 1, 720)
    const cached = await readCache(adminClient, cnpj, provider.name)
    const registration = cached?.data ?? await provider.lookup(cnpj)
    const cacheHit = Boolean(cached)

    if (!cacheHit) await writeCache(adminClient, registration, provider.name, cacheTtlHours)
    const registrationActive = normalizeStatus(registration.registration_status) === "ATIVA"
    const availability = registrationActive ? "available" : "registration_not_active"

    await writeAudit(adminClient, authData.user.id, cnpj, provider.name, cacheHit, availability)

    return respond({
      data: registration,
      provider: provider.name,
      cache_hit: cacheHit,
      checked_at: new Date().toISOString(),
      company_exists: false,
      registration_active: registrationActive,
      can_create: availability === "available",
      availability,
    }, 200, cors)
  } catch (error) {
    if (error instanceof CompanyRegistrationProviderError) {
      return respond({ error: error.code }, error.status, cors)
    }

    console.error("company_registration_lookup_failed", safeErrorCode(error))
    return respond({ error: "LOOKUP_UNAVAILABLE" }, 503, cors)
  }
})

function createProvider(): CompanyRegistrationProvider {
  const providerName = (Deno.env.get("CNPJ_PROVIDER") ?? "brasilapi").toLowerCase()
  const timeoutMs = boundedInteger(Deno.env.get("CNPJ_PROVIDER_TIMEOUT_MS"), 8_000, 2_000, 15_000)

  if (providerName === "brasilapi") {
    return new BrasilApiCompanyRegistrationProvider(
      Deno.env.get("CNPJ_PROVIDER_BASE_URL") ?? "https://brasilapi.com.br/api",
      timeoutMs,
    )
  }

  throw new CompanyRegistrationProviderError("PROVIDER_UNAVAILABLE", 503)
}

async function enforceRateLimits(
  adminClient: SupabaseClient,
  request: Request,
  userId: string,
  rateLimitSalt: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number; retryAfter?: string }> {
  const windowSeconds = 10 * 60
  const scopes: Array<{ value: string; limit: number }> = [{ value: `user:${userId}`, limit: 12 }]
  const clientIp = getClientIp(request)

  if (clientIp) {
    scopes.push({ value: `ip:${await sha256(`${rateLimitSalt}|${clientIp}`)}`, limit: 40 })
  }

  for (const scope of scopes) {
    const { data, error } = await adminClient.rpc("consume_company_registration_lookup_limit", {
      p_scope: scope.value,
      p_limit: scope.limit,
      p_window_seconds: windowSeconds,
    })

    if (error) return { ok: false, error: "RATE_LIMIT_UNAVAILABLE", status: 503 }
    const result = data as RateLimitResult
    if (!result?.allowed) {
      const resetAt = Date.parse(result?.reset_at ?? "")
      const retryAfter = Number.isFinite(resetAt)
        ? String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)))
        : String(windowSeconds)
      return { ok: false, error: "RATE_LIMIT_EXCEEDED", status: 429, retryAfter }
    }
  }

  return { ok: true }
}

async function readCache(
  adminClient: SupabaseClient,
  cnpj: string,
  provider: string,
): Promise<{ data: NormalizedCompanyRegistration } | null> {
  const { data, error } = await adminClient
    .from("cache_consultas_cnpj")
    .select("dados_normalizados")
    .eq("cnpj_normalizado", cnpj)
    .eq("provedor", provider)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle()

  if (error) throw new Error("CACHE_READ_FAILED")
  if (!data?.dados_normalizados) return null
  return { data: data.dados_normalizados as NormalizedCompanyRegistration }
}

async function writeCache(
  adminClient: SupabaseClient,
  registration: NormalizedCompanyRegistration,
  provider: string,
  ttlHours: number,
): Promise<void> {
  const now = new Date()
  const serialized = JSON.stringify(registration)
  const { error } = await adminClient.from("cache_consultas_cnpj").upsert({
    cnpj_normalizado: registration.cnpj,
    provedor: provider,
    dados_normalizados: registration,
    response_fingerprint: await sha256(serialized),
    consultado_em: now.toISOString(),
    expira_em: new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: "cnpj_normalizado" })

  if (error) throw new Error("CACHE_WRITE_FAILED")
}

async function writeAudit(
  adminClient: SupabaseClient,
  userId: string,
  cnpj: string,
  provider: string,
  cacheHit: boolean,
  availability: string,
): Promise<void> {
  const { error } = await adminClient.from("logs_auditoria").insert({
    usuario_id: userId,
    modulo: "cadastro_empresa",
    acao: "consulta_cnpj",
    novo_valor: {
      cnpj_fingerprint: await sha256(cnpj),
      provider,
      cache_hit: cacheHit,
      availability,
    },
  })

  if (error) console.error("company_registration_audit_failed", error.code ?? "unknown")
}

function corsHeaders(request: Request): Record<string, string> {
  const requestOrigin = request.headers.get("origin") ?? ""
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const allowedOrigin = configured.length === 0
    ? "*"
    : configured.includes(requestOrigin)
      ? requestOrigin
      : configured[0]

  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  }
}

function respond(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, ...jsonHeaders } })
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("cf-connecting-ip")?.trim() || null
}

function normalizeStatus(value: string | null): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase()
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

function safeErrorCode(error: unknown): string {
  return error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "unknown"
}
