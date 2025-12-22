import axios from "axios";

const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
const SHEET_MATERIAIS = process.env.SMARTSHEET_SHEET_MATERIAIS;
const SHEET_MEDICOES = process.env.SMARTSHEET_SHEET_MEDICOES;

if (!SMARTSHEET_TOKEN) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Smartsheet] Variável SMARTSHEET_TOKEN não configurada. Integração desativada.",
  );
}

export type SmartsheetCell = {
  columnId: number;
  value?: string | number | boolean;
  displayValue?: string;
};

export type SmartsheetRow = {
  id: number;
  cells: SmartsheetCell[];
};

export type SmartsheetSheet = {
  id: number;
  name: string;
  columns: { id: number; title: string }[];
  rows: SmartsheetRow[];
};

async function getSheet(sheetId: string): Promise<SmartsheetSheet> {
  if (!SMARTSHEET_TOKEN) {
    throw new Error("SMARTSHEET_TOKEN não configurado.");
  }

  const resp = await axios.get<SmartsheetSheet>(
    `https://api.smartsheet.com/2.0/sheets/${sheetId}`,
    {
      headers: {
        Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
      },
    },
  );

  return resp.data;
}

// Importa materiais a partir da planilha de materiais do Smartsheet.
// Espera colunas com títulos: "Nº do item", "Descrição do item", "Unidade de medida", "Em estoque"
export async function importarMateriaisDoSmartsheet() {
  if (!SMARTSHEET_TOKEN) {
    throw new Error("SMARTSHEET_TOKEN não configurado. Configure no Render.com.");
  }
  
  if (!SHEET_MATERIAIS) {
    throw new Error("SMARTSHEET_SHEET_MATERIAIS não configurada. Configure no Render.com.");
  }

  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] Buscando planilha de materiais: ${SHEET_MATERIAIS}`);
  let sheet: SmartsheetSheet;
  try {
    sheet = await getSheet(SHEET_MATERIAIS);
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Planilha encontrada com ${sheet.columns.length} colunas e ${sheet.rows.length} linhas`);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] Erro ao buscar planilha de materiais:", {
      message: e?.message,
      response: e?.response?.data,
      status: e?.response?.status,
    });
    throw new Error(`Erro ao acessar planilha do Smartsheet: ${e?.response?.data?.message || e?.message || "Erro desconhecido"}`);
  }

  const colunaCodigo = sheet.columns.find(
    (c) => c.title.toLowerCase().includes("nº do item") || c.title.toLowerCase().includes("n° do item") || c.title.toLowerCase().includes("n do item"),
  );
  const colunaDescricao = sheet.columns.find((c) =>
    c.title.toLowerCase().includes("descrição do item"),
  );
  const colunaUnidade = sheet.columns.find(
    (c) =>
      c.title.toLowerCase().includes("unidade de medida") ||
      c.title.toLowerCase().includes("unidade"),
  );
  const colunaEstoque = sheet.columns.find(
    (c) =>
      c.title.toLowerCase().includes("em estoque") ||
      c.title.toLowerCase().includes("estoque"),
  );

  if (!colunaCodigo || !colunaDescricao || !colunaUnidade || !colunaEstoque) {
    throw new Error(
      "Não foi possível localizar colunas esperadas na planilha de materiais.",
    );
  }

  const materiaisImportados = sheet.rows
    .map((row) => {
      const busca = (colId: number) =>
        row.cells.find((cell) => cell.columnId === colId)?.value ??
        row.cells.find((cell) => cell.columnId === colId)?.displayValue;

      const codigoItem = (busca(colunaCodigo.id) ?? "") as string;
      const descricao = (busca(colunaDescricao.id) ?? "") as string;
      const unidade = (busca(colunaUnidade.id) ?? "") as string;
      const estoqueBruto = busca(colunaEstoque.id);

      if (!codigoItem || !descricao || !unidade) {
        return null;
      }

      const estoqueInicial = Number(
        typeof estoqueBruto === "string"
          ? estoqueBruto.replace(".", "").replace(",", ".")
          : estoqueBruto ?? 0,
      );

      return {
        codigoItem: String(codigoItem).trim(),
        descricao: String(descricao).trim(),
        unidade: String(unidade).trim(),
        estoqueInicial: Number.isNaN(estoqueInicial) ? 0 : estoqueInicial,
      };
    })
    .filter((m): m is {
      codigoItem: string;
      descricao: string;
      unidade: string;
      estoqueInicial: number;
    } => m !== null);

  return materiaisImportados;
}

// Envia uma nova medição para a planilha de "Medição e Controle de Materiais" no Smartsheet.
// Envia TODOS os campos da medição para o Smartsheet.
export async function registrarMedicaoNoSmartsheet(dados: {
  dia?: Date | string | null;
  semana?: string | null;
  cliente?: string | null;
  projeto: string;
  escala?: string | null;
  tecnicoLider?: string | null;
  quantidadeTecnicos?: number | null;
  nomesTecnicos?: string | null;
  supervisor?: string | null;
  tipoIntervalo?: string | null;
  tipoAcesso?: string | null;
  pa?: string | null;
  torre?: string | null;
  plataforma?: string | null;
  equipe?: string | null;
  tipoHora?: string | null;
  quantidadeEventos?: number | null;
  horaInicio?: string | null;
  horaFim?: string | null;
  tipoDano?: string | null;
  danoCodigo?: string | null;
  larguraDanoMm?: number | null;
  comprimentoDanoMm?: number | null;
  etapaProcesso?: string | null;
  etapaLixamento?: string | null;
  resinaTipo?: string | null;
  resinaQuantidade?: number | null;
  resinaCatalisador?: string | null;
  resinaLote?: string | null;
  resinaValidade?: Date | string | null;
  massaTipo?: string | null;
  massaQuantidade?: number | null;
  massaCatalisador?: string | null;
  massaLote?: string | null;
  massaValidade?: Date | string | null;
  nucleoTipo?: string | null;
  nucleoEspessuraMm?: number | null;
  puTipo?: string | null;
  puMassaPeso?: number | null;
  puCatalisadorPeso?: number | null;
  puLote?: string | null;
  puValidade?: Date | string | null;
  gelTipo?: string | null;
  gelPeso?: number | null;
  gelCatalisadorPeso?: number | null;
  gelLote?: string | null;
  gelValidade?: Date | string | null;
  retrabalho?: boolean | null;
  codigoItem?: string | null;
  descricaoMaterial?: string | null;
  unidadeMaterial?: string | null;
  quantidadeConsumida?: number | null;
}) {
  if (!SMARTSHEET_TOKEN || !SHEET_MEDICOES) {
    // Se não estiver configurado, apenas não envia mas não quebra o fluxo principal
    // eslint-disable-next-line no-console
    console.warn(
      `[Smartsheet] SMARTSHEET_TOKEN ou SMARTSHEET_SHEET_MEDICOES não configurados. Pulo envio de medição.`,
      `Token: ${SMARTSHEET_TOKEN ? "OK" : "FALTANDO"}, Sheet ID: ${SHEET_MEDICOES || "FALTANDO"}`,
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] Iniciando envio de medição para planilha ${SHEET_MEDICOES}`);
  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] Dados recebidos do formulário:`, JSON.stringify({
    dia: dados.dia,
    semana: dados.semana,
    cliente: dados.cliente,
    projeto: dados.projeto,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    tecnicoLider: dados.tecnicoLider,
    quantidadeTecnicos: dados.quantidadeTecnicos,
    nomesTecnicos: dados.nomesTecnicos,
  }, null, 2));

  let sheet: SmartsheetSheet;
  try {
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Buscando planilha ${SHEET_MEDICOES}...`);
    sheet = await getSheet(SHEET_MEDICOES);
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Planilha encontrada com ${sheet.columns.length} colunas`);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] Erro ao buscar planilha:", e?.response?.data || e?.message || e);
    // Se falhar ao buscar a planilha, não envia mas não quebra o fluxo principal
    return;
  }

  // Array para rastrear colunas já encontradas e evitar duplicatas
  const colunasJaUsadas = new Set<number>();
  
  const findCol = (matcher: (title: string) => boolean, nomeColuna?: string) => {
    const found = sheet.columns.find((c) => 
      !colunasJaUsadas.has(c.id) && matcher(c.title.toLowerCase())
    );
    if (found) {
      colunasJaUsadas.add(found.id);
      // eslint-disable-next-line no-console
      console.log(`[Smartsheet] Coluna encontrada${nomeColuna ? ` (${nomeColuna})` : ""}: "${found.title}" (ID: ${found.id})`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[Smartsheet] Coluna NÃO encontrada${nomeColuna ? ` (${nomeColuna})` : ""}: nenhuma coluna corresponde ao padrão`);
    }
    return found;
  };

  // Log das colunas disponíveis para debug
  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] Colunas disponíveis na planilha:`, sheet.columns.map(c => c.title).join(", "));

  // Buscar coluna chatId para gerar novo ID sequencial
  const colChatId = findCol((t) => t.includes("chatid") || t.includes("chat id") || t === "chatid", "chatId");
  
  // Gerar novo chatId sequencial baseado no último ID da planilha
  let novoChatId = "ID1";
  if (colChatId && sheet.rows.length > 0) {
    // Buscar o maior ID existente
    const idsExistentes = sheet.rows
      .map((row) => {
        const cell = row.cells.find((c) => c.columnId === colChatId.id);
        const valor = cell?.value || cell?.displayValue || "";
        // Extrair número do ID (ex: "ID91" -> 91)
        const match = String(valor).match(/ID(\d+)/i) || String(valor).match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((id) => id > 0);
    
    const ultimoId = idsExistentes.length > 0 ? Math.max(...idsExistentes) : 0;
    novoChatId = `ID${ultimoId + 1}`;
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Último chatId encontrado: ID${ultimoId}, Novo chatId gerado: ${novoChatId}`);
  } else if (colChatId) {
    // Se a coluna existe mas não há linhas, começar do ID1
    novoChatId = "ID1";
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Nenhuma linha existente, usando chatId inicial: ${novoChatId}`);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[Smartsheet] Coluna chatId não encontrada. Não será enviado chatId.`);
  }

  // Mapear todas as colunas possíveis do Smartsheet
  // IMPORTANTE: Buscar de forma mais específica, priorizando match exato
  const colDia = findCol((t) => t === "dia", "Dia") || findCol((t) => t.startsWith("dia") && !t.includes("data"), "Dia (fallback)");
  const colData = findCol((t) => t === "data", "Data") || findCol((t) => t.includes("data") && !t.includes("dia"), "Data (fallback)");
  const colSemana = findCol((t) => t === "semana", "Semana") || findCol((t) => t.startsWith("sema"), "Semana (fallback)");
  const colHoraEntrada = findCol((t) => t.includes("hora de entr"), "Hora Entrada") || findCol((t) => t.includes("hora início"), "Hora Entrada (fallback)") || findCol((t) => t.includes("hora") && t.includes("inicio") && !t.includes("saida"), "Hora Entrada (fallback 2)");
  const colHoraSaida = findCol((t) => t.includes("hora de sa"), "Hora Saída") || findCol((t) => t.includes("hora fim"), "Hora Saída (fallback)") || findCol((t) => t.includes("hora") && (t.includes("saida") || t.includes("fim")), "Hora Saída (fallback 2)");
  const colCliente = findCol((t) => t === "cliente", "Cliente");
  const colProjeto = findCol((t) => t === "projeto", "Projeto");
  const colEscala = findCol((t) => t === "escala", "Escala") || findCol((t) => t.includes("escala"), "Escala (fallback)");
  const colTecnicoLider = findCol((t) => t.includes("técnico líder"), "Técnico Líder") || findCol((t) => t.includes("tecnico lider"), "Técnico Líder (fallback)") || findCol((t) => t.includes("líder"), "Técnico Líder (fallback 2)");
  const colQtdTec = findCol((t) => (t.includes("qt") || t.includes("qtd")) && (t.includes("tec") || t.includes("téc")), "Qtd Técnicos");
  const colNomesTec = findCol((t) => t.includes("nome dos técnicos"), "Nomes Técnicos") || findCol((t) => t.includes("nomes técnicos"), "Nomes Técnicos (fallback)") || findCol((t) => t.includes("técnicos"), "Nomes Técnicos (fallback 2)");
  const colSupervisor = findCol((t) => t.includes("supervisor"), "Supervisor");
  const colTipoIntervalo = findCol((t) => t.includes("tipo de intervalo") || t.includes("tipo intervalo") || t.includes("intervalo"));
  const colTipoAcesso = findCol((t) => t.includes("tipo de acesso") || t.includes("tipo acesso") || t.includes("acesso"));
  const colPa = findCol((t) => t === "pá" || t === "pa" || t.includes("pá"));
  const colTorre = findCol((t) => t === "torre" || t.includes("torre"));
  const colPlataforma = findCol((t) => t === "plataforma" || t.includes("plataforma"));
  const colEquipe = findCol((t) => t === "equipe" || t.includes("equipe"));
  const colTipoHora = findCol((t) => t.includes("tipo hora") || t.includes("tipo de hora"));
  const colQtdEventos = findCol((t) => (t.includes("qt") || t.includes("qtd")) && t.includes("evento"));
  const colTipoDano = findCol((t) => t.includes("tipo dano") || t.includes("tipo de dano"));
  const colDanoCodigo = findCol((t) => t.includes("dano código") || t.includes("dano codigo") || t.includes("código dano"));
  const colLarguraDano = findCol((t) => t.includes("largura dano") || t.includes("largura") && t.includes("mm"));
  const colComprimentoDano = findCol((t) => t.includes("comprimento dano") || t.includes("comprimento") && t.includes("mm") || t.includes("comp. dano"));
  const colEtapaProcesso = findCol((t) => t.includes("etapa processo") || t.includes("etapa do processo"));
  const colEtapaLixamento = findCol((t) => t.includes("etapa lixamento") || t.includes("lixamento"));
  const colResinaTipo = findCol((t) => t.includes("resina") && t.includes("tipo"));
  const colResinaQtd = findCol((t) => t.includes("resina") && (t.includes("qtd") || t.includes("quantidade") || t.includes("qt")));
  const colResinaCatalisador = findCol((t) => t.includes("resina") && t.includes("catalisador"));
  const colResinaLote = findCol((t) => t.includes("resina") && t.includes("lote"));
  const colResinaValidade = findCol((t) => t.includes("resina") && t.includes("validade"));
  const colMassaTipo = findCol((t) => t.includes("massa") && t.includes("tipo"));
  const colMassaQtd = findCol((t) => t.includes("massa") && (t.includes("qtd") || t.includes("quantidade") || t.includes("qt")));
  const colMassaCatalisador = findCol((t) => t.includes("massa") && t.includes("catalisador"));
  const colMassaLote = findCol((t) => t.includes("massa") && t.includes("lote"));
  const colMassaValidade = findCol((t) => t.includes("massa") && t.includes("validade"));
  const colNucleoTipo = findCol((t) => t.includes("núcleo") || t.includes("nucleo"));
  const colNucleoEspessura = findCol((t) => t.includes("núcleo") && (t.includes("esp") || t.includes("espessura")));
  const colPuTipo = findCol((t) => t.includes("pu") && t.includes("tipo"));
  const colPuPeso = findCol((t) => t.includes("pu") && (t.includes("peso") || t.includes("massa peso")));
  const colPuCatalisador = findCol((t) => t.includes("pu") && t.includes("catalisador"));
  const colPuLote = findCol((t) => t.includes("pu") && t.includes("lote"));
  const colPuValidade = findCol((t) => t.includes("pu") && t.includes("validade"));
  const colGelTipo = findCol((t) => t.includes("gel") && t.includes("tipo"));
  const colGelPeso = findCol((t) => t.includes("gel") && t.includes("peso"));
  const colGelCatalisador = findCol((t) => t.includes("gel") && t.includes("catalisador"));
  const colGelLote = findCol((t) => t.includes("gel") && t.includes("lote"));
  const colGelValidade = findCol((t) => t.includes("gel") && t.includes("validade"));
  const colRetrabalho = findCol((t) => t.includes("retrabalho") || t.includes("é retrabalho"));
  const colItemCodigo = findCol((t) => (t.includes("item") || t.includes("código")) && (t.includes("código") || t.includes("codigo") || t.includes("nº")));
  const colItemDescricao = findCol((t) => t.includes("item") && (t.includes("descrição") || t.includes("descricao")));
  const colQtdConsumida = findCol((t) => (t.includes("qtd") || t.includes("quantidade")) && (t.includes("consumida") || t.includes("consumido")));
  const colUnidade = findCol((t) => t.includes("unidade") || t.includes("unid") || t === "unid.");

  const cells: SmartsheetCell[] = [];

  // Adicionar chatId primeiro (se a coluna existir)
  // Função auxiliar para adicionar células
  // IMPORTANTE: Smartsheet aceita apenas 'value' para a maioria dos tipos
  // 'displayValue' é usado apenas para fórmulas ou valores calculados
  const addCell = (columnId: number, value: string | number | boolean | null | undefined, logName: string) => {
    if (value === null || value === undefined || value === "") return;
    const cell: any = { columnId };
    
    // Para strings, usar apenas 'value' - Smartsheet aceita strings diretamente
    if (typeof value === "string") {
      cell.value = value;
      // NÃO usar displayValue para strings simples - pode causar problemas
    } else if (typeof value === "number") {
      cell.value = value;
    } else if (typeof value === "boolean") {
      cell.value = value;
    }
    
    cells.push(cell);
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Adicionando célula ${logName}: columnId=${columnId}, value=${value}, type=${typeof value}`);
  };

  // Usar colData se existir, senão usar colDia (para uso nos logs e células)
  const colDataOuDia = colData || colDia;
  
  // Log dos IDs das colunas encontradas para debug
  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] IDs das colunas principais:`, {
    colDataOuDia: colDataOuDia ? { id: colDataOuDia.id, titulo: sheet.columns.find(c => c.id === colDataOuDia.id)?.title } : null,
    colSemana: colSemana ? { id: colSemana.id, titulo: sheet.columns.find(c => c.id === colSemana.id)?.title } : null,
    colHoraEntrada: colHoraEntrada ? { id: colHoraEntrada.id, titulo: sheet.columns.find(c => c.id === colHoraEntrada.id)?.title } : null,
    colHoraSaida: colHoraSaida ? { id: colHoraSaida.id, titulo: sheet.columns.find(c => c.id === colHoraSaida.id)?.title } : null,
    colCliente: colCliente ? { id: colCliente.id, titulo: sheet.columns.find(c => c.id === colCliente.id)?.title } : null,
    colProjeto: colProjeto ? { id: colProjeto.id, titulo: sheet.columns.find(c => c.id === colProjeto.id)?.title } : null,
  });
  
  // Verificar se há colunas duplicadas (mesmo ID) - apenas para as principais
  const colunasPrincipaisParaVerificacao = [
    colDataOuDia, colSemana, colHoraEntrada, colHoraSaida, colCliente, colProjeto,
    colEscala, colTecnicoLider, colQtdTec, colNomesTec, colSupervisor
  ].filter(c => c !== null && c !== undefined) as Array<{ id: number; title: string }>;
  
  const idsColunasPrincipais = colunasPrincipaisParaVerificacao.map(c => c.id);
  const idsUnicosPrincipais = [...new Set(idsColunasPrincipais)];
  
  if (idsUnicosPrincipais.length < idsColunasPrincipais.length) {
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] ⚠️ ATENÇÃO: Algumas colunas principais têm o mesmo ID!`);
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] IDs únicos: ${idsUnicosPrincipais.length}, Total de colunas: ${idsColunasPrincipais.length}`);
  }

  if (colChatId) {
    addCell(colChatId.id, novoChatId, "chatId");
  }

  if (colDataOuDia && dados.dia) {
    // Smartsheet espera datas no formato ISO sem horário (YYYY-MM-DD)
    const isoDate =
      typeof dados.dia === "string"
        ? dados.dia
        : dados.dia.toISOString().substring(0, 10);
    addCell(colDataOuDia.id, isoDate, colData ? "Data" : "Dia");
  }
  if (colSemana && dados.semana) {
    addCell(colSemana.id, dados.semana, "Semana");
  }
  if (colHoraEntrada && dados.horaInicio) {
    addCell(colHoraEntrada.id, dados.horaInicio, "Hora Entrada");
  }
  if (colHoraSaida && dados.horaFim) {
    addCell(colHoraSaida.id, dados.horaFim, "Hora Saída");
  }
  if (colCliente && dados.cliente) {
    addCell(colCliente.id, dados.cliente, "Cliente");
  }
  if (colProjeto && dados.projeto) {
    addCell(colProjeto.id, dados.projeto, "Projeto");
  }
  if (colEscala && dados.escala) {
    addCell(colEscala.id, dados.escala, "Escala");
  }
  if (colTecnicoLider && dados.tecnicoLider) {
    addCell(colTecnicoLider.id, dados.tecnicoLider, "Técnico Líder");
  }
  if (colQtdTec && typeof dados.quantidadeTecnicos === "number") {
    addCell(colQtdTec.id, dados.quantidadeTecnicos, "Qtd Técnicos");
  }
  if (colNomesTec && dados.nomesTecnicos) {
    addCell(colNomesTec.id, dados.nomesTecnicos, "Nomes Técnicos");
  }
  if (colSupervisor && dados.supervisor) {
    addCell(colSupervisor.id, dados.supervisor, "Supervisor");
  }
  if (colTipoIntervalo && dados.tipoIntervalo) {
    addCell(colTipoIntervalo.id, dados.tipoIntervalo, "Tipo Intervalo");
  }
  if (colTipoAcesso && dados.tipoAcesso) {
    addCell(colTipoAcesso.id, dados.tipoAcesso, "Tipo Acesso");
  }
  if (colPa && dados.pa) {
    addCell(colPa.id, dados.pa, "Pá");
  }
  if (colTorre && dados.torre) {
    addCell(colTorre.id, dados.torre, "Torre");
  }
  if (colPlataforma && dados.plataforma) {
    addCell(colPlataforma.id, dados.plataforma, "Plataforma");
  }
  if (colEquipe && dados.equipe) {
    addCell(colEquipe.id, dados.equipe, "Equipe");
  }
  if (colTipoHora && dados.tipoHora) {
    addCell(colTipoHora.id, dados.tipoHora, "Tipo Hora");
  }
  if (colQtdEventos && typeof dados.quantidadeEventos === "number") {
    addCell(colQtdEventos.id, dados.quantidadeEventos, "Qtd Eventos");
  }
  if (colTipoDano && dados.tipoDano) {
    addCell(colTipoDano.id, dados.tipoDano, "Tipo Dano");
  }
  if (colDanoCodigo && dados.danoCodigo) {
    addCell(colDanoCodigo.id, dados.danoCodigo, "Dano Código");
  }
  if (colLarguraDano && typeof dados.larguraDanoMm === "number") {
    addCell(colLarguraDano.id, dados.larguraDanoMm, "Largura Dano");
  }
  if (colComprimentoDano && typeof dados.comprimentoDanoMm === "number") {
    addCell(colComprimentoDano.id, dados.comprimentoDanoMm, "Comprimento Dano");
  }
  if (colEtapaProcesso && dados.etapaProcesso) {
    addCell(colEtapaProcesso.id, dados.etapaProcesso, "Etapa Processo");
  }
  if (colEtapaLixamento && dados.etapaLixamento) {
    addCell(colEtapaLixamento.id, dados.etapaLixamento, "Etapa Lixamento");
  }
  if (colResinaTipo && dados.resinaTipo) {
    addCell(colResinaTipo.id, dados.resinaTipo, "Resina Tipo");
  }
  if (colResinaQtd && typeof dados.resinaQuantidade === "number") {
    addCell(colResinaQtd.id, dados.resinaQuantidade, "Resina Qtd");
  }
  if (colResinaCatalisador && dados.resinaCatalisador) {
    addCell(colResinaCatalisador.id, dados.resinaCatalisador, "Resina Catalisador");
  }
  if (colResinaLote && dados.resinaLote) {
    addCell(colResinaLote.id, dados.resinaLote, "Resina Lote");
  }
  if (colResinaValidade && dados.resinaValidade) {
    const isoDate = typeof dados.resinaValidade === "string" 
      ? dados.resinaValidade 
      : new Date(dados.resinaValidade).toISOString().substring(0, 10);
    addCell(colResinaValidade.id, isoDate, "Resina Validade");
  }
  if (colMassaTipo && dados.massaTipo) {
    addCell(colMassaTipo.id, dados.massaTipo, "Massa Tipo");
  }
  if (colMassaQtd && typeof dados.massaQuantidade === "number") {
    addCell(colMassaQtd.id, dados.massaQuantidade, "Massa Qtd");
  }
  if (colMassaCatalisador && dados.massaCatalisador) {
    addCell(colMassaCatalisador.id, dados.massaCatalisador, "Massa Catalisador");
  }
  if (colMassaLote && dados.massaLote) {
    addCell(colMassaLote.id, dados.massaLote, "Massa Lote");
  }
  if (colMassaValidade && dados.massaValidade) {
    const isoDate = typeof dados.massaValidade === "string" 
      ? dados.massaValidade 
      : new Date(dados.massaValidade).toISOString().substring(0, 10);
    addCell(colMassaValidade.id, isoDate, "Massa Validade");
  }
  if (colNucleoTipo && dados.nucleoTipo) {
    addCell(colNucleoTipo.id, dados.nucleoTipo, "Núcleo Tipo");
  }
  if (colNucleoEspessura && typeof dados.nucleoEspessuraMm === "number") {
    addCell(colNucleoEspessura.id, dados.nucleoEspessuraMm, "Núcleo Espessura");
  }
  if (colPuTipo && dados.puTipo) {
    addCell(colPuTipo.id, dados.puTipo, "PU Tipo");
  }
  if (colPuPeso && typeof dados.puMassaPeso === "number") {
    addCell(colPuPeso.id, dados.puMassaPeso, "PU Peso");
  }
  if (colPuCatalisador && typeof dados.puCatalisadorPeso === "number") {
    addCell(colPuCatalisador.id, dados.puCatalisadorPeso, "PU Catalisador");
  }
  if (colPuLote && dados.puLote) {
    addCell(colPuLote.id, dados.puLote, "PU Lote");
  }
  if (colPuValidade && dados.puValidade) {
    const isoDate = typeof dados.puValidade === "string" 
      ? dados.puValidade 
      : new Date(dados.puValidade).toISOString().substring(0, 10);
    addCell(colPuValidade.id, isoDate, "PU Validade");
  }
  if (colGelTipo && dados.gelTipo) {
    addCell(colGelTipo.id, dados.gelTipo, "Gel Tipo");
  }
  if (colGelPeso && typeof dados.gelPeso === "number") {
    addCell(colGelPeso.id, dados.gelPeso, "Gel Peso");
  }
  if (colGelCatalisador && typeof dados.gelCatalisadorPeso === "number") {
    addCell(colGelCatalisador.id, dados.gelCatalisadorPeso, "Gel Catalisador");
  }
  if (colGelLote && dados.gelLote) {
    addCell(colGelLote.id, dados.gelLote, "Gel Lote");
  }
  if (colGelValidade && dados.gelValidade) {
    const isoDate = typeof dados.gelValidade === "string" 
      ? dados.gelValidade 
      : new Date(dados.gelValidade).toISOString().substring(0, 10);
    addCell(colGelValidade.id, isoDate, "Gel Validade");
  }
  if (colRetrabalho && typeof dados.retrabalho === "boolean") {
    addCell(colRetrabalho.id, dados.retrabalho ? "Sim" : "Não", "Retrabalho");
  }
  if (colItemCodigo && dados.codigoItem) {
    addCell(colItemCodigo.id, dados.codigoItem, "Item Código");
  }
  if (colItemDescricao && dados.descricaoMaterial) {
    addCell(colItemDescricao.id, dados.descricaoMaterial, "Item Descrição");
  }
  if (colQtdConsumida && typeof dados.quantidadeConsumida === "number") {
    addCell(colQtdConsumida.id, dados.quantidadeConsumida, "Qtd Consumida");
  }
  if (colUnidade && dados.unidadeMaterial) {
    addCell(colUnidade.id, dados.unidadeMaterial, "Unidade");
  }

  // Log detalhado das colunas encontradas e não encontradas
  const colunasEncontradas: Array<{nome: string, id: number, tituloOriginal: string}> = [];
  const colunasNaoEncontradas: string[] = [];
  
  if (colDia) colunasEncontradas.push({nome: "Dia", id: colDia.id, tituloOriginal: sheet.columns.find(c => c.id === colDia.id)?.title || ""});
  else colunasNaoEncontradas.push("Dia");
  
  if (colSemana) colunasEncontradas.push({nome: "Semana", id: colSemana.id, tituloOriginal: sheet.columns.find(c => c.id === colSemana.id)?.title || ""});
  else colunasNaoEncontradas.push("Semana");
  
  if (colHoraEntrada) colunasEncontradas.push({nome: "Hora Entrada", id: colHoraEntrada.id, tituloOriginal: sheet.columns.find(c => c.id === colHoraEntrada.id)?.title || ""});
  else colunasNaoEncontradas.push("Hora Entrada");
  
  if (colHoraSaida) colunasEncontradas.push({nome: "Hora Saída", id: colHoraSaida.id, tituloOriginal: sheet.columns.find(c => c.id === colHoraSaida.id)?.title || ""});
  else colunasNaoEncontradas.push("Hora Saída");
  
  if (colCliente) colunasEncontradas.push({nome: "Cliente", id: colCliente.id, tituloOriginal: sheet.columns.find(c => c.id === colCliente.id)?.title || ""});
  else colunasNaoEncontradas.push("Cliente");
  
  if (colProjeto) colunasEncontradas.push({nome: "Projeto", id: colProjeto.id, tituloOriginal: sheet.columns.find(c => c.id === colProjeto.id)?.title || ""});
  else colunasNaoEncontradas.push("Projeto");
  
  if (colEscala) colunasEncontradas.push({nome: "Escala", id: colEscala.id, tituloOriginal: sheet.columns.find(c => c.id === colEscala.id)?.title || ""});
  else colunasNaoEncontradas.push("Escala");
  
  if (colTecnicoLider) colunasEncontradas.push({nome: "Técnico Líder", id: colTecnicoLider.id, tituloOriginal: sheet.columns.find(c => c.id === colTecnicoLider.id)?.title || ""});
  else colunasNaoEncontradas.push("Técnico Líder");
  
  if (colQtdTec) colunasEncontradas.push({nome: "Qtd Técnicos", id: colQtdTec.id, tituloOriginal: sheet.columns.find(c => c.id === colQtdTec.id)?.title || ""});
  else colunasNaoEncontradas.push("Qtd Técnicos");
  
  if (colNomesTec) colunasEncontradas.push({nome: "Nomes Técnicos", id: colNomesTec.id, tituloOriginal: sheet.columns.find(c => c.id === colNomesTec.id)?.title || ""});
  else colunasNaoEncontradas.push("Nomes Técnicos");
  
  if (colSupervisor) colunasEncontradas.push({nome: "Supervisor", id: colSupervisor.id, tituloOriginal: sheet.columns.find(c => c.id === colSupervisor.id)?.title || ""});
  else colunasNaoEncontradas.push("Supervisor");
  
  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] ✅ Colunas encontradas (${colunasEncontradas.length}):`, colunasEncontradas.map(c => `${c.nome} (ID: ${c.id}, Título: "${c.tituloOriginal}")`).join(", "));
  if (colunasNaoEncontradas.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] ⚠️ Colunas NÃO encontradas (${colunasNaoEncontradas.length}):`, colunasNaoEncontradas.join(", "));
  }
  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] Preparando ${cells.length} células para envio`);
  
  if (cells.length === 0) {
    // eslint-disable-next-line no-console
    console.warn("[Smartsheet] ⚠️ Nenhuma célula para enviar. Verifique se as colunas foram encontradas na planilha.");
    // eslint-disable-next-line no-console
    console.log("[Smartsheet] Dados recebidos:", JSON.stringify(dados, null, 2));
    return;
  }

  // Verificar se há células duplicadas (mesmo columnId)
  const columnIds = cells.map(c => c.columnId);
  const columnIdsUnicos = [...new Set(columnIds)];
  const duplicados = columnIds.filter((id, index) => columnIds.indexOf(id) !== index);
  
  // Verificação crítica: se todas as células têm o mesmo ID, há um problema grave
  if (columnIdsUnicos.length === 1 && cells.length > 1) {
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] ❌ ERRO CRÍTICO: Todas as ${cells.length} células têm o mesmo columnId (${columnIdsUnicos[0]})!`);
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] Isso significa que todas as colunas encontradas apontam para a mesma coluna na planilha.`);
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] Detalhes das células:`, cells.map((c, i) => `Célula ${i}: columnId=${c.columnId}, value=${c.value}`).join("\n"));
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] Lista completa de colunas na planilha:`, sheet.columns.map(c => `"${c.title}" (ID: ${c.id})`).join(", "));
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] Colunas já usadas (rastreadas):`, Array.from(colunasJaUsadas).join(", "));
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] ❌ CANCELANDO ENVIO: Dados não serão enviados pois estão incorretos.`);
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] PROBLEMA: A função findCol está retornando sempre a mesma coluna. Verifique os nomes das colunas no Smartsheet.`);
    // Lançar erro para que seja capturado pelo catch no index.ts
    throw new Error(`Todas as células têm o mesmo columnId (${columnIdsUnicos[0]}). Verifique os logs para detalhes.`);
  }
  
  // Verificação adicional: se temos menos de 3 columnIds únicos, pode ser um problema
  if (columnIdsUnicos.length < 3 && cells.length >= 3) {
    // eslint-disable-next-line no-console
    console.warn(`[Smartsheet] ⚠️ ATENÇÃO: Apenas ${columnIdsUnicos.length} columnIds únicos para ${cells.length} células. Isso pode indicar um problema.`);
  }
  
  if (duplicados.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[Smartsheet] ⚠️ ATENÇÃO: Encontradas células com columnId duplicado:`, duplicados);
  }

  // Log detalhado do que está sendo enviado
  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] Células a serem enviadas (${cells.length} células):`, JSON.stringify(cells.map(c => ({
    columnId: c.columnId,
    value: c.value,
    displayValue: c.displayValue
  })), null, 2));
  
  // Log resumido mostrando apenas os columnIds únicos (já declarado acima)
  // eslint-disable-next-line no-console
  console.log(`[Smartsheet] ColumnIds únicos encontrados: ${columnIdsUnicos.length} de ${cells.length} células`);
  
  // Verificação final antes de enviar
  if (columnIdsUnicos.length < 2) {
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] ❌ ERRO: Apenas ${columnIdsUnicos.length} columnId(s) único(s) para ${cells.length} células.`);
    // eslint-disable-next-line no-console
    console.error(`[Smartsheet] ❌ CANCELANDO ENVIO: Não é possível criar uma linha com apenas uma coluna preenchida.`);
    return;
  }

  try {
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Enviando medição para Smartsheet...`);
    const payload = {
      toBottom: true,
      rows: [
        {
          cells,
        },
      ],
    };
    // Verificar se displayValue está presente nas células
    const cellsComDisplayValue = cells.filter(c => (c as any).displayValue !== undefined);
    const cellsSemDisplayValue = cells.filter(c => (c as any).displayValue === undefined && typeof (c as any).value === "string");
    
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Verificação do payload:`);
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] - Total de células: ${cells.length}`);
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] - Células com displayValue: ${cellsComDisplayValue.length}`);
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] - Células string SEM displayValue: ${cellsSemDisplayValue.length}`);
    if (cellsSemDisplayValue.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`[Smartsheet] ⚠️ PROBLEMA: ${cellsSemDisplayValue.length} células string não têm displayValue!`);
      // eslint-disable-next-line no-console
      console.error(`[Smartsheet] Primeiras células sem displayValue:`, cellsSemDisplayValue.slice(0, 5).map(c => ({ columnId: c.columnId, value: (c as any).value, type: typeof (c as any).value })));
    }
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Payload completo:`, JSON.stringify(payload, null, 2));
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Total de células no payload: ${cells.length}`);
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Primeiras 5 células:`, cells.slice(0, 5).map(c => `columnId=${c.columnId}, value=${c.value}, type=${typeof c.value}`));
    
    const response = await axios.post(
      `https://api.smartsheet.com/2.0/sheets/${SHEET_MEDICOES}/rows`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    
    // A API do Smartsheet retorna result como objeto (não array) quando cria uma linha
    const resultado = response.data?.result;
    const rowId = resultado?.id;
    const rowNumber = resultado?.rowNumber;
    
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Resposta da API (status ${response.status}):`, {
      status: response.status,
      message: response.data?.message,
      resultCode: response.data?.resultCode,
      rowId: rowId || "N/A",
      rowNumber: rowNumber || "N/A",
    });
    
    // Se chegou aqui sem erro, a linha foi criada com sucesso
    if (rowNumber) {
      // eslint-disable-next-line no-console
      console.log(`[Smartsheet] ✅ Medição enviada com sucesso! Nova linha criada na linha ${rowNumber} do Smartsheet.`);
      // eslint-disable-next-line no-console
      console.log(`[Smartsheet] ✅ ID da linha: ${rowId || "N/A"}. Verifique na planilha do Smartsheet.`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[Smartsheet] ✅ Medição enviada com sucesso! Nova linha criada no Smartsheet.`);
      // eslint-disable-next-line no-console
      console.log(`[Smartsheet] ✅ O ID da linha aparecerá automaticamente na planilha. Verifique na planilha do Smartsheet.`);
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] ❌ Erro ao enviar medição:", {
      status: e?.response?.status,
      statusText: e?.response?.statusText,
      data: e?.response?.data,
      message: e?.message,
    });
    // Não relança o erro para não quebrar o fluxo principal
  }
}

