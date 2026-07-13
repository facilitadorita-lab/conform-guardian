import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useEquipamentos } from "@/hooks/use-conform-data";
import { useSession } from "@/hooks/use-session";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { equipamentosService } from "@/services";
import { formatDateBR } from "@/utils/date";
import { statusLabel } from "@/utils/status";

export function EquipamentosPage() {
  const { selectedCompanyId, selectedCompany } = useSession();
  const { data: equipamentos = [], isLoading } = useEquipamentos();
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedCompanyId) throw new Error("Selecione uma empresa antes de salvar.");

      return equipamentosService.criar(selectedCompanyId, {
        nome: required(formData, "nome"),
        codigo_interno: optional(formData, "codigo_interno"),
        numero_serie: optional(formData, "numero_serie"),
        fabricante: optional(formData, "fabricante"),
        modelo: optional(formData, "modelo"),
        setor: optional(formData, "setor"),
        localizacao: optional(formData, "localizacao"),
        criticidade: required(formData, "criticidade"),
        status: "ativo",
        observacoes: optional(formData, "observacoes"),
      });
    },
    onSuccess: async () => {
      setModalAberto(false);
      setErro(null);
      await queryClient.invalidateQueries({ queryKey: ["equipamentos", selectedCompanyId] });
    },
    onError: (error) => {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar o equipamento.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    createMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <AppShell
      title="Equipamentos"
      description="Cadastro de ativos com calibrações, qualificações, manutenções e evidências."
      actions={
        <>
          <button className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
            <Download className="h-4 w-4" /> Exportar
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo equipamento
          </button>
        </>
      }
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-6 py-2.5 text-left font-medium">Equipamento</th>
              <th className="px-4 py-2.5 text-left font-medium">Código</th>
              <th className="px-4 py-2.5 text-left font-medium">Fabricante / Modelo</th>
              <th className="px-4 py-2.5 text-left font-medium">Setor</th>
              <th className="px-4 py-2.5 text-left font-medium">Criticidade</th>
              <th className="px-4 py-2.5 text-left font-medium">Prox. Venc.</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-6 py-2.5 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                  Carregando equipamentos...
                </td>
              </tr>
            )}

            {!isLoading &&
              equipamentos.map((equipamento) => (
                <tr key={equipamento.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3">
                    <div className="font-medium">{equipamento.nome}</div>
                    <div className="text-xs text-muted-foreground">{equipamento.tipo}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{equipamento.codigo}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {equipamento.fabricante} · {equipamento.modelo}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{equipamento.setor}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        equipamento.criticidade === "Critica"
                          ? "border-danger/30 bg-danger/5 text-danger"
                          : equipamento.criticidade === "Alta"
                            ? "border-warning/40 bg-warning/5 text-warning"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {equipamento.criticidade}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatDateBR(equipamento.proximoVenc)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={equipamento.status}>
                      {statusLabel(equipamento.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      to="/equipamentos/$id"
                      params={{ id: equipamento.id }}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}

            {!isLoading && equipamentos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center">
                  <div className="mx-auto max-w-md">
                    <p className="font-medium text-foreground">Nenhum equipamento cadastrado.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ambiente atual: {selectedCompany?.nome_fantasia ?? "empresa não selecionada"}.
                      Cadastre um equipamento ou troque de empresa no seletor superior.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <NovoEquipamentoModal
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

function NovoEquipamentoModal({
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
            <h2 className="text-lg font-semibold">Novo equipamento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O equipamento será criado apenas no ambiente da empresa selecionada.
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
          <Input label="Nome" name="nome" required />
          <Input label="Código interno" name="codigo_interno" />
          <Input label="Número de série" name="numero_serie" />
          <Input label="Fabricante" name="fabricante" />
          <Input label="Modelo" name="modelo" />
          <Input label="Setor" name="setor" />
          <Input label="Localização" name="localizacao" />
          <Select label="Criticidade" name="criticidade" required>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </Select>
          <TextArea label="Observações" name="observacoes" />

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
            {isSaving ? "Salvando..." : "Salvar equipamento"}
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

function required(formData: FormData, key: string): string {
  const value = optional(formData, key);
  if (!value) throw new Error("Preencha os campos obrigatórios.");
  return value;
}

function optional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
