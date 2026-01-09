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
        // Sempre incluir codigoItem se estiver presente no body, mesmo que vazio (para permitir atualização)
        if (req.body?.codigoItem !== undefined) {
            const codigoItemTrimmed = typeof req.body.codigoItem === "string" ? req.body.codigoItem.trim() : String(req.body.codigoItem).trim();
            if (codigoItemTrimmed) {
                dados.codigoItem = codigoItemTrimmed;
                console.log(`[PUT /materiais/${id}] codigoItem recebido no body:`, req.body.codigoItem, "→ processado:", dados.codigoItem);
            } else {
                console.log(`[PUT /materiais/${id}] ⚠️ codigoItem vazio ou inválido, ignorando`);
            }
        }
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
        
        // Se estiver atualizando codigoItem, verificar se já existe outro material com esse código
        if (dados.codigoItem) {
            console.log(`[PUT /materiais/${id}] Verificando se código ${dados.codigoItem} já existe...`);
            
            // Buscar material atual para pegar o codigoProjeto atual se não estiver sendo atualizado
            const materialAtual = await prisma.material.findUnique({
                where: { id },
                select: { codigoProjeto: true, codigoItem: true },
            });
            
            const codigoProjetoParaVerificar = dados.codigoProjeto !== undefined 
                ? dados.codigoProjeto 
                : materialAtual?.codigoProjeto;
            
            console.log(`[PUT /materiais/${id}] Verificando duplicata com codigoProjeto:`, codigoProjetoParaVerificar);
            
            // Construir where clause dinamicamente
            const whereClause = {
                codigoItem: dados.codigoItem,
                NOT: { id: id },
            };
            
            // Se codigoProjeto está sendo atualizado ou já existe, incluir na verificação
            if (codigoProjetoParaVerificar !== undefined) {
                whereClause.codigoProjeto = codigoProjetoParaVerificar;
            } else {
                // Se não tem projeto, verificar materiais sem projeto também
                whereClause.codigoProjeto = null;
            }
            
            const materialExistente = await prisma.material.findFirst({
                where: whereClause,
            });
            
            if (materialExistente) {
                console.log(`[PUT /materiais/${id}] ❌ Já existe material com código ${dados.codigoItem} (ID: ${materialExistente.id})`);
                return res.status(400).json({ 
                    error: `Já existe outro material com o código "${dados.codigoItem}". Escolha um código diferente.`,
                    detalhes: `Material ID ${materialExistente.id} já usa este código.`
                });
            }
            
            console.log(`[PUT /materiais/${id}] ✅ Código ${dados.codigoItem} está disponível`);
        }
        
        console.log(`[PUT /materiais/${id}] Dados que serão enviados ao Prisma:`, JSON.stringify(dados, null, 2));
        console.log(`[PUT /materiais/${id}] Verificando se codigoItem está em dados:`, 'codigoItem' in dados, dados.codigoItem);
        
        // Buscar material atual antes da atualização para comparar
        const materialAntes = await prisma.material.findUnique({
            where: { id },
            select: { codigoItem: true, codigoProjeto: true },
        });
        console.log(`[PUT /materiais/${id}] Material antes da atualização:`, materialAntes);
        
        const material = await prisma.material.update({
            where: { id },
            data: dados,
        });
        
        console.log(`[PUT /materiais/${id}] ✅ Material atualizado pelo Prisma:`, JSON.stringify(material, null, 2));
        console.log(`[PUT /materiais/${id}] Código antes: ${materialAntes?.codigoItem} → Código depois: ${material.codigoItem}`);
        
        // Verificar se o codigoItem foi realmente atualizado
        if (dados.codigoItem && material.codigoItem !== dados.codigoItem) {
            console.error(`[PUT /materiais/${id}] ⚠️ ATENÇÃO: codigoItem não foi atualizado! Esperado: ${dados.codigoItem}, Recebido: ${material.codigoItem}`);
        }
        
        res.json(material);
    }
    catch (e) {
        console.error("[PUT /materiais/:id] ❌ Erro:", e);
        console.error("[PUT /materiais/:id] ❌ Stack:", e?.stack);
        console.error("[PUT /materiais/:id] ❌ Code:", e?.code);
        
        // Verificar se é erro de constraint única
        if (e?.code === 'P2002' || e?.message?.includes('Unique constraint')) {
            return res.status(400).json({ 
                error: "Já existe outro material com este código. Escolha um código diferente.",
                detalhes: e?.message 
            });
        }
        
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
    // Função helper para converter valores para string quando necessário
    const converterParaString = (valor) => {
        if (valor === null || valor === undefined) return null;
        if (typeof valor === 'number') {
            // Se for NaN, retornar null
            if (isNaN(valor)) return null;
            return String(valor);
        }
        return String(valor);
    };
    
    // Função helper para converter valores numéricos (tratar NaN)
    const converterParaNumero = (valor) => {
        if (valor === null || valor === undefined) return null;
        const num = Number(valor);
        return isNaN(num) ? null : num;
    };
    
    const medicao = await prisma.$transaction(async (tx) => {
        const novaMedicao = await tx.medicao.create({
            data: {
                materialId: material.id,
                quantidadeConsumida: quantidade,
                projeto,
                torre: converterParaString(torre),
                usuarioId,
                origem: origem ?? "mobile",
                dia: dia ? new Date(dia) : null,
                semana: converterParaString(semana),
                cliente,
                escala,
                quantidadeTecnicos: converterParaNumero(quantidadeTecnicos),
                tecnicoLider,
                nomesTecnicos,
                supervisor,
                tipoIntervalo,
                tipoAcesso,
                pa: converterParaString(pa),
                plataforma,
                equipe,
                tipoHora,
                quantidadeEventos: converterParaNumero(quantidadeEventos),
                horaInicio,
                horaFim,
                tipoDano,
                danoCodigo,
                larguraDanoMm: converterParaNumero(larguraDanoMm),
                comprimentoDanoMm: converterParaNumero(comprimentoDanoMm),
                etapaProcesso,
                etapaLixamento,
                resinaTipo,
                resinaQuantidade: converterParaNumero(resinaQuantidade),
                resinaCatalisador: converterParaString(resinaCatalisador),
                resinaLote: converterParaString(resinaLote),
                resinaValidade,
                massaTipo,
                massaQuantidade: converterParaNumero(massaQuantidade),
                massaCatalisador,
                massaLote,
                massaValidade,
                nucleoTipo,
                nucleoEspessuraMm: converterParaNumero(nucleoEspessuraMm),
                puTipo,
                puMassaPeso: converterParaNumero(puMassaPeso),
                puCatalisadorPeso: converterParaNumero(puCatalisadorPeso),
                puLote: converterParaString(puLote),
                puValidade,
                gelTipo,
                gelPeso: converterParaNumero(gelPeso),
                gelCatalisadorPeso: converterParaNumero(gelCatalisadorPeso),
                gelLote: converterParaString(gelLote),
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
// Buscar todas as medições diretamente do Smartsheet (DEVE VIR ANTES de /medicoes)
app.get("/smartsheet/status", async (_req, res) => {
    try {
        const tokenConfigurado = !!process.env.SMARTSHEET_TOKEN;
        const sheetMedicoesConfigurado = !!process.env.SMARTSHEET_SHEET_MEDICOES;
        let tokenValido = undefined;
        if (tokenConfigurado) {
            try {
                // Testar se o token é válido fazendo uma requisição simples
                const axios = require("axios");
                await axios.get("https://api.smartsheet.com/2.0/users/me", {
                    headers: {
                        Authorization: `Bearer ${process.env.SMARTSHEET_TOKEN}`,
                    },
                    timeout: 5000,
                });
                tokenValido = true;
            }
            catch (e) {
                tokenValido = false;
            }
        }
        res.json({
            tokenConfigurado,
            sheetMedicoesConfigurado,
            tokenValido,
            urlBackend: process.env.API_BASE_URL || "https://gwindapp-portal-web.onrender.com",
        });
    }
    catch (e) {
        console.error("[Smartsheet/Status] Erro ao verificar status:", e?.message);
        res.status(500).json({
            error: "Erro ao verificar status do Smartsheet.",
            detalhes: e?.message,
            tokenConfigurado: false,
            sheetMedicoesConfigurado: false,
        });
    }
});
// Endpoint de debug para verificar mapeamento de colunas
app.get("/smartsheet/debug/colunas", async (_req, res) => {
    try {
        const sheet = await (0, smartsheetService_1.getSheet)(process.env.SMARTSHEET_SHEET_MEDICOES);
        
        const todasColunas = sheet.columns.map(col => ({
            title: col.title,
            id: col.id,
            type: col.type,
            index: col.index
        }));
        
        // Tentar encontrar coluna de data usando a mesma lógica do smartsheetService.js
        // PRIMEIRO: tentar "Dia" exato (case-insensitive) - PRIORIDADE MÁXIMA
        let colDia = sheet.columns.find(c => {
            const lower = c.title.toLowerCase().trim();
            return lower === "dia" || lower === '"dia"' || lower === "'dia'";
        });
        if (colDia) {
            console.log(`[Debug] ✅ Coluna "Dia" encontrada por busca exata: "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})`);
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
                console.log(`[Debug] ✅ Coluna "Dia" encontrada por busca flexível: "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})`);
            }
        }
        
        // Segundo: tentar "Data" exato (case-insensitive) - apenas como fallback
        if (!colDia) {
            colDia = sheet.columns.find(c => c.title.toLowerCase().trim() === "data");
            if (colDia) {
                console.log(`[Debug] ✅ Coluna "Data" encontrada por busca exata (fallback): "${colDia.title}" (ID: ${colDia.id}, Type: ${colDia.type})`);
            }
        }
        
        // Se não encontrou, tentar por tipo
        let colDiaPorTipo = null;
        if (!colDia) {
            colDiaPorTipo = sheet.columns.find(c => c.type === 'DATE' || c.type === 'DATETIME');
        }
        
        // Se ainda não encontrou, buscar qualquer coluna com "data" ou "dia"
        let colDiaPorBuscaAmpla = null;
        if (!colDia && !colDiaPorTipo) {
            const possiveis = sheet.columns.filter(c => {
                const lower = c.title.toLowerCase();
                return (lower.includes("data") || lower.includes("dia") || lower.includes("date")) && 
                       !lower.includes("hora") && 
                       !lower.includes("time");
            });
            if (possiveis.length > 0) {
                colDiaPorBuscaAmpla = possiveis[0];
            }
        }
        
        // Verificar primeiras 5 linhas para ver valores
        let primeirasLinhasData = [];
        if (sheet.rows.length > 0 && (colDia || colDiaPorTipo || colDiaPorBuscaAmpla)) {
            const colFinal = colDia || colDiaPorTipo || colDiaPorBuscaAmpla;
            for (let i = 0; i < Math.min(5, sheet.rows.length); i++) {
                const cell = sheet.rows[i].cells.find(c => c.columnId === colFinal.id);
                if (cell) {
                    primeirasLinhasData.push({
                        linha: i,
                        value: cell.value,
                        displayValue: cell.displayValue,
                        objectValue: cell.objectValue,
                        valueType: typeof cell.value,
                        hasValue: cell.value !== null && cell.value !== undefined,
                        hasDisplayValue: cell.displayValue !== null && cell.displayValue !== undefined,
                        hasObjectValue: cell.objectValue !== null && cell.objectValue !== undefined
                    });
                } else {
                    primeirasLinhasData.push({
                        linha: i,
                        erro: "Célula não encontrada para esta coluna"
                    });
                }
            }
        }
        
        res.json({
            totalColunas: todasColunas.length,
            todasColunas: todasColunas,
            colunaDataEncontrada: colDia ? {
                title: colDia.title,
                id: colDia.id,
                type: colDia.type,
                metodo: "busca_por_nome"
            } : null,
            colunaDataPorTipo: colDiaPorTipo ? {
                title: colDiaPorTipo.title,
                id: colDiaPorTipo.id,
                type: colDiaPorTipo.type,
                metodo: "busca_por_tipo"
            } : null,
            colunaDataPorBuscaAmpla: colDiaPorBuscaAmpla ? {
                title: colDiaPorBuscaAmpla.title,
                id: colDiaPorBuscaAmpla.id,
                type: colDiaPorBuscaAmpla.type,
                metodo: "busca_ampla"
            } : null,
            primeiraLinhaData: primeirasLinhasData.length > 0 ? primeirasLinhasData[0] : null,
            primeirasLinhasData: primeirasLinhasData,
            possiveisColunasData: todasColunas.filter(c => {
                const lower = c.title.toLowerCase();
                return lower.includes("data") || lower.includes("dia") || lower.includes("date");
            })
        });
    } catch (e) {
        console.error("[Smartsheet/Debug] Erro:", e);
        res.status(500).json({ error: "Erro ao verificar colunas.", detalhes: e?.message });
    }
});

app.get("/medicoes/smartsheet", async (_req, res) => {
    try {
        const medicoes = await (0, smartsheetService_1.buscarMedicoesDoSmartsheet)();
        console.log(`[Medicoes/Smartsheet] ✅ ${medicoes.length} medições encontradas no Smartsheet`);
        
        // Adicionar informações de debug na resposta
        const comDia = medicoes.filter(m => m.dia).length;
        const comHoraInicio = medicoes.filter(m => m.horaInicio).length;
        const comHoraFim = medicoes.filter(m => m.horaFim).length;
        
        // Incluir debug info no header da resposta
        res.setHeader('X-Debug-Info', JSON.stringify({
            total: medicoes.length,
            comDia: comDia,
            comHoraInicio: comHoraInicio,
            comHoraFim: comHoraFim,
            semDia: medicoes.length - comDia
        }));
        
        res.json(medicoes);
    }
    catch (e) {
        console.error("[Medicoes/Smartsheet] Erro ao buscar medições do Smartsheet:", e?.message);
        res.status(503).json({
            error: "Erro ao buscar medições do Smartsheet.",
            detalhes: e?.message,
        });
    }
});
// Função reutilizável para sincronizar apontamentos do Smartsheet
async function sincronizarSmartsheet() {
    try {
        console.log("[Sincronização Automática] 🔄 Iniciando sincronização de apontamentos do Smartsheet...");
        
        // Buscar apontamentos do Smartsheet
        const medicoesSmartsheet = await (0, smartsheetService_1.buscarMedicoesDoSmartsheet)();
        console.log(`[Sincronização Automática] 📋 ${medicoesSmartsheet.length} apontamentos encontrados no Smartsheet`);
        
        let processados = 0;
        let atualizados = 0;
        let erros = 0;
        const errosDetalhes = [];
        
        for (const medicaoSmartsheet of medicoesSmartsheet) {
            try {
                // Verificar se já existe uma medição com os mesmos dados (evitar duplicatas)
                const chaveUnica = `${medicaoSmartsheet.dia || ''}_${medicaoSmartsheet.horaInicio || ''}_${medicaoSmartsheet.horaFim || ''}_${medicaoSmartsheet.projeto || ''}_${medicaoSmartsheet.equipe || ''}`;
                
                // Função para normalizar quantidade (converter "3kg" -> 3, "900g" -> 0.9, etc)
                const normalizarQuantidade = (valor) => {
                    if (!valor) return null;
                    const str = String(valor).trim().toLowerCase();
                    // Remover espaços e converter
                    const numero = parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.'));
                    if (isNaN(numero)) return null;
                    // Se contém "g" (gramas), converter para kg (dividir por 1000)
                    if (str.includes('g') && !str.includes('kg')) {
                        return numero / 1000;
                    }
                    return numero;
                };
                
                // Processar materiais consumidos
                const materiaisConsumidos = [];
                
                // Log para debug (primeiras 3 linhas)
                if (processados < 3) {
                    console.log(`[Sincronização] 🔍 Apontamento ${processados + 1}:`, {
                        dia: medicaoSmartsheet.dia,
                        projeto: medicaoSmartsheet.projeto,
                        equipe: medicaoSmartsheet.equipe,
                        resinaTipo: medicaoSmartsheet.resinaTipo,
                        resinaQuantidade: medicaoSmartsheet.resinaQuantidade,
                        massaTipo: medicaoSmartsheet.massaTipo,
                        massaQuantidade: medicaoSmartsheet.massaQuantidade,
                        puTipo: medicaoSmartsheet.puTipo,
                        puMassaPeso: medicaoSmartsheet.puMassaPeso,
                        gelTipo: medicaoSmartsheet.gelTipo,
                        gelPeso: medicaoSmartsheet.gelPeso
                    });
                }
                
                // Resina
                if (medicaoSmartsheet.resinaTipo) {
                    const quantidadeNormalizada = normalizarQuantidade(medicaoSmartsheet.resinaQuantidade);
                    if (quantidadeNormalizada && quantidadeNormalizada > 0) {
                        materiaisConsumidos.push({
                            codigoItem: medicaoSmartsheet.resinaTipo,
                            quantidade: quantidadeNormalizada,
                            tipo: 'resina'
                        });
                        if (processados < 3) {
                            console.log(`[Sincronização] ✅ Resina encontrada: ${medicaoSmartsheet.resinaTipo} - ${quantidadeNormalizada} kg`);
                        }
                    }
                }
                
                // Massa
                if (medicaoSmartsheet.massaTipo) {
                    const quantidadeNormalizada = normalizarQuantidade(medicaoSmartsheet.massaQuantidade);
                    if (quantidadeNormalizada && quantidadeNormalizada > 0) {
                        materiaisConsumidos.push({
                            codigoItem: medicaoSmartsheet.massaTipo,
                            quantidade: quantidadeNormalizada,
                            tipo: 'massa'
                        });
                        if (processados < 3) {
                            console.log(`[Sincronização] ✅ Massa encontrada: ${medicaoSmartsheet.massaTipo} - ${quantidadeNormalizada} kg`);
                        }
                    }
                }
                
                // PU
                if (medicaoSmartsheet.puTipo) {
                    const quantidadeNormalizada = normalizarQuantidade(medicaoSmartsheet.puMassaPeso);
                    if (quantidadeNormalizada && quantidadeNormalizada > 0) {
                        materiaisConsumidos.push({
                            codigoItem: medicaoSmartsheet.puTipo,
                            quantidade: quantidadeNormalizada,
                            tipo: 'pu'
                        });
                        if (processados < 3) {
                            console.log(`[Sincronização] ✅ PU encontrado: ${medicaoSmartsheet.puTipo} - ${quantidadeNormalizada} kg`);
                        }
                    }
                }
                
                // Gel
                if (medicaoSmartsheet.gelTipo) {
                    const quantidadeNormalizada = normalizarQuantidade(medicaoSmartsheet.gelPeso);
                    if (quantidadeNormalizada && quantidadeNormalizada > 0) {
                        materiaisConsumidos.push({
                            codigoItem: medicaoSmartsheet.gelTipo,
                            quantidade: quantidadeNormalizada,
                            tipo: 'gel'
                        });
                        if (processados < 3) {
                            console.log(`[Sincronização] ✅ Gel encontrado: ${medicaoSmartsheet.gelTipo} - ${quantidadeNormalizada} kg`);
                        }
                    }
                }
                
                if (materiaisConsumidos.length === 0 && processados < 3) {
                    console.log(`[Sincronização] ⚠️ Nenhum material consumido encontrado neste apontamento`);
                }
                
                // Processar cada material consumido
                for (const materialConsumido of materiaisConsumidos) {
                    // Buscar material no banco pelo código (busca exata primeiro)
                    let material = await prisma.material.findFirst({
                        where: {
                            codigoItem: materialConsumido.codigoItem
                        }
                    });
                    
                    // Se não encontrou, tentar buscar por descrição (caso o código no Smartsheet seja a descrição)
                    if (!material) {
                        material = await prisma.material.findFirst({
                            where: {
                                descricao: {
                                    contains: materialConsumido.codigoItem,
                                    mode: 'insensitive'
                                }
                            }
                        });
                    }
                    
                    // Se ainda não encontrou, tentar buscar onde o código do item contém parte do código do Smartsheet
                    if (!material) {
                        const codigoLimpo = materialConsumido.codigoItem.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                        const todosMateriais = await prisma.material.findMany();
                        material = todosMateriais.find(m => {
                            const codigoMaterial = m.codigoItem.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                            return codigoMaterial.includes(codigoLimpo) || codigoLimpo.includes(codigoMaterial);
                        });
                    }
                    
                    if (!material) {
                        console.warn(`[Sincronização] ⚠️ Material não encontrado: ${materialConsumido.codigoItem} (tipo: ${materialConsumido.tipo})`);
                        errosDetalhes.push(`Material ${materialConsumido.codigoItem} não encontrado no banco`);
                        continue;
                    }
                    
                    if (processados < 3) {
                        console.log(`[Sincronização] ✅ Material encontrado no banco: ${material.codigoItem} - ${material.descricao} (Estoque atual: ${material.estoqueAtual} ${material.unidade})`);
                    }
                    
                    // Verificar se já existe medição para evitar duplicatas
                    const medicaoExistente = await prisma.medicao.findFirst({
                        where: {
                            materialId: material.id,
                            dia: medicaoSmartsheet.dia ? new Date(medicaoSmartsheet.dia) : undefined,
                            horaInicio: medicaoSmartsheet.horaInicio || undefined,
                            horaFim: medicaoSmartsheet.horaFim || undefined,
                            projeto: medicaoSmartsheet.projeto || undefined,
                            equipe: medicaoSmartsheet.equipe || undefined,
                            origem: 'smartsheet'
                        }
                    });
                    
                    if (medicaoExistente) {
                        console.log(`[Sincronização] ⏭️ Medição já existe, pulando: ${materialConsumido.codigoItem}`);
                        continue;
                    }
                    
                    // Função helper para converter valores para string quando necessário
                    const converterParaString = (valor) => {
                        if (valor === null || valor === undefined) return null;
                        if (typeof valor === 'number') {
                            // Se for NaN, retornar null
                            if (isNaN(valor)) return null;
                            return String(valor);
                        }
                        return String(valor);
                    };
                    
                    // Função helper para converter valores numéricos (tratar NaN)
                    const converterParaNumero = (valor) => {
                        if (valor === null || valor === undefined) return null;
                        const num = Number(valor);
                        return isNaN(num) ? null : num;
                    };
                    
                    // Criar medição
                    const novaMedicao = await prisma.medicao.create({
                        data: {
                            materialId: material.id,
                            projeto: medicaoSmartsheet.projeto || 'N/A',
                            torre: converterParaString(medicaoSmartsheet.torre),
                            quantidadeConsumida: materialConsumido.quantidade,
                            origem: 'smartsheet',
                            cliente: medicaoSmartsheet.cliente,
                            dia: medicaoSmartsheet.dia ? new Date(medicaoSmartsheet.dia) : undefined,
                            equipe: medicaoSmartsheet.equipe,
                            escala: medicaoSmartsheet.escala,
                            etapaLixamento: medicaoSmartsheet.etapaLixamento,
                            etapaProcesso: medicaoSmartsheet.etapaProcesso,
                            horaFim: medicaoSmartsheet.horaFim,
                            horaInicio: medicaoSmartsheet.horaInicio,
                            tipoDano: medicaoSmartsheet.tipoDano,
                            danoCodigo: medicaoSmartsheet.danoCodigo,
                            larguraDanoMm: converterParaNumero(medicaoSmartsheet.larguraDanoMm),
                            comprimentoDanoMm: converterParaNumero(medicaoSmartsheet.comprimentoDanoMm),
                            resinaTipo: medicaoSmartsheet.resinaTipo,
                            resinaQuantidade: converterParaNumero(medicaoSmartsheet.resinaQuantidade),
                            resinaCatalisador: converterParaString(medicaoSmartsheet.resinaCatalisador),
                            resinaLote: converterParaString(medicaoSmartsheet.resinaLote),
                            resinaValidade: medicaoSmartsheet.resinaValidade,
                            massaTipo: medicaoSmartsheet.massaTipo,
                            massaQuantidade: converterParaNumero(medicaoSmartsheet.massaQuantidade),
                            massaCatalisador: medicaoSmartsheet.massaCatalisador,
                            massaLote: medicaoSmartsheet.massaLote,
                            massaValidade: medicaoSmartsheet.massaValidade,
                            nucleoTipo: medicaoSmartsheet.nucleoTipo,
                            nucleoEspessuraMm: converterParaNumero(medicaoSmartsheet.nucleoEspessuraMm),
                            puTipo: medicaoSmartsheet.puTipo,
                            puMassaPeso: converterParaNumero(medicaoSmartsheet.puMassaPeso),
                            puCatalisadorPeso: converterParaNumero(medicaoSmartsheet.puCatalisadorPeso),
                            puLote: converterParaString(medicaoSmartsheet.puLote),
                            puValidade: medicaoSmartsheet.puValidade,
                            gelTipo: medicaoSmartsheet.gelTipo,
                            gelPeso: converterParaNumero(medicaoSmartsheet.gelPeso),
                            gelCatalisadorPeso: converterParaNumero(medicaoSmartsheet.gelCatalisadorPeso),
                            gelLote: converterParaString(medicaoSmartsheet.gelLote),
                            gelValidade: medicaoSmartsheet.gelValidade,
                            retrabalho: medicaoSmartsheet.retrabalho,
                            semana: converterParaString(medicaoSmartsheet.semana),
                            supervisor: medicaoSmartsheet.supervisor,
                            tecnicoLider: medicaoSmartsheet.tecnicoLider,
                            tipoAcesso: medicaoSmartsheet.tipoAcesso,
                            tipoHora: medicaoSmartsheet.tipoHora,
                            tipoIntervalo: medicaoSmartsheet.tipoIntervalo,
                            quantidadeEventos: converterParaNumero(medicaoSmartsheet.quantidadeEventos),
                            quantidadeTecnicos: converterParaNumero(medicaoSmartsheet.quantidadeTecnicos),
                            nomesTecnicos: medicaoSmartsheet.nomesTecnicos,
                            pa: converterParaString(medicaoSmartsheet.pa),
                            plataforma: medicaoSmartsheet.plataforma
                        }
                    });
                    
                    // Subtrair do estoque
                    const novoEstoque = Math.max(0, material.estoqueAtual - materialConsumido.quantidade);
                    await prisma.material.update({
                        where: { id: material.id },
                        data: { estoqueAtual: novoEstoque }
                    });
                    
                    console.log(`[Sincronização Automática] ✅ Material ${materialConsumido.codigoItem}: ${materialConsumido.quantidade} ${material.unidade} subtraído. Estoque: ${material.estoqueAtual} → ${novoEstoque}`);
                    atualizados++;
                }
                
                processados++;
            } catch (error) {
                erros++;
                errosDetalhes.push(`Erro ao processar apontamento: ${error.message}`);
                console.error(`[Sincronização Automática] ❌ Erro ao processar apontamento:`, error);
            }
        }
        
        console.log(`[Sincronização Automática] ✅ Sincronização concluída: ${processados} apontamentos processados, ${atualizados} materiais atualizados, ${erros} erros`);
        
        return {
            sucesso: true,
            processados,
            atualizados,
            erros,
            errosDetalhes: errosDetalhes.length > 0 ? errosDetalhes : undefined
        };
    } catch (error) {
        console.error("[Sincronização Automática] ❌ Erro geral na sincronização:", error);
        throw error;
    }
}

// Endpoint manual para sincronização (mantido para compatibilidade)
app.post("/medicoes/sincronizar-smartsheet", async (req, res) => {
    try {
        const resultado = await sincronizarSmartsheet();
        res.json(resultado);
    } catch (error) {
        res.status(500).json({
            error: "Erro ao sincronizar apontamentos do Smartsheet",
            detalhes: error.message
        });
    }
});

// Listar todas as medições do banco de dados
app.get("/medicoes", async (req, res) => {
    try {
        const { projeto, materialId, limit, offset } = req.query;
        const where = {};
        if (projeto) {
            where.projeto = String(projeto);
        }
        if (materialId) {
            where.materialId = Number(materialId);
        }
        const medicoes = await prisma.medicao.findMany({
            where,
            include: {
                material: {
                    select: {
                        id: true,
                        codigoItem: true,
                        descricao: true,
                        unidade: true,
                    },
                },
            },
            orderBy: { data: "desc" },
            take: limit ? Number(limit) : undefined,
            skip: offset ? Number(offset) : undefined,
        });
        res.json(medicoes);
    }
    catch (e) {
        console.error("[Medicoes] Erro ao listar medições:", e?.message);
        res.status(503).json({
            error: "Erro ao listar medições.",
            detalhes: e?.message,
        });
    }
});
// Listar projetos e clientes únicos das medições
app.get("/projetos-clientes", async (req, res) => {
    try {
        const { tipo } = req.query;
        if (tipo === "projeto") {
            // Buscar projetos únicos das medições
            const medicoes = await prisma.medicao.findMany({
                select: { projeto: true },
                distinct: ["projeto"],
            });
            const projetos = medicoes
                .map((m) => m.projeto)
                .filter((p) => p && p.trim() !== "")
                .map((nome, index) => ({ id: index + 1, nome: nome.trim() }));
            res.json(projetos);
        }
        else if (tipo === "cliente") {
            // Buscar clientes únicos das medições
            const medicoes = await prisma.medicao.findMany({
                where: { cliente: { not: null } },
                select: { cliente: true },
                distinct: ["cliente"],
            });
            const clientes = medicoes
                .map((m) => m.cliente)
                .filter((c) => c && c.trim() !== "")
                .map((nome, index) => ({ id: index + 1, nome: nome.trim() }));
            res.json(clientes);
        }
        else {
            res.status(400).json({ error: "Parâmetro 'tipo' deve ser 'projeto' ou 'cliente'." });
        }
    }
    catch (e) {
        console.error("[Projetos/Clientes] Erro ao listar:", e?.message);
        res.status(503).json({
            error: "Erro ao listar projetos/clientes.",
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
// ============================================
// SINCRONIZAÇÃO AUTOMÁTICA COM SMARTSHEET
// ============================================
// Esta função roda automaticamente sem necessidade de intervenção manual
// Verifica novos apontamentos no Smartsheet e subtrai do estoque automaticamente

// Intervalo de sincronização: a cada 3 minutos (180000 ms)
// Reduzido de 5 para 3 minutos para resposta mais rápida
const INTERVALO_SINCRONIZACAO = 3 * 60 * 1000; // 3 minutos

// Função para executar sincronização com tratamento de erros
async function executarSincronizacaoAutomatica() {
    try {
        console.log("[Sincronização Automática] ⏰ Iniciando sincronização automática...");
        const resultado = await sincronizarSmartsheet();
        if (resultado && resultado.atualizados > 0) {
            console.log(`[Sincronização Automática] ✅ ${resultado.atualizados} material(is) atualizado(s) automaticamente!`);
        }
    } catch (error) {
        console.error("[Sincronização Automática] ❌ Erro na sincronização automática:", error);
        // Não lançar erro para não interromper o servidor
        // A sincronização continuará tentando no próximo intervalo
    }
}

// Executar sincronização logo após o servidor iniciar (após 10 segundos)
// Reduzido de 30 para 10 segundos para iniciar mais rápido
setTimeout(() => {
    console.log("[Sincronização Automática] 🚀 Executando primeira sincronização automática...");
    executarSincronizacaoAutomatica();
}, 10000);

// Configurar sincronização periódica automática
// Esta função roda continuamente sem necessidade de clicar em botão
const intervaloId = setInterval(() => {
    console.log("[Sincronização Automática] ⏰ Executando sincronização automática periódica...");
    executarSincronizacaoAutomatica();
}, INTERVALO_SINCRONIZACAO);

// Garantir que o intervalo continue rodando mesmo se houver erros
process.on('SIGTERM', () => {
    clearInterval(intervaloId);
});

console.log(`[Sincronização Automática] ⚙️ Sincronização automática ATIVADA - executando a cada ${INTERVALO_SINCRONIZACAO / 1000 / 60} minutos`);
console.log(`[Sincronização Automática] 📌 NÃO é necessário clicar em botão - a sincronização é totalmente automática!`);

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
