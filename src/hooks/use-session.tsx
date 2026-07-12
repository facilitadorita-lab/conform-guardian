import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  empresaAtualMock,
  usuarioAtualMock,
  type EmpresaAtualMock,
  type UsuarioAtualMock,
  type EmpresaStatus,
} from "@/mocks/conformflow-mocks";

type SessionCtx = {
  empresaAtual: EmpresaAtualMock;
  usuarioAtual: UsuarioAtualMock;
  isMaster: boolean;
  empresaAtiva: boolean;
  acessoLiberado: boolean;
  // Utilitários de simulação (mock) — permitem testar bloqueio/master no preview.
  setEmpresaStatus: (s: EmpresaStatus) => void;
  setIsMaster: (v: boolean) => void;
};

const Ctx = createContext<SessionCtx | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaAtualMock>(empresaAtualMock);
  const [usuario, setUsuario] = useState<UsuarioAtualMock>(usuarioAtualMock);

  const value = useMemo<SessionCtx>(() => {
    const isMaster = usuario.isMaster;
    const empresaAtiva = empresa.status === "ativa";
    return {
      empresaAtual: empresa,
      usuarioAtual: usuario,
      isMaster,
      empresaAtiva,
      acessoLiberado: isMaster || empresaAtiva,
      setEmpresaStatus: (s) => setEmpresa((prev) => ({ ...prev, status: s })),
      setIsMaster: (v) =>
        setUsuario((prev) => ({
          ...prev,
          isMaster: v,
          perfil: v ? "Admin Master" : "Administrador",
        })),
    };
  }, [empresa, usuario]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession deve ser usado dentro de <SessionProvider>.");
  return ctx;
}