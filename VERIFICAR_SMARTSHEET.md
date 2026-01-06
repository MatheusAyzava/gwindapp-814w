# 🔍 Verificar Integração com Smartsheet

## Problema
O registro está funcionando no backend, mas não aparece no Smartsheet.

## Possíveis Causas

### 1. Variáveis de Ambiente Não Configuradas

O backend precisa das seguintes variáveis de ambiente no Render:

- `SMARTSHEET_TOKEN` - Token de acesso do Smartsheet
- `SMARTSHEET_SHEET_MEDICOES` - ID da planilha de medições no Smartsheet

**Como verificar:**
1. Vá no dashboard do Render
2. Clique no serviço do backend
3. Vá em **Environment** (Variáveis de Ambiente)
4. Verifique se essas variáveis estão configuradas

**Se não estiverem configuradas:**
- O backend vai apenas fazer um `console.warn` e não vai enviar para o Smartsheet
- Mas o registro ainda vai funcionar no banco de dados

### 2. Dados Não Correspondem às Colunas do Smartsheet

O código está enviando apenas estes campos para o Smartsheet:
- `dia`
- `semana`
- `cliente`
- `projeto`
- `escala`
- `tecnicoLider`
- `quantidadeTecnicos`
- `nomesTecnicos`
- `horaInicio`
- `horaFim`

Mas o formulário está enviando:
- `danoCodigo`
- `larguraDanoMm`
- `comprimentoDanoMm`
- `etapaProcesso`
- `retrabalho`

**Solução:** Precisamos ajustar o código para enviar os dados corretos.

### 3. Erro Silencioso

O código captura erros mas apenas faz `console.error`, então pode estar falhando silenciosamente.

**Como verificar:**
1. Vá nos logs do backend no Render
2. Procure por mensagens como:
   - `[Smartsheet] Falha ao enviar medição:`
   - `[Smartsheet] SMARTSHEET_TOKEN ou SMARTSHEET_SHEET_MEDICOES não configurados`

## 🔧 Soluções

### Solução 1: Configurar Variáveis de Ambiente

No Render, adicione:
- `SMARTSHEET_TOKEN`: Seu token do Smartsheet
- `SMARTSHEET_SHEET_MEDICOES`: ID da planilha de medições

### Solução 2: Verificar Logs

Veja os logs do backend para identificar o erro específico.

### Solução 3: Ajustar Código

Se os campos não correspondem, precisamos ajustar o código para enviar os dados corretos.

## 📝 Próximos Passos

1. Verifique as variáveis de ambiente no Render
2. Veja os logs do backend
3. Me envie o que encontrar para eu ajustar o código


