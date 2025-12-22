# 📘 Guia Passo a Passo: UptimeRobot

## 🎯 Objetivo
Configurar o UptimeRobot para fazer requisições periódicas ao backend, evitando que ele "durma" no Render.com.

---

## 📝 Passo 1: Criar Conta

1. **Acesse o site:**
   - Vá para: https://uptimerobot.com/
   - Clique no botão **"Sign Up"** (canto superior direito)

2. **Preencha o cadastro:**
   - **Email**: Seu email
   - **Password**: Sua senha
   - **Username**: Seu nome de usuário
   - Aceite os termos de uso
   - Clique em **"Create Account"**

3. **Verificar email:**
   - Verifique sua caixa de entrada
   - Clique no link de confirmação enviado por email
   - Faça login na sua conta

---

## 📝 Passo 2: Adicionar Monitor

1. **Após fazer login, você verá o dashboard:**
   - Clique no botão **"+ Add New Monitor"** (canto superior direito)
   - Ou clique em **"Add Monitor"** no centro da tela

2. **Preencha os campos:**

   **Monitor Type:**
   - Selecione **"HTTP(s)"** (primeira opção)

   **Friendly Name:**
   - Digite: `Backend Portal Materiais`
   - (Este é apenas um nome para identificar o monitor)

   **URL (or IP):**
   - Digite: `https://gwindapp-portal-web.onrender.com/health`
   - ⚠️ **IMPORTANTE**: Use exatamente esta URL, incluindo o `/health` no final

   **Monitoring Interval:**
   - Selecione **"5 minutes"** (mínimo no plano gratuito)
   - Isso significa que o UptimeRobot fará uma requisição a cada 5 minutos

   **Timeout:**
   - Deixe o padrão: **30 seconds**

   **Alert Contacts:**
   - Selecione seu email (ou crie um novo contato se necessário)
   - Isso é para receber alertas se o backend cair

3. **Clique em "Create Monitor"**

---

## 📝 Passo 3: Verificar se está funcionando

1. **No dashboard do UptimeRobot:**
   - Você verá seu monitor listado
   - O status deve aparecer como **"Up"** (verde) ou **"Down"** (vermelho)

2. **Aguarde alguns minutos:**
   - O primeiro check pode levar até 5 minutos
   - Após isso, você verá o status atualizado

3. **Verificar logs:**
   - Clique no nome do monitor
   - Você verá o histórico de requisições
   - Cada requisição bem-sucedida aparecerá como **"Up"**

---

## 📝 Passo 4: Verificar no Render

1. **Acesse o dashboard do Render:**
   - Vá para: https://dashboard.render.com/
   - Entre no seu serviço `gwindapp-portal-web`

2. **Veja os logs:**
   - Clique na aba **"Logs"**
   - Você deve ver requisições periódicas ao endpoint `/health`
   - Exemplo de log:
     ```
     GET /health 200
     ```

3. **Verificar se o backend está ativo:**
   - Se você ver requisições a cada ~5 minutos, está funcionando!
   - O backend não vai mais "dormir"

---

## ✅ Como saber se está funcionando?

### ✅ Sinais de que está OK:
- ✅ No UptimeRobot: Status **"Up"** (verde)
- ✅ No Render: Logs mostram requisições periódicas ao `/health`
- ✅ O backend responde rapidamente (sem delay de 30-60s)

### ❌ Sinais de problema:
- ❌ No UptimeRobot: Status **"Down"** (vermelho)
- ❌ No Render: Nenhuma requisição ao `/health` nos logs
- ❌ O backend demora 30-60s para responder (está "dormindo")

---

## 🔧 Troubleshooting (Solução de Problemas)

### Problema 1: Monitor mostra "Down"
**Solução:**
- Verifique se a URL está correta: `https://gwindapp-portal-web.onrender.com/health`
- Teste a URL manualmente no navegador
- Verifique se o backend está rodando no Render

### Problema 2: Backend ainda está "dormindo"
**Solução:**
- Verifique se o monitor está realmente ativo no UptimeRobot
- Aguarde alguns minutos (pode levar até 15 minutos para o primeiro check)
- Verifique os logs do Render para ver se há requisições ao `/health`

### Problema 3: Não recebo alertas
**Solução:**
- Vá em **"My Settings"** → **"Alert Contacts"**
- Adicione seu email como contato de alerta
- Verifique a pasta de spam

---

## 📊 Plano Gratuito - Limitações

O plano gratuito do UptimeRobot permite:
- ✅ **50 monitores** (mais que suficiente!)
- ✅ **Intervalo mínimo de 5 minutos** (perfeito para evitar sleep)
- ✅ **Alertas por email**
- ✅ **Histórico de 2 meses**

Isso é mais que suficiente para manter seu backend ativo!

---

## 🎉 Pronto!

Agora seu backend não vai mais "dormir" no Render.com! 🚀

O UptimeRobot fará requisições a cada 5 minutos, mantendo o serviço sempre ativo.

---

## 💡 Dica Extra

Se quiser ter redundância (caso o UptimeRobot falhe), você pode:
1. Configurar o UptimeRobot (a cada 5 min)
2. Configurar também o cron-job.org (a cada 10 min)

Assim, mesmo se um falhar, o outro mantém o backend ativo!

