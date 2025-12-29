-- ============================================
-- SCRIPT SIMPLES PARA LIMPAR APENAS OS DADOS
-- Execute este código no SQL Editor do Supabase
-- ============================================

-- ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
-- Isso vai apagar TODOS os materiais e medições

-- Deletar medições primeiro (tem foreign key para materiais)
DELETE FROM "Medicao";

-- Depois deletar materiais
DELETE FROM "Material";

-- Verificar se foi deletado (deve retornar 0 para ambos)
SELECT 
    (SELECT COUNT(*) FROM "Material") as total_materiais,
    (SELECT COUNT(*) FROM "Medicao") as total_medicoes;

-- Se tudo deu certo, você verá:
-- total_materiais: 0
-- total_medicoes: 0

