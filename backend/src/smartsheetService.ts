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
// Espera colunas com títulos aproximados a: "Dia", "Sem...", "Hora de entr...", "Hora de saída",
// "Cliente", "Projeto", "Escala", "Técnico Líder", "Qtd. Téc", "Nome dos Técnicos".
export async function registrarMedicaoNoSmartsheet(dados: {
  dia?: Date | null;
  semana?: string | null;
  cliente?: string | null;
  projeto: string;
  escala?: string | null;
  tecnicoLider?: string | null;
  quantidadeTecnicos?: number | null;
  nomesTecnicos?: string | null;
  horaInicio?: string | null;
  horaFim?: string | null;
}) {
  if (!SMARTSHEET_TOKEN || !SHEET_MEDICOES) {
    // Se não estiver configurado, apenas não envia mas não quebra o fluxo principal
    // eslint-disable-next-line no-console
    console.warn(
      "[Smartsheet] SMARTSHEET_TOKEN ou SMARTSHEET_SHEET_MEDICOES não configurados. Pulo envio de medição.",
    );
    return;
  }

  const sheet = await getSheet(SHEET_MEDICOES);

  const findCol = (matcher: (title: string) => boolean) =>
    sheet.columns.find((c) => matcher(c.title.toLowerCase()));

  const colDia = findCol((t) => t.startsWith("dia"));
  const colSemana = findCol((t) => t.startsWith("sema"));
  const colHoraEntrada = findCol((t) => t.includes("hora de entr"));
  const colHoraSaida = findCol((t) => t.includes("hora de sa"));
  const colCliente = findCol((t) => t === "cliente");
  const colProjeto = findCol((t) => t === "projeto");
  const colEscala = findCol((t) => t === "escala");
  const colTecnicoLider = findCol((t) => t.includes("técnico líder"));
  const colQtdTec = findCol((t) => t.includes("qt") && t.includes("tec"));
  const colNomesTec = findCol((t) => t.includes("nome dos técnicos"));

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

  if (cells.length === 0) {
    // Nada para enviar
    return;
  }

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
}

