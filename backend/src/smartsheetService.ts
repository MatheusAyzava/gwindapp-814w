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
  if (!SHEET_MATERIAIS) {
    throw new Error("SMARTSHEET_SHEET_MATERIAIS não configurada.");
  }

  const sheet = await getSheet(SHEET_MATERIAIS);

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
      "[Smartsheet] SMARTSHEET_TOKEN ou SMARTSHEET_SHEET_MEDICOES não configurados. Pulo envio de medição.",
    );
    return;
  }

  let sheet: SmartsheetSheet;
  try {
    sheet = await getSheet(SHEET_MEDICOES);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] Erro ao buscar planilha:", e?.message || e);
    // Se falhar ao buscar a planilha, não envia mas não quebra o fluxo principal
    return;
  }

  const findCol = (matcher: (title: string) => boolean) =>
    sheet.columns.find((c) => matcher(c.title.toLowerCase()));

  // Mapear todas as colunas possíveis do Smartsheet
  const colDia = findCol((t) => t.startsWith("dia") || t.includes("data"));
  const colSemana = findCol((t) => t.startsWith("sema") || t.includes("semana"));
  const colHoraEntrada = findCol((t) => t.includes("hora de entr") || t.includes("hora início") || t.includes("hora inicio"));
  const colHoraSaida = findCol((t) => t.includes("hora de sa") || t.includes("hora fim") || t.includes("hora de saída"));
  const colCliente = findCol((t) => t === "cliente" || t.includes("cliente"));
  const colProjeto = findCol((t) => t === "projeto" || t.includes("projeto"));
  const colEscala = findCol((t) => t === "escala" || t.includes("escala"));
  const colTecnicoLider = findCol((t) => t.includes("técnico líder") || t.includes("tecnico lider") || t.includes("líder"));
  const colQtdTec = findCol((t) => (t.includes("qt") || t.includes("qtd")) && (t.includes("tec") || t.includes("téc")));
  const colNomesTec = findCol((t) => t.includes("nome dos técnicos") || t.includes("nomes técnicos") || t.includes("técnicos"));
  const colSupervisor = findCol((t) => t.includes("supervisor"));
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

  if (colDia && dados.dia) {
    // Smartsheet espera datas no formato ISO sem horário (YYYY-MM-DD)
    const isoDate =
      typeof dados.dia === "string"
        ? dados.dia
        : dados.dia.toISOString().substring(0, 10);
    cells.push({ columnId: colDia.id, value: isoDate });
  }
  if (colSemana && dados.semana) {
    cells.push({ columnId: colSemana.id, value: dados.semana });
  }
  if (colHoraEntrada && dados.horaInicio) {
    cells.push({ columnId: colHoraEntrada.id, value: dados.horaInicio });
  }
  if (colHoraSaida && dados.horaFim) {
    cells.push({ columnId: colHoraSaida.id, value: dados.horaFim });
  }
  if (colCliente && dados.cliente) {
    cells.push({ columnId: colCliente.id, value: dados.cliente });
  }
  if (colProjeto) {
    cells.push({ columnId: colProjeto.id, value: dados.projeto });
  }
  if (colEscala && dados.escala) {
    cells.push({ columnId: colEscala.id, value: dados.escala });
  }
  if (colTecnicoLider && dados.tecnicoLider) {
    cells.push({ columnId: colTecnicoLider.id, value: dados.tecnicoLider });
  }
  if (colQtdTec && typeof dados.quantidadeTecnicos === "number") {
    cells.push({ columnId: colQtdTec.id, value: dados.quantidadeTecnicos });
  }
  if (colNomesTec && dados.nomesTecnicos) {
    cells.push({ columnId: colNomesTec.id, value: dados.nomesTecnicos });
  }
  if (colSupervisor && dados.supervisor) {
    cells.push({ columnId: colSupervisor.id, value: dados.supervisor });
  }
  if (colTipoIntervalo && dados.tipoIntervalo) {
    cells.push({ columnId: colTipoIntervalo.id, value: dados.tipoIntervalo });
  }
  if (colTipoAcesso && dados.tipoAcesso) {
    cells.push({ columnId: colTipoAcesso.id, value: dados.tipoAcesso });
  }
  if (colPa && dados.pa) {
    cells.push({ columnId: colPa.id, value: dados.pa });
  }
  if (colTorre && dados.torre) {
    cells.push({ columnId: colTorre.id, value: dados.torre });
  }
  if (colPlataforma && dados.plataforma) {
    cells.push({ columnId: colPlataforma.id, value: dados.plataforma });
  }
  if (colEquipe && dados.equipe) {
    cells.push({ columnId: colEquipe.id, value: dados.equipe });
  }
  if (colTipoHora && dados.tipoHora) {
    cells.push({ columnId: colTipoHora.id, value: dados.tipoHora });
  }
  if (colQtdEventos && typeof dados.quantidadeEventos === "number") {
    cells.push({ columnId: colQtdEventos.id, value: dados.quantidadeEventos });
  }
  if (colTipoDano && dados.tipoDano) {
    cells.push({ columnId: colTipoDano.id, value: dados.tipoDano });
  }
  if (colDanoCodigo && dados.danoCodigo) {
    cells.push({ columnId: colDanoCodigo.id, value: dados.danoCodigo });
  }
  if (colLarguraDano && typeof dados.larguraDanoMm === "number") {
    cells.push({ columnId: colLarguraDano.id, value: dados.larguraDanoMm });
  }
  if (colComprimentoDano && typeof dados.comprimentoDanoMm === "number") {
    cells.push({ columnId: colComprimentoDano.id, value: dados.comprimentoDanoMm });
  }
  if (colEtapaProcesso && dados.etapaProcesso) {
    cells.push({ columnId: colEtapaProcesso.id, value: dados.etapaProcesso });
  }
  if (colEtapaLixamento && dados.etapaLixamento) {
    cells.push({ columnId: colEtapaLixamento.id, value: dados.etapaLixamento });
  }
  if (colResinaTipo && dados.resinaTipo) {
    cells.push({ columnId: colResinaTipo.id, value: dados.resinaTipo });
  }
  if (colResinaQtd && typeof dados.resinaQuantidade === "number") {
    cells.push({ columnId: colResinaQtd.id, value: dados.resinaQuantidade });
  }
  if (colResinaCatalisador && dados.resinaCatalisador) {
    cells.push({ columnId: colResinaCatalisador.id, value: dados.resinaCatalisador });
  }
  if (colResinaLote && dados.resinaLote) {
    cells.push({ columnId: colResinaLote.id, value: dados.resinaLote });
  }
  if (colResinaValidade && dados.resinaValidade) {
    const isoDate = typeof dados.resinaValidade === "string" 
      ? dados.resinaValidade 
      : new Date(dados.resinaValidade).toISOString().substring(0, 10);
    cells.push({ columnId: colResinaValidade.id, value: isoDate });
  }
  if (colMassaTipo && dados.massaTipo) {
    cells.push({ columnId: colMassaTipo.id, value: dados.massaTipo });
  }
  if (colMassaQtd && typeof dados.massaQuantidade === "number") {
    cells.push({ columnId: colMassaQtd.id, value: dados.massaQuantidade });
  }
  if (colMassaCatalisador && dados.massaCatalisador) {
    cells.push({ columnId: colMassaCatalisador.id, value: dados.massaCatalisador });
  }
  if (colMassaLote && dados.massaLote) {
    cells.push({ columnId: colMassaLote.id, value: dados.massaLote });
  }
  if (colMassaValidade && dados.massaValidade) {
    const isoDate = typeof dados.massaValidade === "string" 
      ? dados.massaValidade 
      : new Date(dados.massaValidade).toISOString().substring(0, 10);
    cells.push({ columnId: colMassaValidade.id, value: isoDate });
  }
  if (colNucleoTipo && dados.nucleoTipo) {
    cells.push({ columnId: colNucleoTipo.id, value: dados.nucleoTipo });
  }
  if (colNucleoEspessura && typeof dados.nucleoEspessuraMm === "number") {
    cells.push({ columnId: colNucleoEspessura.id, value: dados.nucleoEspessuraMm });
  }
  if (colPuTipo && dados.puTipo) {
    cells.push({ columnId: colPuTipo.id, value: dados.puTipo });
  }
  if (colPuPeso && typeof dados.puMassaPeso === "number") {
    cells.push({ columnId: colPuPeso.id, value: dados.puMassaPeso });
  }
  if (colPuCatalisador && typeof dados.puCatalisadorPeso === "number") {
    cells.push({ columnId: colPuCatalisador.id, value: dados.puCatalisadorPeso });
  }
  if (colPuLote && dados.puLote) {
    cells.push({ columnId: colPuLote.id, value: dados.puLote });
  }
  if (colPuValidade && dados.puValidade) {
    const isoDate = typeof dados.puValidade === "string" 
      ? dados.puValidade 
      : new Date(dados.puValidade).toISOString().substring(0, 10);
    cells.push({ columnId: colPuValidade.id, value: isoDate });
  }
  if (colGelTipo && dados.gelTipo) {
    cells.push({ columnId: colGelTipo.id, value: dados.gelTipo });
  }
  if (colGelPeso && typeof dados.gelPeso === "number") {
    cells.push({ columnId: colGelPeso.id, value: dados.gelPeso });
  }
  if (colGelCatalisador && typeof dados.gelCatalisadorPeso === "number") {
    cells.push({ columnId: colGelCatalisador.id, value: dados.gelCatalisadorPeso });
  }
  if (colGelLote && dados.gelLote) {
    cells.push({ columnId: colGelLote.id, value: dados.gelLote });
  }
  if (colGelValidade && dados.gelValidade) {
    const isoDate = typeof dados.gelValidade === "string" 
      ? dados.gelValidade 
      : new Date(dados.gelValidade).toISOString().substring(0, 10);
    cells.push({ columnId: colGelValidade.id, value: isoDate });
  }
  if (colRetrabalho && typeof dados.retrabalho === "boolean") {
    cells.push({ columnId: colRetrabalho.id, value: dados.retrabalho ? "Sim" : "Não" });
  }
  if (colItemCodigo && dados.codigoItem) {
    cells.push({ columnId: colItemCodigo.id, value: dados.codigoItem });
  }
  if (colItemDescricao && dados.descricaoMaterial) {
    cells.push({ columnId: colItemDescricao.id, value: dados.descricaoMaterial });
  }
  if (colQtdConsumida && typeof dados.quantidadeConsumida === "number") {
    cells.push({ columnId: colQtdConsumida.id, value: dados.quantidadeConsumida });
  }
  if (colUnidade && dados.unidadeMaterial) {
    cells.push({ columnId: colUnidade.id, value: dados.unidadeMaterial });
  }

  if (cells.length === 0) {
    // Nada para enviar
    return;
  }

  try {
    await axios.post(
      `https://api.smartsheet.com/2.0/sheets/${SHEET_MEDICOES}/rows`,
      {
        toBottom: true,
        rows: [
          {
            cells,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
    // eslint-disable-next-line no-console
    console.log("[Smartsheet] Medição enviada com sucesso.");
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] Erro ao enviar medição:", e?.response?.data || e?.message || e);
    // Não relança o erro para não quebrar o fluxo principal
  }
}

