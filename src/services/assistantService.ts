import { getSupabaseClient } from "@/lib/supabaseClient";
import type { UUID } from "@/types";
import { formatDateBR } from "@/utils/date";

export interface AssistantSource {
  modulo?: string;
  tabela?: string;
  registro_id?: UUID;
  titulo?: string;
  data_vencimento?: string | null;
  status?: string | null;
}

export interface AssistantResponse {
  resposta?: string;
  answer?: string;
  fontes?: AssistantSource[];
  sources?: AssistantSource[];
}

type LegacyItem = {
  raw: string;
  title: string;
  date?: string;
  status?: string;
  setor?: string;
};

export const assistantService = {
  async perguntar(empresaId: UUID, pergunta: string): Promise<AssistantResponse> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke<AssistantResponse>("assistant-query", {
      body: {
        empresa_id: empresaId,
        pergunta,
      },
    });

    if (error) {
      throw new Error(error.message || "Não foi possível consultar a NIA Flow.");
    }

    const response = data ?? {
      resposta: "Não encontrei dados estruturados para responder essa pergunta.",
    };
    const rawAnswer = response.resposta ?? response.answer;

    if (!rawAnswer) return response;

    const humanized = humanizeLegacyAssistantAnswer(pergunta, rawAnswer);

    return {
      ...response,
      resposta: humanized,
      answer: humanized,
    };
  },
};

function humanizeLegacyAssistantAnswer(pergunta: string, resposta: string) {
  const isLegacy =
    resposta.includes("Analisei apenas os dados estruturados") ||
    resposta.includes("Principais itens:") ||
    resposta.includes("Recomendação: priorize") ||
    resposta.includes("RecomendaÃ§Ã£o: priorize");

  if (!isLegacy) return resposta;

  const perguntaNormalizada = normalize(pergunta);
  const linhas = resposta
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  const itens = linhas
    .filter((linha) => linha.startsWith("- "))
    .map((linha) => parseLegacyItem(linha.replace(/^- /, "")));

  const resumo =
    linhas.find((linha) =>
      /(Calibrações|CalibraÃ§Ãµes|Qualificações|QualificaÃ§Ãµes|Manutenções|ManutenÃ§Ãµes|Equipamentos avaliados|Documentos encontrados|Vencimentos em atenção|Vencimentos em atenÃ§Ã£o)/i.test(
        linha,
      ),
    ) ?? "";

  const counts = parseCounts(resumo);
  const tipo = detectIntent(perguntaNormalizada, resumo);
  const escopo = scopeItemsToQuestion(perguntaNormalizada, itens);

  if (escopo.isSpecific) {
    return buildSpecificAnswer(tipo, escopo.label, escopo.items);
  }

  const saida: string[] = [];

  if (tipo === "calibracao") {
    saida.push(
      buildCountPhrase("calibração", "calibrações", counts.vencidas, counts.proximas, itens.length),
    );
    saida.push(
      hasColdChainItem(itens)
        ? "Como tem equipamento de cadeia fria na lista, eu priorizaria geladeira, freezer e câmara fria."
        : "Eu organizaria por data de vencimento e criticidade operacional.",
    );
  } else if (tipo === "qualificacao") {
    saida.push(
      buildCountPhrase(
        "qualificação",
        "qualificações",
        counts.vencidas,
        counts.proximas,
        itens.length,
      ),
    );
    saida.push(
      "Eu olharia primeiro os equipamentos críticos e os que impactam temperatura, esterilização ou operação assistencial.",
    );
  } else if (tipo === "manutencao") {
    saida.push(
      buildCountPhrase("manutenção", "manutenções", counts.vencidas, counts.proximas, itens.length),
    );
    saida.push(
      "Eu separaria preventiva de corretiva: preventiva entra no planejamento; corretiva indica falha/quebra e merece atenção mais rápida.",
    );
  } else if (tipo === "equipamento") {
    const avaliados = parseFirstNumber(resumo);
    const atencao = counts.proximas || itens.length;
    saida.push(
      atencao > 0
        ? `Avaliei ${avaliados || "os"} equipamento${avaliados === 1 ? "" : "s"} e ${atencao} precisam de acompanhamento.`
        : `Avaliei ${avaliados || "os"} equipamento${avaliados === 1 ? "" : "s"} e não vi nenhum em atenção agora.`,
    );
    saida.push(
      "Eu começaria pelos equipamentos críticos ou ligados à cadeia fria, esterilização e áreas de maior risco.",
    );
  } else if (tipo === "documento") {
    saida.push(
      itens.length > 0
        ? `Encontrei ${itens.length} documento${itens.length === 1 ? "" : "s"} relacionado${
            itens.length === 1 ? "" : "s"
          } com a sua pergunta.`
        : "Não encontrei um documento correspondente a essa pergunta nos dados cadastrados desta empresa.",
    );
    saida.push(humanizeDocumentHint(itens));
  } else {
    saida.push(
      itens.length > 0
        ? `Encontrei ${itens.length} item${itens.length === 1 ? "" : "s"} que merecem acompanhamento.`
        : "Não encontrei nenhum item crítico para esse filtro.",
    );
    saida.push(
      "Eu organizaria a rotina começando pelo que vence primeiro e pelo que tiver maior impacto operacional.",
    );
  }

  appendHumanItems(saida, itens);
  saida.push(
    "Minha sugestão: trate primeiro o que estiver vencido ou crítico; depois acompanhe os itens em atenção antes que virem atraso.",
  );
  saida.push("Obs.: usei apenas os dados cadastrados no sistema, sem ler anexos ou PDFs.");

  return saida.join("\n");
}

function buildSpecificAnswer(tipo: string, label: string, itens: LegacyItem[]) {
  const item = itens[0];
  const saida: string[] = [];
  const tipoLabel = humanIntentLabel(tipo);

  if (!item) {
    saida.push(`Não encontrei ${tipoLabel} cadastrada para ${label} nos dados desta empresa.`);
    saida.push(
      "Eu conferiria se o equipamento foi cadastrado com outro nome ou se o registro ainda não foi lançado.",
    );
    saida.push("Obs.: usei apenas os dados cadastrados no sistema, sem ler anexos ou PDFs.");
    return saida.join("\n");
  }

  const equipamento = extractEquipmentName(item.title) || label;
  const data = item.date ? formatDateBR(item.date) : null;
  const status = item.status ? statusLabelHuman(item.status) : null;

  if (tipo === "manutencao") {
    saida.push(
      data
        ? `A próxima manutenção da ${equipamento} está prevista para ${data}.`
        : `Encontrei manutenção cadastrada para ${equipamento}, mas sem data clara de vencimento.`,
    );
    saida.push(
      status
        ? `Pelo status atual, ela está ${status}. Eu já deixaria essa preventiva programada para não virar atraso.`
        : "Eu já deixaria essa preventiva programada para não virar atraso.",
    );
  } else if (tipo === "calibracao") {
    saida.push(
      data
        ? `Sim — a próxima calibração da ${equipamento} vence em ${data}.`
        : `Encontrei calibração vinculada à ${equipamento}, mas sem data clara de vencimento.`,
    );
    saida.push(
      status
        ? `Status atual: ${status}. Minha sugestão é agendar antes do vencimento e anexar o certificado assim que sair.`
        : "Minha sugestão é agendar antes do vencimento e anexar o certificado assim que sair.",
    );
  } else if (tipo === "qualificacao") {
    saida.push(
      data
        ? `Sim — a próxima qualificação da ${equipamento} está prevista para ${data}.`
        : `Encontrei qualificação vinculada à ${equipamento}, mas sem data clara de vencimento.`,
    );
    saida.push(
      status
        ? `Ela está ${status}. Eu manteria isso no radar porque qualificação costuma impactar diretamente a conformidade do equipamento.`
        : "Eu manteria isso no radar porque qualificação costuma impactar diretamente a conformidade do equipamento.",
    );
  } else {
    saida.push(
      data
        ? `Encontrei o registro da ${equipamento} com vencimento em ${data}.`
        : `Encontrei o registro da ${equipamento}, mas sem data clara de vencimento.`,
    );
    if (status) saida.push(`Status atual: ${status}.`);
  }

  if (item.setor) saida.push(`Setor vinculado: ${item.setor}.`);
  saida.push("Obs.: usei apenas os dados cadastrados no sistema, sem ler anexos ou PDFs.");

  return saida.join("\n");
}

function parseLegacyItem(raw: string): LegacyItem {
  const parts = raw.split(/\s+(?:—|â€”)\s+/).map((part) => part.trim());
  const title =
    parts
      .filter(
        (part) => !/vencimento|próxima data|prÃ³xima data|proxima data|status|setor/i.test(part),
      )
      .join(" — ") || "Item";
  const datePart = parts.find((part) =>
    /vencimento|próxima data|prÃ³xima data|proxima data/i.test(part),
  );
  const statusPart = parts.find((part) => /status/i.test(part));
  const setorPart = parts.find((part) => /setor/i.test(part));

  return {
    raw,
    title,
    date: datePart?.split(":").slice(1).join(":").trim(),
    status: statusPart?.split(":").slice(1).join(":").trim(),
    setor: setorPart?.split(":").slice(1).join(":").trim(),
  };
}

function scopeItemsToQuestion(pergunta: string, itens: LegacyItem[]) {
  const scopes = [
    { label: "geladeira", terms: ["geladeira", "refrigerador"] },
    { label: "freezer", terms: ["freezer"] },
    { label: "autoclave", terms: ["autoclave"] },
    { label: "termohigrômetro", terms: ["termohigrometro", "termo higrometro", "termohigr"] },
    { label: "câmara fria", terms: ["camara fria", "camera fria", "câmara fria"] },
  ];

  const scope = scopes.find((candidate) =>
    candidate.terms.some((term) => pergunta.includes(normalize(term))),
  );

  if (!scope) return { isSpecific: false, label: "", items: itens };

  const filtered = itens.filter((item) => {
    const searchable = normalize(`${item.title} ${item.raw}`);
    return scope.terms.some((term) => searchable.includes(normalize(term)));
  });

  return {
    isSpecific: true,
    label: filtered[0] ? extractEquipmentName(filtered[0].title) || scope.label : scope.label,
    items: filtered,
  };
}

function parseCounts(resumo: string) {
  const vencidas = Number(resumo.match(/(\d+)\s+vencida/i)?.[1] ?? 0);
  const proximas =
    Number(
      resumo.match(/e\s+(\d+)\s+próxima/i)?.[1] ??
        resumo.match(/e\s+(\d+)\s+prÃ³xima/i)?.[1] ??
        resumo.match(/e\s+(\d+)\s+proxima/i)?.[1] ??
        resumo.match(/atenção:\s*(\d+)/i)?.[1] ??
        resumo.match(/atenÃ§Ã£o:\s*(\d+)/i)?.[1] ??
        resumo.match(/atencao:\s*(\d+)/i)?.[1] ??
        0,
    ) || 0;

  return { vencidas, proximas };
}

function parseFirstNumber(value: string) {
  const parsed = Number(value.match(/\d+/)?.[0] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function detectIntent(pergunta: string, resumo: string) {
  const base = `${pergunta} ${normalize(resumo)}`;
  if (base.includes("calibr")) return "calibracao";
  if (base.includes("qualific")) return "qualificacao";
  if (base.includes("manut")) return "manutencao";
  if (
    base.includes("document") ||
    base.includes("avcb") ||
    base.includes("alvara") ||
    base.includes("licenca")
  ) {
    return "documento";
  }
  if (base.includes("equip")) return "equipamento";
  return "geral";
}

function buildCountPhrase(
  singular: string,
  plural: string,
  vencidas: number,
  proximas: number,
  fallbackTotal: number,
) {
  const total = vencidas + proximas || fallbackTotal;

  if (total === 0) return `Por enquanto, não encontrei ${plural} vencidas nem próximas de atenção.`;

  if (vencidas > 0 && proximas > 0) {
    return `Sim — encontrei ${total} ${total === 1 ? singular : plural} para cuidar: ${vencidas} já vencida${
      vencidas === 1 ? "" : "s"
    } e ${proximas} em atenção.`;
  }

  if (vencidas > 0) {
    return `Sim — encontrei ${vencidas} ${vencidas === 1 ? singular : plural} vencida${
      vencidas === 1 ? "" : "s"
    }. Eu trataria isso como prioridade.`;
  }

  return `Sim — encontrei ${proximas || total} ${(proximas || total) === 1 ? singular : plural} em atenção. Nenhuma está vencida, mas vale programar antes de virar atraso.`;
}

function appendHumanItems(saida: string[], itens: LegacyItem[]) {
  if (itens.length === 0) {
    saida.push("Não encontrei nenhum item crítico para esse filtro.");
    return;
  }

  const principais = itens.slice(0, 5);
  saida.push(
    principais.length === 1
      ? "O item que eu acompanharia é:"
      : "Eu acompanharia estes itens primeiro:",
  );

  for (const item of principais) {
    const date = item.date ? ` — vence em ${formatDateBR(item.date)}` : "";
    const status = item.status ? ` — ${statusLabelHuman(item.status)}` : "";
    const setor = item.setor ? ` — setor ${item.setor}` : "";
    saida.push(`• ${item.title}${setor}${date}${status}`);
  }
}

function hasColdChainItem(itens: LegacyItem[]) {
  return itens.some((item) => {
    const title = normalize(item.title);
    return ["geladeira", "freezer", "camara fria", "camera fria"].some((term) =>
      title.includes(term),
    );
  });
}

function humanizeDocumentHint(itens: LegacyItem[]) {
  const statuses = itens.map((item) => normalize(item.status ?? ""));

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

function humanIntentLabel(tipo: string) {
  const labels: Record<string, string> = {
    calibracao: "calibração",
    qualificacao: "qualificação",
    manutencao: "manutenção",
    documento: "documento",
    equipamento: "equipamento",
  };

  return labels[tipo] ?? "registro";
}

function extractEquipmentName(title: string) {
  const parts = title.split(/\s+(?:—|â€”)\s+/).map((part) => part.trim());
  const last = parts.at(-1) ?? title;
  return last
    .replace(/^(calibração|calibracao|qualificação|qualificacao|manutenção|manutencao)\s+/i, "")
    .trim();
}

function statusLabelHuman(value: string) {
  const status = normalize(value);
  const labels: Record<string, string> = {
    vencido: "vencida",
    vence_hoje: "vencendo hoje",
    critico: "crítica",
    a_vencer: "a vencer",
    atencao: "em atenção",
    em_dia: "em dia",
    ok: "em dia",
    sem_certificado: "sem certificado",
    pendente_relatorio: "com relatório pendente",
    pendente_evidencia: "com evidência pendente",
  };

  return labels[status] ?? value;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
