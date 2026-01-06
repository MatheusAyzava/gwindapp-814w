# 🔍 Como Identificar a Coluna com Erro no Smartsheet

## Problema
O erro mostra que a coluna `277482268479364` está falhando na validação:
```
CELL_VALUE_FAILS_VALIDATION: O valor da célula na coluna 277482268479364 não atendeu aos requisitos
```

## Solução: Listar Todas as Colunas

### Passo 1: Executar o Script

No terminal, na pasta `backend`, execute:

```bash
node listar-colunas-smartsheet.js
```

### Passo 2: Ver o Resultado

O script vai mostrar:
- ✅ Todas as colunas da planilha
- ✅ O ID de cada coluna
- ✅ O nome de cada coluna
- ✅ O tipo de dados de cada coluna
- ❌ A coluna problemática destacada

### Passo 3: Identificar o Problema

Depois de ver qual coluna é a `277482268479364`, você pode:

1. **Verificar o tipo de dados:**
   - Se é TEXT, DATE, NUMBER, etc.
   - Se há validações configuradas

2. **Verificar o valor sendo enviado:**
   - Veja nos logs qual valor está sendo enviado para essa coluna
   - Compare com o tipo esperado

3. **Corrigir o código:**
   - Ajustar o tipo de dado sendo enviado
   - Ou ajustar o valor para corresponder ao esperado

## Exemplo de Saída

```
✅ Encontradas 13 colunas:

ID da Coluna          | Nome da Coluna                              | Tipo
════════════════════════════════════════════════════════════════════════════════
   7744166108548996   | Dia                                         | DATE
   33376099323780     | Sem...                                      | TEXT
   4833709782683524   | Hora de entr...                             | TEXT
   2387108237627268   | Hora de saída                                | TEXT
   4939899049037700   | Cliente                                      | TEXT
   277482268479364    | [Nome da Coluna]                            | [Tipo] ⬅️ COLUNA COM ERRO!
   ...
```

## Depois de Identificar

Me envie:
1. Qual é o nome da coluna `277482268479364`
2. Qual é o tipo de dados dela
3. Qual valor está sendo enviado para ela (veja nos logs)

Com essas informações, consigo ajustar o código para enviar o valor correto!


