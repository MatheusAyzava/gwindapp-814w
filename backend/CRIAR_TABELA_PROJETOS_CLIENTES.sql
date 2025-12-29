-- ============================================
-- SQL para criar a tabela ProjetoCliente no Supabase
-- Execute este código no SQL Editor do Supabase
-- ============================================

-- Criar tabela ProjetoCliente
CREATE TABLE IF NOT EXISTS "ProjetoCliente" (
    "id" SERIAL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS "ProjetoCliente_nome_tipo_key" 
ON "ProjetoCliente"("nome", "tipo");

-- Criar índice para busca por tipo
CREATE INDEX IF NOT EXISTS "ProjetoCliente_tipo_idx" 
ON "ProjetoCliente"("tipo");

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Após executar, a tabela estará pronta para uso.
-- Os projetos e clientes adicionados serão salvos aqui e
-- aparecerão para todos os usuários.

