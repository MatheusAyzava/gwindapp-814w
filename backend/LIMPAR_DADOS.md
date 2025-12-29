# Como Limpar Todos os Dados Manualmente

Se o botão na interface não estiver funcionando, você pode limpar os dados manualmente usando este script.

## Opção 1: Script Node.js (Recomendado)

1. Abra o terminal na pasta `backend`
2. Execute o comando:

```bash
node limpar-dados.js
```

3. O script vai pedir duas confirmações:
   - Primeiro: digite `SIM`
   - Segundo: digite `CONFIRMAR`

4. Os dados serão apagados e você verá uma mensagem de sucesso.

## Opção 2: SQL Direto (Supabase)

Se você tiver acesso ao Supabase, pode executar este SQL diretamente:

```sql
-- Deletar medições primeiro (tem foreign key)
DELETE FROM "Medicao";

-- Depois deletar materiais
DELETE FROM "Material";
```

## Opção 3: Via API (quando funcionar)

Depois que o deploy for concluído, o botão na interface deve funcionar. Mas se ainda não funcionar, você pode chamar a API diretamente:

```bash
curl -X POST https://gwindapp-portal-web.onrender.com/materiais/limpar-tudo
```

## ⚠️ ATENÇÃO

- Esta ação é **IRREVERSÍVEL**
- Todos os materiais e medições serão **permanentemente deletados**
- Use apenas para limpar dados de teste antes de importar a lista real

