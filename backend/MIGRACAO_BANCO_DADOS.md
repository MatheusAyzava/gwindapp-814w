# 🗄️ Guia de Migração para Banco de Dados Online

## Opções de Banco de Dados Gratuitos

### 1. **Supabase (Recomendado)** ⭐
- **PostgreSQL gratuito**
- **500 MB** de armazenamento
- Interface web muito fácil
- Conexão direta com Prisma
- **Link**: https://supabase.com

### 2. **Render.com PostgreSQL**
- Já usa Render para backend
- PostgreSQL gratuito
- **90 dias grátis**, depois pago
- **Link**: https://render.com

### 3. **PlanetScale (MySQL)**
- MySQL gratuito
- **5 GB** de armazenamento
- Escalável
- **Link**: https://planetscale.com

---

## 📋 Passo a Passo: Migração para Supabase

### Passo 1: Criar conta no Supabase

1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Faça login com GitHub
4. Clique em "New Project"
5. Preencha:
   - **Name**: `gwindapp-materiais` (ou outro nome)
   - **Database Password**: Crie uma senha forte (anote ela!)
   - **Region**: Escolha a mais próxima (ex: `South America (São Paulo)`)
6. Clique em "Create new project"
7. Aguarde 2-3 minutos para criar

### Passo 2: Obter a URL de conexão

1. No projeto criado, vá em **Settings** → **Database**
2. Role até **Connection string**
3. Selecione **URI** (não Transaction)
4. Copie a URL que aparece (algo como):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. **IMPORTANTE**: Substitua `[YOUR-PASSWORD]` pela senha que você criou

### Passo 3: Configurar o Prisma

1. Abra o arquivo `backend/prisma/schema.prisma`
2. Altere de:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
   
   Para:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

### Passo 4: Configurar variável de ambiente

1. Crie/edite o arquivo `backend/.env`
2. Adicione:
   ```env
   DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@db.xxxxx.supabase.co:5432/postgres"
   ```
   (Substitua pela URL completa que você copiou)

### Passo 5: Instalar dependências (se necessário)

```bash
cd backend
npm install
```

### Passo 6: Criar as tabelas no banco

```bash
cd backend
npx prisma migrate dev --name init
```

Isso vai criar todas as tabelas no PostgreSQL.

### Passo 7: Gerar o Prisma Client

```bash
npx prisma generate
```

### Passo 8: Testar

```bash
npm run dev
```

O backend deve conectar ao Supabase agora!

---

## 🔄 Migração de Dados (Opcional)

Se você já tem dados no SQLite local e quer migrar:

### Opção 1: Exportar do SQLite e importar no PostgreSQL

1. Exportar dados do SQLite:
```bash
cd backend
npx prisma db pull  # Puxa schema do SQLite
npx prisma db seed  # Exporta dados (se tiver seed)
```

2. Importar no PostgreSQL:
- Use a interface do Supabase (SQL Editor)
- Ou use um script de migração

### Opção 2: Re-importar do Excel/Smartsheet

- Simplesmente importe novamente pelo sistema web
- Todos os dados serão salvos no PostgreSQL

---

## 🚀 Deploy do Backend com PostgreSQL

### Render.com

1. No Render, vá em **Dashboard** → **New** → **Web Service**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `gwindapp-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd backend && npm start`
4. Em **Environment Variables**, adicione:
   - `DATABASE_URL`: A URL do Supabase
   - `SMARTSHEET_TOKEN`: Seu token do Smartsheet
   - `SMARTSHEET_SHEET_MATERIAIS`: ID da planilha
   - `SMARTSHEET_SHEET_MEDICOES`: ID da planilha
5. Clique em **Create Web Service**

### Atualizar Frontend

No arquivo `web/src/pages/App.tsx`, altere:

```typescript
const API_BASE_URL = "https://seu-backend.onrender.com";
```

Ou use variável de ambiente no Netlify/Vercel.

---

## ✅ Checklist Final

- [ ] Conta criada no Supabase
- [ ] Projeto criado no Supabase
- [ ] URL de conexão copiada
- [ ] `schema.prisma` atualizado para PostgreSQL
- [ ] `.env` configurado com `DATABASE_URL`
- [ ] Migrations executadas (`npx prisma migrate dev`)
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Backend testado localmente
- [ ] Backend deployado no Render
- [ ] Frontend atualizado com URL do backend online
- [ ] Testado importação de materiais

---

## 🆘 Problemas Comuns

### Erro: "Connection refused"
- Verifique se a URL está correta
- Verifique se substituiu `[YOUR-PASSWORD]` pela senha real
- Verifique se o projeto Supabase está ativo

### Erro: "Table does not exist"
- Execute: `npx prisma migrate dev`

### Erro: "Prisma Client not generated"
- Execute: `npx prisma generate`

---

## 📞 Suporte

Se tiver problemas, verifique:
1. Logs do Supabase (Dashboard → Logs)
2. Logs do backend (Render Dashboard)
3. Console do navegador (F12)

