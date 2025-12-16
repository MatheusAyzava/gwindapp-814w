# 🚀 Deploy do Backend no Render.com

## Passo a Passo Rápido

### 1. Criar repositório Git para o backend

```bash
cd backend
git init
git add .
git commit -m "Backend inicial"
```

### 2. Criar repositório no GitHub

1. Acesse: https://github.com/new
2. Nome: `gwindapp-materiais-backend` (ou outro nome)
3. Clique em "Create repository"
4. Siga as instruções para fazer push:

```bash
git remote add origin https://github.com/SEU_USUARIO/gwindapp-materiais-backend.git
git branch -M main
git push -u origin main
```

### 3. Deploy no Render.com

1. Acesse: https://render.com
2. Faça login com GitHub
3. Clique em **"New +"** → **"Web Service"**
4. Conecte o repositório `gwindapp-materiais-backend`
5. Configure:
   - **Name**: `gwindapp-materiais-backend`
   - **Environment**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```
   - **Root Directory**: `backend` (se o repositório for o monorepo) ou deixe vazio se for só o backend

### 4. Variáveis de Ambiente no Render

No Render, vá em **"Environment"** e adicione:

```
DATABASE_URL=mysql://xxxxx:senha@aws.connect.psdb.cloud/nome-banco?sslaccept=strict
SMARTSHEET_TOKEN=seu_token_aqui
SMARTSHEET_SHEET_MATERIAIS=id_da_planilha
SMARTSHEET_SHEET_MEDICOES=id_da_planilha
PORT=4001
```

### 5. Executar Migrations

Após o deploy, execute as migrations:

1. No Render, vá em **"Shell"**
2. Execute:
   ```bash
   npx prisma migrate deploy
   ```

### 6. Configurar Frontend (Netlify)

No Netlify, vá em **"Site settings"** → **"Environment variables"** e adicione:

```
VITE_API_URL=https://seu-backend.onrender.com
```

(Substitua `seu-backend.onrender.com` pela URL que o Render forneceu)

### 7. Redeploy do Frontend

No Netlify, vá em **"Deploys"** → **"Trigger deploy"** → **"Clear cache and deploy site"**

---

## ✅ Pronto!

Agora o frontend vai se conectar ao backend online! 🎉

