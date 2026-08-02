-- Conform Flow - backfill principal da multiunidade.
-- Documentos e módulos operacionais recebem a unidade histórica correspondente.


-- Documentos com setor/unidade textual já demonstravam intenção operacional.
-- O trigger legado revalida vínculos de categoria/tipo em qualquer UPDATE.
-- A migração altera somente o novo escopo, portanto ele é suspenso estritamente
-- durante o backfill e reativado na mesma transação.
alter table public.documentos disable trigger trg_documentos_company;

update public.documentos d
set
  escopo_documento = case
    when nullif(btrim(d.setor_unidade), '') is null then 'corporativo'
    else 'unidade'
  end,
  unidade_id = case
    when nullif(btrim(d.setor_unidade), '') is null then null
    else (
      select u.id
      from public.unidades u
      where u.empresa_id = d.empresa_id
        and u.is_matriz
        and u.deleted_at is null
      limit 1
    )
  end
where d.escopo_documento is distinct from case
    when nullif(btrim(d.setor_unidade), '') is null then 'corporativo'
    else 'unidade'
  end
  or (
    nullif(btrim(d.setor_unidade), '') is not null
    and d.unidade_id is null
  );

alter table public.documentos enable trigger trg_documentos_company;

alter table public.documentos drop constraint if exists documentos_escopo_documento_check;
alter table public.documentos add constraint documentos_escopo_documento_check
  check (
    (escopo_documento = 'corporativo' and unidade_id is null)
    or (escopo_documento = 'unidade' and unidade_id is not null)
  ) not valid;

-- Os validadores legados consideram somente relacionamentos ativos. Para
-- preservar e migrar também o histórico arquivado, suspendemos apenas esses
-- validadores enquanto unidade_id é preenchido; todos são reativados abaixo.
alter table public.equipamentos disable trigger trg_equipamentos_company;
alter table public.calibracoes disable trigger trg_calibracoes_company;
alter table public.qualificacoes disable trigger trg_qualificacoes_company;
alter table public.manutencoes disable trigger trg_manutencoes_company;

update public.equipamentos e
set unidade_id = (
  select u.id
  from public.unidades u
  where u.empresa_id = e.empresa_id
    and u.is_matriz
    and u.deleted_at is null
  limit 1
)
where e.unidade_id is null;

update public.calibracoes c
set unidade_id = e.unidade_id
from public.equipamentos e
where e.id = c.equipamento_id
  and c.unidade_id is null;

update public.qualificacoes q
set unidade_id = e.unidade_id
from public.equipamentos e
where e.id = q.equipamento_id
  and q.unidade_id is null;

update public.manutencoes m
set unidade_id = coalesce(
  (
    select e.unidade_id
    from public.equipamentos e
    where e.id = m.equipamento_id
  ),
  (
    select u.id
    from public.unidades u
    where u.empresa_id = m.empresa_id
      and u.is_matriz
      and u.deleted_at is null
    limit 1
  )
)
where m.unidade_id is null;

alter table public.equipamentos enable trigger trg_equipamentos_company;
alter table public.calibracoes enable trigger trg_calibracoes_company;
alter table public.qualificacoes enable trigger trg_qualificacoes_company;
alter table public.manutencoes enable trigger trg_manutencoes_company;
