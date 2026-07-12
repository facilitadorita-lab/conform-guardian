import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  masterEmpresas,
  usuarioAtualMock,
  type EmpresaAtualMock,
  type UsuarioAtualMock,
  type EmpresaStatus,
} from "@/mocks/conformflow-mocks";

const STORAGE_KEY = "conformflow.selectedCompanyId";

// Fonte única de empresas disponíveis (mock enquanto a tabela real não é consumida).
// Cada registro é convertido em EmpresaAtualMock consumível pelos módulos.
export type EmpresaResumo = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  plano: string;
  status: EmpresaStatus;
  usuarios: number;
  documentos: number;
  equipamentos: number;
  assinatura: string;
  desde: string;
};

const empresasCadastradas: EmpresaResumo[] = masterEmpresas.map((e) => ({
  id: e.id,
  razao_social: e.razao,
  nome_fantasia: e.fantasia,
  cnpj: e.cnpj,
  plano: e.plano,
  status: e.status,
  usuarios: e.usuarios,
  documentos: e.documentos,
  equipamentos: e.equipamentos,
  assinatura: e.assinatura,
  desde: e.desde,
}));

function toEmpresaAtual(e: EmpresaResumo): EmpresaAtualMock {
  return {
    id: e.id,
    razao_social: e.razao_social,
    nome_fantasia: e.nome_fantasia,
    cnpj: e.cnpj,
    status: e.status,
    plano: e.plano,
    proximo_vencimento: "2026-08-10",
  };
}

type SessionCtx = {
  empresaAtual: EmpresaAtualMock;
  selectedCompany: EmpresaResumo | null;
  selectedCompanyId: string | null;
  empresasDisponiveis: EmpresaResumo[];
  usuarioAtual: UsuarioAtualMock;
  isMaster: boolean;
  empresaAtiva: boolean;
  acessoLiberado: boolean;
  trocarEmpresa: (id: string) => boolean;
  limparEmpresa: () => void;
  // Utilitários de simulação (mock).
  setEmpresaStatus: (s: EmpresaStatus) => void;
  setIsMaster: (v: boolean) => void;
};

const Ctx = createContext<SessionCtx | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAtualMock>(usuarioAtualMock);
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>(empresasCadastradas);

  // Empresas visíveis conforme perfil.
  const empresasDisponiveis = useMemo(() => {
    if (usuario.isMaster) return empresas;
    // Usuário comum: apenas a(s) empresa(s) vinculada(s). Enquanto sem backend
    // real, considera-se a primeira empresa como vínculo padrão.
    return empresas.slice(0, 1);
  }, [empresas, usuario.isMaster]);

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  // Valida id salvo contra empresas disponíveis; auto-seleciona quando cabível.
  useEffect(() => {
    const valid = selectedId && empresasDisponiveis.some((e) => e.id === selectedId);
    if (!valid) {
      if (!usuario.isMaster && empresasDisponiveis.length === 1) {
        const only = empresasDisponiveis[0].id;
        setSelectedId(only);
        if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, only);
      } else if (selectedId) {
        // id inválido — limpa
        setSelectedId(null);
        if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [empresasDisponiveis, selectedId, usuario.isMaster]);

  const selectedCompany = useMemo(
    () => empresasDisponiveis.find((e) => e.id === selectedId) ?? null,
    [empresasDisponiveis, selectedId],
  );

  const trocarEmpresa = useCallback(
    (id: string) => {
      const ok = empresasDisponiveis.some((e) => e.id === id);
      if (!ok) return false;
      setSelectedId(id);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
      return true;
    },
    [empresasDisponiveis],
  );

  const limparEmpresa = useCallback(() => {
    setSelectedId(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setEmpresaStatus = useCallback(
    (s: EmpresaStatus) => {
      if (!selectedId) return;
      setEmpresas((prev) => prev.map((e) => (e.id === selectedId ? { ...e, status: s } : e)));
    },
    [selectedId],
  );

  const setIsMaster = useCallback((v: boolean) => {
    setUsuario((prev) => ({
      ...prev,
      isMaster: v,
      perfil: v ? "Admin Master" : "Administrador",
    }));
  }, []);

  const value = useMemo<SessionCtx>(() => {
    // Fallback para módulos legados que dependem de empresaAtual mesmo sem seleção.
    const empresaAtualFallback: EmpresaAtualMock = selectedCompany
      ? toEmpresaAtual(selectedCompany)
      : {
          id: "",
          razao_social: "—",
          nome_fantasia: "Nenhuma empresa selecionada",
          cnpj: "",
          status: "ativa",
          plano: "—",
          proximo_vencimento: "",
        };
    const empresaAtiva = empresaAtualFallback.status === "ativa";
    return {
      empresaAtual: empresaAtualFallback,
      selectedCompany,
      selectedCompanyId: selectedId,
      empresasDisponiveis,
      usuarioAtual: usuario,
      isMaster: usuario.isMaster,
      empresaAtiva,
      // Master sempre libera; usuário comum precisa de empresa ativa selecionada.
      acessoLiberado: usuario.isMaster || (!!selectedCompany && empresaAtiva),
      trocarEmpresa,
      limparEmpresa,
      setEmpresaStatus,
      setIsMaster,
    };
  }, [
    selectedCompany,
    selectedId,
    empresasDisponiveis,
    usuario,
    trocarEmpresa,
    limparEmpresa,
    setEmpresaStatus,
    setIsMaster,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession deve ser usado dentro de <SessionProvider>.");
  return ctx;
}