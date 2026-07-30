# Arquitetura multiunidade — Conform Flow

## Objetivo

A multiunidade adiciona um terceiro nível de isolamento operacional:

```text
usuário autenticado → empresa autorizada → unidade autorizada → registro
```

O frontend nunca é a fonte de autorização. A seleção visual informa o contexto, mas RLS, RPCs e Edge Functions validam novamente empresa, unidade, perfil, assinatura e estado do registro.

## Modelo

| Entidade | Responsabilidade |
| --- | --- |
| `unidades` | Cadastro operacional, matriz, filial, endereço, responsável, estado e exclusão lógica. |
| `usuarios_unidades` | Autorizações específicas de usuário por unidade, com unidade principal. |
| `usuarios_empresas` | Mantém perfil empresarial e `acesso_todas_unidades`. |
| `transferencias_unidades` | Histórico imutável da movimentação de equipamento. |

`documentos` usa `escopo_documento = corporativo | unidade`. Documento corporativo não possui `unidade_id`; documento operacional exige unidade.

Equipamentos sempre possuem unidade. Calibrações, qualificações e manutenções vinculadas preservam uma fotografia da unidade vigente no momento da criação. A transferência do equipamento não reescreve históricos anteriores.

Também possuem contexto de unidade: pendências, tratativas, alertas, anexos, logs, interações da FlowIA, relatórios agendados e suas execuções.

## Camada de segurança

As funções `unit_belongs_to_company`, `has_unit_membership`, `has_unit_access`, `can_read_unit`, `can_write_unit`, `can_admin_unit`, `current_user_unit_ids` e `can_use_consolidated_view` compõem as policies.

O acesso exige:

1. usuário autenticado e ativo;
2. empresa ativa e autorizada;
3. vínculo empresarial ou relacionamento parceiro-cliente válido;
4. assinatura que permita acesso/escrita;
5. vínculo global ou específico com a unidade;
6. unidade pertencente à mesma empresa;
7. perfil compatível com a operação.

Funções `security definer` usam `search_path` fixo, validam o contexto e são revogadas de `public` e `anon`.

## Limites e concorrência

`effective_unit_limit` aplica o limite-base do plano e `assinaturas_empresas.unidades_extras`. Limites customizados/provisórios continuam soberanos.

Consomem limite: `ativa`, `inativa` e `em_implantacao`. Não consomem: `arquivada` e excluída logicamente.

Criação e reativação usam bloqueio transacional por empresa (`pg_advisory_xact_lock`). Duas requisições concorrentes para a última vaga não ultrapassam o limite.

## APIs

O frontend usa RPCs tipadas para CRUD, status, matriz, indicadores, acesso de usuários, transferências, dashboard, listagens, relatórios, auditoria e FlowIA. Inserções operacionais sensíveis não dependem de escrita direta na tabela.

As chaves de cache incluem empresa e `unidade_id | consolidado`. A troca de empresa limpa o contexto anterior; a troca de unidade cancela consultas em andamento, é validada no backend e gera auditoria.

## Frontend

`UnitProvider` expõe:

- unidade atual;
- unidades permitidas;
- visão consolidada;
- permissão de consolidação;
- permissão de administração;
- limites;
- carregamento/erro;
- seleção e recarga.

O seletor é integrado ao shell desktop/mobile. A página `Configurações > Unidades` oferece pesquisa, paginação, CRUD lógico, matriz, estados, indicadores e capacidade.

Dashboard, documentos, equipamentos, manutenções, pendências, alertas, vencimentos, relatórios, usuários, auditoria e FlowIA consomem o contexto.

## FlowIA

A FlowIA recebe empresa e unidade, mas o backend recalcula o escopo autorizado. A visão consolidada só é aceita para perfis permitidos. As fontes estruturadas mostram a unidade e nenhuma rotina lê anexos, PDFs ou imagens.

## QR Code e anexos

O QR é único por equipamento e resolve a unidade atual depois de validar o acesso. Uma transferência preserva o token e atualiza apenas a unidade exibida.

Arquivos permanecem privados. O caminho segue:

```text
empresa/unidade-ou-corporativo/modulo/registro/arquivo
```

O caminho não concede acesso. A autorização usa o registro do anexo, empresa, unidade, usuário e permissões. URLs são assinadas e temporárias.

## Parceiros e Admin Master

Parceiros só recebem clientes relacionados. Ao entrar no cliente, suas permissões operacionais passam pelas mesmas regras de unidade; outro parceiro e outro cliente continuam invisíveis.

O Admin Master recebe visão agregada de utilização, limite-base, add-ons, limite efetivo, unidades ativas/arquivadas, excesso, proximidade do limite, parceiro de origem e receita estimada de unidades extras.
