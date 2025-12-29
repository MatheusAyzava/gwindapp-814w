-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjetoCliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjetoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjetoCliente_nome_tipo_key" ON "ProjetoCliente"("nome", "tipo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjetoCliente_tipo_idx" ON "ProjetoCliente"("tipo");

