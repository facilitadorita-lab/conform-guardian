-- Conform Flow - backfill dos registros relacionados à multiunidade.
-- Pendências, alertas, anexos, assistente e relatórios preservam o escopo histórico.


create or replace function public.resolve_record_unit(
  p_empresa_id uuid,
  p_modulo text,
  p_registro_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_unidade_id uuid;
begin
  case lower(coalesce(p_modulo, ''))
    when 'documentos' then
      select unidade_id into v_unidade_id
      from public.documentos
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'equipamentos' then
      select unidade_id into v_unidade_id
      from public.equipamentos
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'calibracoes' then
      select unidade_id into v_unidade_id
      from public.calibracoes
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'qualificacoes' then
      select unidade_id into v_unidade_id
      from public.qualificacoes
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'manutencoes' then
      select unidade_id into v_unidade_id
      from public.manutencoes
      where id = p_registro_id and empresa_id = p_empresa_id;
    when 'pendencias' then
      select unidade_id into v_unidade_id
      from public.pendencias
      where id = p_registro_id and empresa_id = p_empresa_id;
    else
      v_unidade_id := null;
  end case;

  return v_unidade_id;
end
$$;

update public.pendencias p
set unidade_id = public.resolve_record_unit(p.empresa_id, p.modulo, p.registro_id)
where p.unidade_id is null;

update public.tratativas_pendencias t
set unidade_id = p.unidade_id
from public.pendencias p
where p.id = t.pendencia_id
  and t.unidade_id is null;

update public.alertas a
set unidade_id = public.resolve_record_unit(a.empresa_id, a.modulo, a.registro_id)
where a.unidade_id is null;

-- Backfill técnico não representa ação de usuário. Evita alterar updated_at e
-- criar centenas de eventos artificiais na cadeia imutável de auditoria.
alter table public.anexos disable trigger trg_anexos_audit_fields;
alter table public.anexos disable trigger trg_anexos_audit_log;
alter table public.anexos disable trigger trg_anexos_plan_feature;

with anexos_resolvidos as materialized (
  select
    a.id,
    case a.modulo
      when 'documentos' then d.unidade_id
      when 'equipamentos' then e.unidade_id
      when 'calibracoes' then c.unidade_id
      when 'qualificacoes' then q.unidade_id
      when 'manutencoes' then m.unidade_id
      when 'pendencias' then p.unidade_id
      else null
    end as unidade_id
  from public.anexos a
  left join public.documentos d
    on a.modulo = 'documentos'
    and d.id = a.registro_id
    and d.empresa_id = a.empresa_id
  left join public.equipamentos e
    on a.modulo = 'equipamentos'
    and e.id = a.registro_id
    and e.empresa_id = a.empresa_id
  left join public.calibracoes c
    on a.modulo = 'calibracoes'
    and c.id = a.registro_id
    and c.empresa_id = a.empresa_id
  left join public.qualificacoes q
    on a.modulo = 'qualificacoes'
    and q.id = a.registro_id
    and q.empresa_id = a.empresa_id
  left join public.manutencoes m
    on a.modulo = 'manutencoes'
    and m.id = a.registro_id
    and m.empresa_id = a.empresa_id
  left join public.pendencias p
    on a.modulo = 'pendencias'
    and p.id = a.registro_id
    and p.empresa_id = a.empresa_id
  where a.unidade_id is null
)
update public.anexos a
set unidade_id = r.unidade_id
from anexos_resolvidos r
where r.id = a.id
  and r.unidade_id is not null;

alter table public.anexos enable trigger trg_anexos_audit_fields;
alter table public.anexos enable trigger trg_anexos_audit_log;
alter table public.anexos enable trigger trg_anexos_plan_feature;

update public.interacoes_assistente i
set unidade_id = e.unidade_id
from public.equipamentos e
where e.id = i.equipamento_id
  and i.unidade_id is null;

update public.execucoes_relatorios_agendados e
set unidade_id = r.unidade_id
from public.relatorios_agendados r
where r.id = e.relatorio_agendado_id
  and e.unidade_id is null;

