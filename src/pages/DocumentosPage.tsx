import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Eye, Filter, Plus, X } from "lucide-react";
import { useAuthContext, useDocumentos } from "@/hooks/use-conform-data";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { documentosService, edgeFunctionsService } from "@/services";
import type { DocumentoResumo } from "@/types";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

const uploadAccept =
  "application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function DocumentosPage() {
  const { data: authContext } = useAuthContext();
  const selectedCompanyId = authContext?.empresaAtual.id ?? null;
  const empresaNome = authContext?.empresaAtual.nome ?? "empresa nao selecionada";
  const { data: documentos = [] } = useDocumentos();
  const queryClient = useQueryClient();
  const [documentoPreview, setDocumentoPreview] = useState<DocumentoResumo | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lastUpload, setLastUpload] = useState<{
    label: string;
    url?: string;
    anexoId?: string;
  } | null>(null);

  const documentosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return documentos;

    return documentos.filter((documento) =>
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
      ).includes(termo),
    );
  }, [busca, documentos]);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
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
      setErro(error instanceof Error ? error.message : "Nao foi possivel salvar o documento.");
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
    if (documento.anexoId) {
      void edgeFunctionsService.registrarEventoAnexo(documento.anexoId);
    }
  }

  return (
    <AppShell
      title="Documentos"
      description="Licencas, alvaras, contratos e evidencias regulatorias com versionamento."
      actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo documento
          </button>
        </>
      }
    >
      {lastUpload && (
        <UploadSuccessBanner
          label={lastUpload.label}
          url={lastUpload.url}
          onDismiss={() => setLastUpload(null)}
          onVisualizar={() => {
            if (lastUpload.anexoId) void edgeFunctionsService.registrarEventoAnexo(lastUpload.anexoId);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile
          label="Em dia"
          value={documentos.filter((item) => item.status === "ok").length}
          tone="ok"
        />
        <SummaryTile
          label="Atencao"
          value={documentos.filter((item) => item.status === "atencao").length}
          tone="atencao"
        />
        <SummaryTile
          label="Criticos"
          value={documentos.filter((item) => item.status === "critico").length}
          tone="critico"
        />
        <SummaryTile
          label="Vencidos"
          value={documentos.filter((item) => item.status === "vencido").length}
          tone="vencido"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <input
            placeholder="Buscar por nome, numero, orgao..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            className="h-9 min-w-[240px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option>Todos os status</option>
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option>Todas as categorias</option>
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option>Todos os responsaveis</option>
          </select>
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted">
            <Filter className="h-4 w-4" /> Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-2.5 text-left font-medium">Nome</th>
                <th className="px-4 py-2.5 text-left font-medium">Categoria</th>
                <th className="px-4 py-2.5 text-left font-medium">Numero / Orgao</th>
                <th className="px-4 py-2.5 text-left font-medium">Responsavel</th>
                <th className="px-4 py-2.5 text-left font-medium">Emissao</th>
                <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-6 py-2.5 text-right font-medium">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documentosFiltrados.map((documento) => (
                <tr key={documento.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <div className="font-medium">{documento.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {documento.tipo} - {documento.setor}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{documento.categoria}</td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">{documento.numero}</div>
                    <div className="text-xs text-muted-foreground">{documento.orgao}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{documento.responsavel}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatDateBR(documento.emissao)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDateBR(documento.vencimento)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={documento.status}>
                      {statusLabel(documento.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handlePreview(documento)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-accent hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" /> Visualizar
                    </button>
                  </td>
                </tr>
              ))}
              {documentosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="font-medium text-foreground">
                        {documentos.length === 0
                          ? "Nenhum documento cadastrado."
                          : "Nenhum documento encontrado para essa busca."}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ambiente atual: {empresaNome}.{" "}
                        {documentos.length === 0
                          ? "Cadastre um documento ou troque de empresa no seletor superior."
                          : "Revise o termo digitado ou limpe a busca para ver todos os documentos."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <span>
            Mostrando {documentosFiltrados.length} de {documentos.length} documentos
          </span>
          <div className="flex items-center gap-1">
            <button className="h-7 rounded border border-border px-2 hover:bg-muted">
              Anterior
            </button>
            <button className="h-7 rounded border border-border px-2 hover:bg-muted">
              Proximo
            </button>
          </div>
        </div>
      </div>

      {documentoPreview && (
        <DocumentPreviewModal
          documento={documentoPreview}
          onClose={() => setDocumentoPreview(null)}
        />
      )}

      {modalAberto && (
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
      )}
    </AppShell>
  );
}

function DocumentPreviewModal({
  documento,
  onClose,
}: {
  documento: DocumentoResumo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{documento.nome}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {documento.tipo} - {documento.setor} - {documento.numero}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar visualizacao"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-border p-5 text-sm lg:border-b-0 lg:border-r">
            <dl className="space-y-4">
              <PreviewField label="Categoria" value={documento.categoria} />
              <PreviewField label="Orgao" value={documento.orgao} />
              <PreviewField label="Responsavel" value={documento.responsavel} />
              <PreviewField label="Emissao" value={formatDateBR(documento.emissao)} />
              <PreviewField label="Vencimento" value={formatDateBR(documento.vencimento)} />
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <StatusBadge tone={documento.status}>{statusLabel(documento.status)}</StatusBadge>
                </dd>
              </div>
            </dl>
          </aside>

          <section className="min-h-[420px] overflow-auto bg-muted/30 p-5">
            {documento.anexoUrl ? (
              <iframe
                title={`Visualizacao de ${documento.nome}`}
                src={documento.anexoUrl}
                className="h-[70vh] min-h-[420px] w-full rounded-xl border border-border bg-background"
              />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-background p-8 text-center">
                <div className="max-w-md">
                  <Eye className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    Pre-visualizacao do registro
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Este documento ainda nao possui arquivo disponivel para abrir no navegador.
                    Mesmo assim, voce consegue conferir os dados principais sem baixar nada.
                  </p>
                </div>
              </div>
            )}
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
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Novo documento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O documento sera salvo apenas no ambiente da empresa selecionada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Input label="Nome do documento" name="nome" required />
          <Input label="Numero do documento" name="numero_documento" />
          <Input label="Orgao emissor" name="orgao_emissor" />
          <Input label="Setor / unidade" name="setor_unidade" />
          <Input label="Data de emissao" name="data_emissao" type="date" />
          <Input label="Data de vencimento" name="data_vencimento" type="date" />
          <Input label="Periodicidade (meses)" name="periodicidade_meses" type="number" />
          <TextArea label="Observacoes" name="observacoes" />

          <label className="md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Anexo / evidencia
            </span>
            <input
              name="anexo"
              type="file"
              accept={uploadAccept}
              className="mt-1 w-full rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              PDF, imagem, Word ou Excel ate 20 MB. O arquivo fica privado no Storage da empresa.
            </span>
          </label>

          {erro && (
            <div className="md:col-span-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {erro}
            </div>
          )}

          {uploadProgress !== null && (
            <UploadProgress value={uploadProgress} label="Enviando anexo..." />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar documento"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UploadProgress({ value, label }: { value: number; label: string }) {
  return (
    <div className="md:col-span-2 rounded-md border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${value}%` }} />
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
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
            className="rounded-md border border-success/30 bg-background px-3 py-1.5 text-xs font-medium text-success hover:bg-muted"
          >
            Visualizar anexo
          </a>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
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
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="md:col-span-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <textarea
        name={name}
        rows={3}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

function required(formData: FormData, key: string): string {
  const value = optional(formData, key);
  if (!value) throw new Error("Preencha os campos obrigatorios.");
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

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "atencao" | "critico" | "vencido";
}) {
  const toneColor = {
    ok: "text-success",
    atencao: "text-warning",
    critico: "text-danger",
    vencido: "text-danger",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneColor}`}>{value}</div>
    </div>
  );
}
