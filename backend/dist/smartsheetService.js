"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importarMateriaisDoSmartsheet = importarMateriaisDoSmartsheet;
exports.registrarMedicaoNoSmartsheet = registrarMedicaoNoSmartsheet;
const axios_1 = __importDefault(require("axios"));
const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
const SHEET_MATERIAIS = process.env.SMARTSHEET_SHEET_MATERIAIS;
const SHEET_MEDICOES = process.env.SMARTSHEET_SHEET_MEDICOES;
if (!SMARTSHEET_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn("[Smartsheet] Variável SMARTSHEET_TOKEN não configurada. Integração desativada.");
}
async function getSheet(sheetId) {
    if (!SMARTSHEET_TOKEN) {
        throw new Error("SMARTSHEET_TOKEN não configurado.");
    }
    // Buscar informações completas da planilha incluindo opções das colunas
    const resp = await axios_1.default.get(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, {
        headers: {
            Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
        },
        params: {
            include: 'objectValue'
        }
    });
    return resp.data;
}
// Importa materiais a partir da planilha de materiais do Smartsheet.
// Espera colunas com títulos: "Nº do item", "Descrição do item", "Unidade de medida", "Em estoque"
async function importarMateriaisDoSmartsheet() {
    if (!SHEET_MATERIAIS) {
        throw new Error("SMARTSHEET_SHEET_MATERIAIS não configurada.");
    }
    const sheet = await getSheet(SHEET_MATERIAIS);
    const colunaCodigo = sheet.columns.find((c) => c.title.toLowerCase().includes("nº do item") || c.title.toLowerCase().includes("n° do item") || c.title.toLowerCase().includes("n do item"));
    const colunaDescricao = sheet.columns.find((c) => c.title.toLowerCase().includes("descrição do item"));
    const colunaUnidade = sheet.columns.find((c) => c.title.toLowerCase().includes("unidade de medida") ||
        c.title.toLowerCase().includes("unidade"));
    const colunaEstoque = sheet.columns.find((c) => c.title.toLowerCase().includes("em estoque") ||
        c.title.toLowerCase().includes("estoque"));
    if (!colunaCodigo || !colunaDescricao || !colunaUnidade || !colunaEstoque) {
        throw new Error("Não foi possível localizar colunas esperadas na planilha de materiais.");
    }
    const materiaisImportados = sheet.rows
        .map((row) => {
        const busca = (colId) => row.cells.find((cell) => cell.columnId === colId)?.value ??
            row.cells.find((cell) => cell.columnId === colId)?.displayValue;
        const codigoItem = (busca(colunaCodigo.id) ?? "");
        const descricao = (busca(colunaDescricao.id) ?? "");
        const unidade = (busca(colunaUnidade.id) ?? "");
        const estoqueBruto = busca(colunaEstoque.id);
        if (!codigoItem || !descricao || !unidade) {
            return null;
        }
        const estoqueInicial = Number(typeof estoqueBruto === "string"
            ? estoqueBruto.replace(".", "").replace(",", ".")
            : estoqueBruto ?? 0);
        return {
            codigoItem: String(codigoItem).trim(),
            descricao: String(descricao).trim(),
            unidade: String(unidade).trim(),
            estoqueInicial: Number.isNaN(estoqueInicial) ? 0 : estoqueInicial,
        };
    })
        .filter((m) => m !== null);
    return materiaisImportados;
}
// Envia uma nova medição para a planilha de "Medição e Controle de Materiais" no Smartsheet.
// Espera colunas com títulos aproximados a: "Dia", "Sem...", "Hora de entr...", "Hora de saída",
// "Cliente", "Projeto", "Escala", "Técnico Líder", "Qtd. Téc", "Nome dos Técnicos".
async function registrarMedicaoNoSmartsheet(dados) {
    if (!SMARTSHEET_TOKEN || !SHEET_MEDICOES) {
        // Se não estiver configurado, apenas não envia mas não quebra o fluxo principal
        // eslint-disable-next-line no-console
        console.warn("[Smartsheet] SMARTSHEET_TOKEN ou SMARTSHEET_SHEET_MEDICOES não configurados. Pulo envio de medição.");
        return;
    }
    const sheet = await getSheet(SHEET_MEDICOES);
    const findCol = (matcher) => sheet.columns.find((c) => matcher(c.title.toLowerCase()));
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
    // Verificar tipo da coluna "Nome dos Técnicos" para usar formato correto
    var colNomesTecTipo = colNomesTec ? (colNomesTec.type || 'TEXT') : null;
    // Log para debug
    if (colNomesTec) {
        console.log("[Smartsheet] Coluna Nome dos Técnicos encontrada:", {
            id: colNomesTec.id,
            title: colNomesTec.title,
            type: colNomesTec.type,
            colNomesTecTipo: colNomesTecTipo,
            hasOptions: !!colNomesTec.options,
            optionsCount: colNomesTec.options ? colNomesTec.options.length : 0,
            firstOptions: colNomesTec.options ? colNomesTec.options.slice(0, 5) : []
        });
    }
    const cells = [];
    if (colDia && dados.dia) {
        // Smartsheet espera datas no formato ISO sem horário (YYYY-MM-DD)
        const isoDate = typeof dados.dia === "string"
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
        // Coluna "Nome dos Técnicos" é MULTI_PICKLIST - precisa validar valores contra opções válidas
        // Se nomesTecnicos for string, pode conter múltiplos nomes separados por vírgula
        var nomesArray = typeof dados.nomesTecnicos === 'string' 
            ? dados.nomesTecnicos.split(',').map(function(n) { return n.trim(); }).filter(function(n) { return n.length > 0; })
            : Array.isArray(dados.nomesTecnicos) 
                ? dados.nomesTecnicos 
                : [String(dados.nomesTecnicos)];
        
        // Buscar opções válidas da coluna MULTI_PICKLIST
        // As opções podem estar em colNomesTec.options (array de strings) ou colNomesTec.options[] (array de objetos)
        var opcoesValidas = [];
        if (colNomesTec.type === 'MULTI_PICKLIST' || colNomesTec.type === 'PICKLIST') {
            if (colNomesTec.options && Array.isArray(colNomesTec.options)) {
                // Se options é array de strings
                if (typeof colNomesTec.options[0] === 'string') {
                    opcoesValidas = colNomesTec.options;
                } else if (colNomesTec.options[0] && colNomesTec.options[0].value) {
                    // Se options é array de objetos com propriedade 'value'
                    opcoesValidas = colNomesTec.options.map(function(opt) { return opt.value || opt; });
                } else {
                    opcoesValidas = colNomesTec.options;
                }
            }
        }
        
        // Validar e corrigir nomes para corresponder exatamente às opções válidas
        var nomesValidos = [];
        for (var i = 0; i < nomesArray.length; i++) {
            var nome = nomesArray[i];
            // Tentar encontrar correspondência exata primeiro
            var encontrado = opcoesValidas.find(function(opt) { return opt === nome; });
            if (!encontrado && opcoesValidas.length > 0) {
                // Se não encontrar exato, tentar case-insensitive
                encontrado = opcoesValidas.find(function(opt) { 
                    return opt.toLowerCase() === nome.toLowerCase(); 
                });
            }
            if (encontrado) {
                nomesValidos.push(encontrado); // Usar o valor exato da lista
            } else {
                console.warn("[Smartsheet] ⚠️ Nome não encontrado nas opções válidas:", nome);
                if (opcoesValidas.length > 0) {
                    console.log("[Smartsheet] Opções disponíveis (primeiras 10):", opcoesValidas.slice(0, 10));
                    // Não adicionar nome inválido - apenas pular (não enviar)
                } else {
                    console.warn("[Smartsheet] ⚠️ Nenhuma opção válida encontrada na coluna. Tentando enviar valor original:", nome);
                    // Se não há opções disponíveis, tentar enviar mesmo assim
                    nomesValidos.push(nome);
                }
            }
        }
        
        console.log("[Smartsheet] Preparando célula Nome dos Técnicos:", {
            columnId: colNomesTec.id,
            columnType: colNomesTec.type,
            nomesOriginais: nomesArray,
            nomesValidos: nomesValidos,
            totalOpcoes: opcoesValidas.length
        });
        
        // SEMPRE usar objectValue para esta coluna específica
        if (nomesValidos.length > 0) {
            cells.push({
                columnId: colNomesTec.id,
                objectValue: {
                    objectType: "MULTI_PICKLIST",
                    values: nomesValidos
                }
            });
        } else {
            console.warn("[Smartsheet] Nenhum nome válido encontrado. Pulando célula Nome dos Técnicos.");
        }
    }
    if (cells.length === 0) {
        // Nada para enviar
        return;
    }
    await axios_1.default.post(`https://api.smartsheet.com/2.0/sheets/${SHEET_MEDICOES}/rows`, {
        toBottom: true,
        rows: [
            {
                cells,
            },
        ],
    }, {
        headers: {
            Authorization: `Bearer ${SMARTSHEET_TOKEN}`,
            "Content-Type": "application/json",
        },
    });
}
