import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, CheckCircle2, Plus, ShieldCheck, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { useAuthContext } from "@/hooks/use-conform-data";
import { useAppSession } from "@/hooks/use-app-session";
import { adminMasterService } from "@/services/adminMasterService";

const checklistDocumentalPorTipo: Record<string, string[]> = {
  Clínica: [
    "Alvará Sanitário",
    "Licença de Funcionamento",
    "AVCB",
    "PGRSS",
    "Contrato de coleta de resíduos",
  ],
  Laboratório: [
    "Alvará Sanitário",
    "Licença de Funcionamento",
    "Certificado de calibração dos equipamentos críticos",
    "Plano de controle de qualidade",
    "PGRSS",
  ],
  Farmácia: [
    "Autorização de Funcionamento de Empresa",
    "Alvará Sanitário",
    "Certidão de Regularidade Técnica",
    "Licença de Funcionamento",
    "PGRSS",
  ],
  Distribuidora: [
    "AFE",
    "Licença Sanitária",
    "AVCB",
    "Procedimento de transporte",
    "Contrato de controle de pragas",
  ],
  "Clínica odontológica": [
    "Alvará Sanitário",
    "Licença de Funcionamento",
    "PGRSS",
    "Comprovante de responsável técnico",
    "Controle radiológico quando aplicável",
  ],
  "Diagnóstico por imagem": [
    "Alvará Sanitário",
    "Licença CNEN quando aplicável",
    "Plano de proteção radiológica",
    "Laudos de controle de qualidade",
    "PGRSS",
  ],
  Armazenamento: [
    "Licença de Funcionamento",
    "AVCB",
    "Mapeamento térmico",
    "Procedimento de monitoramento ambiental",
    "Controle de pragas",
  ],
  "Banco biológico": [
    "Alvará Sanitário",
    "Plano de contingência",
    "Qualificação térmica de equipamentos",
    "Registro de monitoramento",
    "PGRSS",
  ],
  "Laboratório de alimentos": [
    "Alvará Sanitário",
    "Manual de boas práticas",
    "Plano APPCC quando aplicável",
    "Controle de calibração",
    "Controle de pragas",
  ],
};

export function MasterEmpresasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: authContext, isLoading, error } = useAuthContext();
  const { selectCompany, refreshContext, selectedCompanyId } = useAppSession();
  const [modalAberto, setModalAberto] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);

  const criarEmpresaMutation = useMutation({
    mutationFn: (formData: FormData) =>
      adminMasterService.criarEmpresa({
        razao_social: required(formData, "razao_social"),
        nome_fantasia: required(formData, "nome_fantasia"),
        cnpj: required(formData, "cnpj"),
        tipo_estabelecimento: optional(formData, "tipo_estabelecimento"),
        segmento: optional(formData, "segmento"),
        cidade: optional(formData, "cidade"),
        estado: optional(formData, "estado"),
        email_principal: optional(formData, "email_principal"),
        responsavel_legal: optional(formData, "responsavel_legal"),
        responsavel_tecnico: optional(formData, "responsavel_tecnico"),
        observacoes: optional(formData, "observacoes"),
      }),
    onSuccess: async (result) => {
      setModalAberto(false);
      setErroCadastro(null);
      setMensagem(
        `${result.empresa.nome_fantasia} cadastrada com ${result.provisionamento_documentos.documentos_criados} documento(s) inicial(is) do perfil ${result.provisionamento_documentos.chaves.join(", ")}.`,
      );
      await queryClient.invalidateQueries();
      await refreshContext();
      await router.invalidate();
    },
    onError: (mutationError) => {
      setErroCadastro(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível cadastrar a empresa.",
      );
    },
  });

  const entrarNaEmpresa = async (empresaId: string) => {
    await selectCompany(empresaId);
    await queryClient.invalidateQueries();
    await router.invalidate();
    await router.navigate({ to: "/dashboard" });
  };

  function handleCriarEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroCadastro(null);
    criarEmpresaMutation.mutate(new FormData(event.currentTarget));
  }

  if (isLoading) {
    return (
      <AppShell title="Empresas cadastradas" description="Carregando empresas disponíveis...">
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Validando acesso e carregando empresas.
        </div>
      </AppShell>
    );
  }

  if (error || !authContext) {
    return (
      <AppShell title="Empresas cadastradas" description="Não foi possível carregar seu acesso.">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
          {error instanceof Error ? error.message : "Contexto de acesso indisponível."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Empresas cadastradas"
      description={
        authContext.usuario.isMaster
          ? "Admin Master: selecione a empresa que deseja acessar ou cadastre uma nova."
          : "Selecione uma empresa vinculada ao seu usuário."
      }
      actions={
        authContext.usuario.isMaster ? (
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova empresa
          </button>
        ) : null
      }
    >
      <section className="grid gap-4">
        {mensagem ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
            {mensagem}
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                {authContext.usuario.isMaster ? "Acesso Admin Master ativo" : "Acesso multiempresa"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cada módulo consulta apenas a empresa selecionada. Trocar de empresa altera o
                contexto do dashboard, documentos, equipamentos, manutenções, pendências e IA.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {authContext.empresasPermitidas.map((empresa) => {
            const selected = empresa.id === selectedCompanyId;
            return (
              <article
                key={empresa.id}
                className={`rounded-xl border bg-card p-5 shadow-sm transition ${
                  selected ? "border-primary/50 ring-2 ring-primary/10" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  {selected ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Atual
                    </span>
                  ) : null}
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-semibold">{empresa.nome}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">CNPJ {empresa.cnpj}</p>
                </div>

                <div className="mt-4">
                  <StatusBadge tone={empresa.status === "ativa" ? "ok" : "critico"}>
                    {empresa.status}
                  </StatusBadge>
                </div>

                <button
                  type="button"
                  onClick={() => entrarNaEmpresa(empresa.id)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={selected}
                >
                  {selected ? "Ambiente atual" : "Entrar"}
                  {!selected ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {modalAberto ? (
        <NovaEmpresaModal
          erro={erroCadastro}
          isSaving={criarEmpresaMutation.isPending}
          onClose={() => {
            if (!criarEmpresaMutation.isPending) {
              setModalAberto(false);
              setErroCadastro(null);
            }
          }}
          onSubmit={handleCriarEmpresa}
        />
      ) : null}
    </AppShell>
  );
}

function NovaEmpresaModal({
  erro,
  isSaving,
  onClose,
  onSubmit,
}: {
  erro: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [tipoSelecionado, setTipoSelecionado] = useState("Clínica");
  const checklist =
    checklistDocumentalPorTipo[tipoSelecionado] ?? checklistDocumentalPorTipo["Clínica"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Nova empresa</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O tipo e o segmento serão usados para pré-configurar os documentos necessários apenas
              neste ambiente.
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
          <Input label="Razão social" name="razao_social" required />
          <Input label="Nome fantasia" name="nome_fantasia" required />
          <Input label="CNPJ" name="cnpj" required />

          <label>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tipo de estabelecimento
            </span>
            <select
              name="tipo_estabelecimento"
              value={tipoSelecionado}
              onChange={(event) => setTipoSelecionado(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option>Clínica</option>
              <option>Laboratório</option>
              <option>Farmácia</option>
              <option>Distribuidora</option>
              <option>Clínica odontológica</option>
              <option>Diagnóstico por imagem</option>
              <option>Armazenamento</option>
              <option>Banco biológico</option>
              <option>Laboratório de alimentos</option>
            </select>
          </label>

          <Input label="Segmento" name="segmento" placeholder="Ex.: Cardiologia, Farmacêutico..." />
          <Input label="Cidade" name="cidade" />
          <Input label="Estado" name="estado" placeholder="SP" />
          <Input label="E-mail principal" name="email_principal" type="email" />
          <Input label="Responsável legal" name="responsavel_legal" />
          <Input label="Responsável técnico" name="responsavel_tecnico" />
          <TextArea label="Observações" name="observacoes" />

          <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Checklist inteligente inicial
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  O ambiente será preparado com documentos sugeridos para{" "}
                  <strong>{tipoSelecionado}</strong>. Documentos extras poderão ser adicionados
                  depois e ficarão somente nesta empresa.
                </p>
                <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  {checklist.map((documento) => (
                    <li key={documento} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>{documento}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {erro ? (
            <div className="md:col-span-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {erro}
            </div>
          ) : null}
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
            {isSaving ? "Preparando ambiente..." : "Cadastrar e preparar ambiente"}
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
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
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

function required(formData: FormData, key: string): string {
  const value = optional(formData, key);
  if (!value) throw new Error("Preencha os campos obrigatórios.");
  return value;
}

function optional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
