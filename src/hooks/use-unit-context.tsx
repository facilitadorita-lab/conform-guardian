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
import { useQueryClient } from "@tanstack/react-query";
import { useAppSession } from "@/hooks/use-app-session";
import { unidadesService } from "@/services";
import type { UnidadeLimites, UnidadeResumo, UUID } from "@/types";

const CONSOLIDATED = "consolidado";

interface UnitContextValue {
  unidadeAtual: UnidadeResumo | null;
  unidadeAtualId: UUID | null;
  unidadesPermitidas: UnidadeResumo[];
  visaoConsolidada: boolean;
  podeVisualizarConsolidado: boolean;
  podeAdministrarUnidades: boolean;
  limites: UnidadeLimites | null;
  carregando: boolean;
  erro: Error | null;
  selecionarUnidade: (unidadeId: UUID | null) => Promise<boolean>;
  atualizarUnidades: () => Promise<void>;
}

const UnitContext = createContext<UnitContextValue | undefined>(undefined);

function storageKey(empresaId: string) {
  return `conformflow.selectedUnitId:${empresaId}`;
}

export function UnitProvider({ children }: { children: ReactNode }) {
  const { selectedCompanyId, user, authContext } = useAppSession();
  const companyId = selectedCompanyId ?? authContext?.empresaAtual.id ?? null;
  const queryClient = useQueryClient();
  const [unidadesPermitidas, setUnidadesPermitidas] = useState<UnidadeResumo[]>([]);
  const [unidadeAtualId, setUnidadeAtualId] = useState<UUID | null>(null);
  const [podeVisualizarConsolidado, setPodeVisualizarConsolidado] = useState(false);
  const [podeAdministrarUnidades, setPodeAdministrarUnidades] = useState(false);
  const [limites, setLimites] = useState<UnidadeLimites | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<Error | null>(null);
  const requestId = useRef(0);

  const atualizarUnidades = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!companyId || (!user && !authContext)) {
      setUnidadesPermitidas([]);
      setUnidadeAtualId(null);
      setPodeVisualizarConsolidado(false);
      setPodeAdministrarUnidades(false);
      setLimites(null);
      setErro(null);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const response = await unidadesService.listar(companyId);
      if (currentRequest !== requestId.current) return;

      const allowedUnits = response.items.filter((unit) => unit.status !== "arquivada");
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(storageKey(companyId))
          : null;
      const storedUnit = allowedUnits.find((unit) => unit.id === stored);
      const resolvedId =
        stored === CONSOLIDATED && response.pode_visualizar_consolidado
          ? null
          : storedUnit
            ? storedUnit.id
            : allowedUnits.length === 1
              ? allowedUnits[0].id
              : response.pode_visualizar_consolidado
                ? null
                : (allowedUnits.find((unit) => unit.is_matriz)?.id ?? allowedUnits[0]?.id ?? null);

      setUnidadesPermitidas(response.items);
      setPodeVisualizarConsolidado(response.pode_visualizar_consolidado);
      setPodeAdministrarUnidades(response.pode_administrar);
      setLimites(response.limites);
      setUnidadeAtualId(resolvedId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey(companyId),
          resolvedId ?? CONSOLIDATED,
        );
      }
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setUnidadesPermitidas([]);
      setUnidadeAtualId(null);
      setPodeVisualizarConsolidado(false);
      setPodeAdministrarUnidades(false);
      setLimites(null);
      setErro(cause instanceof Error ? cause : new Error("Não foi possível carregar as unidades."));
    } finally {
      if (currentRequest === requestId.current) setCarregando(false);
    }
  }, [authContext, companyId, user]);

  useEffect(() => {
    setUnidadesPermitidas([]);
    setUnidadeAtualId(null);
    void atualizarUnidades();
  }, [atualizarUnidades]);

  const selecionarUnidade = useCallback(
    async (unitId: UUID | null) => {
      if (!companyId) return false;
      if (unitId === null && !podeVisualizarConsolidado) return false;
      if (
        unitId !== null &&
        !unidadesPermitidas.some(
          (unit) => unit.id === unitId && unit.status !== "arquivada",
        )
      ) {
        return false;
      }

      await queryClient.cancelQueries();
      if (unitId !== unidadeAtualId) {
        await unidadesService.registrarTroca(companyId, unidadeAtualId, unitId);
      }
      setUnidadeAtualId(unitId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey(companyId), unitId ?? CONSOLIDATED);
      }
      return true;
    },
    [
      companyId,
      podeVisualizarConsolidado,
      queryClient,
      unidadeAtualId,
      unidadesPermitidas,
    ],
  );

  const unidadeAtual = useMemo(
    () => unidadesPermitidas.find((unit) => unit.id === unidadeAtualId) ?? null,
    [unidadeAtualId, unidadesPermitidas],
  );

  const value = useMemo<UnitContextValue>(
    () => ({
      unidadeAtual,
      unidadeAtualId,
      unidadesPermitidas,
      visaoConsolidada: unidadeAtualId === null,
      podeVisualizarConsolidado,
      podeAdministrarUnidades,
      limites,
      carregando,
      erro,
      selecionarUnidade,
      atualizarUnidades,
    }),
    [
      unidadeAtual,
      unidadeAtualId,
      unidadesPermitidas,
      podeVisualizarConsolidado,
      podeAdministrarUnidades,
      limites,
      carregando,
      erro,
      selecionarUnidade,
      atualizarUnidades,
    ],
  );

  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
}

export function useUnitContext() {
  const context = useContext(UnitContext);
  if (!context) throw new Error("useUnitContext deve ser usado dentro de <UnitProvider>.");
  return context;
}
