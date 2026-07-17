import type { ManutencaoResumo } from "@/types";

export const manutencoesMock: ManutencaoResumo[] = [
  {
    id: "M-501",
    equipamento: "Autoclave AC-01",
    tipo: "Preventiva",
    data: "2026-07-10",
    responsavel: "SterilTech",
    status: "atencao",
    os: "OS-8821",
  },
  {
    id: "M-502",
    equipamento: "Ar-Cond. AR-08",
    tipo: "Corretiva",
    data: "2026-06-28",
    responsavel: "AirCorp Servicos",
    status: "vencido",
    os: "OS-8815",
  },
  {
    id: "M-503",
    equipamento: "-",
    tipo: "Recorrente Geral",
    data: "2026-07-30",
    responsavel: "Higienizacao Total",
    status: "ok",
    os: "OS-8830",
  },
  {
    id: "M-504",
    equipamento: "Camara Fria CF-02",
    tipo: "Preventiva",
    data: "2026-08-05",
    responsavel: "ColdMax",
    status: "ok",
    os: "OS-8833",
  },
  {
    id: "M-505",
    equipamento: "Balanca BL-04",
    tipo: "Preventiva",
    data: "2026-07-15",
    responsavel: "Precisa Metrologia",
    status: "atencao",
    os: "OS-8840",
  },
];
