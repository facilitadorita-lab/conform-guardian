update public.planos
set
  descricao = 'Tudo do Profissional, com até 3 unidades, visão multiunidade, relatórios por unidade e visão consolidada.',
  updated_at = now()
where codigo = 'rede'
  and descricao is distinct from 'Tudo do Profissional, com até 3 unidades, visão multiunidade, relatórios por unidade e visão consolidada.';
