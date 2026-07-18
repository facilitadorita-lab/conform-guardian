-- Catálogos de navegação do produto pertencem ao backend para que o frontend
-- publicado não dependa de dados mockados.

create or replace function public.api_catalogo_relatorios()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_array(
    jsonb_build_object('id','conformidade-geral','title','Conformidade Geral','desc','Índice consolidado por setor e período.','icon','bar-chart-3'),
    jsonb_build_object('id','documentos','title','Documentos','desc','Vencimentos, versões e responsáveis.','icon','file-text'),
    jsonb_build_object('id','equipamentos','title','Equipamentos','desc','Calibrações, qualificações e criticidade.','icon','cog'),
    jsonb_build_object('id','manutencoes','title','Manutenções','desc','Preventivas, corretivas e MTBF/MTTR.','icon','wrench'),
    jsonb_build_object('id','pendencias','title','Pendências','desc','Tratativas, prazos e evidências.','icon','clipboard-list'),
    jsonb_build_object('id','historico-auditoria','title','Histórico de Auditoria','desc','Logs imutáveis para compliance.','icon','shield-check')
  );
$$;

create or replace function public.api_catalogo_configuracoes()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_array(
    jsonb_build_object('id','dados-empresa','title','Dados da empresa','desc','Razão social, CNPJ, endereço e responsável legal.','icon','building-2'),
    jsonb_build_object('id','setores','title','Setores','desc','Estruture setores para segmentar responsabilidades.','icon','layers'),
    jsonb_build_object('id','categorias','title','Categorias','desc','Regulatório, ambiental, qualidade, contratos e outros.','icon','tag'),
    jsonb_build_object('id','tipos-documentos','title','Tipos de documentos','desc','Alvará, licença, certificado, contrato, plano.','icon','tag'),
    jsonb_build_object('id','tipos-equipamentos','title','Tipos de equipamentos','desc','Medição, esterilização, climatização, armazenamento.','icon','cog'),
    jsonb_build_object('id','tipos-manutencao','title','Tipos de manutenção','desc','Preventiva, corretiva e recorrente geral.','icon','wrench'),
    jsonb_build_object('id','regras-alerta','title','Regras de alerta','desc','Marcos de 60, 30, 15, 7 dias, no vencimento e após vencido.','icon','bell-ring'),
    jsonb_build_object('id','responsaveis','title','Responsáveis','desc','Padrões de atribuição por setor e categoria.','icon','users'),
    jsonb_build_object('id','preferencias-notificacao','title','Preferências de notificação','desc','Canais, frequência e horários de disparo.','icon','mail-check')
  );
$$;

revoke all on function public.api_catalogo_relatorios() from public, anon;
revoke all on function public.api_catalogo_configuracoes() from public, anon;
grant execute on function public.api_catalogo_relatorios() to authenticated;
grant execute on function public.api_catalogo_configuracoes() to authenticated;
