# 🔍 Como Encontrar a URL do Backend no Render

## Passo 1: Acessar o Dashboard do Render
1. Acesse: https://dashboard.render.com
2. Faça login na sua conta

## Passo 2: Encontrar o Serviço do Backend
1. No dashboard, procure por um serviço do tipo **"Web Service"** (não "Static Site")
2. O nome pode ser algo como:
   - `backend`
   - `api`
   - `controle-materiais-backend`
   - Ou outro nome que você definiu

## Passo 3: Ver a URL do Serviço
1. Clique no serviço do backend
2. Na página do serviço, procure por:
   - **"URL"** ou **"Service URL"**
   - Geralmente está no topo da página
   - Formato: `https://nome-do-servico.onrender.com`

## Passo 4: Verificar se o Serviço Está Rodando
1. Na mesma página, veja o status:
   - ✅ **"Live"** = Serviço rodando
   - ⚠️ **"Building"** = Em construção
   - ❌ **"Failed"** = Falhou
   - ⏸️ **"Suspended"** = Suspenso

## Passo 5: Testar a URL
Abra no navegador: `https://sua-url.onrender.com/health`

Deve retornar: `{"status":"ok"}`

## ⚠️ Se a Tela Está Preta
1. Verifique os **Logs** do serviço no Render
2. Veja se há erros de build ou runtime
3. Verifique se as variáveis de ambiente estão configuradas
4. Verifique se o banco de dados está conectado

## 📝 Exemplo de URL
```
https://controle-materiais-backend.onrender.com
```

## 🔧 Depois de Encontrar a URL
Use essa URL no script `web/FIX_BOTAO.js` na linha 12:
```javascript
const API_URL = 'https://sua-url-aqui.onrender.com';
```


