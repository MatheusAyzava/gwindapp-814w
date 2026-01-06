# 🔍 Como Executar o Script de Debug

## ⚠️ Problema: Variáveis de Ambiente Não Configuradas

O script precisa das variáveis de ambiente do Smartsheet.

## 📝 Opções

### Opção 1: Configurar no Render (Recomendado)

As variáveis já devem estar configuradas no Render. Você pode:

1. **Verificar nos logs do Render:**
   - Vá em: https://dashboard.render.com
   - Clique no serviço do backend
   - Vá em **Logs**
   - Procure por mensagens que mostram os IDs das colunas

### Opção 2: Criar arquivo .env local (Para testar localmente)

Crie um arquivo `.env` na pasta `backend` com:

```env
SMARTSHEET_TOKEN=seu_token_aqui
SMARTSHEET_SHEET_MEDICOES=id_da_planilha_aqui
```

Depois execute:
```bash
cd backend
node debug-smartsheet.js
```

### Opção 3: Verificar Diretamente nos Logs do Render

A forma mais fácil é verificar os logs do backend no Render quando você registra uma medição. Os logs devem mostrar:

- Quais colunas estão sendo encontradas
- Quais valores estão sendo enviados
- Qual coluna está causando o erro

## 🔍 O Que Procurar nos Logs

Quando você registra uma medição, procure nos logs por:

```
[Smartsheet] Primeiras 5 células a atualizar:
columnId: 7744166108548996, value: '2026-01-06'
columnId: 33376099323780, value: '01'
...
```

E depois:

```
[Smartsheet] ❌ Erro ao atualizar lote 1:
CELL_VALUE_FAILS_VALIDATION: O valor da célula na coluna 277482268479364...
```

## 💡 Solução Alternativa

Se você tem acesso ao Smartsheet:

1. Abra a planilha no Smartsheet
2. Veja todas as colunas
3. Identifique qual coluna tem validações ou tipos específicos
4. Compare com os valores que estão sendo enviados

Me envie:
- O nome da coluna que está com problema
- O tipo de dados dela
- Se há validações configuradas

Com essas informações, consigo ajustar o código!


