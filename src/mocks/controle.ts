import type {
  AlertaResumo,
  ConfiguracaoCatalogoItem,
  LogAuditoriaResumo,
  RelatorioCatalogoItem,
  UsuarioResumo,
} from "@/types";

export const alertasMock: AlertaResumo[] = [
  {
    id: "A-9001",
    marco: "60 dias",
    item: "Certificado BPF-221",
    canal: "E-mail + Central",
    data: "2026-08-30",
    nivel: "info",
  },
  {
    id: "A-9002",
    marco: "30 dias",
    item: "Licenca Ambiental LO-4488",
    canal: "Central",
    data: "2026-07-10",
    nivel: "info",
  },
  {
    id: "A-9003",
    marco: "15 dias",
    item: "PGRSS-19",
    canal: "E-mail + Central",
    data: "2026-07-15",
    nivel: "atencao",
  },
  {
    id: "A-9004",
    marco: "7 dias",
    item: "Alvara AS-2025-0091",
    canal: "E-mail + Dashboard",
    data: "2026-07-06",
    nivel: "critico",
  },
  {
    id: "A-9005",
    marco: "No vencimento",
    item: "Calibracao BL-04",
    canal: "E-mail + Dashboard",
    data: "2026-07-02",
    nivel: "critico",
  },
  {
    id: "A-9006",
    marco: "Apos vencido",
    item: "Autorizacao ANV-778",
    canal: "E-mail + Dashboard",
    data: "2026-05-01",
    nivel: "vencido",
  },
];

export const logsAuditoriaMock: LogAuditoriaResumo[] = [
  {
    id: "L-77021",
    data: "2026-07-04 09:12",
    usuario: "marina.alves@empresa.com",
    acao: "Substituicao de arquivo",
    entidade: "Documento D-103 (PGRSS)",
    ip: "189.14.22.10",
  },
  {
    id: "L-77020",
    data: "2026-07-04 08:47",
    usuario: "rafael.souza@empresa.com",
    acao: "Criacao",
    entidade: "Manutencao M-505",
    ip: "189.14.22.12",
  },
  {
    id: "L-77019",
    data: "2026-07-03 17:33",
    usuario: "admin@conformflow.io",
    acao: "Alteracao de permissoes",
    entidade: "Usuario camila.torres",
    ip: "10.0.0.4",
  },
  {
    id: "L-77018",
    data: "2026-07-03 15:02",
    usuario: "camila.torres@empresa.com",
    acao: "Download",
    entidade: "Documento D-102",
    ip: "189.14.22.20",
  },
  {
    id: "L-77017",
    data: "2026-07-03 09:00",
    usuario: "marina.alves@empresa.com",
    acao: "Login",
    entidade: "Sessao",
    ip: "189.14.22.10",
  },
  {
    id: "L-77016",
    data: "2026-07-02 18:41",
    usuario: "rafael.souza@empresa.com",
    acao: "Exclusao logica",
    entidade: "Documento D-090",
    ip: "189.14.22.12",
  },
];

export const usuariosMock: UsuarioResumo[] = [
  {
    id: "U-01",
    nome: "Marina Alves",
    email: "marina.alves@empresa.com",
    perfil: "Administrador",
    setor: "Regulatorio",
    status: "Ativo",
  },
  {
    id: "U-02",
    nome: "Rafael Souza",
    email: "rafael.souza@empresa.com",
    perfil: "Responsavel tecnico",
    setor: "Manutencao",
    status: "Ativo",
  },
  {
    id: "U-03",
    nome: "Camila Torres",
    email: "camila.torres@empresa.com",
    perfil: "Colaborador",
    setor: "Operacoes",
    status: "Ativo",
  },
  {
    id: "U-04",
    nome: "Auditor Externo",
    email: "auditor@parceiro.com",
    perfil: "Somente leitura",
    setor: "-",
    status: "Ativo",
  },
];

export const relatoriosMock: RelatorioCatalogoItem[] = [
  {
    id: "conformidade-geral",
    title: "Conformidade Geral",
    desc: "Indice consolidado por setor e periodo.",
    icon: "bar-chart-3",
  },
  {
    id: "documentos",
    title: "Documentos",
    desc: "Vencimentos, versoes e responsaveis.",
    icon: "file-text",
  },
  {
    id: "equipamentos",
    title: "Equipamentos",
    desc: "Calibracoes, qualificacoes e criticidade.",
    icon: "cog",
  },
  {
    id: "manutencoes",
    title: "Manutencoes",
    desc: "Preventivas, corretivas e MTBF/MTTR.",
    icon: "wrench",
  },
  {
    id: "pendencias",
    title: "Pendencias",
    desc: "Tratativas, prazos e evidencias.",
    icon: "clipboard-list",
  },
  {
    id: "historico-auditoria",
    title: "Historico de Auditoria",
    desc: "Logs imutaveis para compliance.",
    icon: "shield-check",
  },
];

export const configuracoesMock: ConfiguracaoCatalogoItem[] = [
  {
    id: "dados-empresa",
    title: "Dados da empresa",
    desc: "Razao social, CNPJ, endereco e responsavel legal.",
    icon: "building-2",
  },
  {
    id: "setores",
    title: "Setores",
    desc: "Estruture setores para segmentar responsabilidades.",
    icon: "layers",
  },
  {
    id: "categorias",
    title: "Categorias",
    desc: "Regulatorio, ambiental, qualidade, contratos e outros.",
    icon: "tag",
  },
  {
    id: "tipos-documentos",
    title: "Tipos de documentos",
    desc: "Alvara, licenca, certificado, contrato, plano.",
    icon: "tag",
  },
  {
    id: "tipos-equipamentos",
    title: "Tipos de equipamentos",
    desc: "Medicao, esterilizacao, climatizacao, armazenamento.",
    icon: "cog",
  },
  {
    id: "tipos-manutencao",
    title: "Tipos de manutencao",
    desc: "Preventiva, corretiva e recorrente geral.",
    icon: "wrench",
  },
  {
    id: "regras-alerta",
    title: "Regras de alerta",
    desc: "Marcos de 60, 30, 15, 7 dias, no vencimento e apos vencido.",
    icon: "bell-ring",
  },
  {
    id: "responsaveis",
    title: "Responsaveis",
    desc: "Padroes de atribuicao por setor e categoria.",
    icon: "users",
  },
  {
    id: "preferencias-notificacao",
    title: "Preferencias de notificacao",
    desc: "Canais, frequencia e horarios de disparo.",
    icon: "mail-check",
  },
];
