import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Loader2, LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoSignature } from "@/components/public/marketing";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAppSession } from "@/hooks/use-app-session";
import { signupService } from "@/services";

export const Route = createFileRoute("/checkout/sucesso")({
  validateSearch: (search: Record<string, unknown>) => ({
    checkout_session_id:
      typeof search.checkout_session_id === "string" ? search.checkout_session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Finalizando contratação — Conform Flow" }] }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { checkout_session_id: checkoutSessionId } = Route.useSearch();
  const navigate = useNavigate();
  const appSession = useAppSession();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSessionToken(sessionStorage.getItem("cf_signup_token"));
    setEmail(sessionStorage.getItem("cf_signup_email"));
    setHydrated(true);
  }, []);

  const status = useQuery({
    queryKey: ["checkout-status", checkoutSessionId, sessionToken],
    queryFn: () => signupService.consultarStatus(checkoutSessionId!, sessionToken!),
    enabled: Boolean(checkoutSessionId && sessionToken),
    refetchInterval: (query) => {
      const current = query.state.data;
      return current?.can_send_otp || current?.ready ? false : 3_000;
    },
    retry: 2,
  });

  async function sendOtp() {
    if (!email) return;
    setSendingOtp(true);
    setError(null);
    try {
      await signupService.enviarOtp(email);
      setOtpSent(true);
    } catch (caught) {
      setError(friendlyError(caught, "Não foi possível enviar o código agora. Tente novamente."));
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (!email || !sessionToken || otp.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      await signupService.verificarOtp(email, otp);
      await signupService.confirmarEmail(sessionToken);
      await appSession.refreshContext();
      sessionStorage.removeItem("cf_signup_token");
      sessionStorage.removeItem("cf_signup_email");
      sessionStorage.removeItem("cf_checkout_session_id");
      await navigate({ to: "/dashboard" });
    } catch (caught) {
      setError(friendlyError(caught, "Não foi possível confirmar o código. Tente novamente."));
    } finally {
      setVerifying(false);
    }
  }

  const missingSecureContext = hydrated && (!checkoutSessionId || !sessionToken);
  const current = status.data;
  const freeTrial = current?.trial.enabled === true;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.12),transparent_36%),#f8fafc] px-5 py-8 text-slate-950">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <LogoSignature />
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="h-4 w-4 text-cyan-700" /> Pagamento seguro
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.65)] md:p-10">
          {!hydrated ? (
            <State
              icon={Loader2}
              spinning
              title="Preparando sua ativação"
              description="Estamos finalizando os últimos detalhes da sua contratação."
            />
          ) : missingSecureContext ? (
            <State
              icon={LockKeyhole}
              title="Não foi possível continuar"
              description="Volte aos planos e comece novamente."
            >
              <Button asChild className="mt-6 rounded-xl">
                <Link to="/planos">Voltar aos planos</Link>
              </Button>
            </State>
          ) : status.error ? (
            <State
              icon={Clock3}
              title="A confirmação está demorando"
              description="Seu pagamento pode estar sendo processado. Consulte novamente em alguns instantes."
            >
              <Button
                type="button"
                variant="outline"
                className="mt-6 rounded-xl"
                onClick={() => status.refetch()}
              >
                Consultar novamente
              </Button>
            </State>
          ) : status.isLoading || !current ? (
            <State
              icon={Loader2}
              spinning
              title={freeTrial ? "Confirmando seu teste gratuito" : "Confirmando o pagamento"}
              description={
                freeTrial
                  ? "Estamos preparando seu acesso para que você possa começar a testar a plataforma."
                  : "Estamos preparando seu acesso à plataforma."
              }
            />
          ) : current.status === "checkout_pendente" ||
            current.status === "pagamento_confirmado" ? (
            <State
              icon={Clock3}
              title={freeTrial ? "Teste gratuito em processamento" : "Pagamento em processamento"}
              description={
                freeTrial
                  ? "Seu período gratuito está sendo iniciado. Você pode manter esta página aberta."
                  : "Estamos concluindo sua contratação. Você pode manter esta página aberta."
              }
            />
          ) : current.can_send_otp ? (
            <div>
              <State
                icon={MailCheck}
                title={freeTrial ? "Seu teste gratuito começou" : "Pagamento confirmado"}
                description={
                  freeTrial
                    ? `Nenhuma cobrança foi feita hoje. Confirme o e-mail ${current.email_masked} para acessar. O cartão cadastrado será cobrado automaticamente após ${current.trial.days} dias, salvo cancelamento antes disso.`
                    : `Confirme o e-mail ${current.email_masked} para acessar a plataforma.`
                }
              />
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                {!otpSent ? (
                  <Button
                    type="button"
                    onClick={sendOtp}
                    disabled={sendingOtp}
                    className="h-11 w-full rounded-xl bg-slate-950 text-white"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Enviando código...
                      </>
                    ) : (
                      "Enviar código por e-mail"
                    )}
                  </Button>
                ) : (
                  <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-slate-700">
                      Digite o código de 6 dígitos
                    </label>
                    <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="mt-4">
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot key={index} index={index} className="h-11 w-11 bg-white" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <Button
                      type="button"
                      onClick={verifyOtp}
                      disabled={verifying || otp.length !== 6}
                      className="mt-5 h-11 w-full rounded-xl bg-slate-950 text-white"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Validando...
                        </>
                      ) : (
                        "Confirmar e acessar"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={sendingOtp}
                      className="mt-4 text-xs font-semibold text-cyan-700 hover:text-cyan-900"
                    >
                      Reenviar código
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : current.ready ? (
            <State
              icon={CheckCircle2}
              title="Tudo pronto"
              description="Sua contratação está confirmada. Você já pode acessar o Conform Flow."
            >
              <Button asChild className="mt-6 rounded-xl bg-slate-950 text-white">
                <Link to="/dashboard">Acessar plataforma</Link>
              </Button>
            </State>
          ) : (
            <State
              icon={LockKeyhole}
              title="Contratação não disponível"
              description="Esta etapa não está mais disponível. Escolha um plano para começar novamente."
            >
              <Button asChild variant="outline" className="mt-6 rounded-xl">
                <Link to="/planos">Ver planos</Link>
              </Button>
            </State>
          )}
          {error ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Precisa de ajuda? Volte aos planos e escolha a opção ideal para a sua operação.
        </p>
      </div>
    </main>
  );
}

function State({
  icon: Icon,
  spinning,
  title,
  description,
  children,
}: {
  icon: typeof Clock3;
  spinning?: boolean;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
        <Icon className={`h-6 w-6 ${spinning ? "animate-spin" : ""}`} />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
      {children}
    </div>
  );
}

function friendlyError(caught: unknown, fallback: string) {
  const message = caught instanceof Error ? caught.message.trim() : "";
  if (!message) return fallback;

  if (/backend|webhook|api|rpc|supabase|stripe|permission|postgres|database|network/i.test(message)) {
    return fallback;
  }

  return message;
}
