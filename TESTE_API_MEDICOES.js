// Script para testar a API de medições no console do navegador
// Cole este código no console do navegador (F12 > Console) e pressione Enter

// 1. Primeiro, verifique qual é a URL da API configurada
// Procure no código por "API_BASE_URL" ou "VITE_API_URL"
// Exemplo: const API_BASE_URL = "https://seu-backend.onrender.com";

// 2. Teste de conexão com o backend
async function testarBackend() {
  // Substitua pela URL do seu backend
  const API_BASE_URL = window.API_BASE_URL || 'https://seu-backend.onrender.com';
  
  console.log('🔍 Testando conexão com o backend...');
  console.log('URL:', API_BASE_URL);
  
  try {
    // Teste 1: Health check
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Teste 2: Listar materiais (para ver se a API está funcionando)
    const materiaisResponse = await fetch(`${API_BASE_URL}/materiais`);
    const materiais = await materiaisResponse.json();
    console.log('✅ Materiais disponíveis:', materiais.length, 'itens');
    
    // Teste 3: Tentar registrar uma medição de teste
    const medicaoTeste = {
      codigoItem: "TESTE001",
      quantidadeConsumida: 1,
      projeto: "PROJETO_TESTE"
    };
    
    console.log('🧪 Tentando registrar medição de teste...');
    console.log('Dados:', medicaoTeste);
    
    const medicaoResponse = await fetch(`${API_BASE_URL}/medicoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(medicaoTeste)
    });
    
    const medicaoData = await medicaoResponse.json();
    
    if (medicaoResponse.ok) {
      console.log('✅ Medição registrada com sucesso:', medicaoData);
    } else {
      console.error('❌ Erro ao registrar medição:', medicaoData);
      console.log('Status:', medicaoResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error);
    console.log('Possíveis causas:');
    console.log('- Backend não está rodando');
    console.log('- URL da API está incorreta');
    console.log('- Problema de CORS');
    console.log('- Problema de rede');
  }
}

// Execute o teste
testarBackend();

// 3. Para verificar o que o formulário está enviando:
// No DevTools, vá em Network > XHR, tente registrar uma medição
// e veja o que aparece na requisição POST /medicoes


