# 🔍 Diagnóstico: Problema ao Registrar Medição

## Problema
Ao clicar em "Registrar medição", nada acontece.

## Possíveis Causas

### 1. **Campos Obrigatórios Faltando**
A API requer os seguintes campos obrigatórios:
- `codigoItem` (código do material)
- `quantidadeConsumida` (quantidade)
- `projeto` (nome do projeto)

**Solução:** Verifique se o formulário está enviando esses campos.

### 2. **Backend Não Está Rodando**
O backend precisa estar rodando e acessível.

**Como verificar:**
1. Abra o console do navegador (F12)
2. Vá na aba "Network" (Rede)
3. Tente registrar uma medição
4. Veja se há uma requisição para `/medicoes`
5. Se houver erro de conexão (CORS, Network Error, 404), o backend não está acessível

### 3. **URL da API Incorreta**
O frontend precisa estar configurado com a URL correta do backend.

**Verificar:**
- A variável de ambiente `VITE_API_URL` no Netlify deve apontar para o backend
- Exemplo: `https://seu-backend.onrender.com` ou `https://seu-backend.herokuapp.com`

### 4. **Erro no Console do Navegador**
O erro do Service Worker pode estar interferindo.

**Solução:**
1. Abra o console (F12)
2. Veja se há erros em vermelho
3. Copie os erros e verifique

## Como Diagnosticar

### Passo 1: Verificar Console do Navegador
1. Abra o DevTools (F12)
2. Vá na aba "Console"
3. Tente registrar uma medição
4. Veja se aparecem erros

### Passo 2: Verificar Requisições de Rede
1. No DevTools, vá na aba "Network"
2. Filtre por "XHR" ou "Fetch"
3. Tente registrar uma medição
4. Veja se aparece uma requisição POST para `/medicoes`
5. Clique na requisição e veja:
   - **Status:** Deve ser 201 (sucesso) ou 400/500 (erro)
   - **Payload:** Veja os dados que estão sendo enviados
   - **Response:** Veja a resposta do servidor

### Passo 3: Verificar Backend
1. Acesse a URL do backend + `/health`
   - Exemplo: `https://seu-backend.onrender.com/health`
2. Deve retornar: `{"status":"ok"}`
3. Se não funcionar, o backend não está rodando

### Passo 4: Verificar CORS
Se aparecer erro de CORS no console:
- O backend precisa ter `https://gwind-app-test.netlify.app` na lista de origens permitidas
- Já está configurado, mas verifique se o backend está rodando

## Campos Obrigatórios para Registrar Medição

```javascript
{
  "codigoItem": "E01",           // OBRIGATÓRIO
  "quantidadeConsumida": 12,     // OBRIGATÓRIO
  "projeto": "Nome do Projeto"   // OBRIGATÓRIO
}
```

## Campos Opcionais (mas podem ser necessários dependendo do formulário)

- `danoCodigo`: "E01"
- `larguraDanoMm`: 12
- `comprimentoDanoMm`: 12
- `etapaProcesso`: "Inspeção/BOD"
- `retrabalho`: "Não"
- `dia`: "2025-01-15"
- `cliente`: "Nome do Cliente"
- E muitos outros...

## Solução Rápida

Se o problema for que o formulário não está enviando os dados:

1. **Verifique se o botão está dentro de um `<form>` com `onSubmit`**
2. **Verifique se há um handler `handleSubmit` que faz o `axios.post`**
3. **Verifique se os campos obrigatórios estão preenchidos**

## Exemplo de Código Correto

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const dados = {
    codigoItem: danoCodigo, // ou outro campo
    quantidadeConsumida: 1, // ou outro campo
    projeto: projetoSelecionado,
    // ... outros campos
  };
  
  try {
    const response = await axios.post(`${API_BASE_URL}/medicoes`, dados);
    console.log('Medição registrada:', response.data);
    alert('Medição registrada com sucesso!');
    // Limpar formulário
  } catch (error) {
    console.error('Erro ao registrar:', error);
    alert(`Erro: ${error.response?.data?.error || error.message}`);
  }
};
```

## Próximos Passos

1. Abra o console do navegador e tente registrar
2. Copie os erros que aparecerem
3. Verifique a aba Network para ver a requisição
4. Compartilhe essas informações para diagnóstico mais preciso


