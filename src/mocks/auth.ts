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
  },
  empresasPermitidas: [
    {
      id: empresaMock.id,
      nome: empresaMock.razao_social,
      cnpj: empresaMock.cnpj,
      status: empresaMock.status,
    },
  ],
  perfilAtual: "master",
};
