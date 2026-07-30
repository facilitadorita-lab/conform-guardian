# Relatório de segurança — Multiunidade

## Modelo de autorização

O acesso segue:

```text
identidade → empresa autorizada → unidade autorizada → registro permitido
```

O seletor do frontend não concede acesso. RLS, RPCs e Edge Functions recalculam empresa, unidade, perfil, assinatura, relacionamento de parceiro e estado do registro.

## Controles implementados

- `unidades` e `usuarios_unidades` com RLS;
- FK composta para impedir unidade principal de outra empresa;
- funções de acesso com `security definer`, `search_path` fixo e grants mínimos;
- políticas operacionais por empresa e unidade;
- documento corporativo tratado separadamente;
- herança obrigatória do equipamento para calibração, qualificação e manutenção;
- validação de origem em pendências, tratativas e anexos;
- Storage privado; escrita autenticada direta removida;
- upload via Edge Function e caminho empresa/unidade/módulo/registro;
- FlowIA somente com dados estruturados autorizados;
- QR protegido por equipamento e unidade;
- parceiro limitado aos próprios clientes;
- cliente impedido de ver parceiro ou cliente vizinho;
- somente leitura impedido de criar, editar, transferir ou anexar;
- auditoria contextual de CRUD, troca de unidade, acessos e transferência;
- limite de unidade protegido por lock transacional.

## Matriz de ataques preparada

Os testes cobrem:

- UUID de outra empresa;
- UUID de unidade não autorizada;
- SELECT, INSERT, UPDATE e DELETE;
- RPCs `security definer`;
- Storage e URL de upload;
- FlowIA;
- QR Code;
- parceiro cruzado;
- relatório cruzado;
- unidade principal de outra empresa;
- tentativa de exclusão física;
- criação concorrente acima do limite;
- downgrade, excesso, arquivamento e reativação.

## Evidência

TypeScript, build e lint funcional passaram localmente. Os testes SQL, RLS, Edge e E2E estão preparados para ambiente descartável, mas ainda não foram executados neste branch. Por isso, o estado operacional permanece **PREPARED**, não PASS.

## Riscos restantes

1. É obrigatória a execução integral do workflow isolado.
2. O rollout remoto deve usar backup e cópia anonimizada de homologação.
3. As duas árvores Supabase aumentam o risco de editar a origem errada.
4. SMTP, Stripe Test Mode e recuperação de conta requerem validação de segurança própria.
5. Logs e métricas de negação por unidade devem ser acompanhados no rollout.

## Decisão

Segurança de desenho: **implementada e revisada**. Segurança executada da multiunidade: **PENDENTE DO WORKFLOW ISOLADO**.
