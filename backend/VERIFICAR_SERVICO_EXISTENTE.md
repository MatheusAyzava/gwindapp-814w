# Verificar se o Serviço `gwindapp-portal-web` já tem o Backend

## Como Verificar

1. Acesse o serviço `gwindapp-portal-web` no Render
2. Vá em **Settings** → **Build & Deploy**
3. Verifique:
   - **Root Directory**: Se está vazio ou tem algum valor
   - **Build Command**: Qual comando está configurado
   - **Start Command**: Qual comando está configurado

## Possíveis Cenários

### Cenário 1: Serviço está vazio ou é frontend
- **Root Directory**: Vazio ou `web`
- **Build Command**: Algo relacionado a Vite/React
- **Solução**: Criar um NOVO serviço para o backend

### Cenário 2: Serviço já é o backend
- **Root Directory**: `backend` ou vazio (mas Start Command é `node dist/index.js`)
- **Build Command**: `npm install` ou similar
- **Start Command**: `node dist/index.js`
- **Solução**: Verificar se as rotas `/materiais` estão funcionando

## Como Testar se o Backend já está rodando

Abra no navegador:
```
https://gwindapp-portal-web.onrender.com/materiais
```

- Se retornar uma lista (mesmo que vazia `[]`): ✅ Backend já está rodando!
- Se retornar erro 404 ou página não encontrada: ❌ Precisa configurar o backend

## Se o Backend JÁ está rodando

1. Verifique se a URL está correta no frontend
2. Configure o UptimeRobot para manter acordado
3. Teste o cadastro de materiais

## Se o Backend NÃO está rodando

Siga o guia: `COMO_DEPLOYAR_NO_RENDER.md`

