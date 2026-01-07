"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const client_1 = require("@prisma/client");
const smartsheetService_1 = require("./smartsheetService");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// Porta do backend principal deste portal.
// Deixamos 4001 para não conflitar com o servidor de passagens (3001).
const PORT = process.env.PORT || 4001;
// Logar problemas de conexão com o banco mais cedo (ajuda a diagnosticar "fica carregando")
async function conectarBancoComTimeout(ms) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ao conectar no banco após ${ms}ms`)), ms));
    await Promise.race([prisma.$connect(), timeout]);
}
// CORS: configurar ANTES do helmet para evitar conflitos
app.use((0, cors_1.default)({
    origin: [
        'https://gwind-app-test.netlify.app',
        'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));
// Aumentar limite de tamanho do body para permitir importações grandes
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Configurar multer para upload de arquivos
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Healthcheck
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Healthcheck com banco (para diagnosticar Render/Supabase)
app.get("/health/db", async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.json({ status: "ok", db: "ok" });
    }
    catch (e) {
        console.error("[DB] Healthcheck falhou:", e?.message);
        res.status(503).json({ status: "ok", db: "erro", detalhes: e?.message });
    }
});
// Listar materiais com saldo calculado
app.get("/materiais", async (_req, res) => {
    try {
        const materiais = await prisma.material.findMany({
            orderBy: { descricao: "asc" },
        });
        res.json(materiais);
    }
    catch (e) {
        console.error("[Materiais] Erro ao listar materiais:", e?.message);
        res.status(503).json({
            error: "Erro ao acessar o banco para listar materiais.",
            detalhes: e?.message,
        });
    }
});
// Criar/atualizar material
app.post("/materiais", async (req, res) => {
    try {
        console.log("[POST /materiais] Requisição recebida:", req.body);
        const { codigoItem, descricao, unidade, estoqueInicial } = req.body;
        if (!codigoItem || !descricao || !unidade) {
            console.log("[POST /materiais] ❌ Dados incompletos");
            return res.status(400).json({ error: "Dados do material incompletos." });
        }
        const valorEstoqueInicial = Number(estoqueInicial ?? 0);
        // Se codigoProjeto não for fornecido, usa null (permite ter materiais sem projeto)
        const codigoProjetoValue = req.body.codigoProjeto || null;
        
        console.log("[POST /materiais] Buscando material existente...");
        // Buscar material existente por codigoItem e codigoProjeto (se fornecido)
        const materialExistente = await prisma.material.findFirst({
            where: {
                codigoItem: codigoItem,
                codigoProjeto: codigoProjetoValue,
            },
        });
        
        let material;
        if (materialExistente) {
            console.log("[POST /materiais] Material encontrado, atualizando...");
            material = await prisma.material.update({
                where: { id: materialExistente.id },
                data: {
                    descricao,
                    unidade,
                    estoqueInicial: valorEstoqueInicial,
                    estoqueAtual: valorEstoqueInicial,
                    codigoProjeto: codigoProjetoValue,
                },
            });
            console.log("[POST /materiais] ✅ Material atualizado:", material.id);
        } else {
            console.log("[POST /materiais] Material não encontrado, criando novo...");
            material = await prisma.material.create({
                data: {
                    codigoItem,
                    descricao,
                    unidade,
                    estoqueInicial: valorEstoqueInicial,
                    estoqueAtual: valorEstoqueInicial,
                    codigoProjeto: codigoProjetoValue,
                },
            });
            console.log("[POST /materiais] ✅ Material criado:", material.id);
        }
        
        res.json(material);
    } catch (error) {
        console.error("[POST /materiais] ❌ Erro:", error);
        console.error("[POST /materiais] ❌ Stack:", error?.stack);
        res.status(500).json({ 
            error: "Erro ao salvar material.", 
            detalhes: error?.message,
            code: error?.code 
        });
    }
});
// Atualizar material/estoque por ID (usado pela tela de Estoque)
app.put("/materiais/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: "ID inválido." });
        }
        const dados = {};
        if (typeof req.body?.codigoItem === "string" && req.body.codigoItem.trim())
            dados.codigoItem = req.body.codigoItem.trim();
        if (typeof req.body?.descricao === "string")
            dados.descricao = req.body.descricao;
        if (typeof req.body?.unidade === "string")
            dados.unidade = req.body.unidade;
        if (req.body?.estoqueInicial !== undefined)
            dados.estoqueInicial = Number(req.body.estoqueInicial);
        if (req.body?.estoqueAtual !== undefined)
            dados.estoqueAtual = Number(req.body.estoqueAtual);
        if (req.body?.codigoProjeto !== undefined)
            dados.codigoProjeto = req.body.codigoProjeto || null;
        if (req.body?.descricaoProjeto !== undefined)
            dados.descricaoProjeto = req.body.descricaoProjeto || null;
        // Evitar update vazio
        if (Object.keys(dados).length === 0) {
            return res.status(400).json({ error: "Nenhum campo para atualizar." });
        }
        
        console.log(`[PUT /materiais/${id}] Atualizando material com dados:`, dados);
        
        const material = await prisma.material.update({
            where: { id },
            data: dados,
        });
        
        console.log(`[PUT /materiais/${id}] ✅ Material atualizado:`, material);
        res.json(material);
    }
    catch (e) {
        console.error("[Materiais] Erro ao atualizar material:", e?.message);
        res.status(500).json({ error: "Erro ao atualizar material.", detalhes: e?.message });
    }
});
// Remover material por ID
app.delete("/materiais/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: "ID inválido." });
        }
        // Apagar medições do material primeiro (FK)
        await prisma.medicao.deleteMany({ where: { materialId: id } });
        await prisma.material.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error("[Materiais] Erro ao remover material:", e?.message);
        res.status(500).json({ error: "Erro ao remover material.", detalhes: e?.message });
    }
});
// Importar vários materiais de uma vez
app.post("/materiais/import", async (req, res) => {
    try {
        const itens = req.body?.itens;
        if (!Array.isArray(itens) || itens.length === 0) {
            return res
                .status(400)
                .json({ error: "Envie um array 'itens' com pelo menos um material." });
        }
        console.log(`[Import] Recebidos ${itens.length} itens para importar`);
        const resultados = [];
        const erros = [];
        for (const item of itens) {
            if (!item.codigoItem || !item.descricao || !item.unidade) {
                // pula itens inválidos, mas continua importação
                continue;
            }
            try {
                const valorEstoqueInicial = Number(item.estoqueInicial ?? 0);
                const codigoProjetoValue = item.codigoProjeto || "";
                const material = await prisma.material.upsert({
                    where: {
                        codigoItem_codigoProjeto: {
                            codigoItem: item.codigoItem,
                            codigoProjeto: codigoProjetoValue,
                        },
                    },
                    update: {
                        descricao: item.descricao,
                        unidade: item.unidade,
                        estoqueInicial: valorEstoqueInicial,
                        estoqueAtual: valorEstoqueInicial,
                        codigoEstoque: item.codigoEstoque || undefined,
                        descricaoEstoque: item.descricaoEstoque || undefined,
                        confirmado: item.confirmado ?? undefined,
                        pedido: item.pedido ?? undefined,
                        disponivel: item.disponivel ?? undefined,
                        precoItem: item.precoItem ?? undefined,
                        total: item.total ?? undefined,
                        codigoProjeto: codigoProjetoValue || undefined,
                        descricaoProjeto: item.descricaoProjeto || undefined,
                        centroCustos: item.centroCustos || undefined,
                    },
                    create: {
                        codigoItem: item.codigoItem,
                        descricao: item.descricao,
                        unidade: item.unidade,
                        estoqueInicial: valorEstoqueInicial,
                        estoqueAtual: valorEstoqueInicial,
                        codigoEstoque: item.codigoEstoque || undefined,
                        descricaoEstoque: item.descricaoEstoque || undefined,
                        confirmado: item.confirmado ?? undefined,
                        pedido: item.pedido ?? undefined,
                        disponivel: item.disponivel ?? undefined,
                        precoItem: item.precoItem ?? undefined,
                        total: item.total ?? undefined,
                        codigoProjeto: codigoProjetoValue || undefined,
                        descricaoProjeto: item.descricaoProjeto || undefined,
                        centroCustos: item.centroCustos || undefined,
                    },
                });
                resultados.push(material);
            }
            catch (e) {
                const erroMsg = `Erro ao salvar ${item.codigoItem}: ${e.message}`;
                console.error(`[Import] ${erroMsg}`);
                erros.push(erroMsg);
            }
        }
        console.log(`[Import] Importados ${resultados.length} de ${itens.length} itens`);
        if (erros.length > 0) {
            console.error(`[Import] ${erros.length} erros durante importação`);
        }
        res.json({
            quantidadeImportada: resultados.length,
            materiais: resultados,
            erros: erros.length > 0 ? erros : undefined
        });
    }
    catch (e) {
        console.error("[Import] Erro geral na importação:", e.message);
        console.error("[Import] Stack:", e.stack);
        res.status(500).json({
            error: "Erro ao importar materiais.",
            detalhes: e.message
        });
    }
});
// Importar materiais a partir do Smartsheet
app.post("/materiais/import-smartsheet", async (_req, res) => {
    try {
        const itens = await (0, smartsheetService_1.importarMateriaisDoSmartsheet)();
        const resultados = [];
        for (const item of itens) {
            const codigoProjetoValue = item.codigoProjeto || "";
            const material = await prisma.material.upsert({
                where: {
                    codigoItem_codigoProjeto: {
                        codigoItem: item.codigoItem,
                        codigoProjeto: codigoProjetoValue,
                    },
                },
                update: {
                    descricao: item.descricao,
                    unidade: item.unidade,
                    estoqueInicial: item.estoqueInicial,
                    estoqueAtual: item.estoqueInicial,
                    codigoProjeto: codigoProjetoValue || undefined,
                },
                create: {
                    codigoItem: item.codigoItem,
                    descricao: item.descricao,
                    unidade: item.unidade,
                    estoqueInicial: item.estoqueInicial,
                    estoqueAtual: item.estoqueInicial,
                    codigoProjeto: codigoProjetoValue || undefined,
                },
            });
            resultados.push(material);
        }
        res.json({
            quantidadeImportada: resultados.length,
            materiais: resultados,
        });
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error("[Smartsheet] Erro ao importar materiais:", e.message);
        res
            .status(500)
            .json({ error: "Erro ao importar materiais do Smartsheet." });
    }
});
// Importar materiais a partir de arquivo Excel
app.post("/materiais/import-excel", upload.single("arquivo"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }
        // Ler o arquivo Excel
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        if (dados.length < 2) {
            return res.status(400).json({ error: "O arquivo Excel está vazio ou não possui dados." });
        }
        // Primeira linha são os cabeçalhos
        const cabecalhos = dados[0].map((h) => String(h || "").trim().toLowerCase());
        // Mapear índices das colunas pelo nome (flexível)
        const encontrarIndice = (palavras) => {
            for (const palavra of palavras) {
                const idx = cabecalhos.findIndex((h) => h.includes(palavra.toLowerCase()));
                if (idx !== -1)
                    return idx;
            }
            return -1;
        };
        // Mapear todas as colunas da planilha
        const idxCodigoEstoque = encontrarIndice(["código do estoque", "codigo do estoque", "código estoque", "codigo estoque"]);
        const idxDescricaoEstoque = encontrarIndice(["descrição do e", "descricao do e", "descrição estoque", "descricao estoque"]);
        const idxCodigo = encontrarIndice(["nº do item", "numero do item", "número do item", "nº item", "numero item", "número item", "codigo", "código", "item"]);
        const idxDescricao = encontrarIndice(["descrição do item", "descricao do item", "descrição item", "descricao item", "descrição", "descricao", "desc"]);
        const idxUnidade = encontrarIndice(["unidade de medida", "unidade medida", "unidade", "medida", "um"]);
        const idxEstoque = encontrarIndice(["em estoque", "estoque", "disponível", "disponivel", "quantidade"]);
        const idxConfirmado = encontrarIndice(["confirmado"]);
        const idxPedido = encontrarIndice(["pedido"]);
        const idxDisponivel = encontrarIndice(["disponível", "disponivel"]);
        const idxPrecoItem = encontrarIndice(["preço do item", "preco do item", "preço item", "preco item", "preço", "preco", "valor"]);
        const idxTotal = encontrarIndice(["total"]);
        const idxCodigoProjeto = encontrarIndice(["cód. projeto", "cod. projeto", "codigo projeto", "código projeto", "projeto"]);
        const idxDescricaoProjeto = encontrarIndice(["desc. projeto", "desc projeto", "descrição projeto", "descricao projeto"]);
        const idxCentroCustos = encontrarIndice(["centro de custos", "centro custos", "dimensão 1", "dimensao 1"]);
        if (idxCodigo === -1 || idxDescricao === -1) {
            return res.status(400).json({
                error: "Não foi possível identificar as colunas 'Nº do item' e 'Descrição do item' no arquivo."
            });
        }
        const resultados = [];
        const erros = [];
        // Função auxiliar para converter números (formato brasileiro: 1.000,50)
        const converterNumero = (valor) => {
            if (valor === null || valor === undefined || valor === "")
                return null;
            try {
                const str = String(valor).trim();
                if (!str)
                    return null;
                const limpo = str
                    .replace(/\./g, "") // Remove pontos (separadores de milhar)
                    .replace(",", ".") // Substitui vírgula por ponto
                    .replace(/[^\d.-]/g, ""); // Remove caracteres não numéricos exceto ponto e menos
                const num = parseFloat(limpo);
                return isNaN(num) ? null : num;
            }
            catch {
                return null;
            }
        };
        // Processar linhas de dados (pular cabeçalho)
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            const codigoItem = String(linha[idxCodigo] || "").trim();
            const descricao = String(linha[idxDescricao] || "").trim();
            const unidade = idxUnidade !== -1 ? String(linha[idxUnidade] || "").trim() : "KG";
            const estoqueStr = idxEstoque !== -1 ? String(linha[idxEstoque] || "0").trim() : "0";
            // Validar dados obrigatórios
            if (!codigoItem || !descricao) {
                erros.push(`Linha ${i + 1}: Código ou descrição vazios`);
                continue;
            }
            // Extrair todos os campos
            const codigoEstoque = idxCodigoEstoque !== -1 ? String(linha[idxCodigoEstoque] || "").trim() : null;
            const descricaoEstoque = idxDescricaoEstoque !== -1 ? String(linha[idxDescricaoEstoque] || "").trim() : null;
            const estoqueInicial = converterNumero(estoqueStr) || 0;
            const confirmado = idxConfirmado !== -1 ? converterNumero(linha[idxConfirmado]) : null;
            const pedido = idxPedido !== -1 ? converterNumero(linha[idxPedido]) : null;
            const disponivel = idxDisponivel !== -1 ? converterNumero(linha[idxDisponivel]) : null;
            const precoItem = idxPrecoItem !== -1 ? converterNumero(linha[idxPrecoItem]) : null;
            const total = idxTotal !== -1 ? converterNumero(linha[idxTotal]) : null;
            const codigoProjeto = idxCodigoProjeto !== -1 ? String(linha[idxCodigoProjeto] || "").trim() : null;
            const descricaoProjeto = idxDescricaoProjeto !== -1 ? String(linha[idxDescricaoProjeto] || "").trim() : null;
            const centroCustos = idxCentroCustos !== -1 ? String(linha[idxCentroCustos] || "").trim() : null;
            try {
                const codigoProjetoValue = codigoProjeto || "";
                const material = await prisma.material.upsert({
                    where: {
                        codigoItem_codigoProjeto: {
                            codigoItem,
                            codigoProjeto: codigoProjetoValue,
                        },
                    },
                    update: {
                        descricao,
                        unidade: unidade || "KG",
                        estoqueInicial,
                        estoqueAtual: estoqueInicial, // Atualiza estoque atual também
                        codigoEstoque: codigoEstoque || undefined,
                        descricaoEstoque: descricaoEstoque || undefined,
                        confirmado: confirmado ?? undefined,
                        pedido: pedido ?? undefined,
                        disponivel: disponivel ?? undefined,
                        precoItem: precoItem ?? undefined,
                        total: total ?? undefined,
                        codigoProjeto: codigoProjetoValue || undefined,
                        descricaoProjeto: descricaoProjeto || undefined,
                        centroCustos: centroCustos || undefined,
                    },
                    create: {
                        codigoItem,
                        descricao,
                        unidade: unidade || "KG",
                        estoqueInicial,
                        estoqueAtual: estoqueInicial,
                        codigoEstoque: codigoEstoque || undefined,
                        descricaoEstoque: descricaoEstoque || undefined,
                        confirmado: confirmado ?? undefined,
                        pedido: pedido ?? undefined,
                        disponivel: disponivel ?? undefined,
                        precoItem: precoItem ?? undefined,
                        total: total ?? undefined,
                        codigoProjeto: codigoProjetoValue || undefined,
                        descricaoProjeto: descricaoProjeto || undefined,
                        centroCustos: centroCustos || undefined,
                    },
                });
                resultados.push(material);
            }
            catch (e) {
                erros.push(`Linha ${i + 1}: ${e.message}`);
            }
        }
        if (resultados.length === 0) {
            return res.status(400).json({
                error: "Nenhum material foi importado. Verifique o formato do arquivo.",
                erros: erros.slice(0, 10) // Limita a 10 erros
            });
        }
        res.json({
            quantidadeImportada: resultados.length,
            materiais: resultados,
            erros: erros.length > 0 ? erros.slice(0, 10) : undefined,
        });
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error("[Excel] Erro ao importar materiais:", e.message);
        res.status(500).json({
            error: "Erro ao processar arquivo Excel.",
            detalhes: e.message
        });
    }
});
// Registrar medição/consumo de material
app.post("/medicoes", async (req, res) => {
    const { codigoItem, quantidadeConsumida, projeto, torre, usuarioId, origem, 
    // novos campos do formulário completo (todos opcionais)
    dia, semana, cliente, escala, quantidadeTecnicos, tecnicoLider, nomesTecnicos, supervisor, tipoIntervalo, tipoAcesso, pa, plataforma, equipe, tipoHora, quantidadeEventos, horaInicio, horaFim, tipoDano, danoCodigo, larguraDanoMm, comprimentoDanoMm, etapaProcesso, etapaLixamento, resinaTipo, resinaQuantidade, resinaCatalisador, resinaLote, resinaValidade, massaTipo, massaQuantidade, massaCatalisador, massaLote, massaValidade, nucleoTipo, nucleoEspessuraMm, puTipo, puMassaPeso, puCatalisadorPeso, puLote, puValidade, gelTipo, gelPeso, gelCatalisadorPeso, gelLote, gelValidade, retrabalho, } = req.body;
    
    // Projeto é obrigatório, mas codigoItem e quantidadeConsumida são opcionais
    // (para etapas que não consomem material, como "Remoção de núcleo")
    if (!projeto) {
        return res.status(400).json({ error: "Projeto é obrigatório." });
    }
    
    var material = null;
    var quantidade = 0;
    
    // Se houver codigoItem, buscar material e validar
    if (codigoItem && quantidadeConsumida) {
        // Buscar material considerando projeto (o mesmo item pode existir em projetos diferentes)
        // Regra:
        // 1) tenta por (codigoItem + codigoProjeto == projeto)
        // 2) fallback: (codigoItem + codigoProjeto == null)
        // 3) fallback: primeiro por codigoItem (compatibilidade)
        material = (await prisma.material.findFirst({
            where: { codigoItem, codigoProjeto: projeto },
        })) ||
            (await prisma.material.findFirst({
                where: { codigoItem, codigoProjeto: null },
            })) ||
            (await prisma.material.findFirst({
                where: { codigoItem },
            }));
        if (!material) {
            return res.status(404).json({ error: "Material não encontrado." });
        }
        quantidade = Number(quantidadeConsumida);
    } else {
        // Para etapas sem consumo de material, criar ou buscar material genérico "SEM_MATERIAL"
        material = await prisma.material.findFirst({
            where: { codigoItem: "SEM_MATERIAL" },
        });
        if (!material) {
            // Criar material genérico se não existir
            material = await prisma.material.create({
                data: {
                    codigoItem: "SEM_MATERIAL",
                    descricao: "Sem consumo de material (etapas sem apontamento)",
                    unidade: "UN",
                    estoqueInicial: 0,
                    estoqueAtual: 0,
                    codigoProjeto: null,
                },
            });
        }
        quantidade = 0; // Sem consumo de material
    }
    const medicao = await prisma.$transaction(async (tx) => {
        const novaMedicao = await tx.medicao.create({
            data: {
                materialId: material.id,
                quantidadeConsumida: quantidade,
                projeto,
                torre,
                usuarioId,
                origem: origem ?? "mobile",
                dia: dia ? new Date(dia) : null,
                semana,
                cliente,
                escala,
                quantidadeTecnicos,
                tecnicoLider,
                nomesTecnicos,
                supervisor,
                tipoIntervalo,
                tipoAcesso,
                pa,
                plataforma,
                equipe,
                tipoHora,
                quantidadeEventos,
                horaInicio,
                horaFim,
                tipoDano,
                danoCodigo,
                larguraDanoMm,
                comprimentoDanoMm,
                etapaProcesso,
                etapaLixamento,
                resinaTipo,
                resinaQuantidade,
                resinaCatalisador,
                resinaLote,
                resinaValidade,
                massaTipo,
                massaQuantidade,
                massaCatalisador,
                massaLote,
                massaValidade,
                nucleoTipo,
                nucleoEspessuraMm,
                puTipo,
                puMassaPeso,
                puCatalisadorPeso,
                puLote,
                puValidade,
                gelTipo,
                gelPeso,
                gelCatalisadorPeso,
                gelLote,
                gelValidade,
                retrabalho,
            },
        });
        // Atualizar estoque apenas se houver consumo de material (quantidade > 0)
        if (quantidade > 0 && material.codigoItem !== "SEM_MATERIAL") {
            await tx.material.update({
                where: { id: material.id },
                data: {
                    estoqueAtual: material.estoqueAtual - quantidade,
                },
            });
        }
        return novaMedicao;
    });
    // Envia a medição para o Smartsheet de forma assíncrona, sem bloquear a resposta
    (0, smartsheetService_1.registrarMedicaoNoSmartsheet)({
        dia: dia ? new Date(dia) : null,
        semana,
        cliente,
        projeto,
        escala,
        tecnicoLider,
        quantidadeTecnicos,
        nomesTecnicos,
        supervisor,
        tipoIntervalo,
        tipoAcesso,
        pa,
        plataforma,
        equipe,
        tipoHora,
        quantidadeEventos,
        horaInicio,
        horaFim,
        tipoDano,
        danoCodigo,
        larguraDanoMm,
        comprimentoDanoMm,
        etapaProcesso,
        etapaLixamento,
        resinaTipo,
        resinaQuantidade,
        resinaCatalisador,
        resinaLote,
        resinaValidade,
        massaTipo,
        massaQuantidade,
        massaCatalisador,
        massaLote,
        massaValidade,
        nucleoTipo,
        nucleoEspessuraMm,
        puTipo,
        puMassaPeso,
        puCatalisadorPeso,
        puLote,
        puValidade,
        gelTipo,
        gelPeso,
        gelCatalisadorPeso,
        gelLote,
        gelValidade,
        retrabalho,
    }).catch((e) => {
        // eslint-disable-next-line no-console
        console.error("[Smartsheet] Falha ao enviar medição:", e.message);
    });
    res.status(201).json(medicao);
});
// Listar medições (visão tipo grid)
app.get("/medicoes", async (_req, res) => {
    try {
        const medicoes = await prisma.medicao.findMany({
            include: { material: true },
            orderBy: { id: "desc" },
            take: 500, // limitar para não pesar; depois podemos paginar
        });
        res.json(medicoes);
    }
    catch (e) {
        console.error("[Medicoes] Erro ao listar medições:", e?.message);
        res.status(503).json({
            error: "Erro ao acessar o banco para listar medições.",
            detalhes: e?.message,
        });
    }
});
// Limpar todos os dados (materiais e medições) - CUIDADO: Esta ação é irreversível!
app.delete("/materiais/limpar-tudo", async (_req, res) => {
    try {
        // Deletar primeiro as medições (têm foreign key para materiais)
        await prisma.medicao.deleteMany({});
        // Depois deletar os materiais
        const resultado = await prisma.material.deleteMany({});
        res.json({
            mensagem: "Todos os dados foram apagados com sucesso.",
            materiaisDeletados: resultado.count,
        });
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error("[Limpar] Erro ao apagar dados:", e.message);
        res.status(500).json({
            error: "Erro ao apagar dados.",
            detalhes: e.message
        });
    }
});
// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend rodando na porta ${PORT}`);
}).on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
});
// Conectar ao banco no startup (sem derrubar o servidor se falhar, mas logando claramente)
conectarBancoComTimeout(15000)
    .then(() => console.log("✅ Conexão com banco OK"))
    .catch((e) => console.error("❌ Falha ao conectar no banco:", e?.message));
