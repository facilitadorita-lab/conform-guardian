-- Conform Flow — catálogos iniciais idempotentes
insert into public.planos(nome, limite_usuarios, limite_documentos, limite_equipamentos, limite_storage_mb)
values
  ('Essencial',3,200,30,1024),
  ('Profissional',10,1000,150,5120),
  ('Enterprise',50,null,null,20480)
on conflict (nome) do nothing;

insert into public.categorias_documentos(nome,padrao_plataforma,ativo)
select x.nome,true,true from (values
  ('Alvará sanitário'),('Licença de funcionamento'),('AVCB'),('Contrato de resíduos'),
  ('Contrato de dedetização'),('Limpeza de caixa d''água'),('POP'),('Manual de boas práticas'),
  ('Certificado de treinamento'),('Responsabilidade técnica'),('Certificado'),('Documento interno'),('Outro')
) x(nome)
where not exists (select 1 from public.categorias_documentos c where c.empresa_id is null and lower(c.nome)=lower(x.nome));

insert into public.tipos_documentos(nome,exige_anexo,padrao_plataforma,ativo)
select x.nome,x.exige,true,true from (values
  ('Licença',true),('Contrato',true),('Procedimento',true),('Certificado',true),
  ('Manual',true),('Registro interno',false),('Outro',true)
) x(nome,exige)
where not exists (select 1 from public.tipos_documentos t where t.empresa_id is null and lower(t.nome)=lower(x.nome));

insert into public.tipos_equipamentos(nome,padrao_plataforma,ativo)
select x.nome,true,true from (values
  ('Geladeira'),('Freezer'),('Câmara fria'),('Termômetro'),('Termohigrômetro'),
  ('Balança'),('Autoclave'),('Data logger'),('Oxímetro'),('Aparelho de pressão'),
  ('Ar-condicionado'),('Equipamento assistencial'),('Outro')
) x(nome)
where not exists (select 1 from public.tipos_equipamentos t where t.empresa_id is null and lower(t.nome)=lower(x.nome));

