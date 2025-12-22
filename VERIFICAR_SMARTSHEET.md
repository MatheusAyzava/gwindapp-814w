# Guia para Verificar e Corrigir Integração com Smartsheet

## Objetivo
O Smartsheet será usado para:
- ✅ Armazenar histórico de apontamentos (dados de medições)
- 📸 **Futuro:** Armazenar fotos de checklists (Smartsheet suporta anexos)
- 📊 Criar banco de dados visual com checklists

## Variáveis de Ambiente Necessárias no Render

No dashboard do Render.com, vá em **Environment** e verifique se estas variáveis estão configuradas:

### 1. `SMARTSHEET_TOKEN` (OBRIGATÓRIO)
- **O que é:** Token de acesso da API do Smartsheet
- **Como obter:**
  1. Acesse https://app.smartsheet.com
  2. Vá em **Account** → **Apps & Integrations** → **API Access**
  3. Clique em **Generate new token**
  4. Copie o token gerado
  5. Cole no Render como `SMARTSHEET_TOKEN`

### 2. `SMARTSHEET_SHEET_MEDICOES` (OBRIGATÓRIO)
- **O que é:** ID da planilha onde os apontamentos serão salvos
- **Como obter:**
  1. Abra a planilha no Smartsheet
  2. Na URL, você verá algo como: `https://app.smartsheet.com/b/home?lx=ABC123XYZ`
  3. O ID está na URL ou você pode:
     - Clicar com botão direito na planilha → **Properties**
     - O **Sheet ID** estará lá
  4. Cole no Render como `SMARTSHEET_SHEET_MEDICOES`

### 3. `SMARTSHEET_SHEET_MATERIAIS` (OPCIONAL)
- **O que é:** ID da planilha de materiais (para importação)
- **Como obter:** Mesmo processo acima

## Verificar se Está Funcionando

### Passo 1: Verificar Logs no Render
1. Acesse o dashboard do Render
2. Vá em **Logs** do seu serviço backend
3. Procure por estas mensagens:

**✅ Se estiver configurado corretamente:**
```
[Smartsheet] Iniciando envio de medição para planilha [ID]
[Smartsheet] Planilha encontrada com X colunas
[Smartsheet] ✅ Colunas encontradas: ...
```

**❌ Se NÃO estiver configurado:**
```
[Smartsheet] SMARTSHEET_TOKEN ou SMARTSHEET_SHEET_MEDICOES não configurados
Token: FALTANDO, Sheet ID: FALTANDO
```

### Passo 2: Testar um Apontamento
1. Faça um apontamento completo no formulário
2. Abra o Console do navegador (F12)
3. Procure por:
   - `[Frontend] ✅ Resposta do backend...` (confirma que salvou no banco)
4. Verifique os logs do Render:
   - `[Medicao] Medição registrada no banco. Iniciando envio para Smartsheet...`
   - Se aparecer `[Smartsheet] ❌ ERRO CRÍTICO:`, copie a mensagem completa

## Problemas Comuns e Soluções

### Problema 1: "Token: FALTANDO"
**Solução:** Configure `SMARTSHEET_TOKEN` no Render

### Problema 2: "Sheet ID: FALTANDO"
**Solução:** Configure `SMARTSHEET_SHEET_MEDICOES` no Render

### Problema 3: "Todas as células têm o mesmo columnId"
**Solução:** As colunas na planilha do Smartsheet precisam ter nomes específicos. Verifique se existem colunas com estes nomes (ou similares):
- `chatId` ou `Chat ID`
- `Dia` ou `Data`
- `Semana`
- `Cliente`
- `Projeto`
- `Hora de Entrada` ou `Hora Início`
- `Hora de Saída` ou `Hora Fim`
- `Técnico Líder`
- `Qtd Técnicos` ou `Quantidade de Técnicos`
- `Nomes Técnicos`
- E outros campos do formulário

### Problema 4: "Erro 401 Unauthorized"
**Solução:** O token está inválido ou expirado. Gere um novo token no Smartsheet.

### Problema 5: "Erro 404 Not Found"
**Solução:** O Sheet ID está incorreto. Verifique o ID da planilha.

## Próximos Passos (Futuro)

### Adicionar Suporte para Fotos
O Smartsheet suporta anexos! Para adicionar fotos:

1. **Na planilha do Smartsheet:**
   - Adicione uma coluna do tipo "Attachment" (Anexo)

2. **No código:**
   - Usar a API do Smartsheet para upload de arquivos
   - Endpoint: `POST /sheets/{sheetId}/rows/{rowId}/attachments`
   - Enviar foto como base64 ou multipart/form-data

3. **Limites do Smartsheet:**
   - ✅ Sem limite de armazenamento (diferente do Netlify)
   - ✅ Suporta múltiplos anexos por linha
   - ✅ Fotos ficam vinculadas ao registro

## Checklist de Verificação

- [ ] `SMARTSHEET_TOKEN` configurado no Render
- [ ] `SMARTSHEET_SHEET_MEDICOES` configurado no Render
- [ ] Token válido e não expirado
- [ ] Sheet ID correto
- [ ] Planilha tem colunas com nomes corretos
- [ ] Backend está fazendo deploy corretamente
- [ ] Logs mostram tentativa de envio ao Smartsheet

## Comandos Úteis

Para testar a conexão manualmente (no terminal do Render):
```bash
curl -H "Authorization: Bearer $SMARTSHEET_TOKEN" \
  https://api.smartsheet.com/2.0/sheets/$SMARTSHEET_SHEET_MEDICOES
```

Se retornar dados da planilha, a configuração está correta!

