# 🔍 Identificar Coluna 277482268479364

## Baseado nos Logs

Pelos logs que você mostrou, vejo que estão sendo enviadas **29 células** para o Smartsheet. O erro está na coluna `277482268479364`.

## 📋 Colunas que Estão Sendo Enviadas (pelos logs)

Pelos logs, vejo estas colunas sendo atualizadas:

1. `columnId: 7744166108548996` → `value: '2026-01-06'` (Data)
2. `columnId: 33376099323780` → `value: '01'` (Semana)
3. `columnId: 4833709782683524` → `value: '10:00'` (Hora entrada)
4. `columnId: 2387108237627268` → `value: '23:00'` (Hora saída)
5. `columnId: 4939899049037700` → `value: 'NORDEX ESPANHA'` (Cliente)
6. ... e mais 24 colunas (total de 29)
7. **`columnId: 277482268479364`** → ❌ **ERRO AQUI!**

## 🔍 Como Identificar no Smartsheet

### Método 1: Verificar a Planilha Diretamente

1. Abra a planilha no Smartsheet
2. Veja todas as colunas
3. Procure por uma coluna que:
   - Tem validações configuradas (dropdown, lista, formato específico)
   - Tem tipo de dados específico (número, data, etc.)
   - Está vazia ou com valores diferentes dos outros campos

### Método 2: Verificar pelos Logs do Backend

Nos logs do Render, quando você registra uma medição, deve aparecer algo como:

```
[Smartsheet] Primeiras 5 células a atualizar:
columnId: 7744166108548996, value: '2026-01-06'
...
```

Procure por todas as células sendo enviadas e identifique qual tem o ID `277482268479364`.

### Método 3: Adicionar Log no Código

Posso adicionar um log no código que mostra:
- Qual coluna está sendo encontrada
- Qual valor está sendo enviado
- Qual é o tipo esperado

## 💡 Possíveis Causas

Baseado no erro `CELL_VALUE_FAILS_VALIDATION`, pode ser:

1. **Tipo de dado incorreto:**
   - Enviando texto quando espera número
   - Enviando número quando espera texto
   - Enviando data em formato errado

2. **Validação de lista/dropdown:**
   - O valor enviado não está na lista permitida
   - O valor está vazio mas a coluna é obrigatória

3. **Formato incorreto:**
   - Data em formato errado
   - Número com formato errado

## 🔧 Solução Rápida

**Me envie:**
1. Qual é o nome da coluna `277482268479364` no Smartsheet
2. Qual tipo de dados ela aceita
3. Se há validações configuradas (dropdown, lista, etc.)
4. Qual valor está sendo enviado para ela (veja nos logs completos)

Com essas informações, consigo ajustar o código para enviar o valor correto!

## 📝 Alternativa: Ver Logs Completos

Nos logs do Render, procure por uma mensagem que mostra **todas as 29 células** sendo enviadas. Deve ter algo como:

```
[Smartsheet] Células a atualizar:
- columnId: 7744166108548996, value: '2026-01-06'
- columnId: 33376099323780, value: '01'
...
- columnId: 277482268479364, value: '???'
```

Me envie essa lista completa que consigo identificar qual campo está causando o problema!


