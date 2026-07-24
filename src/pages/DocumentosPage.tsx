import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileClock,
  FileText,
  FileWarning,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { SectionHeader } from "@/components/conform/dashboard-widgets";
import { EmptyState, Surface } from "@/components/conform/surface";
import { AttachmentViewer } from "@/components/attachment-viewer";
import { EvidenciasTimeline } from "@/components/evidencias-timeline";
import { DocumentWorkflowPanel } from "@/components/document-workflow-panel";
import { useDocumentos } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { documentosService, edgeFunctionsService, evidenciasTimelineService } from "@/services";
import type { DocumentoResumo, StatusConformidade } from "@/types";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

const uploadAccept =
  "application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type StatusFilter = StatusConformidade | "todos";
type AnexoFilter = "todos" | "com_anexo" | "sem_anexo";
type SortKey = "vencimento" | "nome" | "status";

const pageSize = 12;

export function DocumentosPage() {
  const { podeEscrever, selectedCompanyId, selectedCompany } = useSession();
  const empresaNome = selectedCompany?.razao_social ?? "empresa não selecionada";
  const { data: documentos = [], isLoading, isError, error, refetch } = useDocumentos();
  const queryClient = useQueryClient();
  const [documentoPreview, setDocumentoPreview] = useState<DocumentoResumo | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFilter>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [responsavelFiltro, setResponsavelFiltro] = useState("todos");
  const [anexoFiltro, setAnexoFiltro] = useState<AnexoFilter>("todos");
  const [ordenarPor, setOrdenarPor] = useState<SortKey>("vencimento");
  const [page, setPage] = useState(1);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUpload, setLastUpload] = useState<{
    label: string;
    url?: string;
    anexoId?: string;
  } | null>(null);

  const categorias = useMemo(
    () => uniqueOptions(documentos.map((item) => item.categoria)),
    [documentos],
  );
  const responsaveis = useMemo(
    () => uniqueOptions(documentos.map((item) => item.responsavel)),
    [documentos],
  );
  const summary = useMemo(() => buildSummary(documentos), [documentos]);

  const filtrosAtivos = [
    busca.trim() ? "busca" : null,
    statusFiltro !== "todos" ? "status" : null,
    categoriaFiltro !== "todos" ? "categoria" : null,
    responsavelFiltro !== "todos" ? "responsável" : null,
    anexoFiltro !== "todos" ? "anexo" : null,
  ].filter(Boolean).length;

  const documentosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);

    return documentos
      .filter((documento) => {
        const correspondeBusca =
          !termo ||
          normalizarBusca(
            [
              documento.nome,
              documento.numero,
              documento.orgao,
              documento.categoria,
              documento.tipo,
              documento.setor,
              documento.responsavel,
            ].join(" "),
          ).includes(termo);

        const correspondeStatus = statusFiltro === "todos" || documento.status === statusFiltro;
        const correspondeCategoria =
          categoriaFiltro === "todos" || documento.categoria === categoriaFiltro;
        const correspondeResponsavel =
          responsavelFiltro === "todos" || documento.responsavel === responsavelFiltro;
        const correspondeAnexo =
          anexoFiltro === "todos" ||
          (anexoFiltro === "com_anexo" ? Boolean(documento.anexoId) : !documento.anexoId);

        return (
          correspondeBusca &&
          correspondeStatus &&
          correspondeCategoria &&
          correspondeResponsavel &&
          correspondeAnexo
        );
      })
      .sort((a, b) => sortDocumentos(a, b, ordenarPor));
  }, [
    anexoFiltro,
    busca,
    categoriaFiltro,
    documentos,
    ordenarPor,
    responsavelFiltro,
    statusFiltro,
  ]);

  const totalPages = Math.max(1, Math.ceil(documentosFiltrados.length / pageSize));
  const documentosPaginados = documentosFiltrados.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [anexoFiltro, busca, categoriaFiltro, ordenarPor, responsavelFiltro, statusFiltro]);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!podeEscrever) throw new Error("Seu perfil possui acesso somente para consulta.");
      if (!selectedCompanyId) throw new Error("Selecione uma empresa antes de salvar.");

      const file = formData.get("anexo");
      if (file instanceof File && file.size > 0) {
        edgeFunctionsService.validateAttachmentFile(file);
      }

      const created = await documentosService.criar(selectedCompanyId, {
        nome: required(formData, "nome"),
        numero_documento: optional(formData, "numero_documento"),
        orgao_emissor: optional(formData, "orgao_emissor"),
        data_emissao: optional(formData, "data_emissao"),
        data_vencimento: optional(formData, "data_vencimento"),
        periodicidade_meses: optional(formData, "periodicidade_meses"),
        setor_unidade: optional(formData, "setor_unidade"),
        exige_anexo: true,
        observacoes: optional(formData, "observacoes"),
      });

      let upload: { anexoId?: string; signedUrl?: string } | null = null;
      if (created.id && file instanceof File && file.size > 0) {
        setUploadProgress(0);
        upload = await edgeFunctionsService.uploadAnexoSeguro(file, {
          empresaId: selectedCompanyId,
          modulo: "documentos",
          registroId: created.id,
          finalidade: "principal",
          onProgress: setUploadProgress,
        });
      }

      return { created, upload };
    },
    onSuccess: async ({ created, upload }) => {
      setModalAberto(false);
      setErro(null);
      setUploadProgress(null);
      if (upload?.anexoId || upload?.signedUrl) {
        setLastUpload({
          label: created.nome ?? "Documento",
          url: upload.signedUrl,
          anexoId: upload.anexoId,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["documentos", selectedCompanyId] });
    },
    onError: (error) => {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o documento.");
      setUploadProgress(null);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setLastUpload(null);
    createMutation.mutate(new FormData(event.currentTarget));
  }

  function handlePreview(documento: DocumentoResumo) {
    setDocumentoPreview(documento);
  }

  function limparFiltros() {
    setBusca("");
    setStatusFiltro("todos");
    setCategoriaFiltro("todos");
    setResponsavelFiltro("todos");
    setAnexoFiltro("todos");
    setOrdenarPor("vencimento");
  }

  return (
    <AppShell
      title="Documentos"
      description="Centralize documentos, acompanhe vencimentos e mantenha evidências prontas para auditorias."
      actions={
        <>
          <button
            type="button"
            onClick={() => exportDocumentosCsv(documentosFiltrados, empresaNome)}
            disabled={documentosFiltrados.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm cf-transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            disabled={!podeEscrever}
            title={!podeEscrever ? "Seu perfil possui acesso somente para consulta" : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm cf-transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Novo documento
          </button>
        </>
      }
    >
      {lastUpload ? (
        <UploadSuccessBanner
          label={lastUpload.label}
          url={lastUpload.url}
          onDismiss={() => setLastUpload(null)}
          onVisualizar={() => {
            if (lastUpload.anexoId)
              void edgeFunctionsService.registrarEventoAnexo(lastUpload.anexoId);
          }}
        />
      ) : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <DocumentStatCard label="Total" value={summary.total} icon={FileText} tone="neutral" />
        <DocumentStatCard label="Vigentes" value={summary.ok} icon={FileCheck2} tone="ok" />
        <DocumentStatCard
          label="Vencendo"
          value={summary.atencao}
          icon={FileClock}
          tone="atencao"
        />
        <DocumentStatCard
          label="Críticos"
          value={summary.critico}
          icon={FileWarning}
          tone="critico"
        />
        <DocumentStatCard
          label="Vencidos"
          value={summary.vencido}
          icon={FileWarning}
          tone="vencido"
        />
      </section>

      <Surface className="p-0">
        <div className="border-b border-border p-5">
          <SectionHeader
            title="Gestão documental"
            description={`${documentosFiltrados.length} de ${documentos.length} documentos no ambiente ${empresaNome}.`}
            action={
              filtrosAtivos > 0 ? (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Limpar {filtrosAtivos} filtro{filtrosAtivos === 1 ? "" : "s"}
                </button>
              ) : null
            }
          />

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Buscar por nome, número, órgão, setor..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </label>

            <Select
              ariaLabel="Filtrar por status"
              value={statusFiltro}
              onChange={(value) => setStatusFiltro(value as StatusFilter)}
              options={[
                ["todos", "Todos os status"],
                ["ok", "Vigentes"],
                ["atencao", "Vencendo"],
                ["critico", "Críticos"],
                ["vencido", "Vencidos"],
                ["sem_validade", "Sem validade"],
              ]}
            />
            <Select
              ariaLabel="Filtrar por categoria"
              value={categoriaFiltro}
              onChange={setCategoriaFiltro}
              options={[
                ["todos", "Todas categorias"],
                ...categorias.map((item) => [item, item] as const),
              ]}
            />
            <Select
              ariaLabel="Filtrar por responsável"
              value={responsavelFiltro}
              onChange={setResponsavelFiltro}
              options={[
                ["todos", "Todos responsáveis"],
                ...responsaveis.map((item) => [item, item] as const),
              ]}
            />
            <Select
              ariaLabel="Filtrar por anexo"
              value={anexoFiltro}
              onChange={(value) => setAnexoFiltro(value as AnexoFilter)}
              options={[
                ["todos", "Todos anexos"],
                ["com_anexo", "Com anexo"],
                ["sem_anexo", "Sem anexo"],
              ]}
            />
            <Select
              ariaLabel="Ordenar documentos"
              value={ordenarPor}
              onChange={(value) => setOrdenarPor(value as SortKey)}
              options={[
                ["vencimento", "Ordenar por vencimento"],
                ["nome", "Ordenar por nome"],
                ["status", "Ordenar por status"],
              ]}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              {filtrosAtivos > 0
                ? `${filtrosAtivos} filtro(s) aplicado(s).`
                : "Use os filtros para localizar documentos por situação, categoria, responsável ou anexo."}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={FileWarning}
            title="Não foi possível carregar os documentos"
            description={error instanceof Error ? error.message : "Tente novamente em instantes."}
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-accent hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </button>
            }
          />
        ) : documentosPaginados.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Documento</th>
                    <th className="px-4 py-3 text-left font-medium">Categoria</th>
                    <th className="px-4 py-3 text-left font-medium">Número / Órgão</th>
                    <th className="px-4 py-3 text-left font-medium">Responsável</th>
                    <th className="px-4 py-3 text-left font-medium">Validade</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documentosPaginados.map((documento) => (
                    <DocumentoRow
                      key={documento.id}
                      documento={documento}
                      onPreview={() => handlePreview(documento)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-5 lg:hidden">
              {documentosPaginados.map((documento) => (
                <DocumentoMobileCard
                  key={documento.id}
                  documento={documento}
                  onPreview={() => handlePreview(documento)}
                />
              ))}
            </div>

            <PaginationFooter
              page={page}
              totalPages={totalPages}
              total={documentosFiltrados.length}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
            />
          </>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={documentos.length === 0 ? FileText : Search}
              title={
                documentos.length === 0
                  ? "Nenhum documento cadastrado"
                  : "Nenhum resultado encontrado"
              }
              description={
                documentos.length === 0
                  ? `Cadastre o primeiro documento para acompanhar validade, responsáveis, anexos e histórico da empresa ${empresaNome}.`
                  : "Ajuste os filtros ou limpe a busca para visualizar os documentos cadastrados."
              }
              action={
                documentos.length === 0 && podeEscrever ? (
                  <button
                    type="button"
                    onClick={() => setModalAberto(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" /> Cadastrar documento
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={limparFiltros}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Limpar filtros
                  </button>
                )
              }
            />
          </div>
        )}
      </Surface>

      {documentoPreview ? (
        <DocumentPreviewModal
          documento={documentoPreview}
          empresaId={selectedCompanyId}
          onClose={() => setDocumentoPreview(null)}
        />
      ) : null}

      {modalAberto && podeEscrever ? (
        <NovoDocumentoModal
          erro={erro}
          isSaving={createMutation.isPending}
          uploadProgress={uploadProgress}
          onSubmit={handleSubmit}
          onClose={() => {
            if (!createMutation.isPending) {
              setModalAberto(false);
              setErro(null);
              setUploadProgress(null);
            }
          }}
        />
      ) : null}
    </AppShell>
  );
}

function DocumentoRow({
  documento,
  onPreview,
}: {
  documento: DocumentoResumo;
  onPreview: () => void;
}) {
  return (
    <tr className="cf-transition hover:bg-muted/30">
      <td className="px-6 py-4">
        <div className="font-medium text-foreground">{documento.nome}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{documento.tipo}</span>
          <span>•</span>
          <span>{documento.setor}</span>
          {documento.anexoId ? (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-success">
                <ShieldCheck className="h-3 w-3" /> Anexo ativo
              </span>
            </>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{documento.categoria}</td>
      <td className="px-4 py-4">
        <div className="tabular-nums">{documento.numero}</div>
        <div className="text-xs text-muted-foreground">{documento.orgao}</div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{documento.responsavel}</td>
      <td className="px-4 py-4">
        <div className="font-medium tabular-nums">{formatDateBR(documento.vencimento)}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Emitido em {formatDateBR(documento.emissao)}
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge tone={documento.status}>{statusLabel(documento.status)}</StatusBadge>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-accent cf-transition hover:bg-muted"
        >
          <Eye className="h-3.5 w-3.5" /> Visualizar
        </button>
      </td>
    </tr>
  );
}

function DocumentoMobileCard({
  documento,
  onPreview,
}: {
  documento: DocumentoResumo;
  onPreview: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{documento.nome}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {documento.categoria} • {documento.setor}
          </p>
        </div>
        <StatusBadge tone={documento.status}>{statusLabel(documento.status)}</StatusBadge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Info label="Responsável" value={documento.responsavel} />
        <Info label="Vencimento" value={formatDateBR(documento.vencimento)} />
        <Info label="Órgão" value={documento.orgao} />
        <Info label="Anexo" value={documento.anexoId ? "Disponível" : "Não enviado"} />
      </div>
      <button
        type="button"
        onClick={onPreview}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-accent hover:bg-muted"
      >
        <Eye className="h-3.5 w-3.5" /> Visualizar documento
      </button>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function DocumentPreviewModal({
  documento,
  empresaId,
  onClose,
}: {
  documento: DocumentoResumo;
  empresaId: string | null;
  onClose: () => void;
}) {
  const { podeEscrever } = useSession();
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ["evidencias-timeline", empresaId, "documentos", documento.id],
    queryFn: () => evidenciasTimelineService.listar(empresaId!, "documentos", documento.id),
    enabled: Boolean(empresaId && documento.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
              {documento.nome}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {documento.tipo} • {documento.setor} • {documento.numero}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar visualização"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_1fr]">
          <aside className="overflow-auto border-b border-border p-5 text-sm lg:border-b-0 lg:border-r">
            <dl className="space-y-4">
              <PreviewField label="Categoria" value={documento.categoria} />
              <PreviewField label="Órgão" value={documento.orgao} />
              <PreviewField label="Responsável" value={documento.responsavel} />
              <PreviewField label="Emissão" value={formatDateBR(documento.emissao)} />
              <PreviewField label="Vencimento" value={formatDateBR(documento.vencimento)} />
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <StatusBadge tone={documento.status}>{statusLabel(documento.status)}</StatusBadge>
                </dd>
              </div>
            </dl>
            <div className="mt-6">
              <EvidenciasTimeline items={timeline} isLoading={isLoading} />
            </div>
            {empresaId ? (
              <DocumentWorkflowPanel
                companyId={empresaId}
                documentId={documento.id}
                canWrite={podeEscrever}
              />
            ) : null}
          </aside>

          <section className="min-h-[420px] overflow-auto bg-muted/30 p-5">
            <AttachmentViewer
              url={documento.anexoUrl}
              name={documento.anexoNome}
              mimeType={documento.anexoMimeType}
              title={documento.nome}
              emptyDescription="Este documento ainda não possui arquivo disponível para abrir no navegador. Mesmo assim, os dados principais seguem disponíveis para conferência."
              onView={() => {
                if (documento.anexoId)
                  void edgeFunctionsService.registrarEventoAnexo(documento.anexoId);
              }}
              onDownload={() => {
                if (documento.anexoId)
                  void edgeFunctionsService.registrarEventoAnexo(
                    documento.anexoId,
                    "download_anexo",
                  );
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function NovoDocumentoModal({
  erro,
  isSaving,
  uploadProgress,
  onSubmit,
  onClose,
}: {
  erro: string | null;
  isSaving: boolean;
  uploadProgress: number | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Cadastro documental
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Novo documento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O documento será salvo apenas no ambiente da empresa selecionada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Informações principais</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input label="Nome do documento" name="nome" required />
              <Input label="Número do documento" name="numero_documento" />
              <Input label="Órgão emissor" name="orgao_emissor" />
              <Input label="Setor / unidade" name="setor_unidade" />
              <Input label="Data de emissão" name="data_emissao" type="date" />
              <Input label="Data de vencimento" name="data_vencimento" type="date" />
              <Input label="Periodicidade (meses)" name="periodicidade_meses" type="number" />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">Evidência e observações</h3>
            <div className="mt-4 grid gap-4">
              <TextArea label="Observações" name="observacoes" />
              <label>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Anexo / evidência
                </span>
                <input
                  name="anexo"
                  type="file"
                  accept={uploadAccept}
                  className="mt-1 w-full rounded-xl border border-dashed border-border bg-muted/30 px-3 py-3 text-sm"
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  PDF, imagem, Word ou Excel até 20 MB. O arquivo fica privado no Storage da
                  empresa.
                </span>
              </label>
            </div>
          </section>

          {erro ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {erro}
            </div>
          ) : null}

          {uploadProgress !== null ? (
            <UploadProgress value={uploadProgress} label="Enviando anexo..." />
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar documento"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Select({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: Array<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm cf-transition focus:border-accent focus:ring-4 focus:ring-accent/10"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function PaginationFooter({
  page,
  totalPages,
  total,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground">
      <span>
        Página {page} de {totalPages} • {total} documento{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          className="h-9 rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="h-9 rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function UploadProgress({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          Anexo salvo com sucesso em <strong>{label}</strong>.
        </span>
      </div>
      <div className="flex items-center gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={onVisualizar}
            className="rounded-xl border border-success/30 bg-background px-3 py-1.5 text-xs font-medium text-success hover:bg-muted"
          >
            Visualizar anexo
          </a>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Fechar
        </button>
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
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <textarea
        name={name}
        rows={3}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DocumentStatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "ok" | "atencao" | "critico" | "vencido" | "neutral";
  icon: typeof FileText;
}) {
  const styles = {
    ok: "text-success bg-success/10 border-success/20",
    atencao: "text-warning bg-warning/10 border-warning/25",
    critico: "text-danger bg-danger/10 border-danger/25",
    vencido: "text-danger bg-danger/10 border-danger/25",
    neutral: "text-primary bg-muted border-border",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-2xl border", styles)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function buildSummary(documentos: DocumentoResumo[]) {
  return {
    total: documentos.length,
    ok: documentos.filter((item) => item.status === "ok").length,
    atencao: documentos.filter((item) => item.status === "atencao").length,
    critico: documentos.filter((item) => item.status === "critico").length,
    vencido: documentos.filter((item) => item.status === "vencido").length,
    semValidade: documentos.filter((item) => item.status === "sem_validade").length,
  };
}

function required(formData: FormData, key: string): string {
  const value = optional(formData, key);
  if (!value) throw new Error("Preencha os campos obrigatórios.");
  return value;
}

function optional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizarBusca(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function sortDocumentos(a: DocumentoResumo, b: DocumentoResumo, sortKey: SortKey) {
  if (sortKey === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
  if (sortKey === "status") return statusWeight(a.status) - statusWeight(b.status);
  return dateTime(a.vencimento) - dateTime(b.vencimento);
}

function statusWeight(status: StatusConformidade) {
  const weights: Record<StatusConformidade, number> = {
    vencido: 0,
    critico: 1,
    atencao: 2,
    sem_validade: 3,
    ok: 4,
  };
  return weights[status];
}

function dateTime(value: string) {
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function exportDocumentosCsv(documentos: DocumentoResumo[], empresaNome: string) {
  const rows = [
    [
      "Documento",
      "Categoria",
      "Tipo",
      "Numero",
      "Orgao",
      "Responsavel",
      "Emissao",
      "Vencimento",
      "Status",
      "Setor",
    ],
    ...documentos.map((documento) => [
      documento.nome,
      documento.categoria,
      documento.tipo,
      documento.numero,
      documento.orgao,
      documento.responsavel,
      formatDateBR(documento.emissao),
      formatDateBR(documento.vencimento),
      statusLabel(documento.status),
      documento.setor,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `documentos-${slugify(empresaNome)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function slugify(value: string) {
  return (
    normalizarBusca(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "empresa"
  );
}
