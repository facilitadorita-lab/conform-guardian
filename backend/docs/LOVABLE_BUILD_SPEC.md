# Conform Flow — especificação de construção no Lovable

## Objetivo

Construir um SaaS B2B multiempresa para gestão regulatória e documental de clínicas, ILPIs, laboratórios, consultórios e pequenos serviços de saúde.

O frontend de produção deve ser criado no **Lovable**. O backend, autenticação, banco, storage e regras de acesso devem usar **Supabase**.

## Regra arquitetural obrigatória: cliente fino

O Lovable é responsável somente por apresentação, estado visual, coleta de dados e chamada das APIs do backend. Toda lógica de negócio deve permanecer no Supabase por meio de views, RPCs, triggers, RLS e Edge Functions.

O frontend não deve:

- calcular status ou vigência;
- calcular métricas do dashboard ou conformidade;
- decidir permissões;
- determinar qual registro é vigente;
- montar caminhos de Storage;
- criar usuários com APIs administrativas;
- gerar alertas ou controlar duplicidade;
- atualizar várias tabelas para concluir uma mesma operação;
- produzir relatórios a partir de listas carregadas parcialmente;
- acessar tabelas diretamente para operações de escrita.

O Lovable deve chamar os contratos descritos em `docs/BACKEND_API.md`. Formatação visual, máscaras e validações de ergonomia podem existir no frontend, mas o backend deve repetir e impor toda validação relevante.

O protótipo local existente é apenas uma referência visual. Não copiar sua arquitetura estática para produção.

## Prompt mestre para o Lovable

> Crie uma aplicação SaaS responsiva chamada Conform Flow, em português do Brasil, conectada ao Supabase. A plataforma gerencia documentos regulatórios, equipamentos, calibrações, qualificações, manutenções, anexos, pendências, alertas e auditoria para pequenas empresas de saúde.
>
> Use o logo oficial fornecido com fundo transparente. Adote visual B2B moderno, clean e corporativo: fundo cinza muito claro, cards brancos, azul-petróleo como cor principal, cyan/teal como apoio, vermelho suave para vencidos, âmbar para atenção e verde para conformidade. Evite aparência hospitalar antiga.
>
> A aplicação é multiempresa. Todo registro operacional deve conter `empresa_id`. Usuários comuns só podem acessar empresas vinculadas em `usuarios_empresas`. Admin Master pode acessar todas as empresas, mas cada acesso a dados de uma empresa deve chamar a RPC `registrar_acesso_master`.
>
> A navegação da empresa deve conter: Dashboard, Documentos, Equipamentos, Manutenções, Pendências, Alertas, Relatórios, Usuários e Configurações. Não exiba Calibrações nem Qualificações na sidebar.
>
> O fluxo obrigatório é: Equipamentos → selecionar equipamento → Dados gerais, Calibrações, Qualificações, Manutenções, Anexos e Histórico. Calibrações e qualificações existem exclusivamente dentro da ficha do equipamento. Manutenções permanecem também no menu global porque podem ser vinculadas a serviços recorrentes sem equipamento.
>
> Crie rotas protegidas, loading states, empty states, tratamento de erros, confirmação de exclusão lógica, filtros persistentes na URL, paginação server-side e feedback por toast. Nunca filtre segurança apenas no frontend; confie nas políticas RLS do Supabase.

## Identidade visual

- Logo: `assets/conform-flow-logo-transparent.png`.
- Principal: `#075B67`.
- Cyan: `#08A8D1`.
- Teal: `#2DB9AA`.
- Fundo: `#F4F7F8`.
- Texto: `#15373D`.
- Sucesso: `#2D926B`.
- Atenção: `#DE922F`.
- Erro: `#D75B64`.
- Fonte: DM Sans ou Inter; títulos com Manrope.
- Cards com raio entre 12 e 16 px e sombras muito discretas.
- Sidebar fixa no desktop e drawer no tablet/mobile.

## Estrutura de rotas

### Públicas

- `/login`
- `/esqueci-senha`
- `/redefinir-senha`

### Empresa

- `/app/dashboard`
- `/app/documentos`
- `/app/documentos/novo`
- `/app/documentos/:id`
- `/app/equipamentos`
- `/app/equipamentos/novo`
- `/app/equipamentos/:id`
- `/app/equipamentos/:id/calibracoes/nova`
- `/app/equipamentos/:id/qualificacoes/nova`
- `/app/equipamentos/:id/manutencoes/nova`
- `/app/manutencoes`
- `/app/pendencias`
- `/app/alertas`
- `/app/relatorios`
- `/app/usuarios`
- `/app/configuracoes`

### Admin Master

- `/master/dashboard`
- `/master/empresas`
- `/master/empresas/:id`
- `/master/usuarios`
- `/master/planos`
- `/master/catalogos`
- `/master/logs`
- `/master/configuracoes`

## Navegação da empresa

```text
Dashboard
Documentos
Equipamentos
└── Equipamento selecionado
    ├── Dados gerais
    ├── Calibrações
    ├── Qualificações
    ├── Manutenções
    ├── Anexos
    └── Histórico
Manutenções
Pendências
Alertas
Relatórios
Usuários
Configurações
```

Não criar itens globais de sidebar para Calibrações ou Qualificações.

## Regras de sessão e empresa ativa

1. Após login, buscar `usuarios` pelo `auth.uid()`.
2. Bloquear acesso se `status != 'ativo'`.
3. Buscar empresas permitidas em `usuarios_empresas`.
4. Se houver uma única empresa, defini-la como ativa automaticamente.
5. Se houver várias, mostrar seletor de empresa no topo.
6. Persistir somente o ID da empresa ativa; nunca persistir permissões calculadas no navegador.
7. Toda consulta operacional deve enviar o `empresa_id` ativo e depender da RLS.
8. Ao trocar de empresa, limpar caches e filtros dependentes da empresa.

## Dashboard

Exibir:

- documentos vencidos;
- vencimentos em 7, 30 e 60 dias;
- equipamentos cadastrados;
- manutenções vencidas e próximas;
- calibrações e qualificações consolidadas a partir dos equipamentos;
- registros sem anexo ou responsável;
- percentual geral de conformidade;
- pendências críticas com ação “Abrir registro”.

Usar as views de status do Supabase. Não calcular indicadores a partir de listas incompletas carregadas no navegador.

## Documentos

Lista com busca, paginação e filtros por status, categoria, responsável, setor e intervalo de vencimento.

Formulário:

- nome;
- categoria;
- tipo;
- número;
- órgão emissor;
- responsável;
- emissão;
- vencimento;
- periodicidade;
- dias de antecedência;
- setor/unidade;
- exige anexo;
- observações;
- arquivo principal.

Na substituição de arquivo, criar novo registro em `anexos` e marcar o anterior como substituído. Nunca sobrescrever silenciosamente.

## Equipamentos

Lista com nome, código, tipo, setor, criticidade e situação consolidada.

Ao abrir um equipamento, usar uma página própria com cabeçalho, metadados e abas:

### Dados gerais

- identificação e dados técnicos;
- responsável e localização;
- status consolidado vigente;
- próxima ação;
- resumo da calibração, qualificação e manutenção vigentes.

### Calibrações

- histórico completo, ordenado por data decrescente;
- uma calibração marcada como vigente conforme a mais recente não excluída;
- certificado, laboratório, resultado e vencimento;
- histórico antigo somente leitura por padrão;
- ação “Nova calibração”.

### Qualificações

- histórico completo;
- protocolo e relatório como anexos separados;
- tipo, executor, resultado e vencimento;
- ação “Nova qualificação”.

### Manutenções

- preventivas e corretivas deste equipamento;
- OS, empresa, técnico e próxima manutenção;
- ação “Nova manutenção”.

### Anexos

- todos os anexos relacionados ao equipamento e aos registros filhos;
- filtros por origem e tipo;
- visualização, download e histórico de substituição.

### Histórico

- trilha de auditoria filtrada pelo ID do equipamento e registros filhos;
- usuário, data/hora, ação e alterações.

## Manutenções globais

Manter no menu porque podem existir manutenções sem equipamento, ligadas a um serviço recorrente, como dedetização, caixa d’água, ar-condicionado ou sistema de incêndio.

Regra: exigir `equipamento_id` ou `nome_servico`; nunca permitir ambos vazios.

Os mesmos registros devem ser apresentados por dois caminhos, sem duplicação:

- `Manutenções` na sidebar: visão consolidada de todos os equipamentos e serviços da empresa;
- `Equipamentos → equipamento → Manutenções`: histórico filtrado pelo equipamento selecionado.

Separar `natureza` de `tipo_servico`:

- natureza: preventiva ou corretiva;
- tipo de serviço: inspeção, limpeza, validação, reparo, troca de peça, ajuste ou outro.

Manutenção preventiva deve permitir periodicidade e próxima execução. Manutenção corretiva deve estar obrigatoriamente vinculada a um equipamento e registrar falha apresentada, prioridade, diagnóstico, causa raiz, ação realizada, início da parada e retorno à operação.

## Pendências

Consolidar documentos, calibrações, qualificações e manutenções vencidas, próximas, sem anexo ou sem responsável.

Permitir tratativas com descrição, responsável, prazo, status, evidência e conclusão. A tratativa não deve alterar diretamente o status regulatório do registro de origem.

## Alertas

- central interna com lido/não lido;
- preferências por empresa;
- padrões de 60, 30, 15 e 7 dias, dia do vencimento e após vencido;
- botão que abre o registro de origem;
- e-mail gerado por Edge Function agendada;
- impedir envio duplicado usando chave única por item, marco e destinatário.

## Relatórios

- conformidade geral;
- documentos;
- equipamentos;
- pendências;
- exportação CSV/XLSX/PDF por Edge Functions do backend;
- filtros idênticos aos módulos de origem;
- cabeçalho com empresa, CNPJ, período e data de geração.

## Usuários e permissões

Perfis: administrador, responsável técnico, colaborador e somente leitura.

- Administrador: CRUD completo na empresa, usuários e relatórios.
- Responsável técnico: revisão, validação, evidências e tratativas.
- Colaborador: leitura e inclusão permitida; sem exclusão.
- Somente leitura: consulta e download liberado; sem escrita.

Esconder ações não permitidas melhora a experiência, mas a proteção real deve estar na RLS.

## Admin Master

Criar shell visual separado. Antes de abrir dados de uma empresa, chamar:

```ts
await supabase.rpc('registrar_acesso_master', {
  p_empresa_id: empresaId,
  p_modulo: 'documentos'
})
```

Mostrar aviso persistente “Você está acessando como Admin Master”. Não permitir edição silenciosa em nome da empresa.

## Status automáticos

- sem vencimento: `sem_validade`;
- anterior a hoje: `vencido`;
- hoje: `vence_hoje`;
- 1–7 dias: `critico`;
- 8–30 dias: `a_vencer`;
- 31–60 dias: `atencao`;
- mais de 60 dias: `em_dia`;
- se exige anexo e não há anexo vigente: `pendente_anexo`;
- resultado reprovado prevalece sobre status de vencimento.

Consultar as views `vw_*_status` para obter status dinâmico.

## Storage

Bucket privado `evidencias`. Caminho obrigatório:

```text
{empresa_id}/{modulo}/{registro_id}/{uuid}-{nome-sanitizado}
```

Downloads devem usar URL assinada curta. Nunca tornar o bucket público.

## Estados obrigatórios de interface

- skeleton durante carregamento;
- mensagem orientada para listas vazias;
- erro com opção de tentar novamente;
- confirmação para exclusão lógica;
- toast para sucesso/erro;
- indicador de upload e validação de tamanho/tipo;
- aviso antes de sair de formulário alterado;
- acessibilidade por teclado e foco visível.

## Critérios de aceite

1. Usuário de uma empresa não consegue consultar dados de outra nem alterando URL ou requisição.
2. Calibrações e qualificações não aparecem na sidebar.
3. Calibrações e qualificações só são criadas dentro de um equipamento.
4. Histórico antigo não é perdido quando um novo registro se torna vigente.
5. Manutenções aceitam equipamento ou serviço recorrente.
6. Anexos são privados e isolados por empresa.
7. Exclusões são lógicas.
8. Status e dashboard refletem a data atual.
9. Acesso do Admin Master gera log.
10. A interface funciona em desktop e tablet sem tabelas ilegíveis.
