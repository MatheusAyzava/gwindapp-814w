"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importarMateriaisDoSmartsheet = importarMateriaisDoSmartsheet;
exports.registrarMedicaoNoSmartsheet = registrarMedicaoNoSmartsheet;
exports.buscarMedicoesDoSmartsheet = buscarMedicoesDoSmartsheet;
exports.getSheet = getSheet;
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
    // Adicionar campos de materiais (resina, massa, PU, gel, etc.)
    const findColMaterial = (matcher) => sheet.columns.find((c) => matcher(c.title.toLowerCase()));
    
    // Resina
    const colResinaTipo = findColMaterial((t) => t.includes("qual é a resina") || t.includes("resina"));
    const colResinaQuantidade = findColMaterial((t) => t.includes("quantidade de resina"));
    const colResinaCatalisador = findColMaterial((t) => t.includes("catalisador da resina"));
    const colResinaLote = findColMaterial((t) => t.includes("lote da resina"));
    const colResinaValidade = findColMaterial((t) => t.includes("data de validade da resina") || t.includes("validade da resina"));
    
    // Massa
    const colMassaTipo = findColMaterial((t) => t.includes("massa de colagem"));
    const colMassaQuantidade = findColMaterial((t) => t.includes("quantidade de massa"));
    const colMassaCatalisador = findColMaterial((t) => t.includes("catalisador da massa") || t.includes("catalisador da massa"));
    const colMassaLote = findColMaterial((t) => t.includes("lote da massa"));
    const colMassaValidade = findColMaterial((t) => t.includes("data de validade da massa") || t.includes("validade da massa"));
    
    // Núcleo
    const colNucleoTipo = findColMaterial((t) => t === "núcleo" || t === "nucleo");
    const colNucleoEspessura = findColMaterial((t) => t.includes("espessura do núcleo") || t.includes("espessura do nucleo"));
    const colNucleoTipoNucleo = findColMaterial((t) => t.includes("tipo do núcleo") || t.includes("tipo do nucleo"));
    
    // PU
    const colPuTipo = findColMaterial((t) => t.includes("massa pu") || t.includes("pu (filler)"));
    const colPuPeso = findColMaterial((t) => t.includes("peso da massa pu"));
    const colPuCatalisador = findColMaterial((t) => t.includes("peso do catalisador do pu") || t.includes("catalisador do pu"));
    const colPuLote = findColMaterial((t) => t.includes("lote do pu"));
    const colPuValidade = findColMaterial((t) => t.includes("data de validade do pu") || t.includes("validade do pu"));
    
    // Gel
    const colGelTipo = findColMaterial((t) => t === "gel");
    const colGelPeso = findColMaterial((t) => t.includes("peso do gel"));
    const colGelCatalisador = findColMaterial((t) => t.includes("peso do catalisador do gel") || t.includes("catalisador do gel"));
    const colGelLote = findColMaterial((t) => t.includes("lote do gel"));
    const colGelValidade = findColMaterial((t) => t.includes("data de validade do gel") || t.includes("validade do gel"));
    
    // Dano e processo
    const colTipoDano = findColMaterial((t) => t.includes("tipo de dano"));
    const colDanoCodigo = findColMaterial((t) => t === "dano" || t.includes("dano (código)"));
    const colLarguraDano = findColMaterial((t) => t.includes("largura do dano"));
    const colComprimentoDano = findColMaterial((t) => t.includes("comprimento do dano"));
    const colEtapaProcesso = findColMaterial((t) => t.includes("etapa de processo") || t.includes("etapa do processo"));
    const colEtapaLixamento = findColMaterial((t) => t.includes("etapa do lixamento"));
    const colRetrabalho = findColMaterial((t) => t.includes("é retrabalho") || t.includes("retrabalho"));
    
    // Adicionar células de materiais
    if (colResinaTipo && dados.resinaTipo) {
        cells.push({ columnId: colResinaTipo.id, value: dados.resinaTipo });
    }
    if (colResinaQuantidade && dados.resinaQuantidade) {
        cells.push({ columnId: colResinaQuantidade.id, value: dados.resinaQuantidade });
    }
    if (colResinaCatalisador && dados.resinaCatalisador) {
        cells.push({ columnId: colResinaCatalisador.id, value: String(dados.resinaCatalisador) });
    }
    if (colResinaLote && dados.resinaLote) {
        cells.push({ columnId: colResinaLote.id, value: String(dados.resinaLote) });
    }
    if (colResinaValidade && dados.resinaValidade) {
        const validadeDate = typeof dados.resinaValidade === "string" ? dados.resinaValidade : dados.resinaValidade.toISOString().substring(0, 10);
        cells.push({ columnId: colResinaValidade.id, value: validadeDate });
    }
    
    if (colMassaTipo && dados.massaTipo) {
        cells.push({ columnId: colMassaTipo.id, value: dados.massaTipo });
    }
    if (colMassaQuantidade && dados.massaQuantidade) {
        cells.push({ columnId: colMassaQuantidade.id, value: dados.massaQuantidade });
    }
    if (colMassaCatalisador && dados.massaCatalisador) {
        cells.push({ columnId: colMassaCatalisador.id, value: String(dados.massaCatalisador) });
    }
    if (colMassaLote && dados.massaLote) {
        cells.push({ columnId: colMassaLote.id, value: String(dados.massaLote) });
    }
    if (colMassaValidade && dados.massaValidade) {
        const validadeDate = typeof dados.massaValidade === "string" ? dados.massaValidade : dados.massaValidade.toISOString().substring(0, 10);
        cells.push({ columnId: colMassaValidade.id, value: validadeDate });
    }
    
    if (colNucleoTipo && dados.nucleoTipo) {
        cells.push({ columnId: colNucleoTipo.id, value: dados.nucleoTipo });
    }
    if (colNucleoEspessura && dados.nucleoEspessuraMm) {
        cells.push({ columnId: colNucleoEspessura.id, value: dados.nucleoEspessuraMm });
    }
    if (colNucleoTipoNucleo && dados.nucleoTipoNucleo) {
        cells.push({ columnId: colNucleoTipoNucleo.id, value: dados.nucleoTipoNucleo });
    }
    
    if (colPuTipo && dados.puTipo) {
        cells.push({ columnId: colPuTipo.id, value: dados.puTipo });
    }
    if (colPuPeso && dados.puMassaPeso) {
        cells.push({ columnId: colPuPeso.id, value: dados.puMassaPeso });
    }
    if (colPuCatalisador && dados.puCatalisadorPeso) {
        cells.push({ columnId: colPuCatalisador.id, value: dados.puCatalisadorPeso });
    }
    if (colPuLote && dados.puLote) {
        cells.push({ columnId: colPuLote.id, value: String(dados.puLote) });
    }
    if (colPuValidade && dados.puValidade) {
        const validadeDate = typeof dados.puValidade === "string" ? dados.puValidade : dados.puValidade.toISOString().substring(0, 10);
        cells.push({ columnId: colPuValidade.id, value: validadeDate });
    }
    
    if (colGelTipo && dados.gelTipo) {
        cells.push({ columnId: colGelTipo.id, value: dados.gelTipo });
    }
    if (colGelPeso && dados.gelPeso) {
        cells.push({ columnId: colGelPeso.id, value: dados.gelPeso });
    }
    if (colGelCatalisador && dados.gelCatalisadorPeso) {
        cells.push({ columnId: colGelCatalisador.id, value: dados.gelCatalisadorPeso });
    }
    if (colGelLote && dados.gelLote) {
        cells.push({ columnId: colGelLote.id, value: String(dados.gelLote) });
    }
    if (colGelValidade && dados.gelValidade) {
        const validadeDate = typeof dados.gelValidade === "string" ? dados.gelValidade : dados.gelValidade.toISOString().substring(0, 10);
        cells.push({ columnId: colGelValidade.id, value: validadeDate });
    }
    
    if (colTipoDano && dados.tipoDano) {
        cells.push({ columnId: colTipoDano.id, value: dados.tipoDano });
    }
    if (colDanoCodigo && dados.danoCodigo) {
        cells.push({ columnId: colDanoCodigo.id, value: dados.danoCodigo });
    }
    if (colLarguraDano && dados.larguraDanoMm) {
        cells.push({ columnId: colLarguraDano.id, value: dados.larguraDanoMm });
    }
    if (colComprimentoDano && dados.comprimentoDanoMm) {
        cells.push({ columnId: colComprimentoDano.id, value: dados.comprimentoDanoMm });
    }
    if (colEtapaProcesso && dados.etapaProcesso) {
        cells.push({ columnId: colEtapaProcesso.id, value: dados.etapaProcesso });
    }
    if (colEtapaLixamento && dados.etapaLixamento) {
        cells.push({ columnId: colEtapaLixamento.id, value: dados.etapaLixamento });
    }
    if (colRetrabalho && dados.retrabalho !== undefined && dados.retrabalho !== null) {
        cells.push({ columnId: colRetrabalho.id, value: dados.retrabalho ? "Sim" : "Não" });
    }
    
    if (cells.length === 0) {
        // Nada para enviar
        console.warn("[Smartsheet] ⚠️ Nenhuma célula para enviar. Verifique se os dados estão preenchidos.");
        return;
    }
    
    try {
        console.log(`[Smartsheet] 📤 Enviando ${cells.length} células para o Smartsheet...`);
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
        console.log("[Smartsheet] ✅ Medição enviada com sucesso para o Smartsheet!");
    } catch (error) {
        console.error("[Smartsheet] ❌ Erro ao enviar medição para o Smartsheet:", error.response?.data || error.message);
        throw error;
    }
}
// Busca todas as medições diretamente do Smartsheet
async function buscarMedicoesDoSmartsheet() {
    if (!SMARTSHEET_TOKEN || !SHEET_MEDICOES) {
        throw new Error("SMARTSHEET_TOKEN ou SHEET_MEDICOES não configurados.");
    }
    const sheet = await getSheet(SHEET_MEDICOES);
    const findCol = (matcher) => sheet.columns.find((c) => matcher(c.title.toLowerCase()));
    
    // Log: Listar TODAS as colunas disponíveis para debug
    console.log('[Smartsheet] 📋 Colunas disponíveis no Smartsheet:');
    const colunasComDia = [];
    sheet.columns.forEach((col, idx) => {
        const lower = col.title.toLowerCase().trim();
        // Verificar se o nome contém "dia" (com ou sem acentos, espaços, etc.)
        if (lower.includes('dia') || lower === 'dia' || lower.includes('data')) {
            colunasComDia.push({ title: col.title, id: col.id, type: col.type, index: idx });
        }
        const isDia = lower === "dia";
        console.log(`  [${idx}] "${col.title}" (ID: ${col.id}, Type: ${col.type})${isDia ? ' ⭐ É A COLUNA DIA!' : ''}`);
    });
    
    // Log colunas que podem ser de data
    if (colunasComDia.length > 0) {
        console.log('[Smartsheet] 🔍 Colunas que podem ser de data/dia:', colunasComDia);
    } else {
        console.warn('[Smartsheet] ⚠️ NENHUMA coluna encontrada com "dia" ou "data" no nome!');
    }
    
    // Mapear todas as colunas necessárias - aceitar múltiplas variações de nomes
    // Tentar encontrar a coluna de data de múltiplas formas
    // IMPORTANTE: A coluna se chama "Dia" no Smartsheet e contém datas no formato DD/MM/YY
    // PRIORIDADE: Sempre usar "Dia" se existir, nunca usar "Data" se "Dia" existir
    let colDia = null;
    let colData = null; // Guardar "Data" separadamente para usar apenas se "Dia" não existir
    
    // PRIMEIRO: tentar "Dia" exato (case-insensitive) - PRIORIDADE MÁXIMA
    colDia = sheet.columns.find(c => {
        const lower = c.title.toLowerCase().trim();
        return lower === "dia" || lower === '"dia"' || lower === "'dia'";
    });
    if (colDia) {
        console.log(`[Smartsheet] ✅ Coluna "Dia" encontrada por busca exata: "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type}) ⭐ É A COLUNA DIA!`);
    } else {
        // Tentar busca mais flexível: qualquer coluna que contenha "dia" (mas não "dados", "diário", etc.)
        const possiveisDia = sheet.columns.filter(c => {
            const lower = c.title.toLowerCase().trim();
            return (lower.includes('dia') && lower.length <= 5) || // "dia" com no máximo 5 caracteres
                   (lower === 'dia') ||
                   (lower.startsWith('dia ') && lower.length <= 10); // "dia " seguido de algo curto
        });
        if (possiveisDia.length > 0) {
            colDia = possiveisDia[0];
            console.log(`[Smartsheet] ✅ Coluna "Dia" encontrada por busca flexível: "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type}) ⭐ É A COLUNA DIA!`);
        }
    }
    
    // Guardar "Data" separadamente, mas NÃO usar se "Dia" já foi encontrado
    colData = sheet.columns.find(c => c.title.toLowerCase().trim() === "data");
    if (colData && !colDia) {
        // Só usar "Data" se "Dia" não foi encontrado
        colDia = colData;
        console.log(`[Smartsheet] ✅ Coluna "Data" encontrada por busca exata (fallback - "Dia" não encontrado): "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})`);
    } else if (colData && colDia) {
        console.log(`[Smartsheet] ⚠️ Coluna "Data" encontrada mas IGNORADA porque "Dia" já foi encontrado: "${colData.title}" (ID: ${colData.id}, Type: ${colData.type})`);
    }
    
    // Terceiro: tentar "Modificado" (pode conter timestamp com data)
    if (!colDia) {
        colDia = sheet.columns.find(c => c.title.toLowerCase().trim() === "modificado");
        if (colDia) {
            console.log(`[Smartsheet] ✅ Coluna "Modificado" encontrada por busca exata: "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})`);
        }
    }
    
    // Se não encontrou, tentar outras variações (MAS NUNCA substituir "Dia" se já foi encontrado)
    if (!colDia) {
        const colEncontrada = findCol((t) => {
            const lower = t.toLowerCase().trim();
            // PRIORIDADE: "dia" primeiro, depois "data"
            if (lower === "dia") {
                return true;
            }
            // Tentar "data" ou "dia" exato primeiro
            if (lower === "data") {
                return true;
            }
            // Depois tentar outras variações
            return lower.startsWith("dia") || 
                   lower.startsWith("data") ||
                   lower.includes("data início") ||
                   lower.includes("data inicio") ||
                   lower.includes("data de início") ||
                   lower.includes("data de inicio") ||
                   lower.includes("01 - data") ||
                   lower.includes("01-data") ||
                   lower.includes("01 - data início") ||
                   lower.includes("01 - data inicio") ||
                   lower.includes("01-data início") ||
                   lower.includes("01-data inicio") ||
                   (lower.includes("01") && lower.includes("data")) ||
                   (lower.includes("início") && !lower.includes("hora")) ||
                   (lower.includes("inicio") && !lower.includes("hora")) ||
                   lower.includes("date") ||
                   lower.includes("data início") ||
                   lower.includes("data inicio");
        });
        if (colEncontrada) {
            // Se encontrou "Dia", usar. Se encontrou "Data", só usar se "Dia" não foi encontrado antes
            const lowerEncontrada = colEncontrada.title.toLowerCase().trim();
            if (lowerEncontrada === "dia" || !colDia) {
                colDia = colEncontrada;
                console.log(`[Smartsheet] ✅ Coluna de data encontrada por busca flexível: "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})`);
            }
        }
    }
    
    // Se não encontrou, tentar buscar por tipo DATE ou DATETIME (MAS priorizar "Dia" se existir)
    if (!colDia) {
        // Primeiro tentar encontrar "Dia" por tipo
        const colDiaPorTipo = sheet.columns.find(c => (c.type === 'DATE' || c.type === 'DATETIME') && c.title.toLowerCase().trim() === "dia");
        if (colDiaPorTipo) {
            colDia = colDiaPorTipo;
            console.log(`[Smartsheet] ✅ Coluna "Dia" encontrada por tipo: "${colDia.title}" (Type: ${colDia.type}) ⭐ É A COLUNA DIA!`);
        } else {
            // Se não encontrou "Dia", tentar qualquer coluna DATE ou DATETIME
            const colPorTipo = sheet.columns.find(c => c.type === 'DATE' || c.type === 'DATETIME');
            if (colPorTipo) {
                colDia = colPorTipo;
                console.log(`[Smartsheet] ✅ Coluna de data encontrada por tipo: "${colDia.title}" (Type: ${colDia.type})`);
            }
        }
    }
    
    // Se ainda não encontrou, tentar buscar qualquer coluna que contenha "data", "dia", "modificado" ou "date" no nome
    // MAS priorizar "Dia" se existir
    if (!colDia) {
        // Primeiro tentar encontrar "Dia"
        const possiveisDia = sheet.columns.filter(c => {
            const lower = c.title.toLowerCase();
            return lower.includes("dia") && 
                   !lower.includes("hora") && 
                   !lower.includes("time") &&
                   lower.length <= 10; // "Dia" é curto
        });
        if (possiveisDia.length > 0) {
            colDia = possiveisDia[0];
            console.log(`[Smartsheet] ✅ Coluna "Dia" encontrada por busca ampla: "${colDia.title}" ⭐ É A COLUNA DIA!`);
        } else {
            // Se não encontrou "Dia", tentar outras opções
            const possiveis = sheet.columns.filter(c => {
                const lower = c.title.toLowerCase();
                return (lower.includes("data") || lower.includes("dia") || lower.includes("date") || lower.includes("modificado")) && 
                       !lower.includes("hora") && 
                       !lower.includes("time");
            });
            if (possiveis.length > 0) {
                colDia = possiveis[0];
                console.log(`[Smartsheet] ✅ Coluna de data encontrada por busca ampla: "${colDia.title}"`);
            }
        }
    }
    
    // Se ainda não encontrou, listar TODAS as colunas para debug
    if (!colDia) {
        console.error('[Smartsheet] ❌ COLUNA DE DATA NÃO ENCONTRADA! Todas as colunas disponíveis:');
        sheet.columns.forEach((col, idx) => {
            console.error(`  [${idx}] "${col.title}" (ID: ${col.id}, Type: ${col.type})`);
        });
    }
    const colSemana = findCol((t) => {
        const lower = t.toLowerCase().trim();
        return lower.startsWith("sema") ||
               lower.includes("semana");
    });
    const colHoraEntrada = findCol((t) => {
        const lower = t.toLowerCase().trim();
        return lower.includes("hora de entr") || 
               lower.includes("hora de entrada") ||
               lower.includes("01 - hora in") || 
               lower.includes("01 - hora início") ||
               lower.includes("hora inicio") ||
               lower.includes("hora início") ||
               lower.startsWith("01 - hora") ||
               (lower.includes("hora") && lower.includes("entrada")) ||
               (lower.includes("hora") && lower.includes("início")) ||
               (lower.includes("hora") && lower.includes("inicio"));
    });
    const colHoraSaida = findCol((t) => {
        const lower = t.toLowerCase().trim();
        return lower.includes("hora de sa") || 
               lower.includes("hora de saída") ||
               lower.includes("hora de saida") ||
               lower.includes("hora final") || 
               lower.includes("01 - hora f") ||
               lower.includes("01 - hora fim") ||
               lower.includes("hora fim") ||
               (lower.includes("final") && lower.includes("hora")) ||
               (lower.includes("hora") && lower.includes("saída")) ||
               (lower.includes("hora") && lower.includes("saida"));
    });
    const colCliente = findCol((t) => t === "cliente");
    const colProjeto = findCol((t) => t === "projeto");
    const colEscala = findCol((t) => t === "escala");
    const colTecnicoLider = findCol((t) => t.includes("técnico líder"));
    const colQtdTec = findCol((t) => (t.includes("qt") && t.includes("tec")) || t.includes("qtde téc"));
    const colNomesTec = findCol((t) => t.includes("nome dos técnicos"));
    const colSupervisor = findCol((t) => t === "supervisor");
    const colTipoIntervalo = findCol((t) => t.includes("tipo de intervalo") || t.includes("tipo intervalo"));
    const colTipoAcesso = findCol((t) => t.includes("tipo de acesso") || t.includes("tipo acesso"));
    const colPa = findCol((t) => t === "pá" || t.startsWith("pá"));
    const colTorre = findCol((t) => t.includes("wtg") || t.includes("torre"));
    const colPlataforma = findCol((t) => t === "plataforma");
    const colEquipe = findCol((t) => t === "equipe");
    const colTipoHora = findCol((t) => t.includes("tipo de hora") || t.includes("tipo hora"));
    const colQtdEventos = findCol((t) => t.includes("qtde de eventos") || t.includes("quantidade de eventos"));
    const colEtapaProcesso = findCol((t) => t.includes("etapa de processo") || t.includes("etapa processo") || t.includes("descrição de tarefas"));
    
    // Colunas de materiais
    const colTipoDano = findCol((t) => t.includes("tipo de dano"));
    const colDanoCodigo = findCol((t) => t === "dano" || t.includes("dano (código)"));
    const colLarguraDano = findCol((t) => t.includes("largura do dano"));
    const colComprimentoDano = findCol((t) => t.includes("comprimento do dano"));
    const colEtapaLixamento = findCol((t) => t.includes("etapa do lixamento") || t.includes("etapa de lixamento"));
    
    // Resina
    const colResinaTipo = findCol((t) => t.includes("qual é a resina") || t.includes("qual a resina"));
    const colResinaQuantidade = findCol((t) => t.includes("quantidade de resina"));
    const colResinaCatalisador = findCol((t) => t.includes("catalisador da resina"));
    const colResinaLote = findCol((t) => t.includes("lote da resina"));
    const colResinaValidade = findCol((t) => t.includes("data de validade da resina"));
    
    // Massa
    const colMassaTipo = findCol((t) => t.includes("massa de colagem"));
    const colMassaQuantidade = findCol((t) => t.includes("quantidade de massa"));
    const colMassaCatalisador = findCol((t) => t.includes("catalisador da massa"));
    const colMassaLote = findCol((t) => t.includes("lote da massa"));
    const colMassaValidade = findCol((t) => t.includes("data de validade da massa"));
    
    // Núcleo
    const colNucleoTipo = findCol((t) => t === "núcleo");
    const colNucleoEspessura = findCol((t) => t.includes("espessura do núcleo") || t.includes("espessura do núcleo"));
    const colNucleoTipoNucleo = findCol((t) => t.includes("tipo do núcleo"));
    
    // PU
    const colPuTipo = findCol((t) => t.includes("massa pu") || t.includes("massa pu (filler)"));
    const colPuMassaPeso = findCol((t) => t.includes("peso da massa pu"));
    const colPuCatalisadorPeso = findCol((t) => t.includes("peso do catalisador do pu"));
    const colPuLote = findCol((t) => t.includes("lote do pu"));
    const colPuValidade = findCol((t) => t.includes("data de validade do pu"));
    
    // Gel
    const colGelTipo = findCol((t) => t === "gel");
    const colGelPeso = findCol((t) => t.includes("peso do gel"));
    const colGelCatalisadorPeso = findCol((t) => t.includes("peso do catalisador do gel"));
    const colGelLote = findCol((t) => t.includes("lote do gel"));
    const colGelValidade = findCol((t) => t.includes("data de validade do gel"));
    
    // Retrabalho
    const colRetrabalho = findCol((t) => t.includes("é retrabalho") || t.includes("retrabalho"));
    
    // Função para formatar hora no formato HH:MM
    const formatarHora = (hora) => {
        if (!hora) return null;
        const str = String(hora).trim();
        
        // Se já está no formato HH:MM, retornar
        if (str.includes(":") && str.match(/^\d{1,2}:\d{2}$/)) {
            const partes = str.split(":");
            const horas = String(Number(partes[0]) || 0).padStart(2, "0");
            const minutos = String(Number(partes[1]) || 0).padStart(2, "0");
            return `${horas}:${minutos}`;
        }
        
        // Se está no formato "7h00" ou "07h00", converter para "07:00"
        if (str.includes("h") || str.includes("H")) {
            const partes = str.replace(/[hH]/g, ":").split(":");
            if (partes.length >= 2) {
                const horas = String(Number(partes[0]) || 0).padStart(2, "0");
                const minutos = String(Number(partes[1]) || 0).padStart(2, "0");
                return `${horas}:${minutos}`;
            }
        }
        
        // Tentar extrair números e formatar
        const numeros = str.match(/\d+/g);
        if (numeros && numeros.length >= 2) {
            const horas = String(Number(numeros[0]) || 0).padStart(2, "0");
            const minutos = String(Number(numeros[1]) || 0).padStart(2, "0");
            return `${horas}:${minutos}`;
        }
        
        // Se não conseguir parsear, retornar original
        return str;
    };
    const buscaValor = (row, colId) => {
        if (!colId) return null;
        const cell = row.cells.find((c) => c.columnId === colId);
        if (!cell) return null;
        
        // Para colunas de data (DATE, DATETIME) OU coluna "Dia", tentar extrair o valor correto
        const col = sheet.columns.find(c => c.id === colId);
        const isColunaDia = col && col.title.toLowerCase().trim() === "dia";
        
        // Para coluna "Dia", priorizar displayValue (pode ter formato DD/MM/YY já formatado)
        if (isColunaDia) {
            // Tentar TODOS os campos possíveis para encontrar o valor
            // 1. displayValue primeiro (pode ter formato DD/MM/YY já formatado)
            if (cell.displayValue !== null && cell.displayValue !== undefined) {
                if (typeof cell.displayValue === 'string' && cell.displayValue.trim()) {
                    return cell.displayValue.trim();
                }
                if (typeof cell.displayValue === 'number') {
                    // Se for número, pode ser timestamp - converter
                    let data = new Date(cell.displayValue);
                    if (isNaN(data.getTime()) || data.getFullYear() < 1900) {
                        const dataBase = new Date(1899, 11, 30);
                        data = new Date(dataBase.getTime() + cell.displayValue * 24 * 60 * 60 * 1000);
                    }
                    if (!isNaN(data.getTime()) && data.getFullYear() >= 1900) {
                        return data.toISOString().substring(0, 10);
                    }
                }
            }
            // 2. Tentar value
            if (cell.value !== null && cell.value !== undefined) {
                if (typeof cell.value === 'string' && cell.value.trim()) {
                    return cell.value.trim();
                }
                if (typeof cell.value === 'number') {
                    // Se for número, pode ser timestamp - converter
                    let data = new Date(cell.value);
                    if (isNaN(data.getTime()) || data.getFullYear() < 1900) {
                        const dataBase = new Date(1899, 11, 30);
                        data = new Date(dataBase.getTime() + cell.value * 24 * 60 * 60 * 1000);
                    }
                    if (!isNaN(data.getTime()) && data.getFullYear() >= 1900) {
                        return data.toISOString().substring(0, 10);
                    }
                }
                return cell.value;
            }
            // 3. Tentar objectValue
            if (cell.objectValue !== null && cell.objectValue !== undefined) {
                if (typeof cell.objectValue === 'string' && cell.objectValue.trim()) {
                    return cell.objectValue.trim();
                }
                if (cell.objectValue instanceof Date) {
                    return cell.objectValue.toISOString().substring(0, 10);
                }
                if (typeof cell.objectValue === 'number') {
                    let data = new Date(cell.objectValue);
                    if (isNaN(data.getTime()) || data.getFullYear() < 1900) {
                        const dataBase = new Date(1899, 11, 30);
                        data = new Date(dataBase.getTime() + cell.objectValue * 24 * 60 * 60 * 1000);
                    }
                    if (!isNaN(data.getTime()) && data.getFullYear() >= 1900) {
                        return cell.objectValue.toISOString().substring(0, 10);
                    }
                }
                return cell.objectValue;
            }
            return null;
        }
        
        if (col && (col.type === 'DATE' || col.type === 'DATETIME')) {
            // Para colunas de data, o Smartsheet pode retornar o valor em diferentes formatos
            if (cell.value !== null && cell.value !== undefined) {
                // Se for um número (timestamp do Excel/Smartsheet), converter
                if (typeof cell.value === 'number') {
                    // Smartsheet pode usar diferentes formatos de timestamp
                    // Tentar como milissegundos primeiro
                    let data = new Date(cell.value);
                    // Se não funcionar ou data muito antiga, tentar como dias desde 1900 (formato Excel)
                    if (isNaN(data.getTime()) || data.getFullYear() < 1900) {
                        // Excel usa dias desde 01/01/1900 (mas Excel conta 1900 como ano bissexto, então ajustar)
                        const dataBase = new Date(1899, 11, 30); // 30/12/1899
                        data = new Date(dataBase.getTime() + cell.value * 24 * 60 * 60 * 1000);
                    }
                    if (!isNaN(data.getTime()) && data.getFullYear() >= 1900) {
                        return data.toISOString().substring(0, 10);
                    }
                }
                // Se for string, tentar parsear
                if (typeof cell.value === 'string' && cell.value.trim()) {
                    return cell.value.trim();
                }
            }
            // Tentar objectValue para datas
            if (cell.objectValue !== null && cell.objectValue !== undefined) {
                if (cell.objectValue instanceof Date) {
                    return cell.objectValue.toISOString().substring(0, 10);
                }
                if (typeof cell.objectValue === 'string' && cell.objectValue.trim()) {
                    return cell.objectValue.trim();
                }
                // Se objectValue for um número (timestamp)
                if (typeof cell.objectValue === 'number') {
                    let data = new Date(cell.objectValue);
                    if (isNaN(data.getTime()) || data.getFullYear() < 1900) {
                        const dataBase = new Date(1899, 11, 30);
                        data = new Date(dataBase.getTime() + cell.objectValue * 24 * 60 * 60 * 1000);
                    }
                    if (!isNaN(data.getTime()) && data.getFullYear() >= 1900) {
                        return data.toISOString().substring(0, 10);
                    }
                }
            }
            // Tentar displayValue como último recurso para datas
            if (cell.displayValue !== null && cell.displayValue !== undefined && typeof cell.displayValue === 'string' && cell.displayValue.trim()) {
                return cell.displayValue.trim();
            }
        }
        
        // Priorizar objectValue para MULTI_PICKLIST, depois value, depois displayValue
        if (cell.objectValue !== null && cell.objectValue !== undefined) {
            if (cell.objectValue.values && Array.isArray(cell.objectValue.values)) {
                return cell.objectValue.values.join(", ");
            }
            return cell.objectValue;
        }
        // Tentar value
        if (cell.value !== null && cell.value !== undefined) {
            return cell.value;
        }
        // Tentar displayValue como último recurso
        if (cell.displayValue !== null && cell.displayValue !== undefined) {
            return cell.displayValue;
        }
        return null;
    };
    const medicoes = sheet.rows
        .map((row, index) => {
        // Pular linhas vazias (sem dados relevantes)
        // IMPORTANTE: A coluna "Dia" pode não estar presente em todas as linhas (só aparece quando equipe é expandida)
        // Então não exigir que tenha dia para considerar a linha válida
        const temDados = colProjeto && buscaValor(row, colProjeto.id) ||
            colHoraEntrada && buscaValor(row, colHoraEntrada.id) ||
            colDia && buscaValor(row, colDia.id);
        if (!temDados) {
            return null;
        }
        let dia = buscaValor(row, colDia?.id);
        
        // Se a coluna é "Modificado" e tem formato de timestamp (MM/DD/YY HH:MM), extrair só a data
        if (dia && colDia && colDia.title.toLowerCase().trim() === "modificado" && typeof dia === "string") {
            // Formato: "07/01/26 00:03" -> extrair "07/01/26"
            const partesTimestamp = dia.trim().split(" ");
            if (partesTimestamp.length > 0) {
                dia = partesTimestamp[0]; // Pegar só a parte da data
            }
        }
        
        const horaInicioRaw = buscaValor(row, colHoraEntrada?.id);
        const horaFimRaw = buscaValor(row, colHoraSaida?.id);
        const horaInicio = formatarHora(horaInicioRaw);
        const horaFim = formatarHora(horaFimRaw);
        
        // Log para debug - primeiras 5 linhas para ver padrão
        if (index < 5) {
            console.log(`[Smartsheet] 📊 Linha ${index}:`, {
                colDiaEncontrada: colDia ? `"${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})` : '❌ NÃO ENCONTRADA',
                diaRaw: dia,
                diaTipo: typeof dia,
                horaInicio: horaInicio,
                horaFim: horaFim,
                projeto: buscaValor(row, colProjeto?.id),
                semana: buscaValor(row, colSemana?.id),
            });
            
            // Se não tem dia mas tem coluna de data, investigar a célula em detalhes
            if (!dia && colDia) {
                const cell = row.cells.find((c) => c.columnId === colDia.id);
                if (cell) {
                    console.warn(`[Smartsheet] ⚠️ Linha ${index} - Célula de data encontrada mas vazia:`, JSON.stringify({
                        cellValue: cell.value,
                        cellDisplayValue: cell.displayValue,
                        cellObjectValue: cell.objectValue,
                        cellType: typeof cell.value,
                        cellColumnId: cell.columnId,
                        colDiaId: colDia.id
                    }, null, 2));
                } else {
                    console.warn(`[Smartsheet] ⚠️ Linha ${index} - Célula de data não encontrada na linha. Coluna ID esperada: ${colDia.id}`);
                    // Listar todas as células da linha para debug
                    console.log(`[Smartsheet] 🔬 Todas as células da linha ${index}:`, row.cells.map(c => {
                        const col = sheet.columns.find(col => col.id === c.columnId);
                        return {
                            columnTitle: col ? col.title : 'DESCONHECIDA',
                            columnId: c.columnId,
                            value: c.value,
                            displayValue: c.displayValue,
                            objectValue: c.objectValue
                        };
                    }));
                }
            }
        }
        
        // Log para debug - primeira linha com todas as células
        if (index === 0) {
            console.log('[Smartsheet] 🔍 Mapeamento de colunas:', {
                colDiaEncontrada: colDia ? `✅ "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})` : '❌ NÃO ENCONTRADA',
                colHoraEntradaEncontrada: colHoraEntrada ? `✅ "${colHoraEntrada.title}" (ID: ${colHoraEntrada.id})` : '❌ NÃO ENCONTRADA',
                colHoraSaidaEncontrada: colHoraSaida ? `✅ "${colHoraSaida.title}" (ID: ${colHoraSaida.id})` : '❌ NÃO ENCONTRADA',
            });
            
            // Se coluna de data não foi encontrada, listar colunas que podem ser de data
            if (!colDia) {
                console.warn('[Smartsheet] ⚠️ Coluna de data NÃO encontrada! Procurando colunas similares...');
                const possiveisColunasData = sheet.columns.filter(c => {
                    const lower = c.title.toLowerCase();
                    return lower.includes("data") || lower.includes("dia") || lower.includes("date") || lower.includes("início") || lower.includes("inicio");
                });
                if (possiveisColunasData.length > 0) {
                    console.warn('[Smartsheet] Colunas que podem ser de data:', possiveisColunasData.map(c => `"${c.title}" (ID: ${c.id}, Type: ${c.type})`));
                }
            }
            
            console.log('[Smartsheet] 📊 Primeira linha processada:', {
                diaRaw: dia,
                diaTipo: typeof dia,
                horaInicioRaw: horaInicioRaw,
                horaFimRaw: horaFimRaw,
                horaInicioFormatada: horaInicio,
                horaFimFormatada: horaFim,
                projeto: buscaValor(row, colProjeto?.id),
                semana: buscaValor(row, colSemana?.id),
                equipe: buscaValor(row, colEquipe?.id)
            });
            
            // Log todas as células da primeira linha para debug
            console.log('[Smartsheet] 🔬 Todas as células da primeira linha:');
            row.cells.forEach((cell, idx) => {
                const col = sheet.columns.find(c => c.id === cell.columnId);
                if (col) {
                    const valor = cell.value ?? cell.displayValue ?? cell.objectValue ?? 'VAZIO';
                    console.log(`  [${idx}] Coluna: "${col.title}" (ID: ${col.id}, Type: ${col.type}) = ${JSON.stringify(valor)}`);
                }
            });
        }
        
        // Se não tem pelo menos dia ou horas, pular
        if (!dia && !horaInicio) {
            return null;
        }
        
        // Log se tem horas mas não tem dia (primeiras 5 linhas)
        if (horaInicio && !dia && index < 5) {
            console.warn(`[Smartsheet] ⚠️ Linha ${index}: Tem hora (${horaInicio}) mas NÃO tem data. Coluna de data: ${colDia ? `"${colDia.title}" (Type: ${colDia.type})` : 'NÃO ENCONTRADA'}`);
        }
        
        // Log para debug se horas não foram encontradas
        if (!horaInicio && colHoraEntrada) {
            console.warn(`[Smartsheet] ⚠️ Hora início não encontrada na linha ${row.id || index}. Coluna encontrada: ${colHoraEntrada.title} (ID: ${colHoraEntrada.id})`);
        }
        if (!horaFim && colHoraSaida) {
            console.warn(`[Smartsheet] ⚠️ Hora fim não encontrada na linha ${row.id || index}. Coluna encontrada: ${colHoraSaida.title} (ID: ${colHoraSaida.id})`);
        }
        // Log para debug se data não foi encontrada
        if (!dia && colDia) {
            console.warn(`[Smartsheet] ⚠️ Data/Dia não encontrada na linha ${row.id || index}. Coluna encontrada: ${colDia.title} (ID: ${colDia.id})`);
        }
        // Converter data se necessário
        let diaFormatado = null;
        if (dia) {
            if (typeof dia === "string") {
                // IMPORTANTE: A coluna "Dia" do Smartsheet usa formato brasileiro DD/MM/YY
                // Exemplos: "13/10/25", "29/11/25"
                const partes = dia.trim().split("/");
                if (partes.length === 3) {
                    // Verificar se é formato brasileiro (DD/MM/YY) ou americano (MM/DD/YY)
                    const primeiro = parseInt(partes[0]);
                    const segundo = parseInt(partes[1]);
                    
                    let diaNum, mesNum, anoStr;
                    
                    if (primeiro > 12) {
                        // Definitivamente formato brasileiro: DD/MM/YY
                        diaNum = partes[0];
                        mesNum = partes[1];
                        anoStr = partes[2];
                    } else if (segundo > 12) {
                        // Definitivamente formato americano: MM/DD/YY
                        mesNum = partes[0];
                        diaNum = partes[1];
                        anoStr = partes[2];
                    } else {
                        // Ambíguo - se a coluna se chama "Dia", assumir formato brasileiro DD/MM/YY
                        if (colDia && colDia.title.toLowerCase().trim() === "dia") {
                            diaNum = partes[0];
                            mesNum = partes[1];
                            anoStr = partes[2];
                        } else {
                            // Caso contrário, assumir formato americano MM/DD/YY
                            mesNum = partes[0];
                            diaNum = partes[1];
                            anoStr = partes[2];
                        }
                    }
                    
                    // Se o ano tem 2 dígitos, assumir 20XX
                    const ano = anoStr.length === 2 ? `20${anoStr}` : anoStr;
                    diaFormatado = `${ano}-${mesNum.padStart(2, '0')}-${diaNum.padStart(2, '0')}`;
                    
                    // Log para debug nas primeiras linhas
                    if (index < 3) {
                        console.log(`[Smartsheet] 📅 Linha ${index}: Data parseada: "${dia}" -> "${diaFormatado}" (formato: ${primeiro > 12 ? 'DD/MM/YY' : segundo > 12 ? 'MM/DD/YY' : 'ambíguo'})`);
                    }
                }
                // Tentar formato ISO YYYY-MM-DD
                else if (dia.match(/^\d{4}-\d{2}-\d{2}/)) {
                    diaFormatado = dia.substring(0, 10);
                }
                else {
                    // Tentar parsear como Date
                    const dataParseada = new Date(dia);
                    if (!isNaN(dataParseada.getTime())) {
                        diaFormatado = dataParseada.toISOString().substring(0, 10);
                    } else {
                        // Log se não conseguir parsear
                        if (index < 3) {
                            console.warn(`[Smartsheet] ⚠️ Não foi possível parsear data: "${dia}" (linha ${index})`);
                        }
                        diaFormatado = dia;
                    }
                }
            }
            else if (dia instanceof Date) {
                diaFormatado = dia.toISOString().substring(0, 10);
            }
            else {
                // Se for número (timestamp), converter
                const dataParseada = new Date(dia);
                if (!isNaN(dataParseada.getTime())) {
                    diaFormatado = dataParseada.toISOString().substring(0, 10);
                } else {
                    if (index < 3) {
                        console.warn(`[Smartsheet] ⚠️ Não foi possível converter timestamp para data: ${dia} (linha ${index})`);
                    }
                }
            }
        } else {
            // Se não tem dia mas tem hora, logar para debug
            if (horaInicio && index < 3) {
                console.warn(`[Smartsheet] ⚠️ Linha ${index} tem hora (${horaInicio}) mas não tem data. Coluna de data: ${colDia ? colDia.title : 'NÃO ENCONTRADA'}`);
            }
        }
        
        // Log se diaFormatado está null mas deveria ter valor
        if (!diaFormatado && dia && index < 3) {
            console.warn(`[Smartsheet] ⚠️ Linha ${index}: dia existe (${dia}, tipo: ${typeof dia}) mas diaFormatado é null após parsing`);
        }
        
        return {
            id: row.id || index,
            data: new Date().toISOString(),
            dia: diaFormatado,
            semana: buscaValor(row, colSemana?.id),
            cliente: buscaValor(row, colCliente?.id),
            projeto: buscaValor(row, colProjeto?.id),
            escala: buscaValor(row, colEscala?.id),
            tecnicoLider: buscaValor(row, colTecnicoLider?.id),
            quantidadeTecnicos: buscaValor(row, colQtdTec?.id) ? Number(buscaValor(row, colQtdTec.id)) : null,
            nomesTecnicos: buscaValor(row, colNomesTec?.id),
            supervisor: buscaValor(row, colSupervisor?.id),
            tipoIntervalo: buscaValor(row, colTipoIntervalo?.id),
            tipoAcesso: buscaValor(row, colTipoAcesso?.id),
            pa: buscaValor(row, colPa?.id),
            torre: buscaValor(row, colTorre?.id),
            plataforma: buscaValor(row, colPlataforma?.id),
            equipe: buscaValor(row, colEquipe?.id),
            tipoHora: buscaValor(row, colTipoHora?.id),
            quantidadeEventos: buscaValor(row, colQtdEventos?.id) ? Number(buscaValor(row, colQtdEventos.id)) : null,
            horaInicio: horaInicio,
            horaFim: horaFim,
            tipoDano: buscaValor(row, colTipoDano?.id),
            danoCodigo: buscaValor(row, colDanoCodigo?.id),
            larguraDanoMm: buscaValor(row, colLarguraDano?.id) ? Number(buscaValor(row, colLarguraDano.id)) : null,
            comprimentoDanoMm: buscaValor(row, colComprimentoDano?.id) ? Number(buscaValor(row, colComprimentoDano.id)) : null,
            etapaProcesso: buscaValor(row, colEtapaProcesso?.id),
            etapaLixamento: buscaValor(row, colEtapaLixamento?.id),
            resinaTipo: buscaValor(row, colResinaTipo?.id),
            resinaQuantidade: buscaValor(row, colResinaQuantidade?.id) ? Number(buscaValor(row, colResinaQuantidade.id)) : null,
            resinaCatalisador: buscaValor(row, colResinaCatalisador?.id),
            resinaLote: buscaValor(row, colResinaLote?.id),
            resinaValidade: buscaValor(row, colResinaValidade?.id),
            massaTipo: buscaValor(row, colMassaTipo?.id),
            massaQuantidade: buscaValor(row, colMassaQuantidade?.id) ? Number(buscaValor(row, colMassaQuantidade.id)) : null,
            massaCatalisador: buscaValor(row, colMassaCatalisador?.id),
            massaLote: buscaValor(row, colMassaLote?.id),
            massaValidade: buscaValor(row, colMassaValidade?.id),
            nucleoTipo: buscaValor(row, colNucleoTipo?.id),
            nucleoEspessuraMm: buscaValor(row, colNucleoEspessura?.id) ? Number(buscaValor(row, colNucleoEspessura.id)) : null,
            nucleoTipoNucleo: buscaValor(row, colNucleoTipoNucleo?.id),
            puTipo: buscaValor(row, colPuTipo?.id),
            puMassaPeso: buscaValor(row, colPuMassaPeso?.id) ? Number(buscaValor(row, colPuMassaPeso.id)) : null,
            puCatalisadorPeso: buscaValor(row, colPuCatalisadorPeso?.id) ? Number(buscaValor(row, colPuCatalisadorPeso.id)) : null,
            puLote: buscaValor(row, colPuLote?.id),
            puValidade: buscaValor(row, colPuValidade?.id),
            gelTipo: buscaValor(row, colGelTipo?.id),
            gelPeso: buscaValor(row, colGelPeso?.id) ? Number(buscaValor(row, colGelPeso.id)) : null,
            gelCatalisadorPeso: buscaValor(row, colGelCatalisadorPeso?.id) ? Number(buscaValor(row, colGelCatalisadorPeso.id)) : null,
            gelLote: buscaValor(row, colGelLote?.id),
            gelValidade: buscaValor(row, colGelValidade?.id),
            retrabalho: buscaValor(row, colRetrabalho?.id) ? (buscaValor(row, colRetrabalho.id).toLowerCase() === "sim") : null,
            material: null,
            quantidadeConsumida: 0,
        };
    })
        .filter((m) => m !== null);
    return medicoes;
}
