import { documentosService } from "./documentosService";
import { equipamentosService } from "./equipamentosService";
import { manutencoesService } from "./manutencoesService";
import type { StatusConformidade } from "@/types";

export type VencimentoModulo = "documentos" | "equipamentos" | "manutencoes";

export interface VencimentoConsolidado {
  id: string;
  modulo: VencimentoModulo;
  titulo: string;
  subtitulo: string;
  responsavel: string;
  vencimento: string;
  diasRestantes: number;
  status: StatusConformidade;
  link: string;
}

export const vencimentosService = {
  async listar(empresaId: string): Promise<VencimentoConsolidado[]> {
    const [documentos, equipamentos, manutencoes] = await Promise.all([
      documentosService.listar(empresaId, { limite: 250 }),
      equipamentosService.listar(empresaId),
      manutencoesService.listar(empresaId, { limite: 250 }),
    ]);

    return [
      ...documentos.map((documento) => ({
        id: documento.id,
        modulo: "documentos" as const,
        titulo: documento.nome,
        subtitulo: `${documento.tipo} · ${documento.setor}`,
        responsavel: documento.responsavel,
        vencimento: documento.vencimento,
        diasRestantes: calcularDiasRestantes(documento.vencimento),
        status: documento.status,
        link: "/documentos",
      })),
      ...equipamentos.map((equipamento) => ({
        id: equipamento.id,
        modulo: "equipamentos" as const,
        titulo: equipamento.nome,
        subtitulo: `${equipamento.tipo} · ${equipamento.setor}`,
        responsavel: "Responsável técnico",
        vencimento: equipamento.proximoVenc,
        diasRestantes: calcularDiasRestantes(equipamento.proximoVenc),
        status: equipamento.status,
        link: `/equipamentos/${equipamento.id}`,
      })),
      ...manutencoes.map((manutencao) => ({
        id: manutencao.id,
        modulo: "manutencoes" as const,
        titulo: manutencao.equipamento,
        subtitulo: manutencao.tipo,
        responsavel: manutencao.responsavel,
        vencimento: manutencao.data,
        diasRestantes: calcularDiasRestantes(manutencao.data),
        status: manutencao.status,
        link: manutencao.equipamentoId
          ? `/equipamentos/${manutencao.equipamentoId}`
          : "/manutencoes",
      })),
    ]
      .filter((item) => item.vencimento && item.vencimento !== "-")
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  },
};

function calcularDiasRestantes(date: string | null | undefined): number {
  if (!date || date === "-") return 9999;
  const alvo = new Date(`${date}T00:00:00`);
  if (Number.isNaN(alvo.getTime())) return 9999;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86_400_000);
}
