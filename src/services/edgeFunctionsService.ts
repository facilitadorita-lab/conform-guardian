// Wrappers para as Edge Functions do Supabase.
// Todas as chamadas passam pelo supabase.functions.invoke, que anexa o JWT do
// usuario autenticado. NUNCA chamar asaas-webhook daqui: e webhook externo.
import { requireSupabase } from "./_supabase";

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const SIGNED_PREVIEW_SECONDS = 10 * 60;

const acceptedAttachmentMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function invoke<T = unknown>(name: string, body?: unknown): Promise<T> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: body ?? {},
  });

  if (error) {
    throw new Error(await extractFunctionErrorMessage(error));
  }

  return data as T;
}

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback =
    (error as { message?: string })?.message || "Falha ao chamar funcao do backend.";
  const context = (error as { context?: Response })?.context;

  if (!context) return translateFunctionError(fallback);

  try {
    const payload = (await context.clone().json()) as { error?: string; message?: string };
    return translateFunctionError(payload.error || payload.message || fallback);
  } catch {
    try {
      const text = await context.clone().text();
      return translateFunctionError(text || fallback);
    } catch {
      return translateFunctionError(fallback);
    }
  }
}

function translateFunctionError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid_file")) {
    return "Arquivo invalido. Envie PDF, PNG, JPG, Word ou Excel com ate 20 MB.";
  }
  if (normalized.includes("storage_plan_limit_reached")) {
    return "Limite de armazenamento do plano atingido. Ajuste o plano ou remova arquivos antigos.";
  }
  if (normalized.includes("forbidden") || normalized.includes("sem permiss")) {
    return "Seu usuario nao tem permissao para anexar arquivos nesta empresa.";
  }
  if (normalized.includes("source_not_found")) {
    return "O registro base do anexo nao foi encontrado nesta empresa.";
  }
  if (normalized.includes("upload_not_found")) {
    return "O arquivo foi enviado, mas o backend nao conseguiu confirmar o upload. Tente novamente.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("cors")) {
    return "O navegador bloqueou a comunicacao com o backend. Verifique a funcao de upload no Supabase.";
  }

  return message;
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
  empresaId: string;
  modulo:
    | "documentos"
    | "equipamentos"
    | "calibracoes"
    | "qualificacoes"
    | "manutencoes"
    | "pendencias";
  registroId: string;
  nomeOriginal: string;
  mimeType: string;
  tamanhoBytes: number;
  finalidade?: string;
  substituiAnexoId?: string | null;
}

export interface CreateEvidenceUploadResponse {
  upload_id: string;
  path: string;
  token: string;
  signed_url: string;
  expires_in: number;
}

export function createEvidenceUpload(input: CreateEvidenceUploadRequest) {
  return invoke<CreateEvidenceUploadResponse>("create-evidence-upload", {
    action: "prepare",
    empresa_id: input.empresaId,
    modulo: input.modulo,
    registro_id: input.registroId,
    nome_original: input.nomeOriginal,
    mime_type: input.mimeType,
    tamanho_bytes: input.tamanhoBytes,
  });
}

/**
 * Fluxo completo de upload seguro de anexo:
 * 1. pede URL assinada via create-evidence-upload
 * 2. envia o arquivo direto para o storage
 * 3. confirma a conclusao para o backend registrar metadados
 */
export async function uploadAnexoSeguro(
  file: File,
  input: {
    empresaId: string;
    modulo: CreateEvidenceUploadRequest["modulo"];
    registroId: string;
    finalidade?: string;
    substituiAnexoId?: string | null;
    onProgress?: (progress: number) => void;
  },
): Promise<{ anexoId?: string; signedUrl?: string; path?: string }> {
  validateAttachmentFile(file);
  const supabase = requireSupabase();
  const ticket = await createEvidenceUpload({
    empresaId: input.empresaId,
    modulo: input.modulo,
    registroId: input.registroId,
    nomeOriginal: file.name,
    mimeType: file.type || "application/octet-stream",
    tamanhoBytes: file.size,
  });

  await uploadFileToSignedUrl(ticket.signed_url, file, input.onProgress);

  const result = await invoke<{ anexo?: { id?: string } }>("create-evidence-upload", {
    action: "complete",
    empresa_id: input.empresaId,
    modulo: input.modulo,
    registro_id: input.registroId,
    path: ticket.path,
    nome_original: file.name,
    mime_type: file.type || "application/octet-stream",
    tamanho_bytes: file.size,
    finalidade: input.finalidade ?? "principal",
    substitui_anexo_id: input.substituiAnexoId ?? null,
  });

  input.onProgress?.(100);

  const { data: signedUrlData } = await supabase.storage
    .from("evidencias")
    .createSignedUrl(ticket.path, SIGNED_PREVIEW_SECONDS, { download: false });

  return {
    anexoId: result.anexo?.id,
    signedUrl: signedUrlData?.signedUrl ?? undefined,
    path: ticket.path,
  };
}

export function validateAttachmentFile(file: File): void {
  if (file.size <= 0) {
    throw new Error("Arquivo vazio. Selecione um arquivo valido para anexar.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Arquivo maior que 20 MB. Reduza o arquivo antes de anexar.");
  }
  if (!acceptedAttachmentMimeTypes.has(file.type || "application/octet-stream")) {
    throw new Error("Arquivo invalido. Envie PDF, PNG, JPG, Word ou Excel com ate 20 MB.");
  }
}

function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("cacheControl", "3600");
    formData.append("", file);

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.min(95, Math.round((event.loaded / event.total) * 95));
      onProgress?.(progress);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(95);
        resolve();
        return;
      }

      reject(new Error(translateFunctionError(xhr.responseText || `Falha no upload (${xhr.status}).`)));
    };

    xhr.onerror = () => reject(new Error("Falha de rede durante o upload do arquivo."));
    xhr.onabort = () => reject(new Error("Upload cancelado antes de finalizar."));
    xhr.send(formData);
  });
}

export function registrarEventoAnexo(
  anexoId: string,
  acao: "visualizacao_anexo" | "download_anexo" = "visualizacao_anexo",
) {
  if (!anexoId) return Promise.resolve();
  return requireSupabase().rpc("registrar_evento_anexo", {
    p_anexo_id: anexoId,
    p_acao: acao,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
}

// ---- assistant-query ----
// IA segura: SOMENTE perguntas sobre dados estruturados. Nunca enviar arquivos,
// PDFs, imagens ou DOCX. O backend controla o contexto acessivel.
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
  validateAttachmentFile,
  registrarEventoAnexo,
  assistantQuery,
  createAsaasSubscription,
};
