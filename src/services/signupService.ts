import { getSupabaseClient } from "@/lib/supabaseClient";
import type { CheckoutStatus, PrepareSignupInput, PreparedSignup } from "@/types";

interface StripeCheckoutResult {
  checkout_url: string;
  checkout_session_id: string;
  status: "checkout_pendente";
}

export const signupService = {
  preparar(input: PrepareSignupInput) {
    return invokePublicFunction<PreparedSignup>("prepare-signup", {
      plan_code: input.planCode,
      billing_interval: input.billingInterval,
      responsible: {
        name: input.responsible.name,
        email: input.responsible.email,
        phone: input.responsible.phone,
        role: input.responsible.role,
        department: input.responsible.department,
        relationship: input.responsible.relationship,
      },
      company: {
        cnpj: input.company.cnpj,
        trade_name: input.company.tradeName,
        establishment_type: input.company.establishmentType,
        segment: input.company.segment,
      },
      terms: {
        accepted: input.terms.accepted,
        terms_version: input.terms.termsVersion,
        privacy_version: input.terms.privacyVersion,
      },
      turnstile_token: input.turnstileToken,
    });
  },

  criarCheckout(sessionToken: string) {
    return invokePublicFunction<StripeCheckoutResult>("create-stripe-checkout", {
      session_token: sessionToken,
    });
  },

  consultarStatus(checkoutSessionId: string, sessionToken: string) {
    return invokePublicFunction<CheckoutStatus>("checkout-status", {
      checkout_session_id: checkoutSessionId,
      session_token: sessionToken,
    });
  },

  async enviarOtp(email: string) {
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    if (error) throw new Error(error.message);
  },

  async verificarOtp(email: string, token: string) {
    const { data, error } = await getSupabaseClient().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("Não foi possível iniciar a sessão após validar o código.");
    return data.session;
  },

  confirmarEmail(sessionToken: string) {
    return invokePublicFunction<{ empresa_id: string; status: string }>("confirm-signup-email", {
      session_token: sessionToken,
    });
  },
};

async function invokePublicFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseClient().functions.invoke<T>(name, { body });
  if (!error) return data as T;

  const context = (error as { context?: Response }).context;
  let code = error.message;
  if (context) {
    try {
      const payload = (await context.clone().json()) as { error?: string };
      code = payload.error ?? code;
    } catch {
      // Mantém a mensagem original quando a resposta não for JSON.
    }
  }
  throw new Error(translateSignupError(code));
}

function translateSignupError(code: string) {
  const messages: Record<string, string> = {
    INVALID_CNPJ: "O CNPJ informado não é válido.",
    COMPANY_ALREADY_REGISTERED: "Este CNPJ já possui cadastro no Conform Flow.",
    SIGNUP_ALREADY_IN_PROGRESS: "Já existe uma contratação em andamento para este CNPJ.",
    LEGAL_TERMS_OUTDATED:
      "Os termos foram atualizados. Recarregue a página e revise a versão vigente antes de continuar.",
    REGISTRATION_NOT_ACTIVE: "A situação cadastral deste CNPJ não está ativa.",
    REGISTRATION_NOT_FOUND: "O CNPJ não foi localizado na base cadastral consultada.",
    PLAN_NOT_AVAILABLE: "O plano escolhido não está disponível para contratação.",
    PLAN_PAYMENT_NOT_CONFIGURED: "Este plano ainda não está configurado para pagamento online.",
    PAYMENT_NOT_CONFIGURED: "O pagamento online ainda não está configurado.",
    RATE_LIMIT_EXCEEDED: "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
    ANTI_BOT_REQUIRED: "Confirme a verificação de segurança para continuar.",
    ANTI_BOT_FAILED: "Não foi possível validar a verificação de segurança.",
    SIGNUP_SESSION_EXPIRED: "Esta contratação expirou. Inicie uma nova tentativa.",
    SIGNUP_SESSION_NOT_FOUND: "Não encontramos esta contratação.",
    CHECKOUT_ALREADY_CREATED: "O pagamento desta contratação já foi iniciado.",
    PAYMENT_PROVIDER_UNAVAILABLE: "O serviço de pagamento está temporariamente indisponível.",
    CHECKOUT_CREATE_FAILED: "Não foi possível abrir o pagamento agora.",
    EMAIL_NOT_VERIFIED: "Valide o código enviado ao seu e-mail antes de continuar.",
  };
  return messages[code.toUpperCase()] ?? code;
}
