-- Restaura a rotina usada no cadastro de clientes por parceiros.
--
-- Em alguns ambientes a migration de documentos segmentados nao foi aplicada,
-- embora as migrations de parceiros ja chamem esta funcao. Esta migration e
-- idempotente e deixa o banco compativel com as chamadas atuais.

create or replace function public.api_provisionar_documentos_empresa(
  p_empresa_id uuid,
  p_forcar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa public.empresas;
  v_modelo record;
  v_doc_id uuid;
  v_slug text;
  v_criados integer := 0;
  v_existentes integer := 0;
  v_chaves text[];
  v_parceiro_autorizado boolean := false;
begin
  -- Alem do fluxo normal de escrita, o administrador de um parceiro pode
  -- provisionar o cliente que acabou de vincular, inclusive sem plano fixo
  -- quando o parceiro usa cobranca unitaria por CNPJ.
  v_parceiro_autorizado := exists (
    select 1
    from public.relacionamentos_parceiro_clientes rpc
    join public.empresas parceiro
      on parceiro.id = rpc.parceiro_empresa_id
     and parceiro.tipo_conta = 'parceira'
     and parceiro.deleted_at is null
     and parceiro.access_status in ('active', 'provisional')
     and coalesce(parceiro.parceiro_cobranca_modo, 'plano_carteira') = 'unitario'
    where rpc.cliente_empresa_id = p_empresa_id
      and rpc.status = 'ativo'
      and (
        public.is_master()
        or exists (
          select 1
          from public.usuarios_empresas ue
          where ue.usuario_id = auth.uid()
            and ue.empresa_id = rpc.parceiro_empresa_id
            and ue.perfil in ('administrador', 'parceiro_administrador')
            and ue.ativo
            and ue.deleted_at is null
        )
      )
  );

  if not public.can_write_company(p_empresa_id) and not v_parceiro_autorizado then
    raise exception 'Sem permissao' using errcode = '42501';
  end if;

  select *
    into v_empresa
  from public.empresas e
  where e.id = p_empresa_id
    and e.deleted_at is null;

  if not found then
    raise exception 'Empresa nao encontrada' using errcode = 'P0002';
  end if;

  v_slug := regexp_replace(coalesce(v_empresa.cnpj, v_empresa.id::text), '[^0-9]+', '', 'g');
  v_chaves := public.segmento_documental_chaves(
    v_empresa.tipo_estabelecimento,
    v_empresa.segmento
  );

  for v_modelo in
    select *
    from public.modelos_documentos_segmento m
    where m.deleted_at is null
      and m.ativo
      and m.segmento_chave = any(v_chaves)
    order by
      case when m.segmento_chave = 'comum' then 0 else 1 end,
      m.segmento_chave,
      m.nome
  loop
    select d.id
      into v_doc_id
    from public.documentos d
    where d.empresa_id = p_empresa_id
      and d.deleted_at is null
      and lower(d.nome) = lower(v_modelo.nome)
    limit 1;

    if v_doc_id is not null and not p_forcar then
      v_existentes := v_existentes + 1;
      v_doc_id := null;
      continue;
    end if;

    insert into public.documentos (
      empresa_id,
      nome,
      numero_documento,
      orgao_emissor,
      data_emissao,
      data_vencimento,
      periodicidade_meses,
      exige_anexo,
      setor_unidade,
      observacoes
    )
    values (
      p_empresa_id,
      v_modelo.nome,
      upper(v_modelo.segmento_chave) || '-' || v_slug || '-' ||
        lpad((v_criados + v_existentes + 1)::text, 3, '0'),
      v_modelo.orgao_emissor_padrao,
      null,
      null,
      v_modelo.periodicidade_meses,
      true,
      v_modelo.setor_padrao,
      'Documento pre-configurado conforme tipo de estabelecimento/segmento. Cliente pode editar datas, anexos e responsaveis.'
    )
    on conflict do nothing
    returning id into v_doc_id;

    if v_doc_id is not null then
      v_criados := v_criados + 1;
    else
      v_existentes := v_existentes + 1;
    end if;

    v_doc_id := null;
  end loop;

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'tipo_estabelecimento', v_empresa.tipo_estabelecimento,
    'segmento', v_empresa.segmento,
    'chaves', v_chaves,
    'documentos_criados', v_criados,
    'documentos_existentes', v_existentes
  );
end;
$$;

revoke all on function public.api_provisionar_documentos_empresa(uuid, boolean) from public, anon;
grant execute on function public.api_provisionar_documentos_empresa(uuid, boolean) to authenticated;

