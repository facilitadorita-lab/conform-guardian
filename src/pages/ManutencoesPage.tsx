import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Search, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useEquipamentos, useManutencoes } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { edgeFunctionsService, manutencoesService } from "@/services";
import type { ManutencaoResumo } from "@/types";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

const uploadAccept =
  "application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type FiltroNatureza = "todas" | "preventiva" | "corretiva";

export function ManutencoesPage() {
  const { selectedCompanyId } = useSession();
  const [busca, setBusca] = useState("");
  const [natureza, setNatureza] = useState<FiltroNatureza>("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [preview, setPreview] = useState<ManutencaoResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const params = useMemo(
    () => ({
      busca: busca.trim() || undefined,
      natureza: natureza === "todas" ? undefined : natureza,
      limite: 100,
    }),
    [busca, natureza],
  );

  const { data: manutencoes = [], isLoading } = useManutencoes(params);
  const { data: equipamentos = [] } = useEquipamentos();

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedCompanyId) throw new Error("Selecione uma empresa antes de salvar.");

      const equipamentoId = optional(formData, "equipamento_id");
      const naturezaSelecionada = required(formData, "natureza");
      const payload = {
        equipamento_id: equipamentoId || undefined,
        nome_servico: optional(formData, "nome_servico") || `Manutenção ${naturezaSelecionada}`,
        natureza: naturezaSelecionada,
        tipo_servico: required(formData, "tipo_servico"),
        status_execucao: required(formData, "status_execucao"),
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

      const created = await manutencoesService.criar(selectedCompanyId, payload);
      const registroId = created.id;
      const file = formData.get("anexo");

      if (registroId && file instanceof File && file.size > 0) {
        await edgeFunctionsService.uploadAnexoSeguro(file, {
          empresaId: selectedCompanyId,
          modulo: "manutencoes",
          registroId,
          finalidade: "evidencia",
        });
      }

      return created;
    },
    onSuccess: async (_, formData) => {
      setModalAberto(false);
      setErro(null);
      const equipamentoId = optional(formData, "equipamento_id");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["manutencoes", selectedCompanyId] }),
        equipamentoId
          ? queryClient.invalidateQueries({
              queryKey: ["equipamentos", selectedCompanyId, equipamentoId],
            })
          : Promise.resolve(),
      ]);
    },
    onError: (error) => {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a manutenção.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    createMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <AppShell
      title="Manutenções"
      description="Preventivas, corretivas e serviços recorrentes gerais com evidências e ordens de serviço."
      actions={
        <button
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova manutenção
        </button>
      }
    >
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 lg:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por equipamento, OS, técnico ou serviço..."
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "todas", label: "Todas" },
            { id: "preventiva", label: "Preventiva" },
            { id: "corretiva", label: "Corretiva" },
          ].map((filtro) => (
            <button
              key={filtro.id}
              onClick={() => setNatureza(filtro.id as FiltroNatureza)}
              className={`rounded-md border px-3 py-2 text-sm ${
                natureza === filtro.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {filtro.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Equipamento / Serviço</th>
              <th className="px-4 py-2.5 text-left font-medium">Tipo</th>
              <th className="px-4 py-2.5 text-left font-medium">Data</th>
              <th className="px-4 py-2.5 text-left font-medium">Responsável</th>
              <th className="px-4 py-2.5 text-left font-medium">OS</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-6 py-2.5 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-muted-foreground">
                  Carregando manutenções...
                </td>
              </tr>
            )}

            {!isLoading &&
              manutencoes.map((manutencao) => (
                <tr key={manutencao.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3">
                    {manutencao.equipamentoId ? (
                      <Link
                        to="/equipamentos/$id"
                        params={{ id: manutencao.equipamentoId }}
                        className="font-medium text-foreground hover:text-accent hover:underline"
                      >
                        {manutencao.equipamento}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{manutencao.equipamento}</span>
                    )}
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {manutencao.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{manutencao.tipo}</td>
                  <td className="px-4 py-3 tabular-nums">{formatDateBR(manutencao.data)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{manutencao.responsavel}</td>
                  <td className="px-4 py-3 font-mono text-xs">{manutencao.os}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={manutencao.status}>
                      {statusLabel(manutencao.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setPreview(manutencao)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-accent hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" /> Detalhes
                    </button>
                  </td>
                </tr>
              ))}

            {!isLoading && manutencoes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  Nenhuma manutenção encontrada para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <NovaManutencaoModal
          equipamentos={equipamentos}
          erro={erro}
          isSaving={createMutation.isPending}
          onClose={() => {
            if (!createMutation.isPending) {
              setModalAberto(false);
              setErro(null);
            }
          }}
          onSubmit={handleSubmit}
        />
      )}

      {preview && <ManutencaoPreview manutencao={preview} onClose={() => setPreview(null)} />}
    </AppShell>
  );
}

function NovaManutencaoModal({
  equipamentos,
  erro,
  isSaving,
  onClose,
  onSubmit,
}: {
  equipamentos: { id: string; nome: string; codigo: string }[];
  erro: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Nova manutenção</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vincule a um equipamento para aparecer automaticamente no histórico dele.
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
          <label className="md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Equipamento
            </span>
            <select
              name="equipamento_id"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Serviço geral sem equipamento</option>
              {equipamentos.map((equipamento) => (
                <option key={equipamento.id} value={equipamento.id}>
                  {equipamento.nome} · {equipamento.codigo}
                </option>
              ))}
            </select>
          </label>

          <Select label="Tipo de manutenção" name="natureza" required>
            <option value="preventiva">Preventiva</option>
            <option value="corretiva">Corretiva</option>
          </Select>
          <Select label="Tipo de serviço" name="tipo_servico" required>
            <option value="inspecao">Inspeção</option>
            <option value="limpeza">Limpeza</option>
            <option value="validacao">Validação</option>
            <option value="reparo">Reparo</option>
            <option value="troca_peca">Troca de peça</option>
            <option value="ajuste">Ajuste</option>
            <option value="outro">Outro</option>
          </Select>
          <Input label="Data da manutenção" name="data_manutencao" type="date" required />
          <Input label="Próxima manutenção" name="proxima_manutencao" type="date" />
          <Input label="Nome do serviço" name="nome_servico" />
          <Input label="Periodicidade (meses)" name="periodicidade_meses" type="number" />
          <Input label="Nº da ordem de serviço" name="numero_ordem_servico" />
          <Select label="Status da execução" name="status_execucao" required>
            <option value="concluida">Concluída</option>
            <option value="programada">Programada</option>
            <option value="em_andamento">Em andamento</option>
            <option value="cancelada">Cancelada</option>
          </Select>
          <Input label="Empresa responsável" name="empresa_responsavel" />
          <Input label="Técnico responsável" name="tecnico_responsavel" />
          <Input label="Falha apresentada (corretiva)" name="falha_apresentada" />
          <Input label="Prioridade" name="prioridade" />
          <TextArea label="Diagnóstico" name="diagnostico" />
          <TextArea label="Causa raiz" name="causa_raiz" />
          <TextArea label="Ação realizada" name="acao_realizada" />
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
            {isSaving ? "Salvando..." : "Salvar manutenção"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ManutencaoPreview({
  manutencao,
  onClose,
}: {
  manutencao: ManutencaoResumo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">{manutencao.equipamento}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{manutencao.tipo}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
            aria-label="Fechar detalhes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="grid gap-4 p-5 text-sm md:grid-cols-2">
          <PreviewField label="Data" value={formatDateBR(manutencao.data)} />
          <PreviewField label="Responsável" value={manutencao.responsavel} />
          <PreviewField label="OS" value={manutencao.os} />
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <StatusBadge tone={manutencao.status}>{statusLabel(manutencao.status)}</StatusBadge>
            </dd>
          </div>
          {manutencao.equipamentoId && (
            <div className="md:col-span-2">
              <Link
                to="/equipamentos/$id"
                params={{ id: manutencao.equipamentoId }}
                className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-medium text-accent hover:bg-muted"
              >
                Abrir histórico completo do equipamento
              </Link>
            </div>
          )}
        </dl>
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
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        name={name}
        required={required}
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {children}
      </select>
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
      <dd className="mt-0.5 font-medium text-foreground">{value || "-"}</dd>
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
