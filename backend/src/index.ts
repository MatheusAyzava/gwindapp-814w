import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import {
  importarMateriaisDoSmartsheet,
  registrarMedicaoNoSmartsheet,
} from "./smartsheetService";
import {
  uploadImagemParaSupabase,
  salvarUrlImagemNoSmartsheet,
} from "./imageService";

const app = express();
const prisma = new PrismaClient();
// Porta do backend principal deste portal.
// Deixamos 4001 para não conflitar com o servidor de passagens (3001).
const PORT = process.env.PORT || 4001;

// Logar problemas de conexão com o banco mais cedo (ajuda a diagnosticar "fica carregando")
async function conectarBancoComTimeout(ms: number) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout ao conectar no banco após ${ms}ms`)), ms),
  );
  await Promise.race([prisma.$connect(), timeout]);
}

// CORS: configurar ANTES do helmet para evitar conflitos
app.use(cors({
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

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
// Aumentar limite de tamanho do body para permitir importações grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configurar multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });

// Healthcheck - usado por serviços de ping para manter o backend ativo
app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "controle-materiais-backend"
  });
});

// Healthcheck com banco (para diagnosticar Render/Supabase)
app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "ok" });
  } catch (e: any) {
    console.error("[DB] Healthcheck falhou:", e?.message);
    res.status(503).json({ status: "ok", db: "erro", detalhes: e?.message });
  }
});

// Upload de imagens para checklist
app.post("/upload/imagem", async (req, res) => {
  try {
    const { base64Image, fileName, folder } = req.body;

    if (!base64Image || !fileName) {
      return res.status(400).json({ error: "base64Image e fileName são obrigatórios" });
    }

    // Opção 1: Upload para Supabase (recomendado)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
    if (SUPABASE_URL && SUPABASE_KEY) {
      const imageUrl = await uploadImagemParaSupabase(
        base64Image,
        fileName,
        folder || "checklist"
      );
      return res.json({ url: imageUrl, metodo: "supabase" });
    }

    // Opção 2: Retornar Base64 (para salvar diretamente no Smartsheet)
    // Útil se não tiver Supabase configurado
    return res.json({
      base64: base64Image,
      metodo: "base64",
      aviso: "Supabase não configurado. Use Base64 diretamente no Smartsheet (limitado).",
    });
  } catch (e: any) {
    console.error("[Upload] Erro ao fazer upload de imagem:", e?.message);
    res.status(500).json({ error: "Erro ao fazer upload de imagem", detalhes: e?.message });
  }
});

// Listar materiais com saldo calculado
app.get("/materiais", async (_req, res) => {
  try {
    const materiais = await prisma.material.findMany({
      orderBy: { descricao: "asc" },
    });
    res.json(materiais);
  } catch (e: any) {
    console.error("[Materiais] Erro ao listar materiais:", e?.message);
    res.status(503).json({
      error: "Erro ao acessar o banco para listar materiais.",
      detalhes: e?.message,
    });
  }
});

// Criar/atualizar material
app.post("/materiais", async (req, res) => {
  const { codigoItem, descricao, unidade, estoqueInicial } = req.body;

  if (!codigoItem || !descricao || !unidade) {
    return res.status(400).json({ error: "Dados do material incompletos." });
  }

  const valorEstoqueInicial = Number(estoqueInicial ?? 0);

  // Se codigoProjeto não for fornecido, usa null (permite ter materiais sem projeto)
  const codigoProjetoValue = req.body.codigoProjeto || null;
  
  const material = await prisma.material.upsert({
    where: {
      codigoItem_codigoProjeto: {
        codigoItem,
        codigoProjeto: codigoProjetoValue,
      },
    },
    update: {
      descricao,
      unidade,
      estoqueInicial: valorEstoqueInicial,
      estoqueAtual: valorEstoqueInicial,
      codigoProjeto: codigoProjetoValue,
    },
    create: {
      codigoItem,
      descricao,
      unidade,
      estoqueInicial: valorEstoqueInicial,
      estoqueAtual: valorEstoqueInicial,
      codigoProjeto: codigoProjetoValue,
    },
  });

  res.json(material);
});

// Atualizar material/estoque por ID (usado pela tela de Estoque)
app.put("/materiais/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const dados: any = {};
    if (typeof req.body?.descricao === "string") dados.descricao = req.body.descricao;
    if (typeof req.body?.unidade === "string") dados.unidade = req.body.unidade;

    if (req.body?.estoqueInicial !== undefined) dados.estoqueInicial = Number(req.body.estoqueInicial);
    if (req.body?.estoqueAtual !== undefined) dados.estoqueAtual = Number(req.body.estoqueAtual);

    if (req.body?.codigoProjeto !== undefined) dados.codigoProjeto = req.body.codigoProjeto || null;
    if (req.body?.descricaoProjeto !== undefined) dados.descricaoProjeto = req.body.descricaoProjeto || null;

    // Evitar update vazio
    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar." });
    }

    const material = await prisma.material.update({
      where: { id },
      data: dados,
    });

    res.json(material);
  } catch (e: any) {
    console.error("[Materiais] Erro ao atualizar material:", e?.message);
    res.status(500).json({ error: "Erro ao atualizar material.", detalhes: e?.message });
  }
});

// Limpar todos os dados (materiais e medições) - CUIDADO: Esta ação é irreversível!
// IMPORTANTE: Esta rota deve estar ANTES de /materiais/:id para evitar conflito
app.post("/materiais/limpar-tudo", async (_req, res) => {
  try {
    // eslint-disable-next-line no-console
    console.log("[Limpar] Iniciando limpeza de dados...");
    
    // Deletar primeiro as medições (têm foreign key para materiais)
    const medicoesDeletadas = await prisma.medicao.deleteMany({});
    // eslint-disable-next-line no-console
    console.log(`[Limpar] ${medicoesDeletadas.count} medição(ões) deletada(s)`);
    
    // Depois deletar os materiais
    const resultado = await prisma.material.deleteMany({});
    // eslint-disable-next-line no-console
    console.log(`[Limpar] ${resultado.count} material(is) deletado(s)`);
    
    res.json({
      mensagem: "Todos os dados foram apagados com sucesso.",
      materiaisDeletados: resultado.count,
      medicoesDeletadas: medicoesDeletadas.count,
    });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Limpar] Erro ao apagar dados:", e);
    // eslint-disable-next-line no-console
    console.error("[Limpar] Stack:", e?.stack);
    res.status(500).json({ 
      error: "Erro ao apagar dados.",
      detalhes: e?.message || String(e),
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    });
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
  } catch (e: any) {
    console.error("[Materiais] Erro ao remover material:", e?.message);
    res.status(500).json({ error: "Erro ao remover material.", detalhes: e?.message });
  }
});

// Importar vários materiais de uma vez
app.post("/materiais/import", async (req, res) => {
  try {
    const itens: Array<{
      codigoItem: string;
      descricao: string;
      unidade: string;
      estoqueInicial?: number;
      codigoEstoque?: string;
      descricaoEstoque?: string;
      confirmado?: number;
      pedido?: number;
      disponivel?: number;
      precoItem?: number;
      total?: number;
      codigoProjeto?: string;
      descricaoProjeto?: string;
      centroCustos?: string;
    }> = req.body?.itens;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res
        .status(400)
        .json({ error: "Envie um array 'itens' com pelo menos um material." });
    }

    console.log(`[Import] Recebidos ${itens.length} itens para importar`);

    // Buscar todos os projetos que existem no estoque
    const materiaisExistentes = await prisma.material.findMany({
      select: { codigoProjeto: true },
      distinct: ['codigoProjeto'],
    });
    const projetosNoEstoque = new Set(
      materiaisExistentes
        .map((m) => m.codigoProjeto)
        .filter((p): p is string => Boolean(p))
    );
    
    console.log(`[Import] Projetos encontrados no estoque: ${Array.from(projetosNoEstoque).join(', ')}`);

    const resultados = [];
    const erros: string[] = [];
    let substituidos = 0;
    let novos = 0;

    for (const item of itens) {
      if (!item.codigoItem || !item.descricao || !item.unidade) {
        // pula itens inválidos, mas continua importação
        continue;
      }

      try {
        const valorEstoqueInicial = Number(item.estoqueInicial ?? 0);
        const codigoProjetoValue = item.codigoProjeto || "";
        
        // Verificar se o material já existe no banco
        const materialExistente = await prisma.material.findUnique({
          where: {
            codigoItem_codigoProjeto: {
              codigoItem: item.codigoItem,
              codigoProjeto: codigoProjetoValue,
            },
          },
        });

        // Se o material existe E pertence a um projeto do estoque, substituir
        // Caso contrário, criar novo
        const deveSubstituir = materialExistente && 
          codigoProjetoValue && 
          projetosNoEstoque.has(codigoProjetoValue);

        if (deveSubstituir) {
          // Substituir material existente
          const material = await prisma.material.update({
            where: {
              codigoItem_codigoProjeto: {
                codigoItem: item.codigoItem,
                codigoProjeto: codigoProjetoValue,
              },
            },
            data: {
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
          substituidos++;
        } else {
          // Criar novo material
          const material = await prisma.material.create({
            data: {
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
          novos++;
        }
      } catch (e: any) {
        const erroMsg = `Erro ao salvar ${item.codigoItem}: ${e.message}`;
        console.error(`[Import] ${erroMsg}`);
        erros.push(erroMsg);
      }
    }

    console.log(`[Import] Importados ${resultados.length} de ${itens.length} itens (${substituidos} substituídos, ${novos} novos)`);
    if (erros.length > 0) {
      console.error(`[Import] ${erros.length} erros durante importação`);
    }

    res.json({ 
      quantidadeImportada: resultados.length,
      substituidos,
      novos,
      materiais: resultados,
      erros: erros.length > 0 ? erros : undefined
    });
  } catch (e: any) {
    console.error("[Import] Erro geral na importação:", e.message);
    console.error("[Import] Stack:", e.stack);
    res.status(500).json({ 
      error: "Erro ao importar materiais.",
      detalhes: e.message
    });
  }
});

// Importar materiais a partir do Smartsheet (OPCIONAL - só funciona se SMARTSHEET_SHEET_MATERIAIS estiver configurado)
app.post("/materiais/import-smartsheet", async (_req, res) => {
  // Verificar se a funcionalidade está configurada
  if (!process.env.SMARTSHEET_SHEET_MATERIAIS) {
    return res.status(400).json({ 
      error: "Funcionalidade não configurada.",
      mensagem: "A importação de materiais do Smartsheet não está configurada. Esta funcionalidade é opcional.",
      dica: "Se você quiser usar esta funcionalidade, configure SMARTSHEET_SHEET_MATERIAIS no Render.com",
    });
  }

  try {
    // eslint-disable-next-line no-console
    console.log("[Smartsheet] Iniciando importação de materiais...");
    const itens = await importarMateriaisDoSmartsheet();
    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] ${itens.length} itens encontrados na planilha`);

    const resultados = [];
    const erros: string[] = [];

    for (const item of itens) {
      try {
        const codigoProjetoValue = (item as any).codigoProjeto || "";
        
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
      } catch (itemError: any) {
        // eslint-disable-next-line no-console
        console.error(`[Smartsheet] Erro ao processar item ${item.codigoItem}:`, itemError?.message);
        erros.push(`Item ${item.codigoItem}: ${itemError?.message || "Erro desconhecido"}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[Smartsheet] Importação concluída: ${resultados.length} sucessos, ${erros.length} erros`);

    res.json({
      quantidadeImportada: resultados.length,
      materiais: resultados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] Erro ao importar materiais:", {
      message: e?.message,
      response: e?.response?.data,
      status: e?.response?.status,
    });
    
    const mensagemErro = e?.response?.data?.message || e?.message || "Erro desconhecido";
    const statusCode = e?.response?.status || 500;
    
    res.status(statusCode).json({ 
      error: "Erro ao importar materiais do Smartsheet.",
      detalhes: mensagemErro,
      dica: !process.env.SMARTSHEET_TOKEN 
        ? "Verifique se SMARTSHEET_TOKEN está configurado no Render."
        : !process.env.SMARTSHEET_SHEET_MATERIAIS
        ? "Verifique se SMARTSHEET_SHEET_MATERIAIS está configurado no Render."
        : "Verifique os logs do servidor para mais detalhes.",
    });
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
    const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

    if (dados.length < 2) {
      return res.status(400).json({ error: "O arquivo Excel está vazio ou não possui dados." });
    }

    // Primeira linha são os cabeçalhos
    const cabecalhos = dados[0].map((h: any) => String(h || "").trim().toLowerCase());
    
    // Mapear índices das colunas pelo nome (flexível)
    const encontrarIndice = (palavras: string[]): number => {
      for (const palavra of palavras) {
        const idx = cabecalhos.findIndex((h: string) => 
          h.includes(palavra.toLowerCase())
        );
        if (idx !== -1) return idx;
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
    const converterNumero = (valor: any): number | null => {
      if (valor === null || valor === undefined || valor === "") return null;
      try {
        const str = String(valor).trim();
        if (!str) return null;
        const limpo = str
          .replace(/\./g, "") // Remove pontos (separadores de milhar)
          .replace(",", ".") // Substitui vírgula por ponto
          .replace(/[^\d.-]/g, ""); // Remove caracteres não numéricos exceto ponto e menos
        const num = parseFloat(limpo);
        return isNaN(num) ? null : num;
      } catch {
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
      } catch (e: any) {
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
  } catch (e: any) {
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
  const {
    consumos, // Novo formato: array de consumos
    codigoItem, // Formato antigo (compatibilidade)
    quantidadeConsumida, // Formato antigo (compatibilidade)
    projeto,
    torre,
    usuarioId,
    origem,
    // novos campos do formulário completo (todos opcionais)
    dia,
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
  } = req.body;

  // Suportar ambos os formatos: novo (array de consumos) e antigo (um consumo)
  let consumosParaProcessar: Array<{ codigoItem: string; quantidadeConsumida: number }>;
  
  if (consumos && Array.isArray(consumos) && consumos.length > 0) {
    // Novo formato: array de consumos
    consumosParaProcessar = consumos;
  } else if (codigoItem && quantidadeConsumida) {
    // Formato antigo: um único consumo (compatibilidade)
    consumosParaProcessar = [{ codigoItem, quantidadeConsumida: Number(quantidadeConsumida) }];
  } else {
    return res.status(400).json({ error: "Dados da medição incompletos. Envie 'consumos' (array) ou 'codigoItem' + 'quantidadeConsumida'." });
  }

  if (!projeto) {
    return res.status(400).json({ error: "Campo 'projeto' é obrigatório." });
  }

  // Processar todos os consumos em uma transação
  const medicoes = await prisma.$transaction(async (tx) => {
    const medicoesCriadas = [];

    for (const consumo of consumosParaProcessar) {
      // Buscar material considerando projeto (o mesmo item pode existir em projetos diferentes)
      // Regra:
      // 1) tenta por (codigoItem + codigoProjeto == projeto)
      // 2) fallback: (codigoItem + codigoProjeto == null)
      // 3) fallback: primeiro por codigoItem (compatibilidade)
      const material =
        (await tx.material.findFirst({
          where: { codigoItem: consumo.codigoItem, codigoProjeto: projeto },
        })) ||
        (await tx.material.findFirst({
          where: { codigoItem: consumo.codigoItem, codigoProjeto: null },
        })) ||
        (await tx.material.findFirst({
          where: { codigoItem: consumo.codigoItem },
        }));

      if (!material) {
        throw new Error(`Material não encontrado: ${consumo.codigoItem}`);
      }

      const quantidade = Number(consumo.quantidadeConsumida);

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

      await tx.material.update({
        where: { id: material.id },
        data: {
          estoqueAtual: material.estoqueAtual - quantidade,
        },
      });

      medicoesCriadas.push(novaMedicao);
    }

    return medicoesCriadas;
  });

  // Envia APENAS UMA linha para o Smartsheet (com todos os dados do apontamento)
  // eslint-disable-next-line no-console
  console.log(`[Medicao] ${medicoes.length} medição(ões) registrada(s) no banco. Enviando UMA linha para Smartsheet...`);
  
  // Usar os dados da primeira medição para o Smartsheet (todas têm os mesmos dados de apontamento)
  const primeiraMedicao = medicoes[0];
  const materialPrimeira = await prisma.material.findUnique({
    where: { id: primeiraMedicao.materialId },
  });

  registrarMedicaoNoSmartsheet({
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
    torre,
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
    codigoItem: materialPrimeira?.codigoItem || "",
    descricaoMaterial: materialPrimeira?.descricao || "",
    unidadeMaterial: materialPrimeira?.unidade || "",
    quantidadeConsumida: primeiraMedicao.quantidadeConsumida,
  }).catch((e) => {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] ❌ Falha ao enviar medição para Smartsheet:", e.message);
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] Stack trace:", e.stack);
    // Não bloquear a resposta ao usuário, mas registrar o erro detalhadamente
  });

  res.status(201).json({ medicoes, total: medicoes.length });
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
  } catch (e: any) {
    console.error("[Medicoes] Erro ao listar medições:", e?.message);
    res.status(503).json({
      error: "Erro ao acessar o banco para listar medições.",
      detalhes: e?.message,
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

// Endpoint de diagnóstico do Smartsheet (ANTES do app.listen!)
app.get("/smartsheet/status", async (_req, res) => {
  const status = {
    tokenConfigurado: !!process.env.SMARTSHEET_TOKEN,
    sheetMedicoesConfigurado: !!process.env.SMARTSHEET_SHEET_MEDICOES,
    sheetMateriaisConfigurado: !!process.env.SMARTSHEET_SHEET_MATERIAIS,
    tokenValido: false,
    sheetMedicoesAcessivel: false,
    erro: null as string | null,
  };

  if (status.tokenConfigurado && status.sheetMedicoesConfigurado) {
    try {
      // Tentar buscar a planilha para verificar se está tudo OK
      const axios = require("axios");
      const response = await axios.get(
        `https://api.smartsheet.com/2.0/sheets/${process.env.SMARTSHEET_SHEET_MEDICOES}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SMARTSHEET_TOKEN}`,
          },
          timeout: 10000,
        },
      );
      status.tokenValido = true;
      status.sheetMedicoesAcessivel = true;
      status.erro = null;
    } catch (e: any) {
      status.tokenValido = false;
      status.sheetMedicoesAcessivel = false;
      if (e?.response?.status === 401) {
        status.erro = "Token inválido ou expirado. Gere um novo token no Smartsheet.";
      } else if (e?.response?.status === 404) {
        status.erro = "Sheet ID não encontrado. Verifique se o ID da planilha está correto.";
      } else {
        status.erro = e?.message || "Erro ao conectar com Smartsheet";
      }
    }
  } else {
    status.erro = "Variáveis de ambiente não configuradas. Configure SMARTSHEET_TOKEN e SMARTSHEET_SHEET_MEDICOES no Render.";
  }

  res.json(status);
});

// Endpoints para gerenciar projetos e clientes
// GET /projetos-clientes?tipo=projeto ou ?tipo=cliente
app.get("/projetos-clientes", async (req, res) => {
  try {
    const tipo = req.query.tipo as string | undefined;
    const apenasNomes = req.query.nomes === "true"; // Se quiser apenas nomes como array
    const where = tipo ? { tipo } : {};
    
    const itens = await prisma.projetoCliente.findMany({
      where,
      orderBy: { nome: "asc" },
    });
    
    if (apenasNomes) {
      res.json(itens.map(item => item.nome));
    } else {
      res.json(itens);
    }
  } catch (e: any) {
    console.error("[Projetos/Clientes] Erro ao listar:", e?.message);
    res.status(500).json({ error: "Erro ao listar projetos/clientes.", detalhes: e?.message });
  }
});

// POST /projetos-clientes - adicionar projeto ou cliente
app.post("/projetos-clientes", async (req, res) => {
  try {
    const { nome, tipo } = req.body;
    
    if (!nome || !tipo) {
      return res.status(400).json({ error: "Nome e tipo são obrigatórios." });
    }
    
    if (tipo !== "projeto" && tipo !== "cliente") {
      return res.status(400).json({ error: "Tipo deve ser 'projeto' ou 'cliente'." });
    }
    
    const item = await prisma.projetoCliente.upsert({
      where: {
        nome_tipo: {
          nome: nome.trim(),
          tipo,
        },
      },
      update: {},
      create: {
        nome: nome.trim(),
        tipo,
      },
    });
    
    res.json({ id: item.id, nome: item.nome, tipo: item.tipo });
  } catch (e: any) {
    console.error("[Projetos/Clientes] Erro ao adicionar:", e?.message);
    res.status(500).json({ error: "Erro ao adicionar projeto/cliente.", detalhes: e?.message });
  }
});

// DELETE /projetos-clientes/:id - remover projeto ou cliente
app.delete("/projetos-clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID inválido." });
    }
    
    await prisma.projetoCliente.delete({
      where: { id },
    });
    
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[Projetos/Clientes] Erro ao remover:", e?.message);
    res.status(500).json({ error: "Erro ao remover projeto/cliente.", detalhes: e?.message });
  }
});

// Conectar ao banco no startup (sem derrubar o servidor se falhar, mas logando claramente)
conectarBancoComTimeout(15000)
  .then(() => console.log("✅ Conexão com banco OK"))
  .catch((e) => console.error("❌ Falha ao conectar no banco:", (e as any)?.message));

// Iniciar servidor (DEPOIS de registrar todas as rotas!)
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend rodando na porta ${PORT}`);
}).on('error', (err: any) => {
  // eslint-disable-next-line no-console
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});


