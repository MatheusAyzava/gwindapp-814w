-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigoItem" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "estoqueInicial" REAL NOT NULL DEFAULT 0,
    "estoqueAtual" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Medicao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "materialId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projeto" TEXT NOT NULL,
    "torre" TEXT,
    "quantidadeConsumida" REAL NOT NULL,
    "usuarioId" INTEGER,
    "origem" TEXT NOT NULL DEFAULT 'mobile',
    CONSTRAINT "Medicao_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Medicao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Material_codigoItem_key" ON "Material"("codigoItem");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
