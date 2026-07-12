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
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { shouldUseMocks } from "@/lib/runtime-config";

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

const empresasMock: EmpresaResumo[] = masterEmpresas.map((e) => ({
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
  contextoCarregando: boolean;
  trocarEmpresa: (id: string) => boolean;
  limparEmpresa: () => void;
  // Utilitários de simulação (mock).
  setEmpresaStatus: (s: EmpresaStatus) => void;
  setIsMaster: (v: boolean) => void;
};

const Ctx = createContext<SessionCtx | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const useMocks = shouldUseMocks();
  const { user } = useAuth();
  const [usuario, setUsuario] = useState<UsuarioAtualMock>(
    useMocks
      ? usuarioAtualMock
      : { id: "", nome: "", email: "", perfil: "Colaborador", isMaster: false },
  );
  const [empresas, setEmpresas] = useState<EmpresaResumo[]>(useMocks ? empresasMock : []);
  const [contextoCarregando, setContextoCarregando] = useState<boolean>(!useMocks);

  // Carrega contexto real do usuário via RPC api_contexto_usuario.
  useEffect(() => {
    if (useMocks) return;
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      setEmpresas([]);
      setUsuario({ id: "", nome: "", email: "", perfil: "Colaborador", isMaster: false });
      setContextoCarregando(false);
      return;
    }
    let cancelled = false;
    setContextoCarregando(true);
    (async () => {
      const { data, error } = await supabase.rpc("api_contexto_usuario");
      if (cancelled) return;
      if (error || !data) {
        console.error("api_contexto_usuario:", error);
        setUsuario({
          id: user.id,
          nome: (user.user_metadata?.nome as string) ?? user.email ?? "",
          email: user.email ?? "",
          perfil: "Colaborador",
          isMaster: false,
        });
        setEmpresas([]);
        setContextoCarregando(false);
        return;
      }
      // Aceita shape { usuario, empresas } ou { data: {...} }.
      const payload = (data as { usuario?: unknown; empresas?: unknown; data?: unknown }).data
        ? ((data as { data: unknown }).data as Record<string, unknown>)
        : (data as Record<string, unknown>);
      const u = (payload.usuario ?? {}) as Record<string, unknown>;
      const isMaster = Boolean(u.is_master ?? u.isMaster);
      setUsuario({
        id: (u.id as string) ?? user.id,
        nome: (u.nome as string) ?? user.email ?? "",
        email: (u.email as string) ?? user.email ?? "",
        perfil: isMaster ? "Admin Master" : ((u.perfil as UsuarioAtualMock["perfil"]) ?? "Administrador"),
        isMaster,
      });
      const list = ((payload.empresas as unknown[]) ?? []).map((raw): EmpresaResumo => {
        const e = raw as Record<string, unknown>;
        return {
          id: String(e.id ?? ""),
          razao_social: String(e.razao_social ?? e.razao ?? e.nome ?? ""),
          nome_fantasia: String(e.nome_fantasia ?? e.fantasia ?? e.razao_social ?? e.nome ?? ""),
          cnpj: String(e.cnpj ?? ""),
          plano: String(e.plano ?? "—"),
          status: ((e.status as EmpresaStatus) ?? "ativa"),
          usuarios: Number(e.usuarios ?? 0),
          documentos: Number(e.documentos ?? 0),
          equipamentos: Number(e.equipamentos ?? 0),
          assinatura: String(e.assinatura ?? "ativa"),
          desde: String(e.desde ?? ""),
        };
      });
      setEmpresas(list);
      setContextoCarregando(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [useMocks, user]);

  // Empresas visíveis conforme perfil.
  const empresasDisponiveis = useMemo(() => {
    if (usuario.isMaster) return empresas;
    // Usuário comum: apenas empresas retornadas pelo backend para o vínculo dele.
    return empresas;
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
      contextoCarregando,
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
    contextoCarregando,
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