export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achados_qualidade_dados: {
        Row: {
          detalhes_json: Json
          detectado_at: string
          empresa_id: string
          id: string
          modulo: string
          registro_id: string | null
          regra_codigo: string
          resolvido_at: string | null
          resolvido_por: string | null
          severidade: string
          titulo: string
          ultima_ocorrencia_at: string
        }
        Insert: {
          detalhes_json?: Json
          detectado_at?: string
          empresa_id: string
          id?: string
          modulo: string
          registro_id?: string | null
          regra_codigo: string
          resolvido_at?: string | null
          resolvido_por?: string | null
          severidade: string
          titulo: string
          ultima_ocorrencia_at?: string
        }
        Update: {
          detalhes_json?: Json
          detectado_at?: string
          empresa_id?: string
          id?: string
          modulo?: string
          registro_id?: string | null
          regra_codigo?: string
          resolvido_at?: string | null
          resolvido_por?: string | null
          severidade?: string
          titulo?: string
          ultima_ocorrencia_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achados_qualidade_dados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achados_qualidade_dados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "achados_qualidade_dados_regra_codigo_fkey"
            columns: ["regra_codigo"]
            isOneToOne: false
            referencedRelation: "regras_qualidade_dados"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "achados_qualidade_dados_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          created_at: string
          created_by: string | null
          data_vencimento: string | null
          deleted_at: string | null
          email_enviado_at: string | null
          email_status: string
          empresa_id: string
          id: string
          marco_dias: number
          mensagem: string
          modulo: string
          registro_id: string
          status: string
          titulo: string
          updated_at: string
          updated_by: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          email_enviado_at?: string | null
          email_status?: string
          empresa_id: string
          id?: string
          marco_dias: number
          mensagem: string
          modulo: string
          registro_id: string
          status?: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          email_enviado_at?: string | null
          email_status?: string
          empresa_id?: string
          id?: string
          marco_dias?: number
          mensagem?: string
          modulo?: string
          registro_id?: string
          status?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "alertas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_operacionais_sistema: {
        Row: {
          componente: string
          fingerprint: string
          id: string
          mensagem: string
          metadata_json: Json
          primeira_ocorrencia_at: string
          reconhecido_at: string | null
          reconhecido_por: string | null
          resolvido_at: string | null
          severidade: string
          status: string
          titulo: string
          ultima_ocorrencia_at: string
        }
        Insert: {
          componente: string
          fingerprint: string
          id?: string
          mensagem: string
          metadata_json?: Json
          primeira_ocorrencia_at?: string
          reconhecido_at?: string | null
          reconhecido_por?: string | null
          resolvido_at?: string | null
          severidade: string
          status?: string
          titulo: string
          ultima_ocorrencia_at?: string
        }
        Update: {
          componente?: string
          fingerprint?: string
          id?: string
          mensagem?: string
          metadata_json?: Json
          primeira_ocorrencia_at?: string
          reconhecido_at?: string | null
          reconhecido_por?: string | null
          resolvido_at?: string | null
          severidade?: string
          status?: string
          titulo?: string
          ultima_ocorrencia_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_operacionais_sistema_reconhecido_por_fkey"
            columns: ["reconhecido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      alteracoes_assinatura_agendadas: {
        Row: {
          applied_at: string | null
          assinatura_id: string
          created_at: string
          efetivar_em: string
          empresa_id: string
          id: string
          plano_destino_id: string | null
          plano_origem_id: string | null
          prorata_centavos: number | null
          solicitada_por: string | null
          status: string
          tipo: string
        }
        Insert: {
          applied_at?: string | null
          assinatura_id: string
          created_at?: string
          efetivar_em: string
          empresa_id: string
          id?: string
          plano_destino_id?: string | null
          plano_origem_id?: string | null
          prorata_centavos?: number | null
          solicitada_por?: string | null
          status?: string
          tipo: string
        }
        Update: {
          applied_at?: string | null
          assinatura_id?: string
          created_at?: string
          efetivar_em?: string
          empresa_id?: string
          id?: string
          plano_destino_id?: string | null
          plano_origem_id?: string | null
          prorata_centavos?: number | null
          solicitada_por?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alteracoes_assinatura_agendadas_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alteracoes_assinatura_agendadas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alteracoes_assinatura_agendadas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "alteracoes_assinatura_agendadas_plano_destino_id_fkey"
            columns: ["plano_destino_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alteracoes_assinatura_agendadas_plano_origem_id_fkey"
            columns: ["plano_origem_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alteracoes_assinatura_agendadas_solicitada_por_fkey"
            columns: ["solicitada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      anexos: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_id: string
          finalidade: string
          id: string
          mime_type: string
          modulo: string
          nome_original: string
          registro_id: string
          status: string
          storage_path: string
          substitui_anexo_id: string | null
          tamanho_bytes: number
          updated_at: string
          updated_by: string | null
          versao: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id: string
          finalidade?: string
          id?: string
          mime_type: string
          modulo: string
          nome_original: string
          registro_id: string
          status?: string
          storage_path: string
          substitui_anexo_id?: string | null
          tamanho_bytes: number
          updated_at?: string
          updated_by?: string | null
          versao?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id?: string
          finalidade?: string
          id?: string
          mime_type?: string
          modulo?: string
          nome_original?: string
          registro_id?: string
          status?: string
          storage_path?: string
          substitui_anexo_id?: string | null
          tamanho_bytes?: number
          updated_at?: string
          updated_by?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "anexos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "anexos_substitui_anexo_id_fkey"
            columns: ["substitui_anexo_id"]
            isOneToOne: false
            referencedRelation: "anexos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas_eletronicas: {
        Row: {
          auth_aal: string
          declaracao: string
          documento_hash: string
          documento_id: string
          documento_revisao_id: string
          empresa_id: string
          id: string
          ip: unknown
          signatario_id: string
          signed_at: string
          user_agent: string | null
        }
        Insert: {
          auth_aal?: string
          declaracao: string
          documento_hash: string
          documento_id: string
          documento_revisao_id: string
          empresa_id: string
          id?: string
          ip?: unknown
          signatario_id: string
          signed_at?: string
          user_agent?: string | null
        }
        Update: {
          auth_aal?: string
          declaracao?: string
          documento_hash?: string
          documento_id?: string
          documento_revisao_id?: string
          empresa_id?: string
          id?: string
          ip?: unknown
          signatario_id?: string
          signed_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_eletronicas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_eletronicas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "vw_documentos_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_eletronicas_documento_revisao_id_fkey"
            columns: ["documento_revisao_id"]
            isOneToOne: false
            referencedRelation: "documento_revisoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_eletronicas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_eletronicas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "assinaturas_eletronicas_signatario_id_fkey"
            columns: ["signatario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas_empresas: {
        Row: {
          bloqueada_em: string | null
          cancel_at_period_end: boolean
          cancelada_em: string | null
          ciclo: string
          created_at: string
          created_by: string | null
          current_period_ends_at: string | null
          deleted_at: string | null
          desconto_centavos: number
          desconto_percentual: number
          empresa_id: string
          gateway: string | null
          gateway_customer_id: string | null
          gateway_subscription_id: string | null
          grace_period_ends_at: string | null
          id: string
          moeda: string
          observacoes_internas: string | null
          plano_id: string
          proximo_vencimento: string | null
          status: string
          trial_termina_em: string | null
          ultimo_pagamento_em: string | null
          updated_at: string
          updated_by: string | null
          valor_anual_centavos: number | null
          valor_mensal_centavos: number
        }
        Insert: {
          bloqueada_em?: string | null
          cancel_at_period_end?: boolean
          cancelada_em?: string | null
          ciclo?: string
          created_at?: string
          created_by?: string | null
          current_period_ends_at?: string | null
          deleted_at?: string | null
          desconto_centavos?: number
          desconto_percentual?: number
          empresa_id: string
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          moeda?: string
          observacoes_internas?: string | null
          plano_id: string
          proximo_vencimento?: string | null
          status?: string
          trial_termina_em?: string | null
          ultimo_pagamento_em?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_anual_centavos?: number | null
          valor_mensal_centavos?: number
        }
        Update: {
          bloqueada_em?: string | null
          cancel_at_period_end?: boolean
          cancelada_em?: string | null
          ciclo?: string
          created_at?: string
          created_by?: string | null
          current_period_ends_at?: string | null
          deleted_at?: string | null
          desconto_centavos?: number
          desconto_percentual?: number
          empresa_id?: string
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_subscription_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          moeda?: string
          observacoes_internas?: string | null
          plano_id?: string
          proximo_vencimento?: string | null
          status?: string
          trial_termina_em?: string | null
          ultimo_pagamento_em?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_anual_centavos?: number | null
          valor_mensal_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_empresas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "assinaturas_empresas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_empresas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_consultas_cnpj: {
        Row: {
          cnpj_normalizado: string
          consultado_em: string
          created_at: string
          dados_normalizados: Json
          expira_em: string
          provedor: string
          response_fingerprint: string
          updated_at: string
        }
        Insert: {
          cnpj_normalizado: string
          consultado_em?: string
          created_at?: string
          dados_normalizados: Json
          expira_em: string
          provedor: string
          response_fingerprint: string
          updated_at?: string
        }
        Update: {
          cnpj_normalizado?: string
          consultado_em?: string
          created_at?: string
          dados_normalizados?: Json
          expira_em?: string
          provedor?: string
          response_fingerprint?: string
          updated_at?: string
        }
        Relationships: []
      }
      calibracoes: {
        Row: {
          created_at: string
          created_by: string | null
          data_calibracao: string
          data_vencimento: string | null
          deleted_at: string | null
          empresa_id: string
          equipamento_id: string
          id: string
          laboratorio_responsavel: string | null
          numero_certificado: string | null
          observacoes: string | null
          responsavel_id: string | null
          resultado: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_calibracao: string
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_id: string
          equipamento_id: string
          id?: string
          laboratorio_responsavel?: string | null
          numero_certificado?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          resultado: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_calibracao?: string
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_id?: string
          equipamento_id?: string
          id?: string
          laboratorio_responsavel?: string | null
          numero_certificado?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          resultado?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calibracoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "calibracoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calibracoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "fk_calibracoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id", "empresa_id"]
          },
        ]
      }
      catalogo_permissoes: {
        Row: {
          acao: string
          codigo: string
          descricao: string
          modulo: string
          nome: string
          ordem: number
          sensivel: boolean
        }
        Insert: {
          acao: string
          codigo: string
          descricao: string
          modulo: string
          nome: string
          ordem?: number
          sensivel?: boolean
        }
        Update: {
          acao?: string
          codigo?: string
          descricao?: string
          modulo?: string
          nome?: string
          ordem?: number
          sensivel?: boolean
        }
        Relationships: []
      }
      categorias_documentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          nome: string
          padrao_plataforma: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          padrao_plataforma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          padrao_plataforma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "categorias_documentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_cobranca: {
        Row: {
          bloquear_apos_carencia: boolean
          dias_carencia: number
          id: boolean
          intervalos_tentativas_dias: number[]
          tentativas_automaticas: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bloquear_apos_carencia?: boolean
          dias_carencia?: number
          id?: boolean
          intervalos_tentativas_dias?: number[]
          tentativas_automaticas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bloquear_apos_carencia?: boolean
          dias_carencia?: number
          id?: boolean
          intervalos_tentativas_dias?: number[]
          tentativas_automaticas?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_cobranca_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_comerciais: {
        Row: {
          id: boolean
          moeda: string
          politica_privacidade_versao: string
          preco_unidade_extra_centavos: number
          preco_usuario_extra_centavos: number
          termos_versao: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          moeda?: string
          politica_privacidade_versao?: string
          preco_unidade_extra_centavos?: number
          preco_usuario_extra_centavos?: number
          termos_versao?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          moeda?: string
          politica_privacidade_versao?: string
          preco_unidade_extra_centavos?: number
          preco_usuario_extra_centavos?: number
          termos_versao?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_comerciais_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_empresa: {
        Row: {
          categorias_alerta: string[] | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dias_alerta: number[]
          email_remetente_nome: string | null
          empresa_id: string
          enviar_email: boolean
          id: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categorias_alerta?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dias_alerta?: number[]
          email_remetente_nome?: string | null
          empresa_id: string
          enviar_email?: boolean
          id?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categorias_alerta?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dias_alerta?: number[]
          email_remetente_nome?: string | null
          empresa_id?: string
          enviar_email?: boolean
          id?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "configuracoes_empresa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_limites_provisorios: {
        Row: {
          allow_bulk_import: boolean
          allow_exports: boolean
          allow_integrations: boolean
          id: boolean
          max_documents: number
          max_equipment: number
          max_pending_tasks: number
          max_reports: number
          max_storage_mb: number
          max_units: number
          max_users: number
          trial_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_bulk_import?: boolean
          allow_exports?: boolean
          allow_integrations?: boolean
          id?: boolean
          max_documents?: number
          max_equipment?: number
          max_pending_tasks?: number
          max_reports?: number
          max_storage_mb?: number
          max_units?: number
          max_users?: number
          trial_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_bulk_import?: boolean
          allow_exports?: boolean
          allow_integrations?: boolean
          id?: boolean
          max_documents?: number
          max_equipment?: number
          max_pending_tasks?: number
          max_reports?: number
          max_storage_mb?: number
          max_units?: number
          max_users?: number
          trial_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_limites_provisorios_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons_comerciais: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          limite_usos: number | null
          moeda: string | null
          planos_ids: string[]
          tipo: string
          usos: number
          valido_ate: string | null
          valido_de: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          limite_usos?: number | null
          moeda?: string | null
          planos_ids?: string[]
          tipo: string
          usos?: number
          valido_ate?: string | null
          valido_de?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          limite_usos?: number | null
          moeda?: string | null
          planos_ids?: string[]
          tipo?: string
          usos?: number
          valido_ate?: string | null
          valido_de?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cupons_comerciais_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_aprovacoes: {
        Row: {
          assinatura_id: string | null
          comentario: string | null
          decidido_at: string
          decidido_por: string
          decisao: string
          documento_id: string
          documento_revisao_id: string
          empresa_id: string
          id: string
        }
        Insert: {
          assinatura_id?: string | null
          comentario?: string | null
          decidido_at?: string
          decidido_por: string
          decisao: string
          documento_id: string
          documento_revisao_id: string
          empresa_id: string
          id?: string
        }
        Update: {
          assinatura_id?: string | null
          comentario?: string | null
          decidido_at?: string
          decidido_por?: string
          decisao?: string
          documento_id?: string
          documento_revisao_id?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_aprovacoes_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_eletronicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aprovacoes_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aprovacoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aprovacoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "vw_documentos_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aprovacoes_documento_revisao_id_fkey"
            columns: ["documento_revisao_id"]
            isOneToOne: false
            referencedRelation: "documento_revisoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aprovacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_aprovacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      documento_revisoes: {
        Row: {
          comentario_submissao: string | null
          conteudo_hash: string
          created_at: string
          created_by: string
          decided_at: string | null
          documento_id: string
          empresa_id: string
          id: string
          numero_versao: number
          snapshot_json: Json
          status: string
        }
        Insert: {
          comentario_submissao?: string | null
          conteudo_hash: string
          created_at?: string
          created_by: string
          decided_at?: string | null
          documento_id: string
          empresa_id: string
          id?: string
          numero_versao: number
          snapshot_json: Json
          status?: string
        }
        Update: {
          comentario_submissao?: string | null
          conteudo_hash?: string
          created_at?: string
          created_by?: string
          decided_at?: string | null
          documento_id?: string
          empresa_id?: string
          id?: string
          numero_versao?: number
          snapshot_json?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_revisoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_revisoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_revisoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "vw_documentos_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_revisoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_revisoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      documentos: {
        Row: {
          alerta_antecedencia_dias: number[] | null
          categoria_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_vencimento: string | null
          deleted_at: string | null
          empresa_id: string
          exige_anexo: boolean
          exige_aprovacao: boolean
          id: string
          nome: string
          numero_documento: string | null
          observacoes: string | null
          orgao_emissor: string | null
          periodicidade_meses: number | null
          politica_aprovacao: Json
          responsavel_id: string | null
          setor_unidade: string | null
          tipo_documento_id: string | null
          updated_at: string
          updated_by: string | null
          versao_atual: number
          workflow_status: string
        }
        Insert: {
          alerta_antecedencia_dias?: number[] | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_id: string
          exige_anexo?: boolean
          exige_aprovacao?: boolean
          id?: string
          nome: string
          numero_documento?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          periodicidade_meses?: number | null
          politica_aprovacao?: Json
          responsavel_id?: string | null
          setor_unidade?: string | null
          tipo_documento_id?: string | null
          updated_at?: string
          updated_by?: string | null
          versao_atual?: number
          workflow_status?: string
        }
        Update: {
          alerta_antecedencia_dias?: number[] | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_id?: string
          exige_anexo?: boolean
          exige_aprovacao?: boolean
          id?: string
          nome?: string
          numero_documento?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          periodicidade_meses?: number | null
          politica_aprovacao?: Json
          responsavel_id?: string | null
          setor_unidade?: string | null
          tipo_documento_id?: string | null
          updated_at?: string
          updated_by?: string | null
          versao_atual?: number
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "documentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "tipos_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          access_status: string
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnae_principal_codigo: string | null
          cnae_principal_descricao: string | null
          cnpj: string
          cnpj_normalizado: string
          complemento: string | null
          conselho_profissional: string | null
          created_at: string
          data_status_cadastral: string | null
          deleted_at: string | null
          email_oficial: string | null
          email_principal: string | null
          endereco: string | null
          endereco_oficial_json: Json
          estado: string | null
          id: string
          nome_fantasia: string
          numero: string | null
          observacoes: string | null
          plano_id: string | null
          porte_empresa: string | null
          provedor_consulta_cnpj: string | null
          provisional_expires_at: string | null
          provisional_started_at: string | null
          razao_social: string
          responsavel_legal: string | null
          responsavel_tecnico: string | null
          segmento: string | null
          status: string
          status_cadastral: string | null
          telefone: string | null
          telefone_oficial: string | null
          tipo_estabelecimento: string | null
          ultima_consulta_cnpj_at: string | null
          updated_at: string
          verification_method: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          access_status?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_principal_codigo?: string | null
          cnae_principal_descricao?: string | null
          cnpj: string
          cnpj_normalizado: string
          complemento?: string | null
          conselho_profissional?: string | null
          created_at?: string
          data_status_cadastral?: string | null
          deleted_at?: string | null
          email_oficial?: string | null
          email_principal?: string | null
          endereco?: string | null
          endereco_oficial_json?: Json
          estado?: string | null
          id?: string
          nome_fantasia: string
          numero?: string | null
          observacoes?: string | null
          plano_id?: string | null
          porte_empresa?: string | null
          provedor_consulta_cnpj?: string | null
          provisional_expires_at?: string | null
          provisional_started_at?: string | null
          razao_social: string
          responsavel_legal?: string | null
          responsavel_tecnico?: string | null
          segmento?: string | null
          status?: string
          status_cadastral?: string | null
          telefone?: string | null
          telefone_oficial?: string | null
          tipo_estabelecimento?: string | null
          ultima_consulta_cnpj_at?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          access_status?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_principal_codigo?: string | null
          cnae_principal_descricao?: string | null
          cnpj?: string
          cnpj_normalizado?: string
          complemento?: string | null
          conselho_profissional?: string | null
          created_at?: string
          data_status_cadastral?: string | null
          deleted_at?: string | null
          email_oficial?: string | null
          email_principal?: string | null
          endereco?: string | null
          endereco_oficial_json?: Json
          estado?: string | null
          id?: string
          nome_fantasia?: string
          numero?: string | null
          observacoes?: string | null
          plano_id?: string | null
          porte_empresa?: string | null
          provedor_consulta_cnpj?: string | null
          provisional_expires_at?: string | null
          provisional_started_at?: string | null
          razao_social?: string
          responsavel_legal?: string | null
          responsavel_tecnico?: string | null
          segmento?: string | null
          status?: string
          status_cadastral?: string | null
          telefone?: string | null
          telefone_oficial?: string | null
          tipo_estabelecimento?: string | null
          ultima_consulta_cnpj_at?: string | null
          updated_at?: string
          verification_method?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ensaios_restauracao_backup: {
        Row: {
          ambiente: string
          backup_reference: string
          completed_at: string | null
          created_at: string
          evidence_reference: string | null
          id: string
          initiated_at: string
          notes: string | null
          recorded_by: string | null
          rpo_minutes: number | null
          rto_minutes: number | null
          status: string
        }
        Insert: {
          ambiente: string
          backup_reference: string
          completed_at?: string | null
          created_at?: string
          evidence_reference?: string | null
          id?: string
          initiated_at?: string
          notes?: string | null
          recorded_by?: string | null
          rpo_minutes?: number | null
          rto_minutes?: number | null
          status: string
        }
        Update: {
          ambiente?: string
          backup_reference?: string
          completed_at?: string | null
          created_at?: string
          evidence_reference?: string | null
          id?: string
          initiated_at?: string
          notes?: string | null
          recorded_by?: string | null
          rpo_minutes?: number | null
          rto_minutes?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensaios_restauracao_backup_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_notificacao: {
        Row: {
          alerta_id: string | null
          canal: string
          created_at: string
          empresa_id: string
          erro_codigo: string | null
          erro_sanitizado: string | null
          id: string
          notificacao_id: string | null
          provider_reference: string | null
          proxima_tentativa_at: string | null
          sent_at: string | null
          status: string
          tentativa: number
          usuario_id: string | null
        }
        Insert: {
          alerta_id?: string | null
          canal: string
          created_at?: string
          empresa_id: string
          erro_codigo?: string | null
          erro_sanitizado?: string | null
          id?: string
          notificacao_id?: string | null
          provider_reference?: string | null
          proxima_tentativa_at?: string | null
          sent_at?: string | null
          status?: string
          tentativa?: number
          usuario_id?: string | null
        }
        Update: {
          alerta_id?: string | null
          canal?: string
          created_at?: string
          empresa_id?: string
          erro_codigo?: string | null
          erro_sanitizado?: string | null
          id?: string
          notificacao_id?: string | null
          provider_reference?: string | null
          proxima_tentativa_at?: string | null
          sent_at?: string | null
          status?: string
          tentativa?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_notificacao_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_notificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_notificacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "entregas_notificacao_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_notificacao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          codigo_interno: string | null
          created_at: string
          created_by: string | null
          criticidade: string
          deleted_at: string | null
          empresa_id: string
          fabricante: string | null
          id: string
          localizacao: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacoes: string | null
          qr_token: string
          responsavel_id: string | null
          setor: string | null
          status: string
          tipo_equipamento_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo_interno?: string | null
          created_at?: string
          created_by?: string | null
          criticidade?: string
          deleted_at?: string | null
          empresa_id: string
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacoes?: string | null
          qr_token?: string
          responsavel_id?: string | null
          setor?: string | null
          status?: string
          tipo_equipamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo_interno?: string | null
          created_at?: string
          created_by?: string | null
          criticidade?: string
          deleted_at?: string | null
          empresa_id?: string
          fabricante?: string | null
          id?: string
          localizacao?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacoes?: string | null
          qr_token?: string
          responsavel_id?: string | null
          setor?: string | null
          status?: string
          tipo_equipamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "equipamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_tipo_equipamento_id_fkey"
            columns: ["tipo_equipamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_contratacao: {
        Row: {
          created_at: string
          id: string
          metadata_json: Json
          origem: string
          sessao_contratacao_id: string
          status_anterior: string | null
          status_novo: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata_json?: Json
          origem: string
          sessao_contratacao_id: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata_json?: Json
          origem?: string
          sessao_contratacao_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_contratacao_sessao_contratacao_id_fkey"
            columns: ["sessao_contratacao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_contratacao"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_erro_sistema: {
        Row: {
          ambiente: string
          empresa_id: string | null
          fingerprint: string
          id: string
          mensagem_sanitizada: string
          metadata_json: Json
          ocorrencias: number
          origem: string
          primeira_ocorrencia_at: string
          release_version: string | null
          resolvido_at: string | null
          resolvido_por: string | null
          rota: string | null
          severidade: string
          stack_hash: string | null
          ultima_ocorrencia_at: string
          usuario_id: string | null
        }
        Insert: {
          ambiente?: string
          empresa_id?: string | null
          fingerprint: string
          id?: string
          mensagem_sanitizada: string
          metadata_json?: Json
          ocorrencias?: number
          origem: string
          primeira_ocorrencia_at?: string
          release_version?: string | null
          resolvido_at?: string | null
          resolvido_por?: string | null
          rota?: string | null
          severidade?: string
          stack_hash?: string | null
          ultima_ocorrencia_at?: string
          usuario_id?: string | null
        }
        Update: {
          ambiente?: string
          empresa_id?: string | null
          fingerprint?: string
          id?: string
          mensagem_sanitizada?: string
          metadata_json?: Json
          ocorrencias?: number
          origem?: string
          primeira_ocorrencia_at?: string
          release_version?: string | null
          resolvido_at?: string | null
          resolvido_por?: string | null
          rota?: string | null
          severidade?: string
          stack_hash?: string | null
          ultima_ocorrencia_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_erro_sistema_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_erro_sistema_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "eventos_erro_sistema_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_erro_sistema_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_verificacao_empresa: {
        Row: {
          created_at: string
          empresa_id: string
          event_type: string
          id: string
          message: string | null
          metadata_json: Json
          new_status: string | null
          performed_by: string | null
          performed_by_type: string
          previous_status: string | null
          solicitacao_verificacao_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          event_type: string
          id?: string
          message?: string | null
          metadata_json?: Json
          new_status?: string | null
          performed_by?: string | null
          performed_by_type: string
          previous_status?: string | null
          solicitacao_verificacao_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata_json?: Json
          new_status?: string | null
          performed_by?: string | null
          performed_by_type?: string
          previous_status?: string | null
          solicitacao_verificacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_verificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_verificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "eventos_verificacao_empresa_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_verificacao_empresa_solicitacao_verificacao_id_fkey"
            columns: ["solicitacao_verificacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_verificacao_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_webhook_pagamento: {
        Row: {
          erro_codigo: string | null
          payload_hash: string
          processado: boolean
          processado_at: string | null
          recebido_at: string
          sessao_contratacao_id: string | null
          stripe_event_id: string
          stripe_event_type: string
        }
        Insert: {
          erro_codigo?: string | null
          payload_hash: string
          processado?: boolean
          processado_at?: string | null
          recebido_at?: string
          sessao_contratacao_id?: string | null
          stripe_event_id: string
          stripe_event_type: string
        }
        Update: {
          erro_codigo?: string | null
          payload_hash?: string
          processado?: boolean
          processado_at?: string | null
          recebido_at?: string
          sessao_contratacao_id?: string | null
          stripe_event_id?: string
          stripe_event_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_webhook_pagamento_sessao_contratacao_id_fkey"
            columns: ["sessao_contratacao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_contratacao"
            referencedColumns: ["id"]
          },
        ]
      }
      evidencias_verificacao_empresa: {
        Row: {
          created_at: string
          empresa_id: string
          evidence_type: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          solicitacao_verificacao_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          evidence_type: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          solicitacao_verificacao_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          evidence_type?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          solicitacao_verificacao_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_verificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_verificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "evidencias_verificacao_empresa_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_verificacao_empresa_solicitacao_verificacao_id_fkey"
            columns: ["solicitacao_verificacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_verificacao_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_verificacao_empresa_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_relatorios_agendados: {
        Row: {
          completed_at: string | null
          created_at: string
          destinatarios: string[]
          empresa_id: string
          erro_codigo: string | null
          id: string
          relatorio_agendado_id: string
          snapshot_json: Json | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          destinatarios?: string[]
          empresa_id: string
          erro_codigo?: string | null
          id?: string
          relatorio_agendado_id: string
          snapshot_json?: Json | null
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          destinatarios?: string[]
          empresa_id?: string
          erro_codigo?: string | null
          id?: string
          relatorio_agendado_id?: string
          snapshot_json?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_relatorios_agendados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execucoes_relatorios_agendados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "execucoes_relatorios_agendados_relatorio_agendado_id_fkey"
            columns: ["relatorio_agendado_id"]
            isOneToOne: false
            referencedRelation: "relatorios_agendados"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          assinatura_id: string
          competencia: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          desconto_centavos: number
          empresa_id: string
          forma_pagamento: string | null
          gateway: string | null
          gateway_invoice_id: string | null
          id: string
          link_pagamento: string | null
          moeda: string
          observacoes_internas: string | null
          paga_em: string | null
          status: string
          updated_at: string
          updated_by: string | null
          valor_centavos: number
          valor_pago_centavos: number | null
          vencimento: string
        }
        Insert: {
          assinatura_id: string
          competencia: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          desconto_centavos?: number
          empresa_id: string
          forma_pagamento?: string | null
          gateway?: string | null
          gateway_invoice_id?: string | null
          id?: string
          link_pagamento?: string | null
          moeda?: string
          observacoes_internas?: string | null
          paga_em?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          valor_centavos: number
          valor_pago_centavos?: number | null
          vencimento: string
        }
        Update: {
          assinatura_id?: string
          competencia?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          desconto_centavos?: number
          empresa_id?: string
          forma_pagamento?: string | null
          gateway?: string | null
          gateway_invoice_id?: string | null
          id?: string
          link_pagamento?: string | null
          moeda?: string
          observacoes_internas?: string | null
          paga_em?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          valor_centavos?: number
          valor_pago_centavos?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturas_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "faturas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          ambiente: string
          chave: string
          created_at: string
          descricao: string | null
          empresa_id: string | null
          habilitada: boolean
          id: string
          rollout_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ambiente?: string
          chave: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          habilitada?: boolean
          id?: string
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ambiente?: string
          chave?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          habilitada?: boolean
          id?: string
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fotografias_contratacao: {
        Row: {
          consulta_cnpj_json: Json
          created_at: string
          empresa_json: Json
          fotografia_hash: string
          id: string
          limites_json: Json
          moeda: string
          periodicidade: string
          plano_codigo: string
          plano_id: string
          plano_nome: string
          politica_privacidade_versao: string
          recursos_json: Json
          responsavel_json: Json
          sessao_contratacao_id: string
          stripe_price_id: string
          termos_versao: string
          valor_centavos: number
          versao: number
        }
        Insert: {
          consulta_cnpj_json: Json
          created_at?: string
          empresa_json: Json
          fotografia_hash: string
          id?: string
          limites_json: Json
          moeda: string
          periodicidade: string
          plano_codigo: string
          plano_id: string
          plano_nome: string
          politica_privacidade_versao: string
          recursos_json: Json
          responsavel_json: Json
          sessao_contratacao_id: string
          stripe_price_id: string
          termos_versao: string
          valor_centavos: number
          versao?: number
        }
        Update: {
          consulta_cnpj_json?: Json
          created_at?: string
          empresa_json?: Json
          fotografia_hash?: string
          id?: string
          limites_json?: Json
          moeda?: string
          periodicidade?: string
          plano_codigo?: string
          plano_id?: string
          plano_nome?: string
          politica_privacidade_versao?: string
          recursos_json?: Json
          responsavel_json?: Json
          sessao_contratacao_id?: string
          stripe_price_id?: string
          termos_versao?: string
          valor_centavos?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "fotografias_contratacao_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotografias_contratacao_sessao_contratacao_id_fkey"
            columns: ["sessao_contratacao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_contratacao"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_comercial_imutavel: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          empresa_id: string | null
          entidade: string
          entidade_id: string | null
          evento: string
          id: string
          origem: string
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          empresa_id?: string | null
          entidade: string
          entidade_id?: string | null
          evento: string
          id?: string
          origem?: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          empresa_id?: string | null
          entidade?: string
          entidade_id?: string | null
          evento?: string
          id?: string
          origem?: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_comercial_imutavel_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_comercial_imutavel_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_comercial_imutavel_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      historico_planos_empresas: {
        Row: {
          alterado_por: string | null
          assinatura_id: string | null
          created_at: string
          empresa_id: string
          id: string
          motivo: string | null
          plano_anterior_id: string | null
          plano_novo_id: string | null
          valor_anterior_centavos: number | null
          valor_novo_centavos: number | null
        }
        Insert: {
          alterado_por?: string | null
          assinatura_id?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          motivo?: string | null
          plano_anterior_id?: string | null
          plano_novo_id?: string | null
          valor_anterior_centavos?: number | null
          valor_novo_centavos?: number | null
        }
        Update: {
          alterado_por?: string | null
          assinatura_id?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          plano_anterior_id?: string | null
          plano_novo_id?: string | null
          valor_anterior_centavos?: number | null
          valor_novo_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_planos_empresas_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_planos_empresas_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_planos_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_planos_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "historico_planos_empresas_plano_anterior_id_fkey"
            columns: ["plano_anterior_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_planos_empresas_plano_novo_id_fkey"
            columns: ["plano_novo_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      implantacoes_sistema: {
        Row: {
          actor_user_id: string | null
          ambiente: string
          commit_sha: string | null
          concluido_at: string | null
          id: string
          iniciado_at: string
          metadata_json: Json
          migrations_aplicadas: string[]
          origem: string
          status: string
          versao: string
        }
        Insert: {
          actor_user_id?: string | null
          ambiente: string
          commit_sha?: string | null
          concluido_at?: string | null
          id?: string
          iniciado_at?: string
          metadata_json?: Json
          migrations_aplicadas?: string[]
          origem?: string
          status: string
          versao: string
        }
        Update: {
          actor_user_id?: string | null
          ambiente?: string
          commit_sha?: string | null
          concluido_at?: string | null
          id?: string
          iniciado_at?: string
          metadata_json?: Json
          migrations_aplicadas?: string[]
          origem?: string
          status?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "implantacoes_sistema_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      interacoes_assistente: {
        Row: {
          created_at: string
          empresa_id: string
          equipamento_id: string | null
          escopo: string
          fontes: Json
          id: string
          leu_anexos: boolean
          modelo: string
          pergunta: string
          resposta: string | null
          setor: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          equipamento_id?: string | null
          escopo?: string
          fontes?: Json
          id?: string
          leu_anexos?: boolean
          modelo?: string
          pergunta: string
          resposta?: string | null
          setor?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          equipamento_id?: string | null
          escopo?: string
          fontes?: Json
          id?: string
          leu_anexos?: boolean
          modelo?: string
          pergunta?: string
          resposta?: string | null
          setor?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_assistente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_assistente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "interacoes_assistente_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_assistente_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_assistente_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      limites_acesso_empresa: {
        Row: {
          allow_bulk_import: boolean
          allow_exports: boolean
          allow_integrations: boolean
          created_at: string
          effective_from: string
          effective_until: string | null
          empresa_id: string
          id: string
          max_documents: number | null
          max_equipment: number | null
          max_pending_tasks: number | null
          max_reports: number | null
          max_storage_mb: number | null
          max_units: number | null
          max_users: number | null
          source_type: string
          updated_at: string
        }
        Insert: {
          allow_bulk_import?: boolean
          allow_exports?: boolean
          allow_integrations?: boolean
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          empresa_id: string
          id?: string
          max_documents?: number | null
          max_equipment?: number | null
          max_pending_tasks?: number | null
          max_reports?: number | null
          max_storage_mb?: number | null
          max_units?: number | null
          max_users?: number | null
          source_type: string
          updated_at?: string
        }
        Update: {
          allow_bulk_import?: boolean
          allow_exports?: boolean
          allow_integrations?: boolean
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          empresa_id?: string
          id?: string
          max_documents?: number | null
          max_equipment?: number | null
          max_pending_tasks?: number | null
          max_reports?: number | null
          max_storage_mb?: number | null
          max_units?: number | null
          max_users?: number | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "limites_acesso_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limites_acesso_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      limites_consultas_cnpj: {
        Row: {
          escopo: string
          janela_iniciada_em: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          escopo: string
          janela_iniciada_em: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          escopo?: string
          janela_iniciada_em?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: []
      }
      logs_auditoria: {
        Row: {
          acao: string
          correlation_id: string | null
          created_at: string
          empresa_id: string | null
          event_hash: string | null
          id: string
          ip: unknown
          modulo: string
          novo_valor: Json | null
          previous_hash: string | null
          registro_id: string | null
          user_agent: string | null
          usuario_id: string | null
          valor_anterior: Json | null
        }
        Insert: {
          acao: string
          correlation_id?: string | null
          created_at?: string
          empresa_id?: string | null
          event_hash?: string | null
          id?: string
          ip?: unknown
          modulo: string
          novo_valor?: Json | null
          previous_hash?: string | null
          registro_id?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
        }
        Update: {
          acao?: string
          correlation_id?: string | null
          created_at?: string
          empresa_id?: string | null
          event_hash?: string | null
          id?: string
          ip?: unknown
          modulo?: string
          novo_valor?: Json | null
          previous_hash?: string | null
          registro_id?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_auditoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "logs_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          acao_realizada: string | null
          causa_raiz: string | null
          created_at: string
          created_by: string | null
          data_manutencao: string
          deleted_at: string | null
          diagnostico: string | null
          empresa_id: string
          empresa_responsavel: string | null
          equipamento_id: string | null
          equipamento_parado_desde: string | null
          exige_evidencia: boolean
          falha_apresentada: string | null
          id: string
          natureza: string
          nome_servico: string | null
          numero_ordem_servico: string | null
          observacoes: string | null
          periodicidade_meses: number | null
          prioridade: string | null
          proxima_manutencao: string | null
          responsavel_interno_id: string | null
          retorno_operacao_at: string | null
          status_execucao: string
          tecnico_responsavel: string | null
          tipo_servico: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acao_realizada?: string | null
          causa_raiz?: string | null
          created_at?: string
          created_by?: string | null
          data_manutencao: string
          deleted_at?: string | null
          diagnostico?: string | null
          empresa_id: string
          empresa_responsavel?: string | null
          equipamento_id?: string | null
          equipamento_parado_desde?: string | null
          exige_evidencia?: boolean
          falha_apresentada?: string | null
          id?: string
          natureza: string
          nome_servico?: string | null
          numero_ordem_servico?: string | null
          observacoes?: string | null
          periodicidade_meses?: number | null
          prioridade?: string | null
          proxima_manutencao?: string | null
          responsavel_interno_id?: string | null
          retorno_operacao_at?: string | null
          status_execucao?: string
          tecnico_responsavel?: string | null
          tipo_servico?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acao_realizada?: string | null
          causa_raiz?: string | null
          created_at?: string
          created_by?: string | null
          data_manutencao?: string
          deleted_at?: string | null
          diagnostico?: string | null
          empresa_id?: string
          empresa_responsavel?: string | null
          equipamento_id?: string | null
          equipamento_parado_desde?: string | null
          exige_evidencia?: boolean
          falha_apresentada?: string | null
          id?: string
          natureza?: string
          nome_servico?: string | null
          numero_ordem_servico?: string | null
          observacoes?: string | null
          periodicidade_meses?: number | null
          prioridade?: string | null
          proxima_manutencao?: string | null
          responsavel_interno_id?: string | null
          retorno_operacao_at?: string | null
          status_execucao?: string
          tecnico_responsavel?: string | null
          tipo_servico?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_manutencoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "fk_manutencoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "manutencoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "manutencoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_responsavel_interno_id_fkey"
            columns: ["responsavel_interno_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_documentos_segmento: {
        Row: {
          ativo: boolean
          categoria_nome: string | null
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          obrigatorio: boolean
          observacoes: string | null
          orgao_emissor_padrao: string | null
          periodicidade_meses: number | null
          segmento_chave: string
          setor_padrao: string | null
          tipo_documento_nome: string | null
          tipo_estabelecimento: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_nome?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          obrigatorio?: boolean
          observacoes?: string | null
          orgao_emissor_padrao?: string | null
          periodicidade_meses?: number | null
          segmento_chave: string
          setor_padrao?: string | null
          tipo_documento_nome?: string | null
          tipo_estabelecimento?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_nome?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          obrigatorio?: boolean
          observacoes?: string | null
          orgao_emissor_padrao?: string | null
          periodicidade_meses?: number | null
          segmento_chave?: string
          setor_padrao?: string | null
          tipo_documento_nome?: string | null
          tipo_estabelecimento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          action_url: string | null
          audience: string
          created_at: string
          dedupe_key: string | null
          empresa_id: string | null
          id: string
          lida_at: string | null
          mensagem: string
          tipo: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          action_url?: string | null
          audience?: string
          created_at?: string
          dedupe_key?: string | null
          empresa_id?: string | null
          id?: string
          lida_at?: string | null
          mensagem: string
          tipo: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          action_url?: string | null
          audience?: string
          created_at?: string
          dedupe_key?: string | null
          empresa_id?: string | null
          id?: string
          lida_at?: string | null
          mensagem?: string
          tipo?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "notificacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      pendencias: {
        Row: {
          concluida_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_id: string
          id: string
          modulo: string
          prazo: string | null
          registro_id: string
          responsavel_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          concluida_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id: string
          id?: string
          modulo: string
          prazo?: string | null
          registro_id: string
          responsavel_id?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          concluida_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id?: string
          id?: string
          modulo?: string
          prazo?: string | null
          registro_id?: string
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pendencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "pendencias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pendencias_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_padrao_perfil: {
        Row: {
          perfil: string
          permissao_codigo: string
          permitido: boolean
        }
        Insert: {
          perfil: string
          permissao_codigo: string
          permitido: boolean
        }
        Update: {
          perfil?: string
          permissao_codigo?: string
          permitido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_padrao_perfil_permissao_codigo_fkey"
            columns: ["permissao_codigo"]
            isOneToOne: false
            referencedRelation: "catalogo_permissoes"
            referencedColumns: ["codigo"]
          },
        ]
      }
      permissoes_usuario_empresa: {
        Row: {
          created_at: string
          created_by: string | null
          empresa_id: string
          expira_em: string | null
          id: string
          justificativa: string | null
          permissao_codigo: string
          permitido: boolean
          updated_at: string
          updated_by: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empresa_id: string
          expira_em?: string | null
          id?: string
          justificativa?: string | null
          permissao_codigo: string
          permitido: boolean
          updated_at?: string
          updated_by?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          expira_em?: string | null
          id?: string
          justificativa?: string | null
          permissao_codigo?: string
          permitido?: boolean
          updated_at?: string
          updated_by?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_usuario_empresa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_usuario_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_usuario_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "permissoes_usuario_empresa_permissao_codigo_fkey"
            columns: ["permissao_codigo"]
            isOneToOne: false
            referencedRelation: "catalogo_permissoes"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "permissoes_usuario_empresa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_usuario_empresa_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          disponivel_venda: boolean
          id: string
          limite_documentos: number | null
          limite_equipamentos: number | null
          limite_storage_mb: number
          limite_unidades: number | null
          limite_usuarios: number
          moeda: string
          nivel_suporte: string
          nome: string
          ordem: number
          publico_recomendado: string | null
          recursos: Json
          stripe_monthly_price_id: string | null
          stripe_product_id: string | null
          stripe_yearly_price_id: string | null
          trial_dias: number
          updated_at: string
          valor_anual_centavos: number | null
          valor_mensal_centavos: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          disponivel_venda?: boolean
          id?: string
          limite_documentos?: number | null
          limite_equipamentos?: number | null
          limite_storage_mb?: number
          limite_unidades?: number | null
          limite_usuarios?: number
          moeda?: string
          nivel_suporte?: string
          nome: string
          ordem?: number
          publico_recomendado?: string | null
          recursos?: Json
          stripe_monthly_price_id?: string | null
          stripe_product_id?: string | null
          stripe_yearly_price_id?: string | null
          trial_dias?: number
          updated_at?: string
          valor_anual_centavos?: number | null
          valor_mensal_centavos?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          disponivel_venda?: boolean
          id?: string
          limite_documentos?: number | null
          limite_equipamentos?: number | null
          limite_storage_mb?: number
          limite_unidades?: number | null
          limite_usuarios?: number
          moeda?: string
          nivel_suporte?: string
          nome?: string
          ordem?: number
          publico_recomendado?: string | null
          recursos?: Json
          stripe_monthly_price_id?: string | null
          stripe_product_id?: string | null
          stripe_yearly_price_id?: string | null
          trial_dias?: number
          updated_at?: string
          valor_anual_centavos?: number | null
          valor_mensal_centavos?: number
        }
        Relationships: []
      }
      politicas_retencao_empresa: {
        Row: {
          created_at: string
          created_by: string | null
          descarte_automatico: boolean
          empresa_id: string
          id: string
          justificativa: string | null
          legal_hold: boolean
          modulo: string
          retention_months: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descarte_automatico?: boolean
          empresa_id: string
          id?: string
          justificativa?: string | null
          legal_hold?: boolean
          modulo: string
          retention_months: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descarte_automatico?: boolean
          empresa_id?: string
          id?: string
          justificativa?: string | null
          legal_hold?: boolean
          modulo?: string
          retention_months?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "politicas_retencao_empresa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politicas_retencao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politicas_retencao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "politicas_retencao_empresa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      preferencias_notificacao_usuario: {
        Row: {
          canais: string[]
          empresa_id: string
          hora_resumo: string
          id: string
          resumo_diario: boolean
          severidade_minima: string
          silencio_fim: string | null
          silencio_inicio: string | null
          timezone: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          canais?: string[]
          empresa_id: string
          hora_resumo?: string
          id?: string
          resumo_diario?: boolean
          severidade_minima?: string
          silencio_fim?: string | null
          silencio_inicio?: string | null
          timezone?: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          canais?: string[]
          empresa_id?: string
          hora_resumo?: string
          id?: string
          resumo_diario?: boolean
          severidade_minima?: string
          silencio_fim?: string | null
          silencio_inicio?: string | null
          timezone?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_notificacao_usuario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferencias_notificacao_usuario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "preferencias_notificacao_usuario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      qualificacoes: {
        Row: {
          created_at: string
          created_by: string | null
          data_qualificacao: string
          data_vencimento: string | null
          deleted_at: string | null
          empresa_executora: string | null
          empresa_id: string
          equipamento_id: string
          id: string
          observacoes: string | null
          responsavel_tecnico_id: string | null
          resultado: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_qualificacao: string
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_executora?: string | null
          empresa_id: string
          equipamento_id: string
          id?: string
          observacoes?: string | null
          responsavel_tecnico_id?: string | null
          resultado: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_qualificacao?: string
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_executora?: string | null
          empresa_id?: string
          equipamento_id?: string
          id?: string
          observacoes?: string | null
          responsavel_tecnico_id?: string | null
          resultado?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_qualificacoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "fk_qualificacoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "qualificacoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "qualificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_responsavel_tecnico_id_fkey"
            columns: ["responsavel_tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_notificacao_empresa: {
        Row: {
          antecedencia_dias: number[]
          ativa: boolean
          canais: string[]
          created_at: string
          created_by: string | null
          destinatarios_perfis: string[]
          empresa_id: string
          escalonar_apos_horas: number | null
          evento: string
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          antecedencia_dias?: number[]
          ativa?: boolean
          canais?: string[]
          created_at?: string
          created_by?: string | null
          destinatarios_perfis?: string[]
          empresa_id: string
          escalonar_apos_horas?: number | null
          evento: string
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          antecedencia_dias?: number[]
          ativa?: boolean
          canais?: string[]
          created_at?: string
          created_by?: string | null
          destinatarios_perfis?: string[]
          empresa_id?: string
          escalonar_apos_horas?: number | null
          evento?: string
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regras_notificacao_empresa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_notificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_notificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "regras_notificacao_empresa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_qualidade_dados: {
        Row: {
          ativa: boolean
          codigo: string
          descricao: string
          modulo: string
          nome: string
          severidade: string
        }
        Insert: {
          ativa?: boolean
          codigo: string
          descricao: string
          modulo: string
          nome: string
          severidade: string
        }
        Update: {
          ativa?: boolean
          codigo?: string
          descricao?: string
          modulo?: string
          nome?: string
          severidade?: string
        }
        Relationships: []
      }
      relatorios_agendados: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          destinatarios: string[]
          dia_mes: number | null
          dia_semana: number | null
          empresa_id: string
          filtros_json: Json
          frequencia: string
          horario: string
          id: string
          nome: string
          proxima_execucao_at: string
          timezone: string
          tipo_relatorio: string
          ultima_execucao_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          destinatarios: string[]
          dia_mes?: number | null
          dia_semana?: number | null
          empresa_id: string
          filtros_json?: Json
          frequencia: string
          horario?: string
          id?: string
          nome: string
          proxima_execucao_at?: string
          timezone?: string
          tipo_relatorio?: string
          ultima_execucao_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          destinatarios?: string[]
          dia_mes?: number | null
          dia_semana?: number | null
          empresa_id?: string
          filtros_json?: Json
          frequencia?: string
          horario?: string
          id?: string
          nome?: string
          proxima_execucao_at?: string
          timezone?: string
          tipo_relatorio?: string
          ultima_execucao_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_agendados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_agendados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_agendados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "relatorios_agendados_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      resgates_cupons: {
        Row: {
          assinatura_id: string | null
          created_at: string
          cupom_id: string
          desconto_centavos: number
          empresa_id: string
          id: string
        }
        Insert: {
          assinatura_id?: string | null
          created_at?: string
          cupom_id: string
          desconto_centavos: number
          empresa_id: string
          id?: string
        }
        Update: {
          assinatura_id?: string | null
          created_at?: string
          cupom_id?: string
          desconto_centavos?: number
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resgates_cupons_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resgates_cupons_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "cupons_comerciais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resgates_cupons_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resgates_cupons_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      sessoes_contratacao: {
        Row: {
          assinatura_id: string | null
          auth_user_id: string | null
          cnpj_normalizado: string
          consulta_cnpj_json: Json
          created_at: string
          email_responsavel: string
          email_verificado_at: string | null
          empresa_id: string | null
          empresa_informada_json: Json
          expira_em: string
          id: string
          pagamento_confirmado_at: string | null
          periodicidade: string
          plano_id: string
          politica_privacidade_versao: string
          pre_analise_json: Json
          responsavel_json: Json
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          termos_aceitos: boolean
          termos_versao: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          assinatura_id?: string | null
          auth_user_id?: string | null
          cnpj_normalizado: string
          consulta_cnpj_json: Json
          created_at?: string
          email_responsavel: string
          email_verificado_at?: string | null
          empresa_id?: string | null
          empresa_informada_json: Json
          expira_em?: string
          id?: string
          pagamento_confirmado_at?: string | null
          periodicidade: string
          plano_id: string
          politica_privacidade_versao: string
          pre_analise_json: Json
          responsavel_json: Json
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          termos_aceitos: boolean
          termos_versao: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          assinatura_id?: string | null
          auth_user_id?: string | null
          cnpj_normalizado?: string
          consulta_cnpj_json?: Json
          created_at?: string
          email_responsavel?: string
          email_verificado_at?: string | null
          empresa_id?: string | null
          empresa_informada_json?: Json
          expira_em?: string
          id?: string
          pagamento_confirmado_at?: string | null
          periodicidade?: string
          plano_id?: string
          politica_privacidade_versao?: string
          pre_analise_json?: Json
          responsavel_json?: Json
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          termos_aceitos?: boolean
          termos_versao?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_contratacao_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_contratacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_contratacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "sessoes_contratacao_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_acao_critica: {
        Row: {
          action_type: string
          approved_by: string | null
          decided_at: string | null
          decision_notes: string | null
          empresa_id: string | null
          executed_at: string | null
          expires_at: string
          id: string
          justification: string
          payload_json: Json
          requested_at: string
          requested_by: string
          status: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          approved_by?: string | null
          decided_at?: string | null
          decision_notes?: string | null
          empresa_id?: string | null
          executed_at?: string | null
          expires_at?: string
          id?: string
          justification: string
          payload_json?: Json
          requested_at?: string
          requested_by: string
          status?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          approved_by?: string | null
          decided_at?: string | null
          decision_notes?: string | null
          empresa_id?: string | null
          executed_at?: string | null
          expires_at?: string
          id?: string
          justification?: string
          payload_json?: Json
          requested_at?: string
          requested_by?: string
          status?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_acao_critica_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_acao_critica_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_acao_critica_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "solicitacoes_acao_critica_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_acesso_empresa: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          idempotency_key: string
          message: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          solicitante_cargo: string | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_telefone: string | null
          solicitante_usuario_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          idempotency_key: string
          message?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solicitante_cargo?: string | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_telefone?: string | null
          solicitante_usuario_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          idempotency_key?: string
          message?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solicitante_cargo?: string | null
          solicitante_email?: string
          solicitante_nome?: string
          solicitante_telefone?: string | null
          solicitante_usuario_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_acesso_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_acesso_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "solicitacoes_acesso_empresa_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_acesso_empresa_solicitante_usuario_id_fkey"
            columns: ["solicitante_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_exportacao_lgpd: {
        Row: {
          arquivo_hash: string | null
          created_at: string
          empresa_id: string
          erro_codigo: string | null
          escopo_json: Json
          expira_em: string | null
          id: string
          processed_at: string | null
          solicitante_id: string
          status: string
          storage_path: string | null
        }
        Insert: {
          arquivo_hash?: string | null
          created_at?: string
          empresa_id: string
          erro_codigo?: string | null
          escopo_json?: Json
          expira_em?: string | null
          id?: string
          processed_at?: string | null
          solicitante_id: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          arquivo_hash?: string | null
          created_at?: string
          empresa_id?: string
          erro_codigo?: string | null
          escopo_json?: Json
          expira_em?: string | null
          id?: string
          processed_at?: string | null
          solicitante_id?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_exportacao_lgpd_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_exportacao_lgpd_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "solicitacoes_exportacao_lgpd_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_verificacao_empresa: {
        Row: {
          additional_information_due_at: string | null
          additional_information_items: Json
          additional_information_message: string | null
          analista_responsavel_id: string | null
          created_at: string
          declaracao_autorizacao_aceita: boolean
          declaracao_autorizacao_aceita_at: string | null
          empresa_id: string
          id: string
          idempotency_key: string
          nivel_risco: string
          politica_privacidade_versao: string | null
          rejection_category: string | null
          rejection_reason: string | null
          resubmitted_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          solicitante_cargo: string
          solicitante_departamento: string | null
          solicitante_documento: string | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_relacao: string
          solicitante_telefone: string | null
          solicitante_usuario_id: string
          status: string
          submitted_at: string | null
          termos_versao: string | null
          updated_at: string
        }
        Insert: {
          additional_information_due_at?: string | null
          additional_information_items?: Json
          additional_information_message?: string | null
          analista_responsavel_id?: string | null
          created_at?: string
          declaracao_autorizacao_aceita?: boolean
          declaracao_autorizacao_aceita_at?: string | null
          empresa_id: string
          id?: string
          idempotency_key: string
          nivel_risco?: string
          politica_privacidade_versao?: string | null
          rejection_category?: string | null
          rejection_reason?: string | null
          resubmitted_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solicitante_cargo: string
          solicitante_departamento?: string | null
          solicitante_documento?: string | null
          solicitante_email: string
          solicitante_nome: string
          solicitante_relacao: string
          solicitante_telefone?: string | null
          solicitante_usuario_id: string
          status?: string
          submitted_at?: string | null
          termos_versao?: string | null
          updated_at?: string
        }
        Update: {
          additional_information_due_at?: string | null
          additional_information_items?: Json
          additional_information_message?: string | null
          analista_responsavel_id?: string | null
          created_at?: string
          declaracao_autorizacao_aceita?: boolean
          declaracao_autorizacao_aceita_at?: string | null
          empresa_id?: string
          id?: string
          idempotency_key?: string
          nivel_risco?: string
          politica_privacidade_versao?: string | null
          rejection_category?: string | null
          rejection_reason?: string | null
          resubmitted_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          solicitante_cargo?: string
          solicitante_departamento?: string | null
          solicitante_documento?: string | null
          solicitante_email?: string
          solicitante_nome?: string
          solicitante_relacao?: string
          solicitante_telefone?: string | null
          solicitante_usuario_id?: string
          status?: string
          submitted_at?: string | null
          termos_versao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_verificacao_empresa_analista_responsavel_id_fkey"
            columns: ["analista_responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_verificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_verificacao_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "solicitacoes_verificacao_empresa_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_verificacao_empresa_solicitante_usuario_id_fkey"
            columns: ["solicitante_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tentativas_cobranca: {
        Row: {
          assinatura_id: string | null
          completed_at: string | null
          created_at: string
          empresa_id: string
          erro_codigo: string | null
          fatura_id: string | null
          gateway: string
          gateway_event_id: string | null
          id: string
          proxima_tentativa_at: string | null
          status: string
          tentativa: number
          valor_centavos: number | null
        }
        Insert: {
          assinatura_id?: string | null
          completed_at?: string | null
          created_at?: string
          empresa_id: string
          erro_codigo?: string | null
          fatura_id?: string | null
          gateway: string
          gateway_event_id?: string | null
          id?: string
          proxima_tentativa_at?: string | null
          status: string
          tentativa?: number
          valor_centavos?: number | null
        }
        Update: {
          assinatura_id?: string | null
          completed_at?: string | null
          created_at?: string
          empresa_id?: string
          erro_codigo?: string | null
          fatura_id?: string | null
          gateway?: string
          gateway_event_id?: string | null
          id?: string
          proxima_tentativa_at?: string | null
          status?: string
          tentativa?: number
          valor_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tentativas_cobranca_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_cobranca_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_cobranca_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tentativas_cobranca_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_documentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_id: string | null
          exige_anexo: boolean
          id: string
          nome: string
          padrao_plataforma: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id?: string | null
          exige_anexo?: boolean
          id?: string
          nome: string
          padrao_plataforma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id?: string | null
          exige_anexo?: boolean
          id?: string
          nome?: string
          padrao_plataforma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipos_documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tipos_documentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_equipamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_id: string | null
          id: string
          nome: string
          padrao_plataforma: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          padrao_plataforma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          padrao_plataforma?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipos_equipamentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tipos_equipamentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tratativas_pendencias: {
        Row: {
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          deleted_at: string | null
          descricao: string
          empresa_id: string
          id: string
          pendencia_id: string
          prazo: string | null
          responsavel_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          deleted_at?: string | null
          descricao: string
          empresa_id: string
          id?: string
          pendencia_id: string
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          deleted_at?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          pendencia_id?: string
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tratativas_pendencias_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratativas_pendencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratativas_pendencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "tratativas_pendencias_pendencia_id_fkey"
            columns: ["pendencia_id"]
            isOneToOne: false
            referencedRelation: "pendencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratativas_pendencias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratativas_pendencias_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          cargo: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          is_master: boolean
          nome: string
          status: string
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id: string
          is_master?: boolean
          nome: string
          status?: string
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_master?: boolean
          nome?: string
          status?: string
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      usuarios_empresas: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          empresa_id: string
          id: string
          perfil: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          empresa_id: string
          id?: string
          perfil: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          empresa_id?: string
          id?: string
          perfil?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "usuarios_empresas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacoes_saude_sistema: {
        Row: {
          checked_at: string
          componente: string
          detalhes_json: Json
          id: string
          latencia_ms: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          componente: string
          detalhes_json?: Json
          id?: string
          latencia_ms?: number | null
          status: string
        }
        Update: {
          checked_at?: string
          componente?: string
          detalhes_json?: Json
          id?: string
          latencia_ms?: number | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_calibracoes_status: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_calibracao: string | null
          data_vencimento: string | null
          deleted_at: string | null
          empresa_id: string | null
          equipamento_id: string | null
          id: string | null
          laboratorio_responsavel: string | null
          numero_certificado: string | null
          observacoes: string | null
          responsavel_id: string | null
          resultado: string | null
          status_calculado: string | null
          updated_at: string | null
          updated_by: string | null
          vigente: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "calibracoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "calibracoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibracoes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calibracoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "fk_calibracoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id", "empresa_id"]
          },
        ]
      }
      vw_consumo_empresa: {
        Row: {
          documentos: number | null
          empresa_id: string | null
          equipamentos: number | null
          limite_documentos: number | null
          limite_equipamentos: number | null
          limite_storage_mb: number | null
          nome_fantasia: string | null
          storage_bytes: number | null
        }
        Relationships: []
      }
      vw_documentos_status: {
        Row: {
          alerta_antecedencia_dias: number[] | null
          categoria_id: string | null
          created_at: string | null
          created_by: string | null
          data_emissao: string | null
          data_vencimento: string | null
          deleted_at: string | null
          empresa_id: string | null
          exige_anexo: boolean | null
          id: string | null
          nome: string | null
          numero_documento: string | null
          observacoes: string | null
          orgao_emissor: string | null
          periodicidade_meses: number | null
          responsavel_id: string | null
          setor_unidade: string | null
          status_calculado: string | null
          tipo_documento_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alerta_antecedencia_dias?: number[] | null
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_id?: string | null
          exige_anexo?: boolean | null
          id?: string | null
          nome?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          periodicidade_meses?: number | null
          responsavel_id?: string | null
          setor_unidade?: string | null
          status_calculado?: never
          tipo_documento_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alerta_antecedencia_dias?: number[] | null
          categoria_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          empresa_id?: string | null
          exige_anexo?: boolean | null
          id?: string | null
          nome?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          orgao_emissor?: string | null
          periodicidade_meses?: number | null
          responsavel_id?: string | null
          setor_unidade?: string | null
          status_calculado?: never
          tipo_documento_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "documentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "tipos_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_equipamentos_conformidade: {
        Row: {
          calibracao_vigente_id: string | null
          codigo_interno: string | null
          created_at: string | null
          created_by: string | null
          criticidade: string | null
          deleted_at: string | null
          empresa_id: string | null
          fabricante: string | null
          id: string | null
          localizacao: string | null
          manutencao_recente_id: string | null
          modelo: string | null
          nome: string | null
          numero_serie: string | null
          observacoes: string | null
          qualificacao_vigente_id: string | null
          responsavel_id: string | null
          setor: string | null
          status: string | null
          status_calibracao: string | null
          status_consolidado: string | null
          status_manutencao: string | null
          status_qualificacao: string | null
          tipo_equipamento_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "equipamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_tipo_equipamento_id_fkey"
            columns: ["tipo_equipamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_itens_vencimento: {
        Row: {
          data_vencimento: string | null
          empresa_id: string | null
          modulo: string | null
          registro_id: string | null
          responsavel_id: string | null
          titulo: string | null
        }
        Relationships: []
      }
      vw_manutencoes_status: {
        Row: {
          acao_realizada: string | null
          causa_raiz: string | null
          created_at: string | null
          created_by: string | null
          data_manutencao: string | null
          deleted_at: string | null
          diagnostico: string | null
          empresa_id: string | null
          empresa_responsavel: string | null
          equipamento_id: string | null
          equipamento_parado_desde: string | null
          exige_evidencia: boolean | null
          falha_apresentada: string | null
          id: string | null
          natureza: string | null
          nome_servico: string | null
          numero_ordem_servico: string | null
          observacoes: string | null
          periodicidade_meses: number | null
          prioridade: string | null
          proxima_manutencao: string | null
          responsavel_interno_id: string | null
          retorno_operacao_at: string | null
          status_calculado: string | null
          status_execucao: string | null
          tecnico_responsavel: string | null
          tipo_servico: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          acao_realizada?: string | null
          causa_raiz?: string | null
          created_at?: string | null
          created_by?: string | null
          data_manutencao?: string | null
          deleted_at?: string | null
          diagnostico?: string | null
          empresa_id?: string | null
          empresa_responsavel?: string | null
          equipamento_id?: string | null
          equipamento_parado_desde?: string | null
          exige_evidencia?: boolean | null
          falha_apresentada?: string | null
          id?: string | null
          natureza?: string | null
          nome_servico?: string | null
          numero_ordem_servico?: string | null
          observacoes?: string | null
          periodicidade_meses?: number | null
          prioridade?: string | null
          proxima_manutencao?: string | null
          responsavel_interno_id?: string | null
          retorno_operacao_at?: string | null
          status_calculado?: never
          status_execucao?: string | null
          tecnico_responsavel?: string | null
          tipo_servico?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          acao_realizada?: string | null
          causa_raiz?: string | null
          created_at?: string | null
          created_by?: string | null
          data_manutencao?: string | null
          deleted_at?: string | null
          diagnostico?: string | null
          empresa_id?: string | null
          empresa_responsavel?: string | null
          equipamento_id?: string | null
          equipamento_parado_desde?: string | null
          exige_evidencia?: boolean | null
          falha_apresentada?: string | null
          id?: string | null
          natureza?: string | null
          nome_servico?: string | null
          numero_ordem_servico?: string | null
          observacoes?: string | null
          periodicidade_meses?: number | null
          prioridade?: string | null
          proxima_manutencao?: string | null
          responsavel_interno_id?: string | null
          retorno_operacao_at?: string | null
          status_calculado?: never
          status_execucao?: string | null
          tecnico_responsavel?: string | null
          tipo_servico?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_manutencoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "fk_manutencoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "manutencoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "manutencoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_responsavel_interno_id_fkey"
            columns: ["responsavel_interno_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_qualificacoes_status: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_qualificacao: string | null
          data_vencimento: string | null
          deleted_at: string | null
          empresa_executora: string | null
          empresa_id: string | null
          equipamento_id: string | null
          id: string | null
          observacoes: string | null
          responsavel_tecnico_id: string | null
          resultado: string | null
          status_calculado: string | null
          tipo: string | null
          updated_at: string | null
          updated_by: string | null
          vigente: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_qualificacoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "fk_qualificacoes_equipamento_empresa"
            columns: ["equipamento_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "qualificacoes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "vw_consumo_empresa"
            referencedColumns: ["empresa_id"]
          },
          {
            foreignKeyName: "qualificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "vw_equipamentos_conformidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_responsavel_tecnico_id_fkey"
            columns: ["responsavel_tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualificacoes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      api_assistente_contexto: {
        Args: {
          p_empresa_id: string
          p_equipamento_id?: string
          p_escopo?: string
          p_setor?: string
        }
        Returns: Json
      }
      api_atualizar_calibracao: {
        Args: { p_empresa_id: string; p_id: string; p_payload: Json }
        Returns: Json
      }
      api_atualizar_documento: {
        Args: { p_empresa_id: string; p_id: string; p_payload: Json }
        Returns: Json
      }
      api_atualizar_equipamento: {
        Args: { p_empresa_id: string; p_id: string; p_payload: Json }
        Returns: Json
      }
      api_atualizar_manutencao: {
        Args: { p_empresa_id: string; p_id: string; p_payload: Json }
        Returns: Json
      }
      api_atualizar_qualificacao: {
        Args: { p_empresa_id: string; p_id: string; p_payload: Json }
        Returns: Json
      }
      api_atualizar_usuario_empresa: {
        Args: { p_empresa_id: string; p_payload: Json; p_usuario_id: string }
        Returns: Json
      }
      api_auditoria_avancada: {
        Args: { p_empresa_id: string; p_limite?: number }
        Returns: Json
      }
      api_catalogo_configuracoes: { Args: never; Returns: Json }
      api_catalogo_relatorios: { Args: never; Returns: Json }
      api_central_notificacoes: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_conceder_acesso_provisorio: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_contexto_usuario: { Args: never; Returns: Json }
      api_criar_calibracao: {
        Args: {
          p_empresa_id: string
          p_equipamento_id: string
          p_payload: Json
        }
        Returns: Json
      }
      api_criar_documento: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_criar_equipamento: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_criar_manutencao: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_criar_qualificacao: {
        Args: {
          p_empresa_id: string
          p_equipamento_id: string
          p_payload: Json
        }
        Returns: Json
      }
      api_dashboard: { Args: { p_empresa_id: string }; Returns: Json }
      api_decidir_acao_critica: {
        Args: { p_approve: boolean; p_notes?: string; p_solicitacao_id: string }
        Returns: Json
      }
      api_documento_decidir_aprovacao: {
        Args: {
          p_comentario?: string
          p_decisao: string
          p_declaracao?: string
          p_empresa_id: string
          p_revisao_id: string
          p_user_agent?: string
        }
        Returns: Json
      }
      api_documento_enviar_aprovacao: {
        Args: {
          p_comentario?: string
          p_documento_id: string
          p_empresa_id: string
        }
        Returns: Json
      }
      api_documento_workflow: {
        Args: { p_documento_id: string; p_empresa_id: string }
        Returns: Json
      }
      api_empresa_atual: { Args: { p_empresa_id: string }; Returns: Json }
      api_enviar_informacoes_verificacao: {
        Args: { p_comment?: string; p_solicitacao_id: string }
        Returns: Json
      }
      api_equipamento_detalhe: {
        Args: { p_empresa_id: string; p_equipamento_id: string }
        Returns: Json
      }
      api_excluir_logicamente: {
        Args: { p_empresa_id: string; p_modulo: string; p_registro_id: string }
        Returns: undefined
      }
      api_executar_qualidade_dados: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_exportar_auditoria: {
        Args: { p_empresa_id: string; p_fim?: string; p_inicio?: string }
        Returns: Json
      }
      api_listar_alertas: {
        Args: {
          p_empresa_id: string
          p_limite?: number
          p_somente_nao_lidos?: boolean
        }
        Returns: Json
      }
      api_listar_documentos: {
        Args: {
          p_busca?: string
          p_empresa_id: string
          p_limite?: number
          p_offset?: number
          p_status?: string
        }
        Returns: Json
      }
      api_listar_equipamentos: {
        Args: {
          p_busca?: string
          p_empresa_id: string
          p_limite?: number
          p_offset?: number
          p_status?: string
        }
        Returns: Json
      }
      api_listar_manutencoes: {
        Args: {
          p_busca?: string
          p_empresa_id: string
          p_equipamento_id?: string
          p_limite?: number
          p_natureza?: string
          p_offset?: number
          p_status?: string
        }
        Returns: Json
      }
      api_listar_pendencias: {
        Args: {
          p_empresa_id: string
          p_limite?: number
          p_offset?: number
          p_responsavel_id?: string
          p_status?: string
        }
        Returns: Json
      }
      api_listar_relatorios_agendados: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_marcar_alerta_lido: {
        Args: { p_alerta_id: string; p_lido?: boolean }
        Returns: undefined
      }
      api_marcar_notificacao_lida: {
        Args: { p_notificacao_id: string }
        Returns: undefined
      }
      api_master_alterar_acesso_empresa: {
        Args: {
          p_access_status: string
          p_empresa_id: string
          p_reason: string
        }
        Returns: Json
      }
      api_master_aprovar_empresa: {
        Args: { p_review_notes?: string; p_solicitacao_id: string }
        Returns: Json
      }
      api_master_assumir_verificacao: {
        Args: { p_solicitacao_id: string }
        Returns: Json
      }
      api_master_atualizar_assinatura: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_master_configurar_gateway_plano: {
        Args: {
          p_plano_id: string
          p_stripe_monthly_price_id: string
          p_stripe_product_id: string
          p_stripe_yearly_price_id: string
        }
        Returns: Json
      }
      api_master_detalhe_verificacao: {
        Args: { p_solicitacao_id: string }
        Returns: Json
      }
      api_master_fila_verificacoes: {
        Args: { p_filtros?: Json }
        Returns: Json
      }
      api_master_financeiro_profissional: { Args: never; Returns: Json }
      api_master_financeiro_resumo: { Args: never; Returns: Json }
      api_master_listar_assinaturas: { Args: never; Returns: Json }
      api_master_listar_planos: { Args: never; Returns: Json }
      api_master_rejeitar_empresa: {
        Args: {
          p_block_access?: boolean
          p_category: string
          p_reason: string
          p_review_notes?: string
          p_solicitacao_id: string
        }
        Returns: Json
      }
      api_master_salvar_limites_provisorios: {
        Args: { p_payload: Json }
        Returns: Json
      }
      api_master_salvar_plano: {
        Args: { p_payload: Json; p_plano_id: string }
        Returns: Json
      }
      api_master_saude_sistema: { Args: never; Returns: Json }
      api_master_solicitar_informacoes_verificacao: {
        Args: {
          p_due_at?: string
          p_items?: Json
          p_message: string
          p_solicitacao_id: string
        }
        Returns: Json
      }
      api_matriz_documental_empresa: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_matriz_permissoes_empresa: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_onboarding_empresa: { Args: { p_empresa_id: string }; Returns: Json }
      api_onboarding_inteligente: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_public_catalogo_planos: { Args: never; Returns: Json }
      api_qualidade_dados: { Args: { p_empresa_id: string }; Returns: Json }
      api_registrar_tratativa: {
        Args: { p_empresa_id: string; p_payload: Json; p_pendencia_id: string }
        Returns: Json
      }
      api_relatorio_executivo_ia: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_resolver_qr_equipamento: {
        Args: { p_qr_token: string }
        Returns: Json
      }
      api_rotacionar_qr_equipamento: {
        Args: { p_empresa_id: string; p_equipamento_id: string }
        Returns: Json
      }
      api_salvar_configuracoes: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_salvar_permissoes_usuario: {
        Args: {
          p_empresa_id: string
          p_justificativa?: string
          p_permissoes: Json
          p_usuario_id: string
        }
        Returns: Json
      }
      api_salvar_preferencias_notificacao: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_salvar_regra_notificacao: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_salvar_relatorio_agendado: {
        Args: { p_empresa_id: string; p_payload: Json }
        Returns: Json
      }
      api_solicitar_acao_critica: {
        Args: {
          p_action_type: string
          p_empresa_id: string
          p_justification: string
          p_payload: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      api_solicitar_acesso_empresa_existente: {
        Args: { p_cnpj: string; p_idempotency_key: string; p_message: string }
        Returns: Json
      }
      api_solicitar_exportacao_lgpd: {
        Args: { p_empresa_id: string; p_escopo?: Json }
        Returns: Json
      }
      api_status_verificacao_empresa: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      api_verificar_limite_storage: {
        Args: { p_empresa_id: string; p_novos_bytes: number }
        Returns: Json
      }
      append_company_verification_event: {
        Args: {
          p_empresa_id: string
          p_event_type: string
          p_message?: string
          p_metadata?: Json
          p_new_status: string
          p_performed_by_type: string
          p_previous_status: string
          p_solicitacao_id: string
        }
        Returns: string
      }
      assert_plan_feature: {
        Args: { p_empresa_id: string; p_recurso: string }
        Returns: undefined
      }
      assert_user_in_company: {
        Args: { p_empresa_id: string; p_field: string; p_usuario_id: string }
        Returns: undefined
      }
      audit_category: {
        Args: { p_acao: string; p_modulo: string }
        Returns: string
      }
      audit_risk_level: {
        Args: { p_acao: string; p_modulo: string }
        Returns: string
      }
      can_admin_company: { Args: { p_empresa_id: string }; Returns: boolean }
      can_write_company: { Args: { p_empresa_id: string }; Returns: boolean }
      check_company_permission: {
        Args: { p_acao?: string; p_empresa_id: string; p_recurso: string }
        Returns: boolean
      }
      cleanup_company_registration_lookup_data: { Args: never; Returns: Json }
      company_access_flag: {
        Args: { p_empresa_id: string; p_flag_name: string }
        Returns: boolean
      }
      company_billing_allows_write: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      company_role: { Args: { p_empresa_id: string }; Returns: string }
      consume_company_registration_lookup_limit: {
        Args: { p_limit: number; p_scope: string; p_window_seconds: number }
        Returns: Json
      }
      create_deduplicated_notification: {
        Args: {
          p_action_url: string
          p_audience: string
          p_dedupe_key: string
          p_empresa_id: string
          p_mensagem: string
          p_tipo: string
          p_titulo: string
          p_usuario_id: string
        }
        Returns: undefined
      }
      effective_company_limit: {
        Args: { p_empresa_id: string; p_limit_name: string }
        Returns: number
      }
      gerar_alertas_vencimento: { Args: never; Returns: number }
      get_company_usage_limits: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      get_effective_company_permissions: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      has_company_access: { Args: { p_empresa_id: string }; Returns: boolean }
      has_company_membership: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      has_company_permission: {
        Args: { p_codigo: string; p_empresa_id: string }
        Returns: boolean
      }
      internal_auth_user_id_por_email: {
        Args: { p_email: string }
        Returns: string
      }
      internal_confirmar_email_contratacao: {
        Args: { p_auth_user_id: string; p_sessao_id: string }
        Returns: Json
      }
      internal_provisionar_contratacao_paga: {
        Args: {
          p_auth_user_id: string
          p_sessao_id: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
        }
        Returns: Json
      }
      is_master: { Args: never; Returns: boolean }
      normalize_cnpj: { Args: { p_cnpj: string }; Returns: string }
      plan_feature_enabled: {
        Args: { p_empresa_id: string; p_recurso: string }
        Returns: boolean
      }
      record_exists_in_company: {
        Args: {
          p_empresa_id: string
          p_record_id: string
          p_table_name: string
        }
        Returns: boolean
      }
      registrar_acesso_master: {
        Args: { p_empresa_id: string; p_modulo: string }
        Returns: undefined
      }
      registrar_evento_anexo: {
        Args: {
          p_acao: string
          p_anexo_id: string
          p_ip?: unknown
          p_user_agent?: string
        }
        Returns: undefined
      }
      segmento_documental_chaves: {
        Args: { p_segmento: string; p_tipo_estabelecimento: string }
        Returns: string[]
      }
      session_has_aal2: { Args: never; Returns: boolean }
      status_vencimento: { Args: { p_data: string }; Returns: string }
      subscription_status_normalized: {
        Args: { p_empresa_id: string }
        Returns: string
      }
      tem_anexo_ativo: {
        Args: {
          p_empresa_id: string
          p_finalidade?: string
          p_modulo: string
          p_registro_id: string
        }
        Returns: boolean
      }
      user_belongs_to_company: {
        Args: { p_empresa_id: string; p_usuario_id: string }
        Returns: boolean
      }
      verification_transition_allowed: {
        Args: { p_next: string; p_previous: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
