import { createClient } from "npm:@supabase/supabase-js@^2";

const origin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const cors = {
  "access-control-allow-origin": origin,
  "access-control-allow-headers":
    "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")
    return respond({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authorization = req.headers.get("authorization") ?? "";
  if (!url || !anonKey || !authorization)
    return respond({ error: "unauthorized" }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user)
    return respond({ error: "unauthorized" }, 401);

  const input = await req.json().catch(() => ({}));
  let empresaId = String(input.empresa_id ?? "").trim();
  const pergunta = String(
    input.pergunta ?? input.question ?? input.message ?? "",
  ).trim();
  const escopo = String(input.escopo ?? "geral");
  const equipamentoId = input.equipamento_id
    ? String(input.equipamento_id)
    : null;
  const setor = input.setor ? String(input.setor) : null;

  if (pergunta.length < 3) {
    return respond(
      { error: "invalid_payload", message: "Informe uma pergunta válida." },
      400,
    );
  }

  if (!empresaId) {
    const { data: vinculos, error: vinculosError } = await userClient
      .from("usuarios_empresas")
      .select("empresa_id, empresas!inner(status)")
      .eq("usuario_id", authData.user.id)
      .eq("ativo", true)
      .is("deleted_at", null)
      .eq("empresas.status", "ativa")
      .limit(1);

    if (vinculosError) return respond({ error: vinculosError.message }, 403);
    empresaId = String(vinculos?.[0]?.empresa_id ?? "");
  }

  if (!empresaId) {
    return respond(
      {
        error: "empresa_not_found",
        message: "Não encontrei uma empresa ativa vinculada ao usuário logado.",
      },
      403,
    );
  }

  const { data: contexto, error: contextoError } = await userClient.rpc(
    "api_assistente_contexto",
    {
      p_empresa_id: empresaId,
      p_escopo: escopo,
      p_equipamento_id: equipamentoId,
      p_setor: setor,
    },
  );
  if (contextoError) return respond({ error: contextoError.message }, 403);

  const resposta = buildStructuredAnswer(pergunta, contexto);
  const fontes = buildSources(contexto);

  await userClient.from("interacoes_assistente").insert({
    empresa_id: empresaId,
    usuario_id: authData.user.id,
    pergunta,
    escopo,
    equipamento_id: equipamentoId,
    setor,
    resposta,
    fontes,
    modelo: "structured-safe-assistant-humanized",
    leu_anexos: false,
  });

  return respond({
    resposta,
    answer: resposta,
    fontes,
    sources: fontes,
    leu_anexos: false,
    politica_privacidade: contexto?.politica_privacidade ?? {
      le_anexos: false,
      usa_storage_path: false,
      fontes: "somente metadados estruturados do banco",
    },
  });
});

function buildStructuredAnswer(pergunta: string, contexto: any) {
  const perguntaNormalizada = normalize(pergunta);
  const equipamentos = Array.isArray(contexto?.equipamentos)
    ? contexto.equipamentos
    : [];
  const manutencoes = Array.isArray(contexto?.manutencoes)
    ? contexto.manutencoes
    : [];
  const vencimentos = Array.isArray(contexto?.vencimentos)
    ? contexto.vencimentos
    : [];
  const documentos = Array.isArray(contexto?.documentos)
    ? contexto.documentos
    : [];
  const pendencias = Array.isArray(contexto?.pendencias)
    ? contexto.pendencias
    : [];
  const documentosMencionados = filterDocumentsByQuestion(
    perguntaNormalizada,
    documentos,
  );

  const linhas: string[] = [];

  if (perguntaNormalizada.includes("manut")) {
    const vencidas = manutencoes.filter(
      (item: any) => item.status_calculado === "vencido",
    );
    const proximas = manutencoes.filter((item: any) =>
      ["vence_hoje", "critico", "a_vencer", "atencao"].includes(
        String(item.status_calculado),
      ),
    );

    linhas.push(
      humanizeCountSummary({
        noun: "manutenção",
        plural: "manutenções",
        vencidas: vencidas.length,
        proximas: proximas.length,
      }),
    );
    linhas.push(
      "Para manutenção, eu separaria preventiva de corretiva: preventiva entra no planejamento; corretiva indica falha/quebra e merece olhar mais rápido.",
    );
    appendHumanItems(
      linhas,
      [...vencidas, ...proximas],
      (item) =>
        `${item.equipamento ?? item.nome_servico ?? "Registro"} — ${formatNatureza(
          item.natureza,
        )} — próxima data: ${formatDate(
          item.proxima_manutencao ?? item.data_manutencao,
        )} — ${statusLabel(item.status_calculado)}`,
    );
  } else if (perguntaNormalizada.includes("calibr")) {
    const calibracoes = vencimentos.filter(
      (item: any) => item.modulo === "calibracoes",
    );
    const vencidas = calibracoes.filter(
      (item: any) => item.status === "vencido",
    );
    const proximas = calibracoes.filter((item: any) =>
      ["vence_hoje", "critico", "a_vencer", "atencao"].includes(
        String(item.status),
      ),
    );

    linhas.push(
      humanizeCountSummary({
        noun: "calibração",
        plural: "calibrações",
        vencidas: vencidas.length,
        proximas: proximas.length,
      }),
    );
    linhas.push(
      humanizeOperationalHint([...vencidas, ...proximas], "calibracao"),
    );
    appendHumanItems(
      linhas,
      [...vencidas, ...proximas],
      (item) =>
        `${cleanTitle(item.titulo ?? "Calibração")} — vence em ${formatDate(
          item.data_vencimento,
        )} — ${statusLabel(item.status)}`,
    );
  } else if (perguntaNormalizada.includes("qualific")) {
    const qualificacoes = vencimentos.filter(
      (item: any) => item.modulo === "qualificacoes",
    );
    const vencidas = qualificacoes.filter(
      (item: any) => item.status === "vencido",
    );
    const proximas = qualificacoes.filter((item: any) =>
      ["vence_hoje", "critico", "a_vencer", "atencao"].includes(
        String(item.status),
      ),
    );

    linhas.push(
      humanizeCountSummary({
        noun: "qualificação",
        plural: "qualificações",
        vencidas: vencidas.length,
        proximas: proximas.length,
      }),
    );
    linhas.push(
      "Para qualificação, eu olharia primeiro os equipamentos críticos e os que impactam temperatura, esterilização ou operação assistencial.",
    );
    appendHumanItems(
      linhas,
      [...vencidas, ...proximas],
      (item) =>
        `${cleanTitle(item.titulo ?? "Qualificação")} — vence em ${formatDate(
          item.data_vencimento,
        )} — ${statusLabel(item.status)}`,
    );
  } else if (
    hasDocumentIntent(perguntaNormalizada) ||
    documentosMencionados.length > 0
  ) {
    const documentosFiltrados =
      documentosMencionados.length > 0
        ? documentosMencionados
        : filterDocumentsByDocumentIntent(perguntaNormalizada, documentos);
    const vencimentosFiltrados = filterVencimentosByDocumentIntent(
      perguntaNormalizada,
      vencimentos,
    );
    const itens =
      documentosFiltrados.length > 0
        ? documentosFiltrados
        : vencimentosFiltrados;

    if (itens.length === 0) {
      linhas.push(
        "Não encontrei um documento correspondente a essa pergunta nos dados cadastrados desta empresa.",
      );
      linhas.push(
        "Se você acabou de cadastrar, confira se ele aparece na tela de Documentos e se foi salvo no ambiente da empresa correta.",
      );
    } else {
      linhas.push(
        `Encontrei ${itens.length} documento${itens.length === 1 ? "" : "s"} relacionado${
          itens.length === 1 ? "" : "s"
        } com a sua pergunta.`,
      );
      linhas.push(humanizeDocumentHint(itens));
    }

    appendHumanItems(linhas, itens, (item) => formatDocumentItem(item));
  } else if (perguntaNormalizada.includes("venc")) {
    if (vencimentos.length === 0) {
      linhas.push(
        "No momento, não encontrei vencimentos exigindo atenção nos dados desta empresa.",
      );
    } else {
      linhas.push(
        `Encontrei ${vencimentos.length} vencimento${vencimentos.length === 1 ? "" : "s"} que merecem acompanhamento.`,
      );
      linhas.push(
        "Eu organizaria a rotina começando pelo que vence primeiro e pelo que tiver maior impacto regulatório.",
      );
    }

    appendHumanItems(
      linhas,
      vencimentos,
      (item) =>
        `${cleanTitle(item.titulo ?? item.modulo)} — ${moduleLabel(item.modulo)} — vence em ${formatDate(
          item.data_vencimento,
        )} — ${statusLabel(item.status)}`,
    );
  } else if (perguntaNormalizada.includes("pendenc")) {
    if (pendencias.length === 0) {
      linhas.push("Não encontrei pendências abertas para esta empresa agora.");
    } else {
      linhas.push(
        `Encontrei ${pendencias.length} pendência${pendencias.length === 1 ? "" : "s"} aberta${
          pendencias.length === 1 ? "" : "s"
        }.`,
      );
      linhas.push(
        "Eu trataria primeiro as pendências com prazo mais curto e as que bloqueiam evidência, responsável ou conformidade.",
      );
    }

    appendHumanItems(
      linhas,
      pendencias,
      (item) =>
        `${cleanTitle(item.titulo ?? "Pendência")} — prazo: ${formatDate(item.prazo)} — ${statusLabel(item.status)}`,
    );
  } else if (perguntaNormalizada.includes("equip")) {
    const atencao = equipamentos.filter(
      (item: any) =>
        !["em_dia", "ok", null, undefined].includes(item.status_consolidado),
    );

    if (atencao.length === 0) {
      linhas.push(
        `Avaliei ${equipamentos.length} equipamento${equipamentos.length === 1 ? "" : "s"} e não vi nenhum em atenção agora.`,
      );
    } else {
      linhas.push(
        `Avaliei ${equipamentos.length} equipamento${equipamentos.length === 1 ? "" : "s"} e ${
          atencao.length
        } precisam de acompanhamento.`,
      );
      linhas.push(
        "Eu começaria pelos equipamentos críticos ou ligados à cadeia fria, esterilização e áreas de maior risco.",
      );
    }

    appendHumanItems(
      linhas,
      atencao,
      (item) =>
        `${item.nome ?? "Equipamento"} — setor ${item.setor ?? "não informado"} — ${statusLabel(item.status_consolidado)}`,
    );
  } else {
    linhas.push(
      `Olhei o panorama geral desta empresa: ${equipamentos.length} equipamento${equipamentos.length === 1 ? "" : "s"}, ${
        manutencoes.length
      } manutenção${manutencoes.length === 1 ? "" : "ões"}, ${vencimentos.length} vencimento${
        vencimentos.length === 1 ? "" : "s"
      } em atenção e ${pendencias.length} pendência${pendencias.length === 1 ? "" : "s"} aberta${
        pendencias.length === 1 ? "" : "s"
      }.`,
    );
    linhas.push(
      "Se quiser, eu consigo detalhar por documento, equipamento, manutenção, calibração, qualificação, pendência ou vencimento próximo.",
    );
    appendHumanItems(
      linhas,
      vencimentos,
      (item) =>
        `${cleanTitle(item.titulo ?? item.modulo)} — vence em ${formatDate(item.data_vencimento)} — ${statusLabel(item.status)}`,
    );
  }

  if (pendencias.length > 0 && !perguntaNormalizada.includes("pendenc")) {
    linhas.push(
      `Também existem ${pendencias.length} pendência${pendencias.length === 1 ? "" : "s"} aberta${
        pendencias.length === 1 ? "" : "s"
      } que podem impactar a conformidade.`,
    );
  }

  linhas.push(
    "Minha sugestão: resolva primeiro o que estiver vencido ou crítico; depois acompanhe os itens em atenção antes que virem atraso.",
  );
  linhas.push(
    "Obs.: considerei apenas os dados cadastrados no sistema, sem ler anexos ou PDFs.",
  );

  return linhas.join("\n");
}

function appendHumanItems(
  linhas: string[],
  items: any[],
  formatter: (item: any) => string,
) {
  const limited = items.slice(0, 5);
  if (limited.length === 0) {
    linhas.push("Não encontrei nenhum item crítico para esse filtro.");
    return;
  }

  linhas.push(
    limited.length === 1
      ? "O item que eu acompanharia é:"
      : "Eu acompanharia estes itens primeiro:",
  );
  for (const item of limited) linhas.push(`• ${formatter(item)}`);
}

function filterDocumentsByDocumentIntent(
  perguntaNormalizada: string,
  documentos: any[],
) {
  const tokens = getQuestionTokens(perguntaNormalizada);
  const specificTokens = tokens.filter(
    (token) => !DOCUMENT_GENERIC_TOKENS.has(token),
  );
  const statusFilter = getStatusFilter(perguntaNormalizada);

  let filtered = documentos;
  if (specificTokens.length > 0) {
    filtered = filterDocumentsByQuestion(perguntaNormalizada, documentos);
  }

  if (statusFilter) {
    filtered = filtered.filter((item: any) =>
      statusFilter.includes(
        normalize(String(item.status ?? item.status_calculado ?? "")),
      ),
    );
  }

  return filtered.slice(0, 10);
}

function filterDocumentsByQuestion(
  perguntaNormalizada: string,
  documentos: any[],
) {
  const tokens = getQuestionTokens(perguntaNormalizada).filter(
    (token) => !DOCUMENT_GENERIC_TOKENS.has(token),
  );
  if (tokens.length === 0) return [];

  return documentos
    .map((item: any) => ({
      item,
      score: scoreRecordMatch(tokens, [
        item.nome,
        item.titulo,
        item.numero_documento,
        item.orgao_emissor,
        item.categoria,
        item.tipo,
        item.setor,
      ]),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, 10);
}

function filterVencimentosByDocumentIntent(
  perguntaNormalizada: string,
  vencimentos: any[],
) {
  const documentos = vencimentos.filter(
    (item: any) => item.modulo === "documentos",
  );
  const tokens = getQuestionTokens(perguntaNormalizada).filter(
    (token) => !DOCUMENT_GENERIC_TOKENS.has(token),
  );
  const statusFilter = getStatusFilter(perguntaNormalizada);

  let filtered = documentos;
  if (tokens.length > 0) {
    filtered = documentos
      .map((item: any) => ({
        item,
        score: scoreRecordMatch(tokens, [item.titulo, item.nome]),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  }

  if (statusFilter) {
    filtered = filtered.filter((item: any) =>
      statusFilter.includes(normalize(String(item.status ?? ""))),
    );
  }

  return filtered.slice(0, 10);
}

function formatDocumentItem(item: any) {
  const titulo = cleanTitle(item.titulo ?? item.nome ?? "Documento");
  const status = statusLabel(item.status ?? item.status_calculado);
  const vencimento = formatDate(item.data_vencimento);
  const emissao = formatDate(item.data_emissao);
  const anexo =
    typeof item.tem_anexo === "boolean"
      ? item.tem_anexo
        ? "com anexo cadastrado"
        : "sem anexo cadastrado"
      : null;

  const detalhes = [
    `situação: ${status}`,
    `vencimento: ${vencimento}`,
    emissao !== "sem data" ? `emissão: ${emissao}` : null,
    item.orgao_emissor ? `órgão: ${item.orgao_emissor}` : null,
    item.setor ? `setor: ${item.setor}` : null,
    anexo,
  ].filter(Boolean);

  return `${titulo} — ${detalhes.join(" — ")}`;
}

function humanizeCountSummary({
  noun,
  plural,
  vencidas,
  proximas,
}: {
  noun: string;
  plural: string;
  vencidas: number;
  proximas: number;
}) {
  if (vencidas === 0 && proximas === 0)
    return `Por enquanto, não encontrei ${plural} vencidas nem próximas de atenção.`;

  const total = vencidas + proximas;
  const subject = total === 1 ? noun : plural;

  if (vencidas > 0 && proximas > 0) {
    return `Sim — encontrei ${total} ${subject} para cuidar: ${vencidas} já vencida${
      vencidas === 1 ? "" : "s"
    } e ${proximas} em atenção.`;
  }

  if (vencidas > 0) {
    return `Sim — encontrei ${vencidas} ${vencidas === 1 ? noun : plural} vencida${
      vencidas === 1 ? "" : "s"
    }. Eu trataria isso como prioridade.`;
  }

  return `Sim — encontrei ${proximas} ${proximas === 1 ? noun : plural} em atenção. Nenhuma está vencida, mas vale programar antes de virar atraso.`;
}

function humanizeOperationalHint(items: any[], intent: "calibracao") {
  if (intent === "calibracao") {
    const titles = items.map((item: any) =>
      normalize(String(item.titulo ?? "")),
    );
    const hasColdChain = titles.some((title) =>
      [
        "geladeira",
        "freezer",
        "camara fria",
        "camera fria",
        "câmara fria",
      ].some((term) => title.includes(term)),
    );

    if (hasColdChain) {
      return "Como há itens de cadeia fria na lista, eu priorizaria geladeira, freezer e câmara fria primeiro.";
    }
  }

  return "Eu organizaria esses itens por data de vencimento e criticidade operacional.";
}

function humanizeDocumentHint(items: any[]) {
  const statuses = items.map((item: any) =>
    normalize(String(item.status ?? "")),
  );
  if (statuses.includes("vencido"))
    return "Tem documento vencido nessa lista, então eu trataria como prioridade regulatória.";
  if (statuses.some((status) => ["critico", "vence_hoje"].includes(status))) {
    return "Tem item crítico ou vencendo hoje; eu não deixaria para depois.";
  }
  if (statuses.some((status) => ["a_vencer", "atencao"].includes(status))) {
    return "Nada indica emergência imediata, mas há documento entrando em atenção; vale deixar a renovação encaminhada.";
  }
  return "Pelo status atual, não parece haver urgência, mas é bom manter a evidência e o responsável atualizados.";
}

const DOCUMENT_GENERIC_TOKENS = new Set([
  "documento",
  "documentos",
  "doc",
  "docs",
  "licenca",
  "licencas",
  "alvara",
  "alvaras",
  "certificado",
  "certificados",
  "situacao",
  "status",
  "vencimento",
  "vencimentos",
  "vencer",
  "vence",
  "vencido",
  "vencidos",
]);

const QUESTION_STOPWORDS = new Set([
  "a",
  "o",
  "os",
  "as",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "um",
  "uma",
  "uns",
  "umas",
  "me",
  "meu",
  "minha",
  "meus",
  "minhas",
  "tem",
  "tenho",
  "qual",
  "quais",
  "quando",
  "como",
  "esta",
  "estao",
  "estou",
  "sobre",
  "para",
  "por",
  "que",
  "pra",
]);

function hasDocumentIntent(perguntaNormalizada: string) {
  return [
    "document",
    "licenca",
    "alvara",
    "avcb",
    "anvisa",
    "anvi",
    "certificado",
    "vigilancia",
    "sanitaria",
  ].some((term) => perguntaNormalizada.includes(term));
}

function getQuestionTokens(perguntaNormalizada: string) {
  return perguntaNormalizada
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !QUESTION_STOPWORDS.has(token));
}

function scoreRecordMatch(tokens: string[], values: unknown[]) {
  const haystack = normalize(values.filter(Boolean).join(" "));
  let score = 0;

  for (const token of tokens) {
    if (haystack === token) score += 5;
    else if (haystack.split(/\s+/).includes(token)) score += 3;
    else if (haystack.includes(token)) score += 1;
  }

  return score;
}

function getStatusFilter(perguntaNormalizada: string) {
  if (perguntaNormalizada.includes("vencid")) return ["vencido"];
  if (perguntaNormalizada.includes("vence hoje")) return ["vence_hoje"];
  if (perguntaNormalizada.includes("critic")) return ["critico", "vence_hoje"];
  if (
    perguntaNormalizada.includes("a vencer") ||
    perguntaNormalizada.includes("proximo") ||
    perguntaNormalizada.includes("proxima") ||
    perguntaNormalizada.includes("vencer")
  ) {
    return ["vence_hoje", "critico", "a_vencer", "atencao"];
  }
  return null;
}

function cleanTitle(value: string) {
  return String(value).replace(/\s+/g, " ").trim();
}

function statusLabel(value: unknown) {
  const status = normalize(String(value ?? ""));
  const labels: Record<string, string> = {
    vencido: "vencido",
    vence_hoje: "vence hoje",
    critico: "crítico",
    a_vencer: "a vencer",
    atencao: "em atenção",
    pendente_anexo: "pendente de anexo",
    em_dia: "em dia",
    ok: "em dia",
    sem_validade: "sem validade informada",
    sem_certificado: "sem certificado",
    pendente_relatorio: "com relatório pendente",
    pendente_evidencia: "com evidência pendente",
    reprovado: "reprovado",
    reprovada: "reprovada",
    pendente: "pendente",
    em_andamento: "em andamento",
    concluida: "concluída",
    cancelada: "cancelada",
  };

  return labels[status] ?? `status: ${String(value ?? "não informado")}`;
}

function moduleLabel(value: unknown) {
  const modulo = String(value ?? "");
  const labels: Record<string, string> = {
    documentos: "documento",
    equipamentos: "equipamento",
    calibracoes: "calibração",
    qualificacoes: "qualificação",
    manutencoes: "manutenção",
    pendencias: "pendência",
  };

  return labels[modulo] ?? modulo;
}

function formatNatureza(value: unknown) {
  const natureza = normalize(String(value ?? ""));
  if (natureza === "preventiva") return "preventiva";
  if (natureza === "corretiva") return "corretiva";
  return String(value ?? "manutenção");
}

function formatDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "sem data";

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function buildSources(contexto: any) {
  const fontes: string[] = [];
  if (Array.isArray(contexto?.documentos)) fontes.push("documentos");
  if (Array.isArray(contexto?.equipamentos)) fontes.push("equipamentos");
  if (Array.isArray(contexto?.manutencoes)) fontes.push("manutenções");
  if (Array.isArray(contexto?.vencimentos)) fontes.push("vencimentos");
  if (Array.isArray(contexto?.pendencias)) fontes.push("pendências");
  return fontes;
}

function normalize(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
