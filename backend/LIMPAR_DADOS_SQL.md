# Como Limpar Dados via SQL (Supabase)

Se o endpoint da API não estiver funcionando, você pode limpar os dados diretamente no Supabase usando SQL.

## Passo a Passo:

1. **Acesse o Supabase:**
   - Vá para https://supabase.com
   - Faça login na sua conta
   - Selecione o projeto do "Controle Materiais"

2. **Abra o SQL Editor:**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute este SQL:**

```sql
-- ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
-- Isso vai apagar TODOS os materiais e medições

-- Deletar medições primeiro (tem foreign key para materiais)
DELETE FROM "Medicao";

-- Depois deletar materiais
DELETE FROM "Material";

-- Verificar se foi deletado
SELECT COUNT(*) as total_materiais FROM "Material";
SELECT COUNT(*) as total_medicoes FROM "Medicao";
```

4. **Clique em "Run"** (ou pressione Ctrl+Enter)

5. **Confirme** que os dados foram apagados verificando os SELECTs no final

## ⚠️ ATENÇÃO

- Esta ação é **IRREVERSÍVEL**
- Todos os materiais e medições serão **permanentemente deletados**
- Use apenas para limpar dados de teste antes de importar a lista real

