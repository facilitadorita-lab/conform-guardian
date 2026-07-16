export interface NormalizedCompanyRegistration {
  cnpj: string
  legal_name: string
  trade_name: string | null
  registration_status: string | null
  registration_status_date: string | null
  opened_at: string | null
  headquarters_or_branch: string | null
  legal_nature: string | null
  company_size: string | null
  main_activity: {
    code: string | null
    description: string | null
  }
  secondary_activities: Array<{
    code: string | null
    description: string | null
  }>
  official_address: {
    street: string | null
    number: string | null
    complement: string | null
    district: string | null
    city: string | null
    state: string | null
    postal_code: string | null
  }
  official_phone: string | null
  official_email: string | null
}

export interface CompanyRegistrationProvider {
  readonly name: string
  lookup(cnpj: string): Promise<NormalizedCompanyRegistration>
}

export class CompanyRegistrationProviderError extends Error {
  constructor(
    readonly code: "REGISTRATION_NOT_FOUND" | "PROVIDER_RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "PROVIDER_INVALID_RESPONSE",
    readonly status: number,
  ) {
    super(code)
    this.name = "CompanyRegistrationProviderError"
  }
}

