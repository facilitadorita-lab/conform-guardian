import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, QrCode } from "lucide-react";
import { useEffect } from "react";
import { professionalService } from "@/services";

export const Route = createFileRoute("/equipamento/qr/$token")({ component: EquipmentQrResolver });

function EquipmentQrResolver() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["equipment-qr", token], queryFn: () => professionalService.resolveEquipmentQr(token), retry: false });
  useEffect(() => {
    if (!query.data) return;
    void navigate({ to: "/equipamentos/$id", params: { id: query.data.equipamento_id }, replace: true });
  }, [navigate, query.data]);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">{query.isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" /> : <QrCode className="mx-auto h-8 w-8 text-accent" />}<h1 className="mt-4 text-lg font-semibold">Abrindo equipamento</h1><p className="mt-2 text-sm text-muted-foreground">Validando seu acesso e o ambiente da empresa antes de exibir os dados.</p>{query.error ? <p className="mt-4 text-sm text-danger">Este QR Code não existe ou seu usuário não possui acesso a esta empresa.</p> : null}</div></main>;
}
