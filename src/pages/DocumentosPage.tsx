import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Filter, Plus, X } from "lucide-react";
import { useDocumentos } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { documentosService, edgeFunctionsService } from "@/services";
import type { DocumentoResumo } from "@/types";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

const uploadAccept =
  "application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function DocumentosPage() {
  const { selectedCompanyId, selectedCompany } = useSession();
  const { data: documentos = [] } = useDocumentos();
  const queryClient = useQueryClient();
  const [documentoPreview, setDocumentoPreview] = useState<DocumentoResumo | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedCompanyId) throw new Error("Selecione uma empresa antes de salvar.");

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

      const file = formData.get("anexo");
      if (created.id && file instanceof File && file.size > 0) {
        await edgeFunctionsService.uploadAnexoSeguro(file, {
          empresaId: selectedCompanyId,
          modulo: "documentos",
          registroId: created.id,
          finalidade: "principal",
        });
      }

      return created;
    },
    onSuccess: async () => {
      setModalAberto(false);
      setErro(null);
      await queryClient.invalidateQueries({ queryKey: ["documentos", selectedCompanyId] });
    },
    onError: (error) => {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o documento.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    createMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <AppShell
      title="Documentos"
      description="Licenças, alvarás, contratos e evidências regulatórias com versionamento."
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile
          label="Em dia"
          value={documentos.filter((item) => item.status === "ok").length}
          tone="ok"
        />
        <SummaryTile
          label="Atenção"
          value={documentos.filter((item) => item.status === "atencao").length}
          tone="atencao"
        />
        <SummaryTile
          label="Críticos"
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
            placeholder="Buscar por nome, número, órgão..."
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
                <th className="px-4 py-2.5 text-left font-medium">Número / Órgão</th>
                <th className="px-4 py-2.5 text-left font-medium">Responsável</th>
                <th className="px-4 py-2.5 text-left font-medium">Emissão</th>
                <th className="px-4 py-2.5 text-left font-medium">Vencimento</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-6 py-2.5 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documentos.map((documento) => (
                <tr key={documento.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <div className="font-medium">{documento.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {documento.tipo} · {documento.setor}
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
                      onClick={() => setDocumentoPreview(documento)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-accent hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" /> Visualizar
                    </button>
                  </td>
                </tr>
              ))}
              {documentos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="font-medium text-foreground">Nenhum documento cadastrado.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ambiente atual:{" "}
                        {selectedCompany?.nome_fantasia ?? "empresa não selecionada"}. Cadastre um
                        documento ou troque de empresa no seletor superior.
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
            Mostrando {documentos.length} de {documentos.length} documentos
          </span>
          <div className="flex items-center gap-1">
            <button className="h-7 rounded border border-border px-2 hover:bg-muted">
              Anterior
            </button>
            <button className="h-7 rounded border border-border px-2 hover:bg-muted">
              Próximo
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
          onSubmit={handleSubmit}
          onClose={() => {
            if (!createMutation.isPending) {
              setModalAberto(false);
              setErro(null);
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
              {documento.tipo} · {documento.setor} · {documento.numero}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar visualização"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-border p-5 text-sm lg:border-b-0 lg:border-r">
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
          </aside>

          <section className="min-h-[420px] overflow-auto bg-muted/30 p-5">
            {documento.anexoUrl ? (
              <iframe
                title={`Visualização de ${documento.nome}`}
                src={documento.anexoUrl}
                className="h-[70vh] min-h-[420px] w-full rounded-xl border border-border bg-background"
              />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-background p-8 text-center">
                <div className="max-w-md">
                  <Eye className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    Pré-visualização do registro
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Este documento ainda não possui arquivo disponível para abrir no navegador.
                    Mesmo assim, você consegue conferir os dados principais sem baixar nada.
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
  onSubmit,
  onClose,
}: {
  erro: string | null;
  isSaving: boolean;
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
              O documento será salvo apenas no ambiente da empresa selecionada.
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
          <Input label="Número do documento" name="numero_documento" />
          <Input label="Órgão emissor" name="orgao_emissor" />
          <Input label="Setor / unidade" name="setor_unidade" />
          <Input label="Data de emissão" name="data_emissao" type="date" />
          <Input label="Data de vencimento" name="data_vencimento" type="date" />
          <Input label="Periodicidade (meses)" name="periodicidade_meses" type="number" />
          <TextArea label="Observações" name="observacoes" />

          <label className="md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Anexo / evidência
            </span>
            <input
              name="anexo"
              type="file"
              accept={uploadAccept}
              className="mt-1 w-full rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              PDF, imagem, Word ou Excel. O arquivo fica privado no Storage da empresa.
            </span>
          </label>

          {erro && (
            <div className="md:col-span-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {erro}
            </div>
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
  if (!value) throw new Error("Preencha os campos obrigatórios.");
  return value;
}

function optional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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
