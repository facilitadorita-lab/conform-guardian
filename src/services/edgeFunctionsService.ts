// Wrappers para as Edge Functions do Supabase.
// Todas as chamadas passam pelo supabase.functions.invoke, que já anexa o JWT do
// usuário autenticado. NUNCA chamar asaas-webhook daqui — é webhook externo.
import { requireSupabase } from "./_supabase";

async function invoke<T = unknown>(name: string, body?: unknown): Promise<T> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: body ?? {},
  });
  if (error) {
    const message = (error as { message?: string })?.message ?? "Falha ao chamar função.";
    throw new Error(message);
  }
  return data as T;
}

// ---- invite-company-user ----
export interface InviteCompanyUserInput {
  email: string;
  nome: string;
  perfil: "administrador" | "responsavel_tecnico" | "colaborador" | "somente_leitura";
  setor?: string;
}
export interface InviteCompanyUserResult {
  ok: boolean;
  userId?: string;
  message?: string;
}
export function inviteCompanyUser(input: InviteCompanyUserInput) {
  return invoke<InviteCompanyUserResult>("invite-company-user", input);
}

// ---- create-evidence-upload ----
// Passo 1: pede URL assinada. Passo 2: envia arquivo. Passo 3: confirma.
export interface CreateEvidenceUploadRequest {
  fileName: string;
  mimeType: string;
  size: number;
  contexto: "documento" | "equipamento" | "manutencao" | "pendencia" | "outro";
  referenciaId?: string;
}
export interface CreateEvidenceUploadResponse {
  uploadUrl: string;
  evidenceId: string;
  headers?: Record<string, string>;
  confirmToken?: string;
}
export function createEvidenceUpload(input: CreateEvidenceUploadRequest) {
  return invoke<CreateEvidenceUploadResponse>("create-evidence-upload", input);
}

/**
 * Fluxo completo de upload seguro de anexo:
 * 1. pede URL assinada via create-evidence-upload
 * 2. envia o arquivo direto para o storage
 * 3. confirma a conclusão para o backend registrar metadados
 */
export async function uploadAnexoSeguro(
  file: File,
  contexto: CreateEvidenceUploadRequest["contexto"],
  referenciaId?: string,
): Promise<{ evidenceId: string }> {
  const ticket = await createEvidenceUpload({
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    contexto,
    referenciaId,
  });

  const putResp = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...(ticket.headers ?? {}),
    },
    body: file,
  });
  if (!putResp.ok) {
    throw new Error(`Falha no upload do arquivo (${putResp.status}).`);
  }

  await invoke("create-evidence-upload", {
    confirm: true,
    evidenceId: ticket.evidenceId,
    confirmToken: ticket.confirmToken,
  });

  return { evidenceId: ticket.evidenceId };
}

// ---- assistant-query ----
// IA segura: SOMENTE perguntas sobre dados estruturados. Nunca enviar arquivos,
// PDFs, imagens ou DOCX. O backend controla o contexto acessível.
export interface AssistantQueryInput {
  empresa_id: string;
  pergunta: string;
  contexto?: "dashboard" | "documentos" | "equipamentos" | "manutencoes" | "pendencias" | "geral";
  historico?: { role: "user" | "assistant"; content: string }[];
}
export interface AssistantQueryResult {
  resposta?: string;
  answer?: string;
  referencias?: { tipo: string; id: string; label: string }[];
}
export function assistantQuery(input: AssistantQueryInput) {
  if (!input.empresa_id) {
    throw new Error("Selecione uma empresa antes de consultar a IA.");
  }
  return invoke<AssistantQueryResult>("assistant-query", input);
}

// ---- create-asaas-subscription (Admin Master apenas) ----
export interface CreateAsaasSubscriptionInput {
  empresaId: string;
  planoId: string;
  ciclo: "mensal" | "trimestral" | "semestral" | "anual";
  formaPagamento: "boleto" | "cartao" | "pix";
  valor?: number;
}
export interface CreateAsaasSubscriptionResult {
  ok: boolean;
  subscriptionId?: string;
  invoiceUrl?: string;
  message?: string;
}
export function createAsaasSubscription(input: CreateAsaasSubscriptionInput) {
  return invoke<CreateAsaasSubscriptionResult>("create-asaas-subscription", input);
}

export const edgeFunctionsService = {
  inviteCompanyUser,
  createEvidenceUpload,
  uploadAnexoSeguro,
  assistantQuery,
  createAsaasSubscription,
};