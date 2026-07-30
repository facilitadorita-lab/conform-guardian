# Permissões multiunidade

| Perfil | Consolidado | CRUD de unidade | Configurar usuários | Ler | Escrever | Transferir |
| --- | --- | --- | --- | --- | --- | --- |
| Admin Master | Sim | Sim, em empresa autorizada | Sim | Todas autorizadas | Sim | Sim |
| Administrador | Sim | Sim | Sim | Todas da empresa | Sim | Sim |
| Responsável técnico global | Sim | Não | Não | Todas da empresa | Sim, conforme módulo | Sim, conforme módulo |
| Responsável técnico restrito | Não | Não | Não | Unidades vinculadas | Sim, nas vinculadas | Entre unidades autorizadas |
| Colaborador global | Sim | Não | Não | Todas da empresa | Sim, conforme módulo | Entre unidades autorizadas |
| Colaborador restrito | Não | Não | Não | Unidades vinculadas | Sim, nas vinculadas | Entre unidades autorizadas |
| Somente leitura | Conforme vínculo | Não | Não | Unidades autorizadas | Não | Não |
| Parceiro administrador | Conforme cliente/vínculo | Sim no cliente autorizado | Conforme regra do cliente | Apenas clientes próprios | Conforme assinatura | Conforme unidades autorizadas |
| Parceiro colaborador | Conforme vínculo | Não | Não | Apenas clientes próprios | Conforme permissão | Conforme permissão |

## Regras transversais

- Conhecer um UUID não concede acesso.
- Usuário restrito precisa de ao menos uma unidade ativa e pode ter uma principal.
- Documento corporativo é visível aos usuários autorizados da empresa, mesmo quando estão em uma unidade específica.
- Registro de unidade exige `can_read_unit` ou `can_write_unit`.
- Unidade arquivada preserva consulta histórica, mas não aceita novas operações.
- Unidade inativa não é opção para novas operações e continua consumindo limite.
- Parceiro não herda acesso ao cliente vizinho.
- Cliente não herda acesso a outro cliente do parceiro.
- Somente leitura não cria, edita, anexa, arquiva, reativa nem transfere.
- Auditoria e relatórios consolidados exigem permissão específica e plano compatível.

## Matriz de enforcement

| Camada | Controle |
| --- | --- |
| Interface | Esconde ações e unidades indisponíveis; valida Zod. |
| Serviço | Envia empresa/unidade tipadas e usa RPCs. |
| RPC/Edge Function | Revalida empresa, unidade, perfil, assinatura e registro. |
| RLS | Filtra SELECT/INSERT/UPDATE em duas camadas. |
| Constraints/triggers | Impede empresa/unidade divergente e herança inconsistente. |
| Storage | Autoriza pelo registro privado do anexo, não pelo caminho. |
