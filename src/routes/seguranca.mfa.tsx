import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useMfaAssurance } from "@/hooks/use-mfa-assurance";
import { AppShell } from "@/layouts/app-layout";
import { getSupabaseClient } from "@/lib/supabaseClient";

export const Route = createFileRoute("/seguranca/mfa")({
  head: () => ({ meta: [{ title: "Autenticação em duas etapas — Conform Flow" }] }),
  component: MfaPage,
});

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

function MfaPage() {
  const mfa = useMfaAssurance();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [otp, setOtp] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setWorking(true);
    setError(null);
    try {
      const { data, error: enrollError } = await getSupabaseClient().auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Conform Flow",
      });
      if (enrollError) throw enrollError;
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar o MFA.");
    } finally {
      setWorking(false);
    }
  }

  async function verify() {
    const factorId = enrollment?.factorId ?? mfa.data?.verifiedFactorId;
    if (!factorId || otp.length !== 6) return;
    setWorking(true);
    setError(null);
    try {
      const { error: verifyError } = await getSupabaseClient().auth.mfa.challengeAndVerify({
        factorId,
        code: otp,
      });
      if (verifyError) throw verifyError;
      await mfa.refetch();
      await navigate({ to: "/dashboard" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Código inválido.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <AppShell
      title="Segurança da conta"
      description="Ative a autenticação em duas etapas para proteger ações administrativas."
    >
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 md:p-8">
        {mfa.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando segurança...
          </div>
        ) : mfa.data?.currentLevel === "aal2" ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-xl font-semibold">Sessão protegida com MFA</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você pode executar ações administrativas críticas.
            </p>
            <Button asChild className="mt-6">
              <Link to="/dashboard">Voltar ao painel</Link>
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-accent/10 p-3 text-accent">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Confirmação adicional obrigatória</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Administradores precisam confirmar um código do aplicativo autenticador antes de
                  alterar planos, usuários, empresas ou cobranças.
                </p>
              </div>
            </div>
            {!mfa.data?.hasVerifiedFactor && !enrollment ? (
              <Button type="button" onClick={enroll} disabled={working} className="mt-6 w-full">
                <KeyRound className="h-4 w-4" /> Configurar aplicativo autenticador
              </Button>
            ) : null}
            {enrollment ? (
              <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5 text-center">
                <p className="text-sm font-medium">Escaneie o QR Code no seu autenticador</p>
                <img
                  src={enrollment.qrCode}
                  alt="QR Code para configurar MFA"
                  className="mx-auto mt-4 h-48 w-48 rounded-lg bg-white p-2"
                />
                <p className="mt-3 break-all text-xs text-muted-foreground">
                  Chave manual: {enrollment.secret}
                </p>
              </div>
            ) : null}
            {mfa.data?.hasVerifiedFactor || enrollment ? (
              <div className="mt-6 flex flex-col items-center">
                <label className="text-sm font-medium">Código de 6 dígitos</label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="mt-3">
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} className="h-11 w-11" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  type="button"
                  onClick={verify}
                  disabled={working || otp.length !== 6}
                  className="mt-5 w-full"
                >
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirmar e
                  proteger sessão
                </Button>
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                {error}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
