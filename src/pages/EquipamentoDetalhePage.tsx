import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  Archive,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  Download,
  FileArchive,
  Info,
  Paperclip,
  Plus,
  QrCode,
  RotateCw,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { AttachmentViewer } from "@/components/attachment-viewer";
import { SecureUploadButton } from "@/components/secure-upload-button";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { EvidenciasTimeline } from "@/components/evidencias-timeline";
import { useEquipamento } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { edgeFunctionsService, evidenciasTimelineService, professionalService } from "@/services";
import {
  equipamentosService,
  type CriarCalibracaoPayload,
  type CriarManutencaoPayload,
  type CriarQualificacaoPayload,
  type EquipamentoHistoricoItem,
} from "@/services/equipamentosService";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

const tabs = [
  "Dados gerais",
  "Calibrações",
  "Qualificações",
  "Manutenções",
  "Anexos",
  "Pendências",
  "Histórico",
  "Arquivados",
] as const;

type Tab = (typeof tabs)[number];
type FormKind = "calibracao" | "qualificacao" | "manutencao";

const uploadAccept =
  "application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function EquipamentoDetalhePage({ id }: { id: string }) {
  const { podeEscrever, selectedCompanyId } = useSession();
  const { data: equipamento, isLoading, isError, error, refetch } = useEquipamento(id);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "Dados gerais";
    const requested = new URLSearchParams(window.location.search).get("tab");
    return tabs.includes(requested as Tab) ? (requested as Tab) : "Dados gerais";
  });
  const [activeForm, setActiveForm] = useState<FormKind | null>(null);
  const [previewItem, setPreviewItem] = useState<EquipamentoHistoricoItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUpload, setLastUpload] = useState<{
    label: string;
    url?: string;
    anexoId?: string;
  } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const qrQuery = useQuery({
    queryKey: ["professional", "equipment-qr", id],
    queryFn: () => professionalService.getEquipmentQrToken(id),
    enabled: Boolean(qrOpen && id),
  });
  const rotateQr = useMutation({
    mutationFn: () => professionalService.rotateEquipmentQr(id),
    onSuccess: (data) =>
      queryClient.setQueryData(
        ["professional", "equipment-qr", id],
        data.qr_token,
      ),
  });

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", url);
    }
  }

  const createMutation = useMutation({
    mutationFn: async ({ kind, formData }: { kind: FormKind; formData: FormData }) => {
      if (!podeEscrever) throw new Error("Seu perfil possui acesso somente para consulta.");
      if (!selectedCompanyId) throw new Error("Selecione uma empresa antes de salvar.");
      let upload: { anexoId?: string; signedUrl?: string } | null = null;
      const file = formData.get("anexo");
      if (file instanceof File && file.size > 0) {
        edgeFunctionsService.validateAttachmentFile(file);
      }

      let registroId = "";
      let modulo: "calibracoes" | "qualificacoes" | "manutencoes";
      let finalidade = "principal";
      let descricao = "";

      if (kind === "calibracao") {
        const payload: CriarCalibracaoPayload = {
          data_calibracao: required(formData, "data_calibracao"),
          data_vencimento: optional(formData, "data_vencimento"),
          numero_certificado: optional(formData, "numero_certificado"),
          laboratorio_responsavel: optional(formData, "laboratorio_responsavel"),
          resultado: required(formData, "resultado") as CriarCalibracaoPayload["resultado"],
          observacoes: optional(formData, "observacoes"),
        };
        const created = await equipamentosService.criarCalibracao(selectedCompanyId, id, payload);
        registroId = created.id;
        modulo = "calibracoes";
        finalidade = "certificado";
        descricao = payload.numero_certificado || "Calibração";
      } else if (kind === "qualificacao") {
        const payload: CriarQualificacaoPayload = {
          tipo: required(formData, "tipo"),
          data_qualificacao: required(formData, "data_qualificacao"),
          data_vencimento: optional(formData, "data_vencimento"),
          resultado: required(formData, "resultado") as CriarQualificacaoPayload["resultado"],
          empresa_executora: optional(formData, "empresa_executora"),
          observacoes: optional(formData, "observacoes"),
        };
        const created = await equipamentosService.criarQualificacao(selectedCompanyId, id, payload);
        registroId = created.id;
        modulo = "qualificacoes";
        finalidade = "relatorio";
        descricao = `Qualificação ${payload.tipo}`;
      } else {
        const natureza = required(formData, "natureza") as CriarManutencaoPayload["natureza"];
        const payload: CriarManutencaoPayload = {
          equipamento_id: id,
          nome_servico: optional(formData, "nome_servico") || `Manutenção ${natureza}`,
          natureza,
          tipo_servico: optional(formData, "tipo_servico"),
          status_execucao: optional(formData, "status_execucao") as
            CriarManutencaoPayload["status_execucao"] | undefined,
          data_manutencao: required(formData, "data_manutencao"),
          proxima_manutencao: optional(formData, "proxima_manutencao"),
          periodicidade_meses: optional(formData, "periodicidade_meses"),
          empresa_responsavel: optional(formData, "empresa_responsavel"),
          tecnico_responsavel: optional(formData, "tecnico_responsavel"),
          numero_ordem_servico: optional(formData, "numero_ordem_servico"),
          exige_evidencia: true,
          falha_apresentada: optional(formData, "falha_apresentada"),
          prioridade: optional(formData, "prioridade"),
          diagnostico: optional(formData, "diagnostico"),
          causa_raiz: optional(formData, "causa_raiz"),
          acao_realizada: optional(formData, "acao_realizada"),
          observacoes: optional(formData, "observacoes"),
        };
        const created = await equipamentosService.criarManutencao(selectedCompanyId, payload);
        registroId = created.id;
        modulo = "manutencoes";
        finalidade = "evidencia";
        descricao = payload.nome_servico || "Manutenção";
      }

      if (file instanceof File && file.size > 0) {
        setUploadProgress(0);
        upload = await edgeFunctionsService.uploadAnexoSeguro(file, {
          empresaId: selectedCompanyId,
          modulo,
          registroId,
          finalidade,
          onProgress: setUploadProgress,
        });
      }

      return { upload, descricao };
    },
    onSuccess: async ({ upload, descricao }) => {
      setActiveForm(null);
      setFormError(null);
      setUploadProgress(null);
      if (upload?.anexoId || upload?.signedUrl) {
        setLastUpload({
          label: descricao || "Registro do equipamento",
          url: upload.signedUrl,
          anexoId: upload.anexoId,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["equipamentos", selectedCompanyId, id] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Nao foi possivel salvar o registro.");
      setUploadProgress(null);
    },
  });

  if (!equipamento && isLoading) {
    return (
      <AppShell
        title="Carregando equipamento"
        description="Buscando dados gerais, calibrações, qualificações e histórico."
      >
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Carregando informações do equipamento...
        </div>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell
        title="Equipamento indisponível"
        description="Não foi possível carregar os dados do equipamento selecionado."
        actions={<BackButton />}
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 p-8 text-center">
          <FileArchive className="h-10 w-10 text-danger" />
          <p className="max-w-lg text-sm text-danger">
            {error instanceof Error ? error.message : "Tente novamente em instantes."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-accent hover:bg-muted"
          >
            <RotateCw className="h-4 w-4" /> Tentar novamente
          </button>
        </div>
      </AppShell>
    );
  }

  if (!equipamento) {
    return (
      <AppShell
        title="Equipamento não encontrado"
        description="O registro solicitado ainda não foi carregado ou não existe."
        actions={<BackButton />}
      >
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhum dado de equipamento disponível no momento.
        </div>
      </AppShell>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeForm) return;
    setFormError(null);
    setLastUpload(null);
    createMutation.mutate({ kind: activeForm, formData: new FormData(event.currentTarget) });
  }

  function handlePreviewItem(item: EquipamentoHistoricoItem) {
    setPreviewItem(item);
  }

  const calibracoesAtuais = currentItems(equipamento.calibracoes);
  const qualificacoesAtuais = currentItems(equipamento.qualificacoes);
  const manutencoesAtuais = currentItems(equipamento.manutencoes);
  const anexosAtuais = currentItems(equipamento.anexos);
  const arquivados = [
    ...archivedItems(equipamento.calibracoes, "Calibração"),
    ...archivedItems(equipamento.qualificacoes, "Qualificação"),
    ...archivedItems(equipamento.manutencoes, "Manutenção"),
    ...archivedItems(equipamento.anexos, "Anexo"),
  ];

  return (
    <AppShell
      title={`${equipamento.nome} · ${equipamento.codigo}`}
      description={`${equipamento.fabricante} ${equipamento.modelo} - setor ${equipamento.setor}`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:border-accent/30 hover:bg-muted/40"
          >
            <QrCode className="h-4 w-4" /> QR do equipamento
          </button>
          <BackButton />
        </div>
      }
    >
      {lastUpload && (
        <UploadSuccessBanner
          label={lastUpload.label}
          url={lastUpload.url}
          onDismiss={() => setLastUpload(null)}
          onVisualizar={() => {
            if (lastUpload.anexoId) {
              void edgeFunctionsService.registrarEventoAnexo(lastUpload.anexoId);
            }
          }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <EquipmentSummaryCard
          icon={ShieldCheck}
          label="Status consolidado"
          value={statusLabel(equipamento.status)}
          helper="Atualizado com base nos registros atuais do equipamento."
        >
          <StatusBadge tone={equipamento.status}>{statusLabel(equipamento.status)}</StatusBadge>
        </EquipmentSummaryCard>
        <EquipmentSummaryCard
          icon={Info}
          label="Criticidade"
          value={criticidadeLabel(equipamento.criticidade)}
          helper="Use criticidade para priorizar rotina e evidências."
        />
        <EquipmentSummaryCard
          icon={CalendarClock}
          label="Próximo vencimento"
          value={formatDateBR(equipamento.proximoVenc)}
          helper="Menor data entre calibração, qualificação e manutenção."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={equipamento.status}>{statusLabel(equipamento.status)}</StatusBadge>
        <span className="text-xs text-muted-foreground">
          Criticidade <strong className="text-foreground">{equipamento.criticidade}</strong>
        </span>
        <span className="text-xs text-muted-foreground">
          Próximo vencimento{" "}
          <strong className="text-foreground">{formatDateBR(equipamento.proximoVenc)}</strong>
        </span>
      </div>

      <Surface className="overflow-hidden p-0">
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-muted/25 px-3 pt-3">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => changeTab(item)}
              className={cn(
                "-mb-px whitespace-nowrap rounded-t-xl border-b-2 px-4 py-3 text-sm font-semibold cf-transition",
                tab === item
                  ? "border-accent bg-background text-primary shadow-sm"
                  : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {tabLabel(item)}
            </button>
          ))}
        </div>
        <div className="p-5 md:p-6">
          {tab === "Dados gerais" && (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-2">
              <Field k="Nome" v={equipamento.nome} />
              <Field k="Código interno" v={equipamento.codigo} />
              <Field k="Tipo" v={equipamento.tipo} />
              <Field k="Fabricante" v={equipamento.fabricante} />
              <Field k="Modelo" v={equipamento.modelo} />
              <Field k="Setor" v={equipamento.setor} />
              <Field k="Criticidade" v={equipamento.criticidade} />
              <Field k="Status consolidado" v={statusLabel(equipamento.status)} />
            </dl>
          )}

          {tab === "Calibrações" && (
            <TimelineSection
              title="Calibrações"
              actionLabel="Inserir nova calibração"
              canAdd={podeEscrever}
              onAdd={() => setActiveForm("calibracao")}
            >
              <TimelineList
                items={calibracoesAtuais}
                empty="Nenhuma calibração cadastrada para este equipamento."
                onPreview={handlePreviewItem}
              />
              <ArchiveShortcut
                count={archivedItems(equipamento.calibracoes).length}
                onClick={() => changeTab("Arquivados")}
              />
            </TimelineSection>
          )}

          {tab === "Qualificações" && (
            <TimelineSection
              title="Qualificações"
              actionLabel="Inserir nova qualificação"
              canAdd={podeEscrever}
              onAdd={() => setActiveForm("qualificacao")}
            >
              <TimelineList
                items={qualificacoesAtuais}
                empty="Nenhuma qualificação cadastrada para este equipamento."
                onPreview={handlePreviewItem}
              />
              <ArchiveShortcut
                count={archivedItems(equipamento.qualificacoes).length}
                onClick={() => changeTab("Arquivados")}
              />
            </TimelineSection>
          )}

          {tab === "Manutenções" && (
            <TimelineSection
              title="Manutenções"
              actionLabel="Inserir nova manutenção"
              canAdd={podeEscrever}
              onAdd={() => setActiveForm("manutencao")}
            >
              <TimelineList
                items={manutencoesAtuais}
                empty="Nenhuma manutenção cadastrada para este equipamento."
                onPreview={handlePreviewItem}
              />
              <ArchiveShortcut
                count={archivedItems(equipamento.manutencoes).length}
                onClick={() => changeTab("Arquivados")}
              />
            </TimelineSection>
          )}

          {tab === "Anexos" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Anexos do equipamento</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Evidências ficam isoladas neste equipamento e podem ser visualizadas sem baixar.
                  </p>
                </div>
                {podeEscrever && selectedCompanyId ? (
                  <SecureUploadButton
                    contexto="equipamentos"
                    empresaId={selectedCompanyId}
                    referenciaId={id}
                    finalidade="evidencia"
                    accept={uploadAccept}
                    label="Adicionar anexo"
                    onUploaded={() => {
                      void queryClient.invalidateQueries({
                        queryKey: ["equipamentos", selectedCompanyId, id],
                      });
                    }}
                  />
                ) : null}
              </div>
              <TimelineList
                items={anexosAtuais}
                empty="Nenhum anexo vinculado a este equipamento."
                onPreview={handlePreviewItem}
              />
            </div>
          )}

          {tab === "Pendências" && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <div>
                <p>
                  As pendências específicas do equipamento serão exibidas aqui quando houver
                  tratativas vinculadas ao cadastro.
                </p>
                <Link
                  to="/pendencias"
                  className="mt-3 inline-flex text-sm font-medium text-accent hover:underline"
                >
                  Abrir central de pendências
                </Link>
              </div>
            </div>
          )}

          {tab === "Histórico" && (
            <TimelineList
              items={equipamento.historico}
              empty="Nenhum evento de histórico registrado para este equipamento."
              onPreview={handlePreviewItem}
            />
          )}

          {tab === "Arquivados" && (
            <TimelineList
              items={arquivados}
              empty="Nenhum registro arquivado para este equipamento."
              onPreview={handlePreviewItem}
              archivedView
            />
          )}
        </div>
      </Surface>

      {activeForm && podeEscrever && (
        <OperationalModal
          kind={activeForm}
          equipamentoNome={equipamento.nome}
          isSaving={createMutation.isPending}
          uploadProgress={uploadProgress}
          error={formError}
          onSubmit={handleSubmit}
          onClose={() => {
            if (!createMutation.isPending) {
              setActiveForm(null);
              setFormError(null);
              setUploadProgress(null);
            }
          }}
        />
      )}

      {previewItem && (
        <AttachmentPreview
          item={previewItem}
          empresaId={selectedCompanyId}
          onClose={() => setPreviewItem(null)}
        />
      )}
      {qrOpen ? (
        <EquipmentQrDialog
          equipmentName={equipamento.nome}
          token={qrQuery.data}
          isLoading={qrQuery.isLoading || rotateQr.isPending}
          error={(qrQuery.error ?? rotateQr.error)?.message}
          onRotate={() => rotateQr.mutate()}
          onClose={() => setQrOpen(false)}
        />
      ) : null}
    </AppShell>
  );
}

function EquipmentQrDialog({
  equipmentName,
  token,
  isLoading,
  error,
  onRotate,
  onClose,
}: {
  equipmentName: string;
  token?: string;
  isLoading: boolean;
  error?: string;
  onRotate: () => void;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState("");
  const targetUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/equipamento/qr/${token}`
      : "";
  useEffect(() => {
    if (!targetUrl) {
      setDataUrl("");
      return;
    }
    void QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#0f2947", light: "#ffffff" },
    }).then(setDataUrl);
  }, [targetUrl]);
  function download() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${equipmentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    link.click();
  }
  const friendlyError = error?.toUpperCase().includes("EQUIPMENT_NOT_FOUND")
    ? "Não foi possível localizar este equipamento no ambiente atual. Atualize a página e gere o QR Code novamente."
    : error?.toUpperCase().includes("FORBIDDEN")
      ? "Seu usuário não possui permissão para acessar este equipamento."
      : error;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <QrCode className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">QR do equipamento</h2>
        <p className="mt-1 text-sm text-muted-foreground">{equipmentName}</p>
        <div className="mx-auto mt-5 flex min-h-72 items-center justify-center rounded-2xl border border-border bg-white p-4">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR Code de ${equipmentName}`} className="h-64 w-64" />
          ) : (
            <span className="text-sm text-slate-500">
              {isLoading ? "Gerando QR Code..." : "QR indisponível"}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          O QR não contém dados do equipamento. Ele aponta para uma rota protegida que exige login e
          valida o acesso à empresa com segurança.
        </p>
        {friendlyError ? <p className="mt-3 text-xs text-danger">{friendlyError}</p> : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onRotate}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RotateCw className="h-4 w-4" /> Renovar QR
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!dataUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Baixar
          </button>
        </div>
      </div>
    </div>
  );
}

function BackButton() {
  return (
    <Link
      to="/equipamentos"
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm cf-transition hover:border-accent/30 hover:bg-muted/40"
    >
      <ArrowLeft className="h-4 w-4" /> Voltar
    </Link>
  );
}

function tabLabel(tab: Tab) {
  const labels: Record<number, string> = {
    0: "Dados gerais",
    1: "Calibrações",
    2: "Qualificações",
    3: "Manutenções",
    4: "Anexos",
    5: "Pendências",
    6: "Histórico",
    7: "Arquivados",
  };

  return labels[tabs.indexOf(tab)] ?? String(tab);
}

function tabLabelFromTitle(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("calibra")) {
    return lower.includes("inserir") ? "Inserir nova calibração" : "Calibrações";
  }
  if (lower.includes("qualifica")) {
    return lower.includes("inserir") ? "Inserir nova qualificação" : "Qualificações";
  }
  if (lower.includes("manuten")) {
    return lower.includes("inserir") ? "Inserir nova manutenção" : "Manutenções";
  }
  if (lower.includes("hist")) return "Histórico";
  if (lower.includes("pend")) return "Pendências";
  return value;
}

function criticidadeLabel(value: string) {
  if (value === "Critica") return "Crítica";
  if (value === "Media") return "Média";
  return value || "-";
}

function EquipmentSummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  children,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  helper: string;
  children?: ReactNode;
}) {
  return (
    <div className="cf-page-card flex min-h-36 flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/20 bg-accent/5 text-accent">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{value}</div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </div>
  );
}

function TimelineSection({
  title,
  actionLabel,
  canAdd,
  onAdd,
  children,
}: {
  title: string;
  actionLabel: string;
  canAdd: boolean;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title={tabLabelFromTitle(title)}
        description="Registros vinculados apenas a este equipamento e separados por empresa."
        action={
          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
            title={!canAdd ? "Seu perfil possui acesso somente para consulta" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm cf-transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {tabLabelFromTitle(actionLabel)}
          </button>
        }
      />
      {children}
    </div>
  );
}

function currentItems(items: EquipamentoHistoricoItem[]) {
  const explicitCurrent = items.filter((item) => !item.arquivado);
  if (explicitCurrent.length) return explicitCurrent;
  return items.slice(0, 1);
}

function archivedItems(items: EquipamentoHistoricoItem[], label?: string) {
  return items
    .filter((item, index) => item.arquivado || index > 0)
    .map((item) => ({
      ...item,
      arquivado: true,
      descricao: label ? `${label} · ${item.descricao}` : item.descricao,
    }));
}

function ArchiveShortcut({ count, onClick }: { count: number; onClick: () => void }) {
  if (!count) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
    >
      {count} registro{count === 1 ? "" : "s"} arquivado{count === 1 ? "" : "s"} disponível
      {count === 1 ? "" : "s"} no histórico.
    </button>
  );
}

function TimelineList({
  items,
  empty,
  onPreview,
  archivedView = false,
}: {
  items: EquipamentoHistoricoItem[];
  empty: string;
  onPreview: (item: EquipamentoHistoricoItem) => void;
  archivedView?: boolean;
}) {
  if (!items.length) {
    return (
      <EmptyState
        icon={archivedView ? FileArchive : ClipboardList}
        title="Nenhum registro encontrado"
        description={humanizeTexto(empty)}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item, index) => (
        <div
          key={item.id ?? index}
          className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 cf-transition hover:bg-muted/25 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-foreground">{humanizeTexto(item.descricao)}</p>
              {item.status && (
                <StatusBadge tone={item.status}>{statusLabel(item.status)}</StatusBadge>
              )}
              {(archivedView || item.arquivado) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Archive className="h-3 w-3" /> Arquivado
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {item.tipo && <span>Tipo: {humanizeTipo(item.tipo)}</span>}
              {item.data && <span>Data: {formatDateBR(item.data)}</span>}
              {item.versao && <span>Versão: {item.versao}</span>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPreview(item)}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-accent cf-transition hover:border-accent/30 hover:bg-accent/5"
          >
            <Eye className="h-3.5 w-3.5" /> Visualizar
          </button>
        </div>
      ))}
    </div>
  );
}

function OperationalModal({
  kind,
  equipamentoNome,
  isSaving,
  uploadProgress,
  error,
  onSubmit,
  onClose,
}: {
  kind: FormKind;
  equipamentoNome: string;
  isSaving: boolean;
  uploadProgress: number | null;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const title = {
    calibracao: "Inserir nova calibração",
    qualificacao: "Inserir nova qualificação",
    manutencao: "Inserir nova manutenção",
  }[kind];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-muted/30 p-5">
          <div>
            <div className="mb-2 inline-flex rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Registro operacional
            </div>
            <h2 className="text-lg font-semibold">{tabLabelFromTitle(title)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{equipamentoNome}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-muted-foreground cf-transition hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          {kind === "calibracao" && <CalibracaoFields />}
          {kind === "qualificacao" && <QualificacaoFields />}
          {kind === "manutencao" && <ManutencaoFields />}

          <label className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Anexo / evidência
            </span>
            <div className="mt-1 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-4">
              <Paperclip className="h-4 w-4 text-accent" />
              <input name="anexo" type="file" accept={uploadAccept} className="text-sm" />
            </div>
            <span className="mt-1 block text-xs text-muted-foreground">
              PDF, imagem, Word ou Excel. O arquivo fica privado no Storage da empresa.
            </span>
          </label>

          {error && (
            <div className="md:col-span-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </div>
          )}

          {uploadProgress !== null && (
            <UploadProgress value={uploadProgress} label="Enviando anexo..." />
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium cf-transition hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cf-transition hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Wrench className="h-4 w-4 animate-pulse" /> Salvando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Salvar registro
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function UploadProgress({ value, label }: { value: number; label: string }) {
  return (
    <div className="md:col-span-2 rounded-2xl border border-accent/20 bg-accent/5 p-4">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function UploadSuccessBanner({
  label,
  url,
  onDismiss,
  onVisualizar,
}: {
  label: string;
  url?: string;
  onDismiss: () => void;
  onVisualizar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm shadow-sm">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          Anexo salvo com sucesso em <strong>{label}</strong>.
        </span>
      </div>
      <div className="flex items-center gap-2">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={onVisualizar}
            className="rounded-xl border border-success/30 bg-background px-3 py-1.5 text-xs font-semibold text-success cf-transition hover:bg-muted"
          >
            Visualizar anexo
          </a>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium cf-transition hover:bg-muted"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function CalibracaoFields() {
  return (
    <>
      <Input label="Data da calibração" name="data_calibracao" type="date" required />
      <Input label="Vencimento" name="data_vencimento" type="date" />
      <Input label="Nº do certificado" name="numero_certificado" />
      <Input label="Laboratório responsável" name="laboratorio_responsavel" />
      <Select label="Resultado" name="resultado" required>
        <option value="aprovado">Aprovado</option>
        <option value="aprovado_restricao">Aprovado com restrição</option>
        <option value="reprovado">Reprovado</option>
        <option value="nao_aplicavel">Não aplicável</option>
      </Select>
      <TextArea label="Observações" name="observacoes" />
    </>
  );
}

function QualificacaoFields() {
  return (
    <>
      <Select label="Tipo de qualificação" name="tipo" required>
        <option value="instalacao">Instalação</option>
        <option value="operacao">Operação</option>
        <option value="desempenho">Desempenho</option>
        <option value="mapeamento_termico">Mapeamento térmico</option>
      </Select>
      <Input label="Data da qualificação" name="data_qualificacao" type="date" required />
      <Input label="Vencimento" name="data_vencimento" type="date" />
      <Input label="Empresa executora" name="empresa_executora" />
      <Select label="Resultado" name="resultado" required>
        <option value="aprovado">Aprovado</option>
        <option value="aprovado_restricao">Aprovado com restrição</option>
        <option value="reprovado">Reprovado</option>
        <option value="nao_aplicavel">Não aplicável</option>
      </Select>
      <TextArea label="Observações" name="observacoes" />
    </>
  );
}

function ManutencaoFields() {
  return (
    <>
      <Select label="Tipo de manutenção" name="natureza" required>
        <option value="preventiva">Preventiva</option>
        <option value="corretiva">Corretiva</option>
      </Select>
      <Input label="Data da manutenção" name="data_manutencao" type="date" required />
      <Input label="Nome do serviço" name="nome_servico" />
      <Input label="Tipo de serviço" name="tipo_servico" />
      <Input label="Próxima manutenção" name="proxima_manutencao" type="date" />
      <Input label="Periodicidade (meses)" name="periodicidade_meses" type="number" />
      <Input label="Nº da ordem de serviço" name="numero_ordem_servico" />
      <Input label="Empresa responsável" name="empresa_responsavel" />
      <Input label="Técnico responsável" name="tecnico_responsavel" />
      <Select label="Status da execução" name="status_execucao">
        <option value="concluida">Concluída</option>
        <option value="programada">Programada</option>
        <option value="em_andamento">Em andamento</option>
        <option value="cancelada">Cancelada</option>
      </Select>
      <Input label="Falha apresentada (corretiva)" name="falha_apresentada" />
      <Input label="Prioridade" name="prioridade" />
      <TextArea label="Diagnóstico" name="diagnostico" />
      <TextArea label="Causa raiz" name="causa_raiz" />
      <TextArea label="Ação realizada" name="acao_realizada" />
      <TextArea label="Observações" name="observacoes" />
    </>
  );
}

function AttachmentPreview({
  item,
  empresaId,
  onClose,
}: {
  item: EquipamentoHistoricoItem;
  empresaId: string | null;
  onClose: () => void;
}) {
  const modulo = item.modulo ?? "";
  const registroId = item.registroId ?? item.id ?? "";
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["evidencias-timeline", empresaId, modulo, registroId],
    queryFn: () => evidenciasTimelineService.listar(empresaId!, modulo, registroId),
    enabled: Boolean(empresaId && modulo && registroId),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">{item.documentoNome || item.descricao}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.tipo ? `Tipo: ${humanizeTipo(item.tipo)}` : "Registro do equipamento"}
              {item.data ? ` · Data: ${formatDateBR(item.data)}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
            aria-label="Fechar visualização"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-[420px] overflow-auto bg-muted/30 p-5">
          <AttachmentViewer
            url={item.documentoUrl}
            name={item.documentoNome}
            mimeType={item.documentoMimeType}
            title={item.documentoNome || item.descricao}
            emptyDescription="Este item ainda não possui arquivo disponível para abrir no navegador. Quando houver anexo real, ele será exibido aqui sem precisar baixar."
            onView={() => {
              if (item.anexoId) void edgeFunctionsService.registrarEventoAnexo(item.anexoId);
            }}
            onDownload={() => {
              if (item.anexoId)
                void edgeFunctionsService.registrarEventoAnexo(item.anexoId, "download_anexo");
            }}
          />
          <div className="mt-5">
            <EvidenciasTimeline items={timeline} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
    </label>
  );
}

function Select({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <select
        name={name}
        required={required}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
      >
        {children}
      </select>
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="md:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <textarea
        name={name}
        rows={3}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
    </label>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/25 p-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {humanizeTexto(k)}
      </dt>
      <dd className="mt-2 font-semibold">{humanizeTexto(v || "-")}</dd>
    </div>
  );
}

function humanizeTipo(value: string) {
  return value.replaceAll("_", " ");
}

function humanizeTexto(value: string) {
  return value
    .replaceAll("CalibraÃ§Ã£o", "Calibração")
    .replaceAll("QualificaÃ§Ã£o", "Qualificação")
    .replaceAll("ManutenÃ§Ã£o", "Manutenção")
    .replaceAll("laboratÃ³rio", "laboratório")
    .replaceAll("tÃ©cnico", "técnico")
    .replaceAll("Â·", "·")
    .replaceAll("PrÃ³ximo", "Próximo")
    .replaceAll("HistÃ³rico", "Histórico")
    .replaceAll("PendÃªncias", "Pendências");
}

function required(formData: FormData, key: string) {
  const value = optional(formData, key);
  if (!value) throw new Error("Preencha todos os campos obrigatórios.");
  return value;
}

function optional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
