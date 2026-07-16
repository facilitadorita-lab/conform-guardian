import {
  CompanyRegistrationProviderError,
  type CompanyRegistrationProvider,
  type NormalizedCompanyRegistration,
} from "../provider.ts"

type JsonObject = Record<string, unknown>

export class BrasilApiCompanyRegistrationProvider implements CompanyRegistrationProvider {
  readonly name = "brasilapi"

  constructor(
    private readonly baseUrl = "https://brasilapi.com.br/api",
    private readonly timeoutMs = 8_000,
  ) {}

  async lookup(cnpj: string): Promise<NormalizedCompanyRegistration> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/cnpj/v1/${cnpj}`, {
        method: "GET",
        headers: { accept: "application/json", "user-agent": "ConformFlow/1.0" },
        signal: controller.signal,
      })

      if (response.status === 404) {
        throw new CompanyRegistrationProviderError("REGISTRATION_NOT_FOUND", 404)
      }
      if (response.status === 429) {
        throw new CompanyRegistrationProviderError("PROVIDER_RATE_LIMITED", 503)
      }
      if (!response.ok) {
        throw new CompanyRegistrationProviderError("PROVIDER_UNAVAILABLE", 503)
      }

      const payload = await response.json() as JsonObject
      return normalizeBrasilApiResponse(payload, cnpj)
    } catch (error) {
      if (error instanceof CompanyRegistrationProviderError) throw error
      throw new CompanyRegistrationProviderError("PROVIDER_UNAVAILABLE", 503)
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

function normalizeBrasilApiResponse(payload: JsonObject, requestedCnpj: string): NormalizedCompanyRegistration {
  const legalName = text(payload.razao_social)
  const returnedCnpj = digits(payload.cnpj)

  if (!legalName || returnedCnpj !== requestedCnpj) {
    throw new CompanyRegistrationProviderError("PROVIDER_INVALID_RESPONSE", 502)
  }

  const secondaryActivities = Array.isArray(payload.cnaes_secundarios)
    ? payload.cnaes_secundarios
        .filter(isObject)
        .slice(0, 50)
        .map((activity) => ({
          code: text(activity.codigo),
          description: text(activity.descricao),
        }))
    : []

  return {
    cnpj: returnedCnpj,
    legal_name: legalName,
    trade_name: text(payload.nome_fantasia),
    registration_status: text(payload.descricao_situacao_cadastral),
    registration_status_date: text(payload.data_situacao_cadastral),
    opened_at: text(payload.data_inicio_atividade),
    headquarters_or_branch: text(payload.descricao_identificador_matriz_filial),
    legal_nature: text(payload.natureza_juridica),
    company_size: text(payload.porte),
    main_activity: {
      code: text(payload.cnae_fiscal),
      description: text(payload.cnae_fiscal_descricao),
    },
    secondary_activities: secondaryActivities,
    official_address: {
      street: text(payload.logradouro),
      number: text(payload.numero),
      complement: text(payload.complemento),
      district: text(payload.bairro),
      city: text(payload.municipio),
      state: text(payload.uf),
      postal_code: digits(payload.cep) || null,
    },
    official_phone: text(payload.ddd_telefone_1),
    official_email: text(payload.email)?.toLowerCase() ?? null,
  }
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "")
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

