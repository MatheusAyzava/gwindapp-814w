-- ============================================
-- SCRIPT PARA LIMPAR DADOS E RECRIAR TABELAS
-- Execute este código no SQL Editor do Supabase
-- ============================================

-- ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
-- Isso vai apagar TODOS os dados e recriar as tabelas

-- ============================================
-- PASSO 1: LIMPAR DADOS
-- ============================================

-- Deletar medições primeiro (tem foreign key para materiais)
DELETE FROM "Medicao";

-- Depois deletar materiais
DELETE FROM "Material";

-- Deletar usuários (opcional - descomente se quiser limpar também)
-- DELETE FROM "Usuario";

-- ============================================
-- PASSO 2: RECRIAR TABELAS (se necessário)
-- ============================================
-- Descomente as linhas abaixo se quiser DROPAR e RECRIAR as tabelas
-- CUIDADO: Isso vai apagar a estrutura também!

/*
-- Dropar tabelas (na ordem correta devido às foreign keys)
DROP TABLE IF EXISTS "Medicao" CASCADE;
DROP TABLE IF EXISTS "Material" CASCADE;
DROP TABLE IF EXISTS "Usuario" CASCADE;

-- Tabela: Usuario
CREATE TABLE "Usuario" (
    "id" SERIAL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "senhaHash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL
);

-- Tabela: Material (COM TODAS AS COLUNAS)
CREATE TABLE "Material" (
    "id" SERIAL PRIMARY KEY,
    "codigoItem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "estoqueInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estoqueAtual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codigoEstoque" TEXT,
    "descricaoEstoque" TEXT,
    "confirmado" DOUBLE PRECISION,
    "pedido" DOUBLE PRECISION,
    "disponivel" DOUBLE PRECISION,
    "precoItem" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "codigoProjeto" TEXT,
    "descricaoProjeto" TEXT,
    "centroCustos" TEXT,
    CONSTRAINT "Material_codigoItem_codigoProjeto_key" UNIQUE ("codigoItem", "codigoProjeto")
);

-- Tabela: Medicao (COM TODAS AS COLUNAS)
CREATE TABLE "Medicao" (
    "id" SERIAL PRIMARY KEY,
    "materialId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dia" TIMESTAMP(3),
    "semana" TEXT,
    "cliente" TEXT,
    "projeto" TEXT NOT NULL,
    "escala" TEXT,
    "quantidadeTecnicos" INTEGER,
    "tecnicoLider" TEXT,
    "nomesTecnicos" TEXT,
    "supervisor" TEXT,
    "tipoIntervalo" TEXT,
    "tipoAcesso" TEXT,
    "pa" TEXT,
    "torre" TEXT,
    "plataforma" TEXT,
    "equipe" TEXT,
    "tipoHora" TEXT,
    "quantidadeEventos" INTEGER,
    "horaInicio" TEXT,
    "horaFim" TEXT,
    "tipoDano" TEXT,
    "danoCodigo" TEXT,
    "larguraDanoMm" DOUBLE PRECISION,
    "comprimentoDanoMm" DOUBLE PRECISION,
    "etapaProcesso" TEXT,
    "etapaLixamento" TEXT,
    "resinaTipo" TEXT,
    "resinaQuantidade" DOUBLE PRECISION,
    "resinaCatalisador" TEXT,
    "resinaLote" TEXT,
    "resinaValidade" TEXT,
    "massaTipo" TEXT,
    "massaQuantidade" DOUBLE PRECISION,
    "massaCatalisador" TEXT,
    "massaLote" TEXT,
    "massaValidade" TEXT,
    "nucleoTipo" TEXT,
    "nucleoEspessuraMm" DOUBLE PRECISION,
    "puTipo" TEXT,
    "puMassaPeso" DOUBLE PRECISION,
    "puCatalisadorPeso" DOUBLE PRECISION,
    "puLote" TEXT,
    "puValidade" TEXT,
    "gelTipo" TEXT,
    "gelPeso" DOUBLE PRECISION,
    "gelCatalisadorPeso" DOUBLE PRECISION,
    "gelLote" TEXT,
    "gelValidade" TEXT,
    "retrabalho" BOOLEAN,
    "quantidadeConsumida" DOUBLE PRECISION NOT NULL,
    "usuarioId" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'mobile',
    CONSTRAINT "Medicao_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Medicao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX "Material_codigoItem_idx" ON "Material"("codigoItem");
CREATE INDEX "Material_codigoProjeto_idx" ON "Material"("codigoProjeto");
CREATE INDEX "Medicao_materialId_idx" ON "Medicao"("materialId");
CREATE INDEX "Medicao_usuarioId_idx" ON "Medicao"("usuarioId");
CREATE INDEX "Medicao_data_idx" ON "Medicao"("data");
CREATE INDEX "Medicao_projeto_idx" ON "Medicao"("projeto");
*/

-- ============================================
-- VERIFICAÇÃO: Contar registros restantes
-- ============================================
SELECT 
    (SELECT COUNT(*) FROM "Material") as total_materiais,
    (SELECT COUNT(*) FROM "Medicao") as total_medicoes;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Se tudo deu certo, você verá:
-- total_materiais: 0
-- total_medicoes: 0

