# 🔧 Solução para Erro de CORS

## ❌ Problema Identificado

O erro que você está vendo:
```
Access to fetch at 'https://seu-backend.onrender.com/medicoes' from origin 'https://gwind-app-test.netlify.app' has been blocked by CORS policy
```

## 🔍 Causas

1. **URL do Backend Incorreta**: Você está usando `https://seu-backend.onrender.com` que é um placeholder, não a URL real
2. **CORS não configurado**: O backend precisa permitir requisições do Netlify

## ✅ Soluções

### 1. Encontrar a URL Correta do Backend

No Render Dashboard:
1. Acesse: https://dashboard.render.com
2. Encontre o serviço do backend (tipo "Web Service")
3. Clique no serviço
4. Copie a URL que aparece (ex: `https://controle-materiais-backend.onrender.com`)

### 2. Verificar CORS no Backend

O backend já está configurado para aceitar requisições de:
- `https://gwind-app-test.netlify.app` ✅

Mas você precisa usar a URL **REAL** do seu backend, não o placeholder.

### 3. Testar a URL do Backend

Abra no navegador:
```
https://SUA-URL-REAL.onrender.com/health
```

Deve retornar: `{"status":"ok"}`

### 4. Usar a URL Correta no Script

Quando o script pedir a URL, digite a URL **REAL** do seu backend do Render.

## 📝 Exemplo

Se sua URL do backend for: `https://controle-materiais-backend.onrender.com`

Então quando o script pedir a URL, digite:
```
https://controle-materiais-backend.onrender.com
```

## ⚠️ Se Ainda Der Erro de CORS

1. Verifique se o backend está rodando no Render
2. Verifique os logs do backend no Render
3. Certifique-se de que a URL está correta (sem barra no final)
4. Verifique se o backend tem `https://gwind-app-test.netlify.app` na lista de origens permitidas


