-- Conform Flow — dados operacionais ficticios para as 30 empresas de teste.
-- Idempotente: pode rodar novamente sem duplicar documentos, equipamentos,
-- calibracoes, qualificacoes, manutencoes ou anexos.
-- Observacao: os anexos abaixo simulam arquivos do cliente por metadados.
-- O conteudo real do PDF nao e gravado aqui; o storage_path respeita a regra
-- empresa_id/modulo/registro_id/arquivo para manter o isolamento multiempresa.

do $$
declare
  v_empresa record;
  v_doc record;
  v_eq record;
  v_doc_id uuid;
  v_equip_id uuid;
  v_cal_id uuid;
  v_qual_id uuid;
  v_manut_id uuid;
  v_slug text;
  v_offset integer;
  v_cat_avcb uuid;
  v_cat_alvara uuid;
  v_cat_licenca uuid;
  v_cat_contrato uuid;
  v_cat_manual uuid;
  v_cat_certificado uuid;
  v_tipo_licenca uuid;
  v_tipo_contrato uuid;
  v_tipo_procedimento uuid;
  v_tipo_certificado uuid;
  v_tipo_manual uuid;
  v_tipo_geladeira uuid;
  v_tipo_freezer uuid;
  v_tipo_autoclave uuid;
  v_tipo_termometro uuid;
  v_tipo_camara_fria uuid;
begin
  select id into v_cat_avcb
  from public.categorias_documentos
  where empresa_id is null and lower(nome) like '%avcb%'
  limit 1;

  select id into v_cat_alvara
  from public.categorias_documentos
  where empresa_id is null and lower(nome) like '%alvar%'
  limit 1;

  select id into v_cat_licenca
  from public.categorias_documentos
  where empresa_id is null and lower(nome) like '%licen%'
  limit 1;

  select id into v_cat_contrato
  from public.categorias_documentos
  where empresa_id is null and lower(nome) like '%contrato%'
  limit 1;

  select id into v_cat_manual
  from public.categorias_documentos
  where empresa_id is null and lower(nome) like '%manual%'
  limit 1;

  select id into v_cat_certificado
  from public.categorias_documentos
  where empresa_id is null and lower(nome) like '%certificado%'
  limit 1;

  select id into v_tipo_licenca
  from public.tipos_documentos
  where empresa_id is null and lower(nome) like '%licen%'
  limit 1;

  select id into v_tipo_contrato
  from public.tipos_documentos
  where empresa_id is null and lower(nome) like '%contrato%'
  limit 1;

  select id into v_tipo_procedimento
  from public.tipos_documentos
  where empresa_id is null and lower(nome) like '%proced%'
  limit 1;

  select id into v_tipo_certificado
  from public.tipos_documentos
  where empresa_id is null and lower(nome) like '%certificado%'
  limit 1;

  select id into v_tipo_manual
  from public.tipos_documentos
  where empresa_id is null and lower(nome) like '%manual%'
  limit 1;

  select id into v_tipo_geladeira
  from public.tipos_equipamentos
  where empresa_id is null and lower(nome) like '%geladeira%'
  limit 1;

  select id into v_tipo_freezer
  from public.tipos_equipamentos
  where empresa_id is null and lower(nome) like '%freezer%'
  limit 1;

  select id into v_tipo_autoclave
  from public.tipos_equipamentos
  where empresa_id is null and lower(nome) like '%autoclave%'
  limit 1;

  select id into v_tipo_termometro
  from public.tipos_equipamentos
  where empresa_id is null and lower(nome) like '%termo%'
  limit 1;

  select id into v_tipo_camara_fria
  from public.tipos_equipamentos
  where empresa_id is null and lower(nome) like '%camara%' or lower(nome) like '%câmara%'
  limit 1;

  for v_empresa in
    select
      e.id,
      e.razao_social,
      e.nome_fantasia,
      e.cnpj,
      row_number() over (order by e.cnpj)::integer as seq
    from public.empresas e
    where e.cnpj between '90.000.001/0001-01' and '90.000.030/0001-30'
      and e.deleted_at is null
    order by e.cnpj
  loop
    v_slug := lower(regexp_replace(v_empresa.cnpj, '[^0-9]+', '', 'g'));
    v_offset := v_empresa.seq;

    -- Documentos regulatórios principais.
    for v_doc in
      select *
      from (
        values
          (
            'AVCB - Auto de Vistoria do Corpo de Bombeiros',
            v_cat_avcb,
            v_tipo_certificado,
            'AVCB-' || v_slug || '-2026',
            'Corpo de Bombeiros',
            current_date - (300 + v_offset),
            current_date + (20 + (v_offset % 45)),
            12,
            'Administrativo',
            'avcb-auto-vistoria.pdf',
            420000
          ),
          (
            'Alvara Sanitario',
            v_cat_alvara,
            v_tipo_licenca,
            'ALV-SAN-' || v_slug || '-2026',
            'Vigilancia Sanitaria',
            current_date - (210 + v_offset),
            current_date + (80 + (v_offset % 60)),
            12,
            'Qualidade',
            'alvara-sanitario.pdf',
            390000
          ),
          (
            'Licenca de Funcionamento',
            v_cat_licenca,
            v_tipo_licenca,
            'LIC-FUNC-' || v_slug || '-2026',
            'Prefeitura Municipal',
            current_date - (180 + v_offset),
            current_date + (150 + (v_offset % 90)),
            12,
            'Administrativo',
            'licenca-funcionamento.pdf',
            365000
          ),
          (
            'PGRSS - Plano de Gerenciamento de Residuos',
            v_cat_contrato,
            v_tipo_procedimento,
            'PGRSS-' || v_slug || '-2026',
            'Responsavel Tecnico',
            current_date - (120 + v_offset),
            current_date + (240 + (v_offset % 90)),
            12,
            'Qualidade',
            'pgrss-plano-residuos.pdf',
            810000
          ),
          (
            'Contrato de Coleta de Residuos',
            v_cat_contrato,
            v_tipo_contrato,
            'CTR-RES-' || v_slug || '-2026',
            'Fornecedor homologado',
            current_date - (90 + v_offset),
            current_date + (45 + (v_offset % 75)),
            12,
            'Operacoes',
            'contrato-coleta-residuos.pdf',
            530000
          ),
          (
            'Manual de Boas Praticas',
            v_cat_manual,
            v_tipo_manual,
            'MBP-' || v_slug || '-2026',
            'Qualidade Interna',
            current_date - (60 + v_offset),
            null::date,
            null::integer,
            'Qualidade',
            'manual-boas-praticas.pdf',
            1250000
          )
      ) as docs(
        nome,
        categoria_id,
        tipo_documento_id,
        numero_documento,
        orgao_emissor,
        data_emissao,
        data_vencimento,
        periodicidade_meses,
        setor_unidade,
        arquivo,
        tamanho_bytes
      )
    loop
      insert into public.documentos (
        empresa_id,
        nome,
        categoria_id,
        tipo_documento_id,
        numero_documento,
        orgao_emissor,
        data_emissao,
        data_vencimento,
        periodicidade_meses,
        exige_anexo,
        setor_unidade,
        observacoes
      )
      select
        v_empresa.id,
        v_doc.nome,
        v_doc.categoria_id,
        v_doc.tipo_documento_id,
        v_doc.numero_documento,
        v_doc.orgao_emissor,
        v_doc.data_emissao,
        v_doc.data_vencimento,
        v_doc.periodicidade_meses,
        true,
        v_doc.setor_unidade,
        'Carga ficticia Conform Flow: documento completo com anexo simulado.'
      where not exists (
        select 1
        from public.documentos d
        where d.empresa_id = v_empresa.id
          and d.numero_documento = v_doc.numero_documento
          and d.deleted_at is null
      )
      returning id into v_doc_id;

      if v_doc_id is null then
        select d.id into v_doc_id
        from public.documentos d
        where d.empresa_id = v_empresa.id
          and d.numero_documento = v_doc.numero_documento
          and d.deleted_at is null
        limit 1;
      end if;

      insert into public.anexos (
        empresa_id,
        modulo,
        registro_id,
        finalidade,
        storage_path,
        nome_original,
        mime_type,
        tamanho_bytes,
        versao,
        status
      )
      values (
        v_empresa.id,
        'documentos',
        v_doc_id,
        'principal',
        v_empresa.id::text || '/documentos/' || v_doc_id::text || '/' || v_doc.arquivo,
        v_doc.arquivo,
        'application/pdf',
        v_doc.tamanho_bytes,
        1,
        'ativo'
      )
      on conflict (storage_path) do update set
        nome_original = excluded.nome_original,
        mime_type = excluded.mime_type,
        tamanho_bytes = excluded.tamanho_bytes,
        status = 'ativo',
        deleted_at = null,
        updated_at = now();

      v_doc_id := null;
    end loop;

    -- Equipamentos com historico operacional.
    for v_eq in
      select *
      from (
        values
          (
            'Geladeira de Vacinas 01',
            'EQ-' || v_slug || '-GEL-01',
            v_tipo_geladeira,
            'ColdTech',
            'CT-280',
            'Farmacia',
            'Sala de vacinas',
            'critica',
            'ativo'
          ),
          (
            'Freezer de Amostras 01',
            'EQ-' || v_slug || '-FRZ-01',
            v_tipo_freezer,
            'BioFreeze',
            'BF-500',
            'Laboratorio',
            'Sala fria',
            'alta',
            'ativo'
          ),
          (
            'Autoclave Central 01',
            'EQ-' || v_slug || '-AUT-01',
            v_tipo_autoclave,
            'SterilMax',
            'SM-75',
            'Esterilizacao',
            'CME',
            'critica',
            'ativo'
          ),
          (
            'Termohigrometro Farmacia 01',
            'EQ-' || v_slug || '-THG-01',
            v_tipo_termometro,
            'MediSense',
            'TH-20',
            'Farmacia',
            'Armario controlado',
            'alta',
            'ativo'
          ),
          (
            'Camara Fria Medicamentos 01',
            'EQ-' || v_slug || '-CAM-01',
            coalesce(v_tipo_camara_fria, v_tipo_geladeira),
            'ThermoSafe',
            'TS-1200',
            'Almoxarifado',
            'Camara fria',
            'critica',
            'ativo'
          )
      ) as eqs(
        nome,
        codigo_interno,
        tipo_equipamento_id,
        fabricante,
        modelo,
        setor,
        localizacao,
        criticidade,
        status
      )
    loop
      insert into public.equipamentos (
        empresa_id,
        nome,
        tipo_equipamento_id,
        codigo_interno,
        numero_serie,
        fabricante,
        modelo,
        setor,
        localizacao,
        criticidade,
        status,
        observacoes
      )
      values (
        v_empresa.id,
        v_eq.nome,
        v_eq.tipo_equipamento_id,
        v_eq.codigo_interno,
        'SN-' || right(v_slug, 6) || '-' || right(v_eq.codigo_interno, 6),
        v_eq.fabricante,
        v_eq.modelo,
        v_eq.setor,
        v_eq.localizacao,
        v_eq.criticidade,
        v_eq.status,
        'Carga ficticia Conform Flow: equipamento com calibracao, qualificacao, manutencao e anexos simulados.'
      )
      on conflict (empresa_id, codigo_interno) do update set
        nome = excluded.nome,
        tipo_equipamento_id = excluded.tipo_equipamento_id,
        numero_serie = excluded.numero_serie,
        fabricante = excluded.fabricante,
        modelo = excluded.modelo,
        setor = excluded.setor,
        localizacao = excluded.localizacao,
        criticidade = excluded.criticidade,
        status = excluded.status,
        observacoes = excluded.observacoes,
        deleted_at = null,
        updated_at = now()
      returning id into v_equip_id;

      insert into public.anexos (
        empresa_id,
        modulo,
        registro_id,
        finalidade,
        storage_path,
        nome_original,
        mime_type,
        tamanho_bytes,
        versao,
        status
      )
      values (
        v_empresa.id,
        'equipamentos',
        v_equip_id,
        'ficha_tecnica',
        v_empresa.id::text || '/equipamentos/' || v_equip_id::text || '/ficha-tecnica-' || lower(right(v_eq.codigo_interno, 6)) || '.pdf',
        'ficha-tecnica-' || lower(right(v_eq.codigo_interno, 6)) || '.pdf',
        'application/pdf',
        280000,
        1,
        'ativo'
      )
      on conflict (storage_path) do update set
        nome_original = excluded.nome_original,
        mime_type = excluded.mime_type,
        tamanho_bytes = excluded.tamanho_bytes,
        status = 'ativo',
        deleted_at = null,
        updated_at = now();

      insert into public.calibracoes (
        empresa_id,
        equipamento_id,
        data_calibracao,
        data_vencimento,
        numero_certificado,
        laboratorio_responsavel,
        resultado,
        observacoes
      )
      select
        v_empresa.id,
        v_equip_id,
        current_date - (55 + (v_offset % 20)),
        current_date + (25 + (v_offset % 70)),
        'CAL-' || v_slug || '-' || right(v_eq.codigo_interno, 6) || '-2026',
        'LabCal Metrologia Acreditada',
        'aprovado',
        'Carga ficticia Conform Flow: certificado de calibracao simulado.'
      where not exists (
        select 1
        from public.calibracoes c
        where c.empresa_id = v_empresa.id
          and c.numero_certificado = 'CAL-' || v_slug || '-' || right(v_eq.codigo_interno, 6) || '-2026'
          and c.deleted_at is null
      )
      returning id into v_cal_id;

      if v_cal_id is null then
        select c.id into v_cal_id
        from public.calibracoes c
        where c.empresa_id = v_empresa.id
          and c.numero_certificado = 'CAL-' || v_slug || '-' || right(v_eq.codigo_interno, 6) || '-2026'
          and c.deleted_at is null
        limit 1;
      end if;

      insert into public.anexos (
        empresa_id,
        modulo,
        registro_id,
        finalidade,
        storage_path,
        nome_original,
        mime_type,
        tamanho_bytes,
        versao,
        status
      )
      values (
        v_empresa.id,
        'calibracoes',
        v_cal_id,
        'certificado',
        v_empresa.id::text || '/calibracoes/' || v_cal_id::text || '/certificado-calibracao.pdf',
        'certificado-calibracao-' || lower(right(v_eq.codigo_interno, 6)) || '.pdf',
        'application/pdf',
        610000,
        1,
        'ativo'
      )
      on conflict (storage_path) do update set
        nome_original = excluded.nome_original,
        mime_type = excluded.mime_type,
        tamanho_bytes = excluded.tamanho_bytes,
        status = 'ativo',
        deleted_at = null,
        updated_at = now();

      insert into public.qualificacoes (
        empresa_id,
        equipamento_id,
        tipo,
        data_qualificacao,
        data_vencimento,
        resultado,
        empresa_executora,
        observacoes
      )
      select
        v_empresa.id,
        v_equip_id,
        case
          when lower(v_eq.nome) like '%autoclave%' then 'operacao'
          when lower(v_eq.nome) like '%camara%' or lower(v_eq.nome) like '%geladeira%' or lower(v_eq.nome) like '%freezer%' then 'mapeamento_termico'
          else 'requalificacao_periodica'
        end,
        current_date - (70 + (v_offset % 25)),
        current_date + (55 + (v_offset % 90)),
        'aprovado',
        'QualiTech Validacoes',
        'Carga ficticia Conform Flow: relatorio de qualificacao simulado.'
      where not exists (
        select 1
        from public.qualificacoes q
        where q.empresa_id = v_empresa.id
          and q.equipamento_id = v_equip_id
          and q.data_qualificacao = current_date - (70 + (v_offset % 25))
          and q.deleted_at is null
      )
      returning id into v_qual_id;

      if v_qual_id is null then
        select q.id into v_qual_id
        from public.qualificacoes q
        where q.empresa_id = v_empresa.id
          and q.equipamento_id = v_equip_id
          and q.data_qualificacao = current_date - (70 + (v_offset % 25))
          and q.deleted_at is null
        order by q.created_at desc
        limit 1;
      end if;

      insert into public.anexos (
        empresa_id,
        modulo,
        registro_id,
        finalidade,
        storage_path,
        nome_original,
        mime_type,
        tamanho_bytes,
        versao,
        status
      )
      values (
        v_empresa.id,
        'qualificacoes',
        v_qual_id,
        'relatorio',
        v_empresa.id::text || '/qualificacoes/' || v_qual_id::text || '/relatorio-qualificacao.pdf',
        'relatorio-qualificacao-' || lower(right(v_eq.codigo_interno, 6)) || '.pdf',
        'application/pdf',
        730000,
        1,
        'ativo'
      )
      on conflict (storage_path) do update set
        nome_original = excluded.nome_original,
        mime_type = excluded.mime_type,
        tamanho_bytes = excluded.tamanho_bytes,
        status = 'ativo',
        deleted_at = null,
        updated_at = now();

      insert into public.manutencoes (
        empresa_id,
        equipamento_id,
        nome_servico,
        natureza,
        tipo_servico,
        status_execucao,
        data_manutencao,
        proxima_manutencao,
        periodicidade_meses,
        empresa_responsavel,
        tecnico_responsavel,
        numero_ordem_servico,
        exige_evidencia,
        prioridade,
        acao_realizada,
        observacoes
      )
      select
        v_empresa.id,
        v_equip_id,
        'Manutencao preventiva programada - ' || v_eq.nome,
        'preventiva',
        'inspecao',
        'concluida',
        current_date - (35 + (v_offset % 25)),
        current_date + (40 + (v_offset % 75)),
        6,
        'TecService Engenharia Clinica',
        'Tecnico Paulo Nunes',
        'OS-PREV-' || v_slug || '-' || right(v_eq.codigo_interno, 6) || '-2026',
        true,
        'media',
        'Inspecao geral, limpeza tecnica, testes operacionais e liberacao do equipamento.',
        'Carga ficticia Conform Flow: manutencao preventiva com evidencia simulada.'
      where not exists (
        select 1
        from public.manutencoes m
        where m.empresa_id = v_empresa.id
          and m.numero_ordem_servico = 'OS-PREV-' || v_slug || '-' || right(v_eq.codigo_interno, 6) || '-2026'
          and m.deleted_at is null
      )
      returning id into v_manut_id;

      if v_manut_id is null then
        select m.id into v_manut_id
        from public.manutencoes m
        where m.empresa_id = v_empresa.id
          and m.numero_ordem_servico = 'OS-PREV-' || v_slug || '-' || right(v_eq.codigo_interno, 6) || '-2026'
          and m.deleted_at is null
        limit 1;
      end if;

      insert into public.anexos (
        empresa_id,
        modulo,
        registro_id,
        finalidade,
        storage_path,
        nome_original,
        mime_type,
        tamanho_bytes,
        versao,
        status
      )
      values (
        v_empresa.id,
        'manutencoes',
        v_manut_id,
        'evidencia',
        v_empresa.id::text || '/manutencoes/' || v_manut_id::text || '/ordem-servico-preventiva.pdf',
        'ordem-servico-preventiva-' || lower(right(v_eq.codigo_interno, 6)) || '.pdf',
        'application/pdf',
        460000,
        1,
        'ativo'
      )
      on conflict (storage_path) do update set
        nome_original = excluded.nome_original,
        mime_type = excluded.mime_type,
        tamanho_bytes = excluded.tamanho_bytes,
        status = 'ativo',
        deleted_at = null,
        updated_at = now();

      -- Uma corretiva por empresa em equipamento diferente para enriquecer o historico.
      if right(v_eq.codigo_interno, 6) = 'GEL-01' then
        insert into public.manutencoes (
          empresa_id,
          equipamento_id,
          nome_servico,
          natureza,
          tipo_servico,
          status_execucao,
          data_manutencao,
          proxima_manutencao,
          empresa_responsavel,
          tecnico_responsavel,
          numero_ordem_servico,
          exige_evidencia,
          falha_apresentada,
          prioridade,
          diagnostico,
          causa_raiz,
          acao_realizada,
          equipamento_parado_desde,
          retorno_operacao_at,
          observacoes
        )
        select
          v_empresa.id,
          v_equip_id,
          'Manutencao corretiva - ajuste de temperatura',
          'corretiva',
          'ajuste',
          'concluida',
          current_date - (12 + (v_offset % 10)),
          null::date,
          'TecService Engenharia Clinica',
          'Tecnica Ana Ribeiro',
          'OS-CORR-' || v_slug || '-GEL-01-2026',
          true,
          'Oscilacao de temperatura acima do limite configurado.',
          'alta',
          'Sensor com leitura instavel e borracha de vedacao desgastada.',
          'Desgaste natural por uso continuo.',
          'Sensor recalibrado, borracha substituida e teste de estabilidade realizado.',
          now() - interval '18 days',
          now() - interval '17 days 4 hours',
          'Carga ficticia Conform Flow: manutencao corretiva para simular quebra do equipamento.'
        where not exists (
          select 1
          from public.manutencoes m
          where m.empresa_id = v_empresa.id
            and m.numero_ordem_servico = 'OS-CORR-' || v_slug || '-GEL-01-2026'
            and m.deleted_at is null
        )
        returning id into v_manut_id;

        if v_manut_id is null then
          select m.id into v_manut_id
          from public.manutencoes m
          where m.empresa_id = v_empresa.id
            and m.numero_ordem_servico = 'OS-CORR-' || v_slug || '-GEL-01-2026'
            and m.deleted_at is null
          limit 1;
        end if;

        insert into public.anexos (
          empresa_id,
          modulo,
          registro_id,
          finalidade,
          storage_path,
          nome_original,
          mime_type,
          tamanho_bytes,
          versao,
          status
        )
        values (
          v_empresa.id,
          'manutencoes',
          v_manut_id,
          'evidencia',
          v_empresa.id::text || '/manutencoes/' || v_manut_id::text || '/ordem-servico-corretiva.pdf',
          'ordem-servico-corretiva-geladeira.pdf',
          'application/pdf',
          515000,
          1,
          'ativo'
        )
        on conflict (storage_path) do update set
          nome_original = excluded.nome_original,
          mime_type = excluded.mime_type,
          tamanho_bytes = excluded.tamanho_bytes,
          status = 'ativo',
          deleted_at = null,
          updated_at = now();
      end if;

      v_cal_id := null;
      v_qual_id := null;
      v_manut_id := null;
    end loop;
  end loop;
end $$;
