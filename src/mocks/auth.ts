import { MOCK_EMPRESA_ID, MOCK_USUARIO_ID } from "@/lib/runtime-config";
import type { AuthContexto, Empresa, Usuario, UsuarioEmpresa } from "@/types";

export const empresaMock: Empresa = {
  id: MOCK_EMPRESA_ID,
  razao_social: "Clinica Vitalis Ltda.",
  nome_fantasia: "Clinica Vitalis",
  cnpj: "12.345.678/0001-90",
  segmento: "Saude regulada",
  cidade: "Sao Paulo",
  estado: "SP",
  status: "ativa",
};

export const usuarioMock: Usuario = {
  id: MOCK_USUARIO_ID,
  nome: "Marina Alves",
  email: "marina.alves@empresa.com",
  is_master: true,
  status: "ativo",
};

export const usuarioEmpresaMock: UsuarioEmpresa = {
  id: "usuario-empresa-mock-01",
  usuario_id: MOCK_USUARIO_ID,
  empresa_id: MOCK_EMPRESA_ID,
  perfil: "administrador",
  ativo: true,
};

export const authContextMock: AuthContexto = {
  usuario: {
    id: usuarioMock.id,
    nome: usuarioMock.nome,
    email: usuarioMock.email,
    isMaster: usuarioMock.is_master,
  },
  empresaAtual: {
    id: empresaMock.id,
    nome: empresaMock.razao_social,
    cnpj: empresaMock.cnpj,
    status: empresaMock.status,
    plano: {
      id: "plano-completo",
      nome: "Completo",
      codigo: "completo",
      recursos: {
        assistente_ia: true,
        vencimentos: true,
        documentos: true,
        equipamentos: true,
        calibracoes: true,
        qualificacoes: true,
        manutencoes: true,
        pendencias: true,
        alertas: true,
        relatorios: true,
        auditoria: true,
        usuarios: true,
        anexos: true,
      },
      limite_usuarios: 4,
      limite_documentos: 500,
      limite_equipamentos: 150,
      limite_storage_mb: 2048,
    },
  },
  empresasPermitidas: [
    {
      id: empresaMock.id,
      nome: empresaMock.razao_social,
      cnpj: empresaMock.cnpj,
      status: empresaMock.status,
      plano: {
        id: "plano-completo",
        nome: "Completo",
        codigo: "completo",
        recursos: {
          assistente_ia: true,
          vencimentos: true,
          documentos: true,
          equipamentos: true,
          calibracoes: true,
          qualificacoes: true,
          manutencoes: true,
          pendencias: true,
          alertas: true,
          relatorios: true,
          auditoria: true,
          usuarios: true,
          anexos: true,
        },
        limite_usuarios: 4,
        limite_documentos: 500,
        limite_equipamentos: 150,
        limite_storage_mb: 2048,
      },
    },
  ],
  perfilAtual: "master",
};
