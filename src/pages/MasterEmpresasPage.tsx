import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { AppShell, StatusBadge } from "@/layouts/app-layout";
import { useAuthContext } from "@/hooks/use-conform-data";
import { useAppSession } from "@/hooks/use-app-session";
import { adminMasterService } from "@/services/adminMasterService";
import { partnerService } from "@/services/partnerService";
import { edgeFunctionsService } from "@/services/edgeFunctionsService";
import { PartnerPortfolioHealth } from "@/components/partner-portfolio-health";
import type { PartnerPlanCatalogItem } from "@/types";
import { formatCurrencyFromCents } from "@/utils/money";

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
  const [modalParceiroAberto, setModalParceiroAberto] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"todas" | "ativa" | "bloqueada">("todas");
  const [pagina, setPagina] = useState(1);
  const [parceiroExpandidoId, setParceiroExpandidoId] = useState<string | null>(null);
  const [isencaoSelecionada, setIsencaoSelecionada] = useState<{
    parceiroId: string;
    cliente: import("@/types").PartnerClient;
  } | null>(null);
  const [bonusParceiroSelecionado, setBonusParceiroSelecionado] = useState<string | null>(null);
  const empresaParceira = authContext?.empresasPermitidas.find(
    (empresa) => empresa.tipoConta === "parceira",
  );
  const isParceiro = Boolean(empresaParceira && !authContext?.usuario.isMaster);
  const isAdministradorParceiro = Boolean(
    authContext &&
    (authContext.perfilAtual === "parceiro_administrador" ||
      (authContext.empresaAtual.tipoConta === "parceira" &&
        ["administrador", "master"].includes(authContext.perfilAtual))),
  );

  const clientesParceiroQuery = useQuery({
    queryKey: ["partner-clients", empresaParceira?.id],
    queryFn: () => partnerService.listarClientes(empresaParceira!.id),
    enabled: isParceiro && isAdministradorParceiro,
    staleTime: 30_000,
  });

  const parceiroPlanosQuery = useQuery({
    queryKey: ["partner-plans"],
    queryFn: () => partnerService.listarPlanos(),
    enabled:
      (isParceiro && isAdministradorParceiro) || Boolean(authContext?.usuario.isMaster),
    staleTime: 60_000,
  });

  const parceiroPlanosUnitariosQuery = useQuery({
    queryKey: ["partner-unit-plans"],
    queryFn: () => partnerService.listarPlanosUnitarios(),
    enabled: isParceiro && isAdministradorParceiro,
    staleTime: 60_000,
  });

  const parceiroBeneficiosId = isParceiro ? empresaParceira?.id : parceiroExpandidoId;
  const parceiroBeneficiosQuery = useQuery({
    queryKey: ["partner-benefits", parceiroBeneficiosId],
    queryFn: () => partnerService.listarBeneficios(parceiroBeneficiosId!),
    enabled: Boolean(parceiroBeneficiosId && (isAdministradorParceiro || authContext?.usuario.isMaster)),
    staleTime: 30_000,
  });

  const parceiros = useMemo(
    () =>
      authContext?.empresasPermitidas.filter((empresa) => empresa.tipoConta === "parceira") ?? [],
    [authContext?.empresasPermitidas],
  );

  const resumoMultiunidadeQuery = useQuery({
    queryKey: ["master", "multiunit-summary"],
    queryFn: () => adminMasterService.resumoMultiunidade(),
    enabled: Boolean(authContext?.usuario.isMaster),
    staleTime: 60_000,
  });

  const clientesParceiroMasterQuery = useQuery({
    queryKey: ["master", "partner-clients", parceiroExpandidoId],
    queryFn: () => partnerService.listarClientes(parceiroExpandidoId!),
    enabled: Boolean(authContext?.usuario.isMaster && parceiroExpandidoId),
    staleTime: 30_000,
  });

  const resumoParceiroMasterQuery = useQuery({
    queryKey: ["master", "partner-summary", parceiroExpandidoId],
    queryFn: () => partnerService.resumo(parceiroExpandidoId!),
    enabled: Boolean(authContext?.usuario.isMaster && parceiroExpandidoId),
    staleTime: 30_000,
  });

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

  const criarClienteMutation = useMutation({
    mutationFn: (formData: FormData) =>
      partnerService.vincularCliente({
        parceiro_empresa_id: empresaParceira!.id,
        razao_social: required(formData, "razao_social"),
        nome_fantasia: required(formData, "nome_fantasia"),
        cnpj: required(formData, "cnpj"),
        tipo_estabelecimento: optional(formData, "tipo_estabelecimento"),
        segmento: optional(formData, "segmento"),
        email_principal: optional(formData, "email_principal"),
        plano_servico_codigo: (optional(formData, "plano_servico_codigo") || "profissional") as
          "essencial" | "profissional" | "rede",
        usar_bonus_isencao: formData.get("usar_bonus_isencao") === "true",
      }),
    onSuccess: async (result) => {
      setModalAberto(false);
      setErroCadastro(null);
      let conviteMensagem: string;
      const emailCliente = result.cliente.email_principal?.trim().toLowerCase();
      if (emailCliente) {
        try {
          const convite = await edgeFunctionsService.inviteCompanyUser({
            empresaId: result.cliente.id,
            email: emailCliente,
            nome: result.cliente.nome_fantasia || result.cliente.razao_social,
            perfil: "administrador",
          });
          conviteMensagem = convite.invitation_sent === false
            ? ` O acesso foi vinculado ao e-mail ${emailCliente}; se necessário, use “Esqueci minha senha”.`
            : ` O convite de primeiro acesso foi enviado para ${emailCliente}.`;
        } catch (inviteError) {
          conviteMensagem = ` O cliente foi criado, mas o convite ficou pendente: ${inviteError instanceof Error ? inviteError.message : "reenvie o primeiro acesso depois."}`;
        }
      } else {
        conviteMensagem = " Nenhum e-mail principal foi informado; cadastre um e-mail para enviar o primeiro acesso.";
      }
      setMensagem(
        `${result.cliente.nome_fantasia} vinculada com sucesso.${result.bonus_consumido ? " O bônus de isenção foi aplicado ao CNPJ." : " A cobrança permanecerá no parceiro."}${conviteMensagem}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["partner-clients"] });
      await queryClient.invalidateQueries({ queryKey: ["partner-benefits"] });
      try {
        await partnerService.sincronizarCobranca(empresaParceira!.id);
      } catch {
        // Sem assinatura Stripe, a cobrança será sincronizada ao ativar o checkout.
      }
      await refreshContext();
      await router.invalidate();
    },
    onError: (mutationError) => {
      setErroCadastro(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível vincular o cliente.",
      );
    },
  });

  const criarParceiroMutation = useMutation({
    mutationFn: (formData: FormData) =>
      adminMasterService.criarParceiro({
        razao_social: required(formData, "razao_social"),
        nome_fantasia: required(formData, "nome_fantasia"),
        cnpj: required(formData, "cnpj"),
        email_principal: optional(formData, "email_principal"),
        plano_codigo: (optional(formData, "plano_codigo") || null) as
          | "parceiro_start"
          | "parceiro_pro"
          | "parceiro_enterprise"
          | null,
        modo_cobranca: (optional(formData, "modo_cobranca") || "plano_carteira") as
          | "plano_carteira"
          | "unitario",
      }),
    onSuccess: async (result) => {
      setModalParceiroAberto(false);
      setErroCadastro(null);
      let inviteMessage: string;
      try {
        const invite = await edgeFunctionsService.invitePartnerAdmin(String(result.empresa.id));
        inviteMessage = invite.existing_user
          ? `Parceiro criado e acesso vinculado a ${invite.email ?? "o e-mail principal"}. Se necessário, use “Esqueci minha senha” para definir uma nova senha.`
          : `Parceiro criado. Convite enviado para ${invite.email ?? "o e-mail principal"} para definição segura da senha.`;
      } catch (inviteError) {
        inviteMessage = `Parceiro criado, mas o convite ficou pendente. ${inviteError instanceof Error ? inviteError.message : "Reenvie o primeiro acesso pelo cartão do parceiro."}`;
      }
      setMensagem(inviteMessage);
      await queryClient.invalidateQueries();
      await refreshContext();
      await router.invalidate();
    },
    onError: (mutationError) => {
      setErroCadastro(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível criar o parceiro.",
      );
    },
  });

  const convidarParceiroMutation = useMutation({
    mutationFn: (parceiroEmpresaId: string) =>
      edgeFunctionsService.invitePartnerAdmin(parceiroEmpresaId),
    onSuccess: (result) => {
      setErroCadastro(null);
      setMensagem(
        `Convite enviado para ${result.email ?? "o e-mail principal do parceiro"}. O destinatário poderá definir a senha pelo link seguro.`,
      );
    },
    onError: (mutationError) => {
      setErroCadastro(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível enviar o primeiro acesso.",
      );
    },
  });

  const configurarCobrancaMutation = useMutation({
    mutationFn: (payload: {
      parceiro_empresa_id: string;
      modo_cobranca: "plano_carteira" | "unitario";
      plano_codigo?: string | null;
    }) => partnerService.configurarCobranca(payload),
    onSuccess: async (result) => {
      setErroCadastro(null);
      setMensagem(
        result.modo_cobranca === "unitario"
          ? "Cobrança por CNPJ ativada. Cada novo cliente será incluído na mensalidade com pró-rata no primeiro ciclo."
          : `Plano ${result.plano?.nome ?? "selecionado"} configurado para a carteira.`,
      );
      await queryClient.invalidateQueries();
      await refreshContext();
      await router.invalidate();
    },
    onError: (mutationError) => {
      setErroCadastro(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível configurar a cobrança do parceiro.",
      );
    },
  });

  const concederIsencaoMutation = useMutation({
    mutationFn: (payload: {
      parceiro_empresa_id: string;
      cliente_empresa_id: string;
      meses: number;
      motivo?: string;
      observacoes?: string;
    }) => partnerService.concederIsencao(payload),
    onSuccess: async (result) => {
      const parceiroId = result.parceiro_empresa_id;
      setIsencaoSelecionada(null);
      setErroCadastro(null);
      setMensagem(
        `Cortesia registrada até ${formatDateBR(result.termina_em)}. O cliente não será cobrado durante esse período.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["master", "partner-clients", parceiroId] });
      await queryClient.invalidateQueries({ queryKey: ["master", "partner-summary", parceiroId] });
      await queryClient.invalidateQueries({ queryKey: ["partner-clients", parceiroId] });
      // A tabela é a fonte de verdade. Quando houver assinatura Stripe ativa,
      // a sincronização remove o cliente cortesia da quantidade faturada.
      try {
        await partnerService.sincronizarCobranca(parceiroId);
      } catch {
        // Parceiros em trial ou sem Stripe configurado sincronizam ao ativar a cobrança.
      }
    },
    onError: (mutationError) => {
      setErroCadastro(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível registrar a cortesia.",
      );
    },
  });

  const concederBonusMutation = useMutation({
    mutationFn: (payload: {
      parceiro_empresa_id: string;
      quantidade: number;
      meses_por_bonus: number;
      validade_ate?: string | null;
      motivo?: string;
      observacoes?: string;
    }) => partnerService.concederBonus(payload),
    onSuccess: async (result) => {
      const parceiroId = result.parceiro_empresa_id;
      setBonusParceiroSelecionado(null);
      setErroCadastro(null);
      setMensagem(
        `${result.quantidade_total} bÃ´nus de ${result.meses_por_bonus} ${result.meses_por_bonus === 1 ? "mÃªs" : "meses"} concedidos ao parceiro.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["partner-benefits", parceiroId] });
    },
    onError: (mutationError) => {
      setErroCadastro(
        mutationError instanceof Error
          ? mutationError.message
          : "NÃ£o foi possÃ­vel conceder o bÃ´nus de isenÃ§Ã£o.",
      );
    },
  });

  const entrarNaEmpresa = async (empresaId: string) => {
    await selectCompany(empresaId);
    await queryClient.invalidateQueries();
    await router.invalidate();
    await router.navigate({ to: "/dashboard" });
  };

  const reenviarPrimeiroAcesso = async (cliente: import("@/types").PartnerClient) => {
    const email = cliente.email_principal?.trim().toLowerCase();
    if (!email) {
      setErroCadastro("Cadastre um e-mail principal para enviar o primeiro acesso.");
      return;
    }
    try {
      const convite = await edgeFunctionsService.inviteCompanyUser({
        empresaId: cliente.id,
        email,
        nome: cliente.nome_fantasia || cliente.razao_social,
        perfil: "administrador",
      });
      setErroCadastro(null);
      setMensagem(
        convite.invitation_sent === false
          ? `O acesso de ${cliente.nome_fantasia} já está vinculado a ${email}. Use “Esqueci minha senha” se necessário.`
          : `Convite de primeiro acesso enviado para ${email}.`,
      );
    } catch (inviteError) {
      setErroCadastro(
        inviteError instanceof Error
          ? inviteError.message
          : "Não foi possível enviar o primeiro acesso.",
      );
    }
  };

  const empresasFiltradas = useMemo(
    () =>
      authContext?.empresasPermitidas.filter((empresa) => {
        const termo = busca.trim().toLocaleLowerCase("pt-BR");
        const correspondeBusca =
          !termo || `${empresa.nome} ${empresa.cnpj}`.toLocaleLowerCase("pt-BR").includes(termo);
        const correspondeStatus =
          statusFiltro === "todas" ||
          (statusFiltro === "ativa" ? empresa.status === "ativa" : empresa.status !== "ativa");
        return correspondeBusca && correspondeStatus;
      }) ?? [],
    [authContext?.empresasPermitidas, busca, statusFiltro],
  );
  const totalPaginas = Math.max(1, Math.ceil(empresasFiltradas.length / 24));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const empresasPaginadas = empresasFiltradas.slice(
    (paginaAtual - 1) * 24,
    paginaAtual * 24,
  );

  function handleCriarEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroCadastro(null);
    criarEmpresaMutation.mutate(new FormData(event.currentTarget));
  }

  function handleCriarCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroCadastro(null);
    criarClienteMutation.mutate(new FormData(event.currentTarget));
  }

  function handleConcederIsencao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isencaoSelecionada) return;
    const formData = new FormData(event.currentTarget);
    concederIsencaoMutation.mutate({
      parceiro_empresa_id: isencaoSelecionada.parceiroId,
      cliente_empresa_id: isencaoSelecionada.cliente.id,
      meses: Number(optional(formData, "meses")),
      motivo: optional(formData, "motivo") || "Presente do parceiro",
      observacoes: optional(formData, "observacoes"),
    });
  }

  function handleConcederBonus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bonusParceiroSelecionado) return;
    const formData = new FormData(event.currentTarget);
    concederBonusMutation.mutate({
      parceiro_empresa_id: bonusParceiroSelecionado,
      quantidade: Number(optional(formData, "quantidade")) || 1,
      meses_por_bonus: Number(optional(formData, "meses_por_bonus")) || 1,
      validade_ate: optional(formData, "validade_ate") || null,
      motivo: optional(formData, "motivo") || "Bônus comercial",
      observacoes: optional(formData, "observacoes"),
    });
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
      title={
        authContext.usuario.isMaster
          ? "Empresas e parceiros"
          : isParceiro
            ? "Painel do parceiro"
            : "Empresas cadastradas"
      }
      description={
        authContext.usuario.isMaster
          ? "Cadastre parceiros, consulte suas carteiras e entre em qualquer ambiente autorizado."
          : isParceiro
            ? "Gerencie sua carteira e acesse somente os ambientes dos clientes vinculados ao parceiro."
            : "Selecione uma empresa vinculada ao seu usuário."
      }
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {authContext.usuario.isMaster ? (
            <button
              type="button"
              onClick={() => setModalParceiroAberto(true)}
              className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <ShieldCheck className="h-4 w-4" /> Novo parceiro
            </button>
          ) : null}
          {authContext.usuario.isMaster || (isParceiro && isAdministradorParceiro) ? (
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> {isParceiro ? "Novo cliente" : "Nova empresa"}
            </button>
          ) : null}
        </div>
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

        {isParceiro && empresaParceira ? (
          <PartnerPortfolioHealth partnerCompanyId={empresaParceira.id} />
        ) : null}

        {authContext.usuario.isMaster ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  Governança multiunidade
                </p>
                <h2 className="mt-1 text-lg font-semibold">Capacidade por empresa</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acompanhe utilização, implantação e empresas próximas ou acima do limite
                  contratado.
                </p>
              </div>
              {resumoMultiunidadeQuery.isFetching ? (
                <span className="text-xs text-muted-foreground">Atualizando indicadores...</span>
              ) : null}
            </div>

            {resumoMultiunidadeQuery.isError ? (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                Não foi possível carregar o resumo de unidades.
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryMetric
                    label="Empresas multiunidade"
                    value={resumoMultiunidadeQuery.data?.resumo.empresas_com_multiunidade ?? 0}
                  />
                  <SummaryMetric
                    label="Unidades ativas"
                    value={resumoMultiunidadeQuery.data?.resumo.unidades_ativas ?? 0}
                  />
                  <SummaryMetric
                    label="Em implantação"
                    value={resumoMultiunidadeQuery.data?.resumo.unidades_em_implantacao ?? 0}
                  />
                  <SummaryMetric
                    label="Empresas em excesso"
                    value={resumoMultiunidadeQuery.data?.resumo.empresas_em_excesso ?? 0}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Receita mensal estimada de unidades extras:{" "}
                  <strong className="text-foreground">
                    {formatMoneyBR(
                      resumoMultiunidadeQuery.data?.resumo
                        .receita_unidades_extras_centavos ?? 0,
                    )}
                  </strong>
                  {" · "}
                  {resumoMultiunidadeQuery.data?.resumo.empresas_proximas_limite ?? 0} empresa(s)
                  próxima(s) do limite
                  {" · "}
                  {resumoMultiunidadeQuery.data?.resumo.unidades_arquivadas ?? 0} unidade(s)
                  arquivada(s)
                </p>
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Empresa</th>
                        <th className="px-4 py-3 text-left font-medium">Conta</th>
                        <th className="px-4 py-3 text-right font-medium">Ativas</th>
                        <th className="px-4 py-3 text-right font-medium">Base + extras</th>
                        <th className="px-4 py-3 text-right font-medium">Utilização</th>
                        <th className="px-4 py-3 text-left font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(resumoMultiunidadeQuery.data?.empresas ?? []).slice(0, 10).map((empresa) => (
                        <tr key={empresa.empresa_id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{empresa.empresa}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {empresa.tipo_conta}
                          </td>
                          <td className="px-4 py-3 text-right">{empresa.unidades_ativas}</td>
                          <td className="px-4 py-3 text-right">
                            {empresa.limite_base} + {empresa.unidades_extras}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {empresa.unidades_utilizadas}/{empresa.limite_unidades}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              tone={
                                empresa.em_excesso
                                  ? "critico"
                                  : empresa.proxima_do_limite
                                    ? "atencao"
                                    : "ok"
                              }
                            >
                              {empresa.em_excesso
                                ? "Acima do limite"
                                : empresa.proxima_do_limite
                                  ? "Próxima do limite"
                                  : "Regular"}
                            </StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        ) : null}

        {authContext.usuario.isMaster ? (
          <section className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  Gestao de parceiros
                </p>
                <h2 className="mt-1 text-lg font-semibold">Carteiras por parceiro</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  Consulte os clientes de cada parceiro em uma visao separada. O parceiro paga a
                  assinatura consolidada, mas cada cliente continua em seu proprio ambiente.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-3 py-1.5 text-xs font-medium text-primary">
                <UsersRound className="h-3.5 w-3.5" />
                {parceiros.length} parceiro(s)
              </div>
            </div>

            {parceiros.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                Nenhum parceiro cadastrado. Use o botao <strong>Novo parceiro</strong> para criar a
                primeira carteira.
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {parceiros.map((parceiro) => {
                    const selecionado = parceiro.id === parceiroExpandidoId;
                    const clientesConhecidos = authContext.empresasPermitidas.filter(
                      (empresa) =>
                        empresa.tipoConta === "cliente" && empresa.parceiroEmpresaId === parceiro.id,
                    ).length;
                    const clientesAtivos = selecionado
                      ? (resumoParceiroMasterQuery.data?.clientes_ativos ?? clientesConhecidos)
                      : clientesConhecidos;

                    return (
                      <article
                        key={parceiro.id}
                        className={`rounded-xl border bg-card p-4 transition ${
                          selecionado
                            ? "border-primary/50 ring-2 ring-primary/10"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold">{parceiro.nome}</h3>
                              <p className="mt-1 text-xs text-muted-foreground">CNPJ {parceiro.cnpj}</p>
                            </div>
                          </div>
                          <StatusBadge tone={parceiro.status === "ativa" ? "ok" : "critico"}>
                            {parceiro.status}
                          </StatusBadge>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border border-border/70 bg-background p-2.5">
                            <span className="block text-muted-foreground">Clientes ativos</span>
                            <strong className="mt-1 block text-sm text-foreground">
                              {clientesAtivos}
                            </strong>
                          </div>
                          <div className="rounded-lg border border-border/70 bg-background p-2.5">
                            <span className="block text-muted-foreground">Plano</span>
                            <strong className="mt-1 block truncate text-sm text-foreground">
                              {parceiro.plano?.nome ?? "Nao definido"}
                            </strong>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={convidarParceiroMutation.isPending}
                            onClick={() => convidarParceiroMutation.mutate(parceiro.id)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {convidarParceiroMutation.isPending &&
                            convidarParceiroMutation.variables === parceiro.id
                              ? "Enviando..."
                              : "Enviar primeiro acesso"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setParceiroExpandidoId(selecionado ? null : parceiro.id)
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                            aria-expanded={selecionado}
                          >
                            {selecionado ? "Ocultar clientes" : "Ver clientes do parceiro"}
                            {selecionado ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setErroCadastro(null);
                              setBonusParceiroSelecionado(parceiro.id);
                            }}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            Conceder bÃ´nus
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {parceiroExpandidoId ? (
                  <div className="mt-4 rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Clientes vinculados
                        </p>
                        <h3 className="mt-1 text-base font-semibold">
                          {parceiros.find((parceiro) => parceiro.id === parceiroExpandidoId)?.nome ??
                            "Parceiro selecionado"}
                        </h3>
                      </div>
                      {resumoParceiroMasterQuery.data ? (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-border bg-background px-3 py-1.5">
                            {resumoParceiroMasterQuery.data.clientes_incluidos} incluidos
                          </span>
                          <span className="rounded-full border border-warning/30 bg-warning/5 px-3 py-1.5 text-warning">
                            {resumoParceiroMasterQuery.data.clientes_extras} extras
                          </span>
                          <span className="rounded-full border border-success/30 bg-success/5 px-3 py-1.5 text-success">
                            {resumoParceiroMasterQuery.data.clientes_isentos ?? 0} cortesias
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {parceiroBeneficiosQuery.isLoading ? (
                      <div className="mt-3 h-9 animate-pulse rounded-lg bg-muted" />
                    ) : parceiroBeneficiosQuery.data?.length ? (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                        {parceiroBeneficiosQuery.data.reduce(
                          (total, item) => total + item.quantidade_disponivel,
                          0,
                        )} {parceiroBeneficiosQuery.data.reduce((total, item) => total + item.quantidade_disponivel, 0) === 1 ? "bÃ´nus" : "bÃ´nus"} disponÃ­vel(is) para novos clientes.
                      </div>
                    ) : null}

                    {clientesParceiroMasterQuery.isLoading ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {[0, 1].map((item) => (
                          <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
                        ))}
                      </div>
                    ) : clientesParceiroMasterQuery.error ? (
                      <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                        Nao foi possivel carregar os clientes deste parceiro.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {(clientesParceiroMasterQuery.data ?? []).map((cliente) => (
                          <div key={cliente.id} className="rounded-lg border border-border p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{cliente.nome_fantasia}</p>
                                <p className="mt-1 text-xs text-muted-foreground">CNPJ {cliente.cnpj}</p>
                              </div>
                              <StatusBadge tone={cliente.status === "ativa" ? "ok" : "critico"}>
                                {cliente.status}
                              </StatusBadge>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                              {cliente.plano?.nome ?? "Plano nao definido"} · {cliente.segmento ?? "Segmento nao informado"}
                            </p>
                            {cliente.unidades ? (
                              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
                                <span className="text-muted-foreground">Unidades</span>
                                <strong
                                  className={
                                    cliente.unidades.em_excesso
                                      ? "text-danger"
                                      : "text-foreground"
                                  }
                                >
                                  {cliente.unidades.utilizadas} de {cliente.unidades.limite}
                                </strong>
                              </div>
                            ) : null}
                            {cliente.isencao ? (
                              <div className="mt-3 rounded-lg border border-success/30 bg-success/5 p-2.5 text-xs text-success">
                                Cortesia ativa até {formatDateBR(cliente.isencao.termina_em)}
                              </div>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => void entrarNaEmpresa(cliente.id)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                Entrar no ambiente <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setErroCadastro(null);
                                  setIsencaoSelecionada({ parceiroId: parceiroExpandidoId, cliente });
                                }}
                                className="text-xs font-semibold text-emerald-700 hover:underline"
                              >
                                {cliente.isencao ? "Renovar cortesia" : "Dar cortesia"}
                              </button>
                            </div>
                          </div>
                        ))}
                        {!clientesParceiroMasterQuery.data?.length ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum cliente ativo vinculado a este parceiro.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {isParceiro ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  Planos do parceiro
                </p>
                <h2 className="mt-1 text-lg font-semibold">Escolha o nível da sua carteira</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Compare limites, recursos e clientes incluídos. A assinatura e os extras são
                  cobrados somente do parceiro.
                </p>
              </div>
              <div className="rounded-full border border-success/30 bg-success/5 px-3 py-1.5 text-xs font-semibold text-success">
                Plano atual: {empresaParceira?.plano?.nome ?? "Em validação"}
              </div>
            </div>
            {parceiroBeneficiosQuery.data?.length ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                Você possui {parceiroBeneficiosQuery.data.reduce((total, item) => total + item.quantidade_disponivel, 0)} bônus de isenção disponíveis.
                Eles poderão ser usados ao cadastrar novos clientes.
              </div>
            ) : null}
            {parceiroPlanosQuery.isLoading ? (
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {(parceiroPlanosQuery.data ?? []).map((plano) => {
                  const atual = plano.codigo === empresaParceira?.plano?.codigo;
                  return (
                    <article key={plano.id} className={`rounded-xl border p-4 ${atual ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold">{plano.nome}</h3>
                        {atual ? <StatusBadge tone="ok">Atual</StatusBadge> : null}
                      </div>
                      <p className="mt-2 text-xl font-semibold text-primary">
                        {formatMoneyBR(plano.valor_mensal_centavos)}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Até {plano.limite_clientes} clientes · {plano.limite_usuarios ? `${plano.limite_usuarios} usuários` : "usuários sob contrato"}
                      </p>
                      {isAdministradorParceiro ? (
                        <button
                          type="button"
                          disabled={atual || configurarCobrancaMutation.isPending}
                          onClick={() =>
                            configurarCobrancaMutation.mutate({
                              parceiro_empresa_id: empresaParceira!.id,
                              modo_cobranca: "plano_carteira",
                              plano_codigo: plano.codigo,
                            })
                          }
                          className="mt-4 w-full rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {atual ? "Plano atual" : "Escolher este plano"}
                        </button>
                      ) : null}
                    </article>
                  );
                })}
                <article className="rounded-xl border border-primary/40 bg-primary/[0.04] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">Plano unitário por CNPJ</h3>
                    {empresaParceira?.plano == null ? <StatusBadge tone="ok">Disponível</StatusBadge> : null}
                  </div>
                  <p className="mt-2 text-xl font-semibold text-primary">Por cliente</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cada CNPJ usa o plano operacional escolhido no cadastro. O valor entra na mensalidade do parceiro e o primeiro mês é calculado proporcionalmente.
                  </p>
                  {parceiroPlanosUnitariosQuery.data?.length ? (
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {parceiroPlanosUnitariosQuery.data.map((unitPlan) => (
                        <div key={unitPlan.id} className="flex items-center justify-between gap-2">
                          <span>{unitPlan.nome}</span>
                          <span className="font-medium text-foreground">{formatMoneyBR(unitPlan.valor_mensal_centavos)}/mês</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {isAdministradorParceiro ? (
                    <button
                      type="button"
                      disabled={configurarCobrancaMutation.isPending}
                      onClick={() =>
                        configurarCobrancaMutation.mutate({
                          parceiro_empresa_id: empresaParceira!.id,
                          modo_cobranca: "unitario",
                        })
                      }
                      className="mt-4 w-full rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-60"
                    >
                      {empresaParceira?.plano == null ? "Usar cobrança por CNPJ" : "Mudar para cobrança por CNPJ"}
                    </button>
                  ) : null}
                </article>
              </div>
            )}
          </section>
        ) : null}

        {isParceiro ? (
          <section className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  Carteira do parceiro
                </p>
                <h2 className="mt-1 text-lg font-semibold">Empresas sob sua gestão</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Você pode acessar somente os clientes vinculados à sua conta. Cada cliente possui
                  dados, documentos e permissões separados; o cliente não visualiza outras empresas.
                </p>
              </div>
              {isAdministradorParceiro ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void partnerService
                        .criarCheckout(empresaParceira!.id)
                        .then((result) => {
                          window.location.assign(result.checkout_url);
                        })
                        .catch((error) =>
                          setErroCadastro(
                            error instanceof Error ? error.message : "Falha ao abrir o checkout.",
                          ),
                        );
                    }}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Ativar cobrança Stripe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void partnerService
                        .sincronizarCobranca(empresaParceira!.id)
                        .then(() => setMensagem("Cobrança consolidada sincronizada com o Stripe."))
                        .catch((error) =>
                          setErroCadastro(
                            error instanceof Error
                              ? error.message
                              : "Falha ao sincronizar cobrança.",
                          ),
                        );
                    }}
                    className="rounded-lg border border-primary/30 bg-background px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5"
                  >
                    Sincronizar cobrança
                  </button>
                </div>
              ) : null}
            </div>
            {clientesParceiroQuery.isLoading ? (
              <div className="mt-5 h-16 animate-pulse rounded-lg bg-muted" />
            ) : clientesParceiroQuery.error ? (
              <p className="mt-4 text-sm text-danger">
                Não foi possível carregar a carteira do parceiro.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(clientesParceiroQuery.data ?? []).map((cliente) => (
                  <div key={cliente.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{cliente.nome_fantasia}</p>
                        <p className="mt-1 text-xs text-muted-foreground">CNPJ {cliente.cnpj}</p>
                      </div>
                      <StatusBadge tone={cliente.status === "ativa" ? "ok" : "critico"}>
                        {cliente.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Plano {cliente.plano?.nome ?? "não definido"} · vínculo{" "}
                      {cliente.relacionamento.status}
                    </p>
                    {cliente.unidades ? (
                      <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Unidades</span>
                        <strong
                          className={cliente.unidades.em_excesso ? "text-danger" : "text-foreground"}
                        >
                          {cliente.unidades.utilizadas} de {cliente.unidades.limite}
                        </strong>
                      </div>
                    ) : null}
                    {cliente.isencao ? (
                      <div className="mt-3 rounded-lg border border-success/30 bg-success/5 p-2.5 text-xs text-success">
                        Cortesia ativa até {formatDateBR(cliente.isencao.termina_em)}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void entrarNaEmpresa(cliente.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Entrar no ambiente <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      {isAdministradorParceiro ? (
                        <button
                          type="button"
                          onClick={() => void reenviarPrimeiroAcesso(cliente)}
                          className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                        >
                          Reenviar primeiro acesso
                        </button>
                      ) : null}
                      {isAdministradorParceiro ? (
                        <button
                          type="button"
                          onClick={() => {
                            setErroCadastro(null);
                            setIsencaoSelecionada({ parceiroId: empresaParceira!.id, cliente });
                          }}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          {cliente.isencao ? "Renovar cortesia" : "Dar cortesia"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!clientesParceiroQuery.data?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum cliente vinculado ainda.</p>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        {!isParceiro ? <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-[1fr_auto]">
          <label className="relative">
            <span className="sr-only">Buscar empresa</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/10"
            />
          </label>
          <select
            value={statusFiltro}
            onChange={(event) => setStatusFiltro(event.target.value as typeof statusFiltro)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            aria-label="Filtrar empresas por status"
          >
            <option value="todas">Todos os status</option>
            <option value="ativa">Ativas</option>
            <option value="bloqueada">Bloqueadas ou suspensas</option>
          </select>
        </div> : null}

        {!isParceiro ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {empresasPaginadas.map((empresa) => {
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
          {empresasFiltradas.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma empresa corresponde aos filtros. Revise o nome, CNPJ ou status informado.
            </div>
          ) : null}
        </div> : null}
        {!isParceiro && empresasFiltradas.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Página {paginaAtual} de {totalPaginas} · {empresasFiltradas.length} empresa(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina(Math.max(1, paginaAtual - 1))}
                disabled={paginaAtual === 1}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina(Math.min(totalPaginas, paginaAtual + 1))}
                disabled={paginaAtual === totalPaginas}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {modalAberto ? (
        <NovaEmpresaModal
          modo={isParceiro ? "cliente" : "empresa"}
          beneficioIsencao={
            isParceiro
              ? (parceiroBeneficiosQuery.data ?? []).find(
                  (beneficio) => beneficio.status === "ativo" && beneficio.quantidade_disponivel > 0,
                ) ?? null
              : null
          }
          erro={erroCadastro}
          isSaving={isParceiro ? criarClienteMutation.isPending : criarEmpresaMutation.isPending}
          onClose={() => {
            if (!criarEmpresaMutation.isPending && !criarClienteMutation.isPending) {
              setModalAberto(false);
              setErroCadastro(null);
            }
          }}
          onSubmit={isParceiro ? handleCriarCliente : handleCriarEmpresa}
        />
      ) : null}
      {modalParceiroAberto ? (
        <NovoParceiroModal
          planos={parceiroPlanosQuery.data ?? []}
          erro={erroCadastro}
          isSaving={criarParceiroMutation.isPending}
          onClose={() => {
            if (!criarParceiroMutation.isPending) {
              setModalParceiroAberto(false);
              setErroCadastro(null);
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            setErroCadastro(null);
            criarParceiroMutation.mutate(new FormData(event.currentTarget));
          }}
        />
      ) : null}
      {isencaoSelecionada ? (
        <IsencaoParceiroModal
          cliente={isencaoSelecionada.cliente}
          erro={erroCadastro}
          isSaving={concederIsencaoMutation.isPending}
          onClose={() => {
            if (!concederIsencaoMutation.isPending) {
              setIsencaoSelecionada(null);
              setErroCadastro(null);
            }
          }}
          onSubmit={handleConcederIsencao}
        />
      ) : null}
      {bonusParceiroSelecionado ? (
        <BonusIsencaoModalPremium
          parceiroNome={
            parceiros.find((parceiro) => parceiro.id === bonusParceiroSelecionado)?.nome ??
            "Parceiro selecionado"
          }
          erro={erroCadastro}
          isSaving={concederBonusMutation.isPending}
          onClose={() => {
            if (!concederBonusMutation.isPending) {
              setBonusParceiroSelecionado(null);
              setErroCadastro(null);
            }
          }}
          onSubmit={handleConcederBonus}
        />
      ) : null}
    </AppShell>
  );
}

function BonusIsencaoModalPremium({
  parceiroNome,
  erro,
  isSaving,
  onClose,
  onSubmit,
}: {
  parceiroNome: string;
  erro: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const requiresMfa = Boolean(erro?.includes("autenticação em duas etapas"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-xl rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
              Bônus comercial
            </p>
            <h2 className="mt-1 text-lg font-semibold">Liberar isenções para parceiro</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O parceiro <strong>{parceiroNome}</strong> poderá usar cada bônus uma única vez ao
              cadastrar um novo CNPJ. A cobrança continua sendo do parceiro.
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
          <Input label="Quantidade de bônus" name="quantidade" type="number" defaultValue="1" required />
          <label>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Meses por bônus
            </span>
            <select
              name="meses_por_bonus"
              defaultValue="1"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((months) => (
                <option key={months} value={months}>
                  {months} {months === 1 ? "mês" : "meses"} sem cobrança
                </option>
              ))}
            </select>
          </label>
          <Input label="Validade do lote (opcional)" name="validade_ate" type="date" />
          <Input label="Motivo" name="motivo" defaultValue="Bônus comercial" />
          <TextArea label="Observações internas" name="observacoes" />
          <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            O backend valida Admin Master + MFA, limita o lote a 1.000 bônus e registra a concessão
            na auditoria. O bônus não é transferível entre parceiros.
          </div>
          {erro ? (
            <div className="md:col-span-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
              <p>{erro}</p>
              {requiresMfa ? (
                <a
                  href="/seguranca/mfa"
                  className="mt-2 inline-flex font-semibold underline underline-offset-4"
                >
                  Configurar ou confirmar MFA
                </a>
              ) : null}
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
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSaving ? "Concedendo bônus..." : "Conceder bônus"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BonusIsencaoModalLegacy({
  parceiroNome,
  erro,
  isSaving,
  onClose,
  onSubmit,
}: {
  parceiroNome: string;
  erro: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-xl rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
              BÃ´nus comercial
            </p>
            <h2 className="mt-1 text-lg font-semibold">Liberar isenÃ§Ãµes para parceiro</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O parceiro <strong>{parceiroNome}</strong> poderÃ¡ usar cada bÃ´nus uma Ãºnica vez ao
              cadastrar um novo CNPJ. A cobranÃ§a continua sendo do parceiro.
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
          <Input label="Quantidade de bÃ´nus" name="quantidade" type="number" defaultValue="1" required />
          <label>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Meses por bÃ´nus
            </span>
            <select
              name="meses_por_bonus"
              defaultValue="1"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((months) => (
                <option key={months} value={months}>
                  {months} {months === 1 ? "mÃªs" : "meses"} sem cobranÃ§a
                </option>
              ))}
            </select>
          </label>
          <Input label="Validade do lote (opcional)" name="validade_ate" type="date" />
          <Input label="Motivo" name="motivo" defaultValue="BÃ´nus comercial" />
          <TextArea label="ObservaÃ§Ãµes internas" name="observacoes" />
          <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            O backend valida Admin Master + MFA, limita o lote a 1.000 bÃ´nus e registra a concessÃ£o
            na auditoria. O bÃ´nus nÃ£o Ã© transferÃ­vel entre parceiros.
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
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSaving ? "Concedendo bÃ´nus..." : "Conceder bÃ´nus"}
          </button>
        </div>
      </form>
    </div>
  );
}

function IsencaoParceiroModal({
  cliente,
  erro,
  isSaving,
  onClose,
  onSubmit,
}: {
  cliente: import("@/types").PartnerClient;
  erro: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">
              Cortesia comercial
            </p>
            <h2 className="mt-1 text-lg font-semibold">Liberar acesso sem cobrança</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A isenção fica vinculada somente ao CNPJ selecionado e não altera os demais clientes.
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
        <div className="grid gap-4 p-5">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-sm font-semibold">{cliente.nome_fantasia}</p>
            <p className="mt-1 text-xs text-muted-foreground">CNPJ {cliente.cnpj}</p>
          </div>
          <label>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Duração da cortesia
            </span>
            <select
              name="meses"
              defaultValue={cliente.isencao?.meses ? String(cliente.isencao.meses) : "1"}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((months) => (
                <option key={months} value={months}>
                  {months} {months === 1 ? "mês" : "meses"} sem cobrança
                </option>
              ))}
            </select>
          </label>
          <Input label="Motivo" name="motivo" defaultValue="Presente do parceiro" />
          <TextArea label="Observações internas" name="observacoes" />
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            A data final será calculada pelo backend. O período máximo permitido é de 12 meses.
            Todas as concessões ficam registradas na auditoria.
          </div>
          {erro ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
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
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSaving ? "Salvando cortesia..." : "Liberar cortesia"}
          </button>
        </div>
      </form>
    </div>
  );
}

function NovoParceiroModal({
  planos,
  erro,
  isSaving,
  onClose,
  onSubmit,
}: {
  planos: PartnerPlanCatalogItem[];
  erro: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-xl rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-semibold">Novo parceiro</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O parceiro será o titular da assinatura Stripe e poderá cadastrar clientes em
              ambientes isolados.
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
          <div>
            <Input label="E-mail principal" name="email_principal" type="email" required />
            <p className="mt-1 text-xs text-muted-foreground">
              Enviaremos para este endereço o convite de primeiro acesso e o link para definir a senha.
            </p>
          </div>
          <label className="md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Plano de parceria
            </span>
            <select
              name="plano_codigo"
              defaultValue=""
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sem plano — configurar depois</option>
              {planos.map((plano) => (
                <option key={plano.id} value={plano.codigo}>
                  {plano.nome} · {formatCurrencyFromCents(plano.valor_mensal_centavos)} ·{" "}
                  {plano.limite_clientes} clientes incluídos
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Modelo inicial de cobrança
            </span>
            <select
              name="modo_cobranca"
              defaultValue="plano_carteira"
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="plano_carteira">Plano de carteira (pode escolher depois)</option>
              <option value="unitario">Plano unitário por CNPJ</option>
            </select>
          </label>
          <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            A mensalidade e os clientes adicionais serão cobrados somente do parceiro. Os clientes
            vinculados não terão checkout próprio.
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
            {isSaving ? "Criando parceiro..." : "Criar parceiro"}
          </button>
        </div>
      </form>
    </div>
  );
}

function NovaEmpresaModal({
  modo,
  beneficioIsencao,
  erro,
  isSaving,
  onClose,
  onSubmit,
}: {
  modo: "empresa" | "cliente";
  beneficioIsencao: import("@/types").PartnerGiftBenefit | null;
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
            <h2 className="text-lg font-semibold">
              {modo === "cliente" ? "Novo cliente" : "Nova empresa"}
            </h2>
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
          {modo === "cliente" ? (
            <>
              <label>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Plano operacional do cliente
                </span>
                <select
                  name="plano_servico_codigo"
                  defaultValue="profissional"
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="essencial">Essencial</option>
                  <option value="profissional">Profissional</option>
                  <option value="rede">Plano Rede</option>
                </select>
              </label>
              {beneficioIsencao ? (
                <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <input
                    type="checkbox"
                    name="usar_bonus_isencao"
                    value="true"
                    className="mt-0.5 h-4 w-4 accent-emerald-700"
                  />
                  <span>
                    <strong>Aplicar bônus de isenção</strong>
                    <span className="mt-1 block text-xs text-emerald-800">
                      Você tem {beneficioIsencao.quantidade_disponivel} bônus disponível(is), com {beneficioIsencao.meses_por_bonus} {beneficioIsencao.meses_por_bonus === 1 ? "mês" : "meses"} de acesso sem cobrança.
                    </span>
                  </span>
                </label>
              ) : null}
            </>
          ) : null}
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
            {isSaving
              ? "Preparando ambiente..."
              : modo === "cliente"
                ? "Vincular cliente"
                : "Cadastrar e preparar ambiente"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <strong className="mt-2 block text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </strong>
    </div>
  );
}

function Input({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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

function formatDateBR(value: string | null | undefined): string {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatMoneyBR(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
