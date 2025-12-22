# Como Evitar que o Backend "Durma" no Render.com

O Render.com suspende serviços gratuitos após **15 minutos de inatividade**. Para evitar isso, você precisa fazer requisições periódicas ao backend.

## ✅ Solução Recomendada: UptimeRobot (Gratuito)

### 1. Criar conta no UptimeRobot
- Acesse: https://uptimerobot.com/
- Crie uma conta gratuita (até 50 monitores)

### 2. Adicionar Monitor
1. Clique em **"+ Add New Monitor"**
2. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: `Backend Portal Materiais`
   - **URL**: `https://gwindapp-portal-web.onrender.com/health`
   - **Monitoring Interval**: `5 minutes` (mínimo no plano gratuito)
   - **Alert Contacts**: Seu email
3. Clique em **"Create Monitor"**

### 3. Pronto!
O UptimeRobot fará requisições a cada 5 minutos ao endpoint `/health`, mantendo o backend ativo.

---

## 🔄 Alternativa: cron-job.org (Gratuito)

### 1. Criar conta
- Acesse: https://cron-job.org/
- Crie uma conta gratuita

### 2. Criar Cron Job
1. Clique em **"Create cronjob"**
2. Configure:
   - **Title**: `Ping Backend Render`
   - **Address**: `https://gwindapp-portal-web.onrender.com/health`
   - **Schedule**: A cada 10 minutos (`*/10 * * * *`)
   - **Notification**: Seu email (opcional)
3. Clique em **"Create"**

---

## 🚀 Alternativa: Render.com Cron Jobs (Requer plano pago)

Se você tiver um plano pago no Render, pode configurar um Cron Job diretamente no Render:

1. Vá em **"Background Workers"** no dashboard
2. Crie um novo Cron Job
3. Configure para executar a cada 10 minutos:
   ```bash
   curl https://gwindapp-portal-web.onrender.com/health
   ```

---

## 📝 Endpoints Disponíveis

O backend já possui endpoints de health check:

- **`GET /health`**: Verifica se o backend está rodando
  - Resposta: `{ "status": "ok" }`

- **`GET /health/db`**: Verifica backend + conexão com banco
  - Resposta: `{ "status": "ok", "db": "ok" }`

**Recomendação**: Use `/health` para o ping periódico (mais rápido).

---

## ⚠️ Importante

- **Intervalo mínimo**: 5 minutos (UptimeRobot gratuito) ou 10 minutos (cron-job.org)
- **15 minutos de inatividade**: Render suspende o serviço
- **Primeira requisição após sleep**: Pode levar 30-60 segundos para "acordar"

---

## 🔍 Verificar se está funcionando

1. Acesse o dashboard do Render
2. Veja os logs do serviço
3. Você deve ver requisições periódicas ao endpoint `/health`

---

## 💡 Dica Extra

Se quiser, pode configurar múltiplos serviços de ping para garantir redundância:
- UptimeRobot (a cada 5 min)
- cron-job.org (a cada 10 min)

Assim, mesmo se um falhar, o outro mantém o backend ativo.

