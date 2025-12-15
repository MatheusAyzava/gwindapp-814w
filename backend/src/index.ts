import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
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
app.use(cors());
app.use(express.json());

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

  const material = await prisma.material.upsert({
    where: { codigoItem },
    update: {
      descricao,
      unidade,
      estoqueInicial: valorEstoqueInicial,
      estoqueAtual: valorEstoqueInicial,
    },
    create: {
      codigoItem,
      descricao,
      unidade,
      estoqueInicial: valorEstoqueInicial,
      estoqueAtual: valorEstoqueInicial,
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

    const material = await prisma.material.upsert({
      where: { codigoItem: item.codigoItem },
      update: {
        descricao: item.descricao,
        unidade: item.unidade,
        estoqueInicial: valorEstoqueInicial,
        estoqueAtual: valorEstoqueInicial,
      },
      create: {
        codigoItem: item.codigoItem,
        descricao: item.descricao,
        unidade: item.unidade,
        estoqueInicial: valorEstoqueInicial,
        estoqueAtual: valorEstoqueInicial,
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
      const material = await prisma.material.upsert({
        where: { codigoItem: item.codigoItem },
        update: {
          descricao: item.descricao,
          unidade: item.unidade,
          estoqueInicial: item.estoqueInicial,
          estoqueAtual: item.estoqueInicial,
        },
        create: {
          codigoItem: item.codigoItem,
          descricao: item.descricao,
          unidade: item.unidade,
          estoqueInicial: item.estoqueInicial,
          estoqueAtual: item.estoqueInicial,
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

  const material = await prisma.material.findUnique({
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend rodando na porta ${PORT}`);
});


