# 🚀 Guia Completo: PlanetScale (MySQL 5GB)

## ✅ Por que PlanetScale?

- **5 GB gratuitos** (mais que suficiente para começar)
- **Escalável**: Pode aumentar facilmente depois
- **MySQL compatível** com Prisma
- **Performance excelente**
- **Backup automático**

---

## 📋 Passo a Passo: Configuração PlanetScale

### Passo 1: Criar conta no PlanetScale

1. Acesse: https://planetscale.com
2. Clique em **"Sign up"**
3. Faça login com GitHub (recomendado)
4. Confirme seu email

### Passo 2: Criar banco de dados

1. No dashboard, clique em **"Create database"**
2. Preencha:
   - **Database name**: `gwindapp-materiais` (ou outro nome)
   - **Region**: Escolha a mais próxima (ex: `us-east` ou `sa-east-1`)
   - **Plan**: **Hobby** (gratuito, 5GB)
3. Clique em **"Create database"**
4. Aguarde alguns segundos para criar

### Passo 3: Obter URL de conexão

1. No banco criado, clique em **"Connect"**
2. Selecione **"Prisma"**
3. Copie a URL que aparece (algo como):
   ```
   mysql://xxxxx:xxxxx@aws.connect.psdb.cloud/gwindapp-materiais?sslaccept=strict
   ```
4. **IMPORTANTE**: Essa URL tem uma senha temporária. Você pode criar uma senha permanente depois.

### Passo 4: Criar senha permanente (recomendado)

1. No banco, vá em **"Settings"** → **"Passwords"**
2. Clique em **"New password"**
3. Dê um nome (ex: `backend-prod`)
4. Clique em **"Create password"**
5. **COPIE A SENHA** (ela só aparece uma vez!)
6. Use essa senha na URL de conexão

### Passo 5: Configurar Prisma

O schema já está configurado para MySQL! ✅

Apenas configure o `.env`:

```env
DATABASE_URL="mysql://xxxxx:SUA_SENHA@aws.connect.psdb.cloud/gwindapp-materiais?sslaccept=strict"
```

### Passo 6: Criar as tabelas

```bash
cd backend
npx prisma migrate dev --name init
```

Isso vai criar todas as tabelas no PlanetScale.

### Passo 7: Gerar Prisma Client

```bash
npx prisma generate
```

### Passo 8: Testar

```bash
npm run dev
```

---

## 📈 Como Aumentar o Plano Depois

### Opções de Upgrade:

1. **Scaling Plan** ($29/mês)
   - 10 GB de armazenamento
   - Mais recursos
   - Suporte prioritário

2. **Enterprise Plan** (sob consulta)
   - Armazenamento ilimitado
   - Recursos dedicados
   - Suporte 24/7

### Como fazer upgrade:

1. No dashboard do PlanetScale, vá em **"Settings"** → **"Plan"**
2. Clique em **"Upgrade"**
3. Escolha o plano desejado
4. Complete o pagamento
5. **Sem downtime!** O upgrade é instantâneo

### Monitoramento de uso:

- No dashboard, você vê:
  - Armazenamento usado
  - Número de requisições
  - Performance

---

## 🔄 Migração de Dados

### Se você já tem dados no SQLite:

1. **Exportar do SQLite** (opcional):
   - Use a interface do sistema para exportar
   - Ou re-importe do Excel/Smartsheet

2. **Importar no PlanetScale**:
   - Use o sistema web normalmente
   - Todos os dados serão salvos no PlanetScale

---

## 🚀 Deploy do Backend com PlanetScale

### Render.com

1. No Render, vá em **Dashboard** → **New** → **Web Service**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `gwindapp-backend`
   - **Environment**: `Node`
   - **Build Command**: 
     ```bash
     cd backend && npm install && npx prisma generate && npm run build
     ```
   - **Start Command**: 
     ```bash
     cd backend && npm start
     ```
4. Em **Environment Variables**, adicione:
   - `DATABASE_URL`: A URL do PlanetScale
   - `SMARTSHEET_TOKEN`: Seu token do Smartsheet
   - `SMARTSHEET_SHEET_MATERIAIS`: ID da planilha
   - `SMARTSHEET_SHEET_MEDICOES`: ID da planilha
5. Clique em **Create Web Service**

### Atualizar Frontend

No arquivo `web/src/pages/App.tsx`, altere:

```typescript
const API_BASE_URL = "https://seu-backend.onrender.com";
```

Ou configure variável de ambiente no Netlify/Vercel:
- `VITE_API_URL`: `https://seu-backend.onrender.com`

---

## 🔒 Segurança

### Boas práticas:

1. **Nunca commite** a URL do banco no Git
2. Use **variáveis de ambiente** sempre
3. Crie **senhas separadas** para dev/prod
4. Use **branching** no PlanetScale para testar mudanças

### Branching (Desenvolvimento):

PlanetScale permite criar "branches" do banco:

```bash
# Criar branch de desenvolvimento
pscale branch create gwindapp-materiais dev

# Conectar ao branch
pscale connect gwindapp-materiais dev
```

Isso permite testar mudanças sem afetar produção!

---

## ✅ Checklist Final

- [ ] Conta criada no PlanetScale
- [ ] Banco de dados criado (Hobby plan - 5GB)
- [ ] Senha permanente criada
- [ ] URL de conexão copiada
- [ ] `.env` configurado com `DATABASE_URL`
- [ ] Migrations executadas (`npx prisma migrate dev`)
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Backend testado localmente
- [ ] Backend deployado no Render
- [ ] Frontend atualizado com URL do backend online
- [ ] Testado importação de materiais
- [ ] Monitoramento configurado no PlanetScale

---

## 📊 Monitoramento

No dashboard do PlanetScale você pode ver:

- **Storage**: Quanto espaço está usando
- **Queries**: Número de consultas
- **Performance**: Tempo de resposta
- **Connections**: Conexões ativas

**Dica**: Configure alertas para quando chegar perto dos 5GB!

---

## 🆘 Problemas Comuns

### Erro: "SSL connection required"
- Certifique-se de que a URL tem `?sslaccept=strict`
- Verifique se a senha está correta

### Erro: "Table does not exist"
- Execute: `npx prisma migrate dev`

### Erro: "Connection timeout"
- Verifique se o banco está ativo no dashboard
- Verifique a região (escolha a mais próxima)

### Erro: "Prisma Client not generated"
- Execute: `npx prisma generate`

---

## 💡 Dicas

1. **Use branching** para testar mudanças
2. **Monitore o uso** regularmente
3. **Configure alertas** para espaço
4. **Faça backup** antes de mudanças grandes
5. **Use índices** para melhor performance (Prisma faz isso automaticamente)

---

## 📞 Suporte

- **Documentação**: https://planetscale.com/docs
- **Status**: https://status.planetscale.com
- **Comunidade**: https://github.com/planetscale/discussion

---

## 🎯 Próximos Passos

1. ✅ Criar conta no PlanetScale
2. ✅ Criar banco de dados
3. ✅ Configurar `.env`
4. ✅ Executar migrations
5. ✅ Testar localmente
6. ✅ Deploy no Render
7. ✅ Atualizar frontend
8. ✅ Testar tudo online!

**Boa sorte! 🚀**

