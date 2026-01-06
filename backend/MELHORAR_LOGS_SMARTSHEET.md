# 🔧 Melhorar Logs do Smartsheet para Identificar Coluna

## Problema Atual

O código não mostra qual coluna corresponde ao ID `277482268479364` quando há erro.

## Solução: Adicionar Logs Detalhados

Posso modificar o código para mostrar:

1. **Qual coluna está sendo encontrada para cada campo:**
   ```
   [Smartsheet] Coluna "Dia" encontrada: ID 7744166108548996
   [Smartsheet] Coluna "Semana" encontrada: ID 33376099323780
   ...
   ```

2. **Todas as células sendo enviadas com nome da coluna:**
   ```
   [Smartsheet] Enviando células:
   - Dia (ID: 7744166108548996): '2026-01-06'
   - Semana (ID: 33376099323780): '01'
   ...
   - [Nome] (ID: 277482268479364): '[valor]' ⬅️ PROBLEMA AQUI
   ```

3. **Em caso de erro, mostrar qual coluna falhou:**
   ```
   [Smartsheet] ❌ Erro na coluna "Nome da Coluna" (ID: 277482268479364)
   Valor enviado: [valor]
   Tipo esperado: [tipo]
   ```

## Como Aplicar

Preciso modificar o arquivo `backend/src/smartsheetService.ts` (se existir) ou o código compilado.

Me diga se quer que eu faça isso!


