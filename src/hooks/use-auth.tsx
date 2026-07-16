import type { ReactNode } from "react";
import { AppSessionProvider, useAppSession } from "./use-app-session";

/** @deprecated Use AppSessionProvider diretamente em novos layouts. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <AppSessionProvider>{children}</AppSessionProvider>;
}

/** Adaptador de compatibilidade; o estado pertence ao AppSessionContext único. */
export function useAuth() {
  const session = useAppSession();
  return {
    user: session.user,
    session: session.session,
    loading: session.authLoading,
    passwordRecovery: session.passwordRecovery,
    clearPasswordRecovery: session.clearPasswordRecovery,
    signIn: session.signIn,
    signOut: session.signOut,
  };
}
