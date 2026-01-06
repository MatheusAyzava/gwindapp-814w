# 🔍 Como Verificar o Render Quando Não Aparece Nada

## Problema: Tela Preta no Render

Se o Render está mostrando uma tela preta, pode ser:
1. O serviço não está rodando
2. Há um erro no serviço
3. O serviço está em estado de erro

## Passos para Diagnosticar

### 1. Verificar Lista de Serviços

No dashboard do Render:
1. Clique em **"Services"** ou **"Serviços"** no menu lateral
2. Veja a lista de todos os seus serviços
3. Procure por um serviço do tipo **"Web Service"** (não "Static Site")
4. O nome pode ser algo como:
   - `backend`
   - `api`
   - `controle-materiais-backend`
   - Ou outro nome

### 2. Verificar Status do Serviço

Quando encontrar o serviço do backend:
1. Clique nele
2. Veja o **status** no topo:
   - ✅ **"Live"** = Serviço rodando (verde)
   - ⚠️ **"Building"** = Em construção (amarelo)
   - ❌ **"Failed"** = Falhou (vermelho)
   - ⏸️ **"Suspended"** = Suspenso (cinza)

### 3. Ver os Logs

1. Na página do serviço, clique na aba **"Logs"**
2. Veja os últimos logs
3. Procure por erros em vermelho
4. Veja se há mensagens de erro

### 4. Encontrar a URL do Serviço

Na página do serviço:
1. Procure por **"URL"** ou **"Service URL"**
2. Geralmente está no topo, ao lado do status
3. A URL será algo como: `https://nome-do-servico.onrender.com`

### 5. Testar a URL

Abra no navegador:
```
https://sua-url.onrender.com/health
```

Deve retornar: `{"status":"ok"}`

## Se o Serviço Está com Erro

### Verificar Logs
1. Vá na aba **"Logs"**
2. Veja os erros
3. Erros comuns:
   - Erro de build
   - Erro de conexão com banco de dados
   - Variáveis de ambiente faltando
   - Porta incorreta

### Verificar Variáveis de Ambiente
1. Na página do serviço, vá em **"Environment"**
2. Verifique se todas as variáveis necessárias estão configuradas:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - Outras variáveis que o backend precisa

### Verificar Build
1. Vá na aba **"Events"** ou **"Builds"**
2. Veja se o último build foi bem-sucedido
3. Se falhou, veja o erro

## Se Não Há Nenhum Serviço

Você pode precisar criar um novo serviço:
1. Clique em **"New +"** no dashboard
2. Selecione **"Web Service"**
3. Conecte seu repositório Git
4. Configure o build e start commands

## URLs Comuns do Render

Se você não conseguir encontrar a URL, tente estas (substitua pelo nome do seu serviço):
- `https://controle-materiais-backend.onrender.com`
- `https://backend.onrender.com`
- `https://api.onrender.com`

## Próximos Passos

1. Me diga qual é o status do serviço (Live, Failed, etc.)
2. Me envie os erros que aparecem nos logs
3. Me diga qual é a URL do serviço (se conseguir encontrar)


