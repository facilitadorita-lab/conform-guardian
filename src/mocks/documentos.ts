import type { DocumentoResumo } from "@/types";

export const documentosMock: DocumentoResumo[] = [
  { id: "D-101", nome: "Alvara Sanitario 2025", categoria: "Regulatorio", tipo: "Alvara", numero: "AS-2025-0091", orgao: "Vigilancia Sanitaria", responsavel: "Marina Alves", emissao: "2025-07-06", vencimento: "2026-07-06", status: "critico", setor: "Administrativo" },
  { id: "D-102", nome: "Licenca Ambiental de Operacao", categoria: "Ambiental", tipo: "Licenca", numero: "LO-4488", orgao: "SEMA", responsavel: "Camila Torres", emissao: "2024-01-10", vencimento: "2027-01-10", status: "ok", setor: "Operacoes" },
  { id: "D-103", nome: "PGRSS", categoria: "Saude", tipo: "Plano", numero: "PGRSS-19", orgao: "Interno", responsavel: "Camila Torres", emissao: "2025-01-15", vencimento: "2026-07-15", status: "atencao", setor: "Operacoes" },
  { id: "D-104", nome: "Contrato Coleta de Residuos", categoria: "Contratos", tipo: "Contrato", numero: "CT-0071", orgao: "EcoAmbiental", responsavel: "Marina Alves", emissao: "2024-08-05", vencimento: "2026-08-05", status: "ok", setor: "Administrativo" },
  { id: "D-105", nome: "Autorizacao ANVISA", categoria: "Regulatorio", tipo: "Autorizacao", numero: "ANV-778", orgao: "ANVISA", responsavel: "Marina Alves", emissao: "2023-05-01", vencimento: "2026-05-01", status: "vencido", setor: "Regulatorio" },
  { id: "D-106", nome: "Certificado de Boas Praticas", categoria: "Qualidade", tipo: "Certificado", numero: "BPF-221", orgao: "ANVISA", responsavel: "Rafael Souza", emissao: "2025-03-01", vencimento: "2027-03-01", status: "ok", setor: "Qualidade" },
];
