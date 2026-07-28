import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, QrCode } from "lucide-react";
import { useEffect } from "react";
import { useAppSession } from "@/hooks/use-app-session";
import { cacheQrEquipment, getCachedQrEquipment } from "@/lib/offline-cache";
import { professionalService } from "@/services";

export const Route = createFileRoute("/equipamento/qr/$token")({ component: EquipmentQrResolver });

function EquipmentQrResolver() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const { selectedCompanyId, selectCompany } = useAppSession();
  const query = useQuery({
    queryKey: ["equipment-qr", token],
    queryFn: async () => {
      try {
        const resolved = await professionalService.resolveEquipmentQr(token);
        cacheQrEquipment({ ...resolved, qr_token: token });
        return resolved;
      } catch (error) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const cached = getCachedQrEquipment(token);
          if (cached) return cached;
        }
        throw error;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (!query.data) return;
    let active = true;
    void (async () => {
      if (selectedCompanyId !== query.data.empresa_id) {
        const changed = await selectCompany(query.data.empresa_id);
        if (!changed || !active) return;
      }
      if (active) {
        await navigate({
          to: "/equipamentos/$id",
          params: { id: query.data.equipamento_id },
          replace: true,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate, query.data, selectCompany, selectedCompanyId]);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        {query.isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
        ) : (
          <QrCode className="mx-auto h-8 w-8 text-accent" />
        )}
        <h1 className="mt-4 text-lg font-semibold">Abrindo equipamento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Validando seu acesso e o ambiente da empresa antes de exibir os dados.
        </p>
        {offline && query.data ? (
          <p className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            Modo offline: usando o último cadastro autorizado neste dispositivo.
          </p>
        ) : null}
        {query.error ? (
          <p className="mt-4 text-sm text-danger">
            Este QR Code não existe ou seu usuário não possui acesso a esta empresa.
          </p>
        ) : null}
      </div>
    </main>
  );
}
