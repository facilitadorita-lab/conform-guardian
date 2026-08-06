import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, Eye, FileText, Loader2, Printer, QrCode, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { useUnitContext } from "@/hooks/use-unit-context";
import { professionalService } from "@/services";
import { formatDateBR, formatDateTimeBR } from "@/utils/date";
import { cn } from "@/lib/utils";

export function FiscalizacaoPage() {
  const navigate = useNavigate();
  const { selectedCompanyId } = useSession();
  const { unidadeAtualId, unidadeAtual, visaoConsolidada } = useUnitContext();
  const auditLogged = useRef<string | null>(null);
  const panel = useQuery({
    queryKey: ["inspection-panel", selectedCompanyId, unidadeAtualId ?? "consolidado"],
    queryFn: () => professionalService.inspectionPanel(selectedCompanyId!, unidadeAtualId),
    enabled: Boolean(selectedCompanyId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!selectedCompanyId || panel.isLoading || panel.isError) return;
    const key = `${selectedCompanyId}:${unidadeAtualId ?? "consolidado"}`;
    if (auditLogged.current === key) return;
    auditLogged.current = key;
    void professionalService.registerInspectionAccess(selectedCompanyId, unidadeAtualId);
  }, [panel.isError, panel.isLoading, selectedCompanyId, unidadeAtualId]);

  if (panel.isLoading) {
    return <main className="cf-app-bg flex min-h-screen items-center justify-center p-6"><div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Preparando a visão segura para fiscalização…</div></main>;
  }

  if (panel.isError || !panel.data) {
    return <main className="cf-app-bg flex min-h-screen items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-danger/30 bg-card p-7 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-danger" /><h1 className="mt-4 text-lg font-semibold">Visão indisponível</h1><p className="mt-2 text-sm text-muted-foreground">Não foi possível abrir este painel com as permissões atuais.</p><button type="button" onClick={() => void navigate({ to: "/dashboard" })} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Voltar ao sistema</button></div></main>;
  }

  const data = panel.data;
  const scope = visaoConsolidada ? "Visão consolidada" : (unidadeAtual?.nome ?? "Unidade selecionada");
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 print:bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur print:static">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><ShieldCheck className="h-5 w-5" /></div><div><div className="text-sm font-semibold">Conform Flow · Modo fiscalização</div><div className="text-xs text-slate-500">Somente leitura · acesso registrado na trilha de auditoria</div></div></div>
          <div className="flex items-center gap-2 print:hidden"><button type="button" onClick={() => void navigate({ to: "/dashboard" })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />Voltar</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"><Printer className="h-4 w-4" />Imprimir</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Empresa fiscalizada</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{data.empresa.nome}</h1><p className="mt-1 text-sm text-slate-500">{data.empresa.razao_social} · CNPJ {data.empresa.cnpj}</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"><div className="font-semibold">Sessão protegida</div><div className="mt-1 text-xs">{scope} · gerado em {formatDateTimeBR(data.gerado_em)}</div></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Responsável legal" value={data.empresa.responsavel_legal} /><Info label="Responsável técnico" value={data.empresa.responsavel_tecnico} /></div>
        </section>

        <section className="grid gap-4 md:grid-cols-3"><InspectionMetric label="Documentos disponíveis" value={data.documentos.length} icon={FileText} /><InspectionMetric label="Equipamentos mapeados" value={data.equipamentos.length} icon={Wrench} /><InspectionMetric label="Evidências registradas" value={data.evidencias.length} icon={ClipboardCheck} /></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle icon={FileText} title="Documentos e licenças" description="Metadados e situação de validade. Os arquivos não são exibidos nesta visão." /><DataTable headers={["Documento", "Número", "Vencimento", "Evidência", "Status"]}>{data.documentos.map((document) => <tr key={document.id}><td className="font-medium">{document.nome}</td><td>{document.numero ?? "—"}</td><td>{document.vencimento ? formatDateBR(document.vencimento) : "Sem validade"}</td><td>{document.possui_anexo ? <span className="text-emerald-700">Registrada</span> : <span className="text-amber-700">Pendente</span>}</td><td><InspectionStatus value={document.status} /></td></tr>)}</DataTable></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle icon={Wrench} title="Equipamentos e rotinas" description="Situação consolidada de calibração, qualificação e manutenção." /><DataTable headers={["Equipamento", "Código", "Setor", "Criticidade", "Conformidade"]}>{data.equipamentos.map((equipment) => <tr key={equipment.id}><td className="font-medium">{equipment.nome}</td><td>{equipment.codigo ?? "—"}</td><td>{equipment.setor ?? "—"}</td><td className="capitalize">{equipment.criticidade}</td><td><InspectionStatus value={equipment.status} /></td></tr>)}</DataTable></section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionTitle icon={Eye} title="Linha de evidências" description="Registros de anexos, versões e hashes. O conteúdo confidencial permanece protegido." /><DataTable headers={["Evidência", "Módulo", "Versão", "Hash", "Registrada em"]}>{data.evidencias.map((evidence, index) => <tr key={`${evidence.nome}-${index}`}><td className="font-medium">{evidence.nome}</td><td className="capitalize">{evidence.modulo}</td><td>v{evidence.versao}</td><td className="font-mono text-[11px] text-slate-500">{evidence.hash ? `${evidence.hash.slice(0, 12)}…` : "Pendente"}</td><td>{formatDateTimeBR(evidence.enviado_em)}</td></tr>)}</DataTable></section>

        <footer className="flex items-center gap-2 pb-6 text-xs leading-5 text-slate-500"><QrCode className="h-4 w-4 shrink-0" />Esta visão não libera arquivos, não permite alterações e exige sessão autenticada no ambiente autorizado.</footer>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span><div className="mt-1 text-sm font-medium">{value || "Não informado"}</div></div>; }
function InspectionMetric({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</span><Icon className="h-4 w-4 text-slate-500" /></div><div className="mt-3 text-3xl font-semibold tabular-nums">{value}</div></div>; }
function SectionTitle({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) { return <div className="mb-4 flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div></div>; }
function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div>; }
function InspectionStatus({ value }: { value: string }) { const normalized = value.toLowerCase(); const tone = normalized.includes("venc") || normalized.includes("reprov") ? "danger" : normalized.includes("atenc") || normalized.includes("a_vencer") || normalized.includes("pendente") ? "warning" : "success"; const label = normalized.replaceAll("_", " "); return <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold capitalize", tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{label}</span>; }
