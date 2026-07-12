import { getSupabaseClient } from "@/lib/supabaseClient";
import type { UUID } from "@/types";

export interface AssistantSource {
  modulo?: string;
  tabela?: string;
  registro_id?: UUID;
  titulo?: string;
  data_vencimento?: string | null;
  status?: string | null;
}

export interface AssistantResponse {
  resposta?: string;
  answer?: string;
  fontes?: AssistantSource[];
  sources?: AssistantSource[];
}

export const assistantService = {
  async perguntar(empresaId: UUID, pergunta: string): Promise<AssistantResponse> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke<AssistantResponse>("assistant-query", {
      body: {
        empresa_id: empresaId,
        pergunta,
      },
    });

    if (error) {
      throw new Error(error.message || "Não foi possível consultar o Assistente IA.");
    }

    return data ?? { resposta: "Não encontrei dados estruturados para responder essa pergunta." };
  },
};
