import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authContextMock } from "@/mocks";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { shouldUseMocks } from "@/lib/runtime-config";
import {
  authService,
  clearSelectedCompanyId,
  companyVerificationService,
  getSelectedCompanyId,
  setSelectedCompanyId,
} from "@/services";
import type { AuthContexto, EffectiveCompanyPermissions } from "@/types";

export interface AppSessionContextValue {
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  passwordRecovery: boolean;
  authContext: AuthContexto | null;
  permissions: EffectiveCompanyPermissions | null;
  contextLoading: boolean;
  contextError: Error | null;
  selectedCompanyId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearPasswordRecovery: () => void;
  refreshContext: () => Promise<AuthContexto | null>;
  selectCompany: (companyId: string) => Promise<boolean>;
  clearSelectedCompany: () => void;
}

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const useMocks = shouldUseMocks();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(!useMocks);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authContext, setAuthContext] = useState<AuthContexto | null>(
    useMocks ? authContextMock : null,
  );
  const [permissions, setPermissions] = useState<EffectiveCompanyPermissions | null>(null);
  const [contextLoading, setContextLoading] = useState(!useMocks);
  const [contextError, setContextError] = useState<Error | null>(null);
  const [selectedCompanyId, setSelectedCompanyState] = useState<string | null>(() =>
    getSelectedCompanyId(),
  );
  const contextRequest = useRef(0);
  const user = session?.user ?? null;

  useEffect(() => {
    if (useMocks) {
      setAuthLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (/type=(recovery|invite|signup|magiclink)/.test(hash)) {
        setPasswordRecovery(true);
      }
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") setPasswordRecovery(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [useMocks]);

  const refreshContext = useCallback(async (): Promise<AuthContexto | null> => {
    const requestId = ++contextRequest.current;

    if (useMocks) {
      setAuthContext(authContextMock);
      setContextError(null);
      setContextLoading(false);
      return authContextMock;
    }

    if (!user) {
      setAuthContext(null);
      setPermissions(null);
      setContextError(null);
      setContextLoading(false);
      return null;
    }

    setContextLoading(true);
    setContextError(null);
    try {
      const nextContext = await authService.obterContexto();
      if (requestId !== contextRequest.current) return null;

      setAuthContext(nextContext);
      const storedCompanyId = getSelectedCompanyId();
      if (!nextContext.usuario.isMaster && !storedCompanyId) {
        setSelectedCompanyId(nextContext.empresaAtual.id);
        setSelectedCompanyState(nextContext.empresaAtual.id);
      } else {
        setSelectedCompanyState(storedCompanyId);
      }

      const canResolvePermissions = !nextContext.usuario.isMaster || Boolean(storedCompanyId);
      if (canResolvePermissions) {
        const nextPermissions = await companyVerificationService.obterPermissoes(
          nextContext.empresaAtual.id,
        );
        if (requestId === contextRequest.current) setPermissions(nextPermissions);
      } else {
        setPermissions(null);
      }

      return nextContext;
    } catch (error) {
      if (requestId !== contextRequest.current) return null;
      const normalized = error instanceof Error ? error : new Error("Contexto indisponível.");
      setAuthContext(null);
      setPermissions(null);
      setContextError(normalized);
      return null;
    } finally {
      if (requestId === contextRequest.current) setContextLoading(false);
    }
  }, [useMocks, user]);

  useEffect(() => {
    if (authLoading) return;
    void refreshContext();
  }, [authLoading, refreshContext]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (useMocks) throw new Error("Login real indisponível enquanto os mocks estiverem ativos.");
      const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    [useMocks],
  );

  const signOut = useCallback(async () => {
    contextRequest.current += 1;
    clearSelectedCompanyId();
    setSelectedCompanyState(null);
    setAuthContext(useMocks ? authContextMock : null);
    setPermissions(null);
    if (!useMocks) await getSupabaseClient().auth.signOut();
  }, [useMocks]);

  const selectCompany = useCallback(
    async (companyId: string) => {
      const allowed = authContext?.empresasPermitidas.some((company) => company.id === companyId);
      if (!allowed) return false;
      setSelectedCompanyId(companyId);
      setSelectedCompanyState(companyId);
      await refreshContext();
      return true;
    },
    [authContext, refreshContext],
  );

  const clearSelectedCompany = useCallback(() => {
    clearSelectedCompanyId();
    setSelectedCompanyState(null);
    setPermissions(null);
  }, []);

  const value = useMemo<AppSessionContextValue>(
    () => ({
      user,
      session,
      authLoading,
      passwordRecovery,
      authContext,
      permissions,
      contextLoading,
      contextError,
      selectedCompanyId,
      signIn,
      signOut,
      clearPasswordRecovery: () => setPasswordRecovery(false),
      refreshContext,
      selectCompany,
      clearSelectedCompany,
    }),
    [
      user,
      session,
      authLoading,
      passwordRecovery,
      authContext,
      permissions,
      contextLoading,
      contextError,
      selectedCompanyId,
      signIn,
      signOut,
      refreshContext,
      selectCompany,
      clearSelectedCompany,
    ],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) throw new Error("useAppSession deve ser usado dentro de <AppSessionProvider>.");
  return context;
}
