# Como Deployar o Backend de Materiais no Render

O backend de materiais precisa ser deployado no Render para funcionar. Atualmente você tem:
- ✅ `gwindapp-portal-web` (frontend)
- ✅ `gwindapp-passagens-backend-1` (backend de passagens)
- ❌ **Falta:** Backend de materiais

## 🚀 Passo a Passo para Criar o Serviço no Render

### 1. Criar Novo Serviço no Render

1. Acesse: https://dashboard.render.com/
2. Clique em **"+ New"** → **"Web Service"**
3. **Selecione o repositório**: `gwindapp-814w` (o mesmo repositório que contém o backend)
4. Configure o serviço:
   - **Name**: `gwindapp-materiais-backend`
   - **Environment**: `Node`
   - **Region**: `Virginia` (mesma região dos outros serviços)
   - **Branch**: `main` (ou a branch que você usa)
   - **Root Directory**: `backend` ⚠️ **IMPORTANTE!** (isso faz o Render olhar dentro da pasta `backend/` do repositório)
   - **Build Command**: `npm install` (o código já está compilado em `dist/`)
   - **Start Command**: `node dist/index.js`
   - **Plan**: `Free`

### 2. Configurar Variáveis de Ambiente

No Render, vá em **Environment** e adicione:
- `DATABASE_URL` - URL do banco de dados Supabase
- `SMARTSHEET_ACCESS_TOKEN` - Token do Smartsheet (se usar)
- `PORT` - Deixe vazio (Render define automaticamente)
- Outras variáveis que o backend precisa

### 3. Após o Deploy

1. Anote a URL do serviço (ex: `https://gwindapp-materiais-backend.onrender.com`)
2. Configure no Netlify (frontend):
   - Vá em **Site settings** → **Environment variables**
   - Adicione: `VITE_API_URL` = URL do novo serviço
   - Faça um novo deploy do frontend

## ✅ Verificar se Funcionou

Após o deploy, teste no navegador:
```
https://gwindapp-materiais-backend.onrender.com/materiais
```

Deve retornar uma lista de materiais (mesmo que vazia `[]`).

## 🔧 Manter Servidor Acordado

Após o deploy, configure o UptimeRobot para manter o servidor acordado:
- URL: `https://gwindapp-materiais-backend.onrender.com/materiais`
- Intervalo: 5 minutos
- Veja o guia: `web/COMO_MANTER_SERVIDOR_ACORDADO.md`

## ⚠️ Importante

- O **Root Directory** deve ser `backend` (não deixe vazio!)
- O código já está compilado em `dist/index.js`, então só precisa de `npm install`
- Use a mesma região (Virginia) dos outros serviços
