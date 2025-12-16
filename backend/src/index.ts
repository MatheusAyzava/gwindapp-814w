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

const app = express();
const prisma = new PrismaClient();
// Porta do backend principal deste portal.
// Deixamos 4001 para não conflitar com o servidor de passagens (3001).
const PORT = process.env.PORT || 4001;

app.use(helmet());
// CORS: permitir requisições do frontend Netlify e localhost
app.use(cors({
  origin: [
    'https://gwind-app-test.netlify.app',
    'http://localhost:5174',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
// Aumentar limite de tamanho do body para permitir importações grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configurar multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });

// Healthcheck
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Listar materiais com saldo calculado
app.get("/materiais", async (_req, res) => {
  const materiais = await prisma.material.findMany({
    orderBy: { descricao: "asc" },
  });
  res.json(materiais);
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

// Importar vários materiais de uma vez
app.post("/materiais/import", async (req, res) => {
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

  const resultados = [];

  for (const item of itens) {
    if (!item.codigoItem || !item.descricao || !item.unidade) {
      // pula itens inválidos, mas continua importação
      continue;
    }

    const valorEstoqueInicial = Number(item.estoqueInicial ?? 0);

    const codigoProjetoValue = item.codigoProjeto || null;
    
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

  res.json({ quantidadeImportada: resultados.length, materiais: resultados });
});

// Importar materiais a partir do Smartsheet
app.post("/materiais/import-smartsheet", async (_req, res) => {
  try {
    const itens = await importarMateriaisDoSmartsheet();

    const resultados = [];

    for (const item of itens) {
      const codigoProjetoValue = item.codigoProjeto || null;
      
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
  } catch (e: any) {
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
        const codigoProjetoValue = codigoProjeto || null;
        
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
    codigoItem,
    quantidadeConsumida,
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

  if (!codigoItem || !quantidadeConsumida || !projeto) {
    return res.status(400).json({ error: "Dados da medição incompletos." });
  }

  // Buscar material - pode ter múltiplos com mesmo código em projetos diferentes
  // Por enquanto busca o primeiro, mas idealmente deveria buscar pelo projeto também
  const material = await prisma.material.findFirst({
    where: { codigoItem },
  });

  if (!material) {
    return res.status(404).json({ error: "Material não encontrado." });
  }

  const quantidade = Number(quantidadeConsumida);

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

    await tx.material.update({
      where: { id: material.id },
      data: {
        estoqueAtual: material.estoqueAtual - quantidade,
      },
    });

    return novaMedicao;
  });

  // Envia a medição para o Smartsheet de forma assíncrona, sem bloquear a resposta
  registrarMedicaoNoSmartsheet({
    dia: dia ? new Date(dia) : null,
    semana,
    cliente,
    projeto,
    escala,
    tecnicoLider,
    quantidadeTecnicos,
    nomesTecnicos,
    horaInicio,
    horaFim,
  }).catch((e) => {
    // eslint-disable-next-line no-console
    console.error("[Smartsheet] Falha ao enviar medição:", e.message);
  });

  res.status(201).json(medicao);
});

// Listar medições (visão tipo grid)
app.get("/medicoes", async (_req, res) => {
  const medicoes = await prisma.medicao.findMany({
    include: { material: true },
    orderBy: { id: "desc" },
    take: 500, // limitar para não pesar; depois podemos paginar
  });

  res.json(medicoes);
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
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[Limpar] Erro ao apagar dados:", e.message);
    res.status(500).json({ 
      error: "Erro ao apagar dados.",
      detalhes: e.message 
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend rodando na porta ${PORT}`);
});


