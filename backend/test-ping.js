/**
 * Script simples para testar o endpoint de health check
 * Execute: node test-ping.js
 */

const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'https://gwindapp-portal-web.onrender.com';

console.log(`🔍 Testando ping em: ${BACKEND_URL}/health`);
console.log('---');

https.get(`${BACKEND_URL}/health`, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Resposta do backend:');
      console.log(JSON.stringify(json, null, 2));
      console.log('---');
      console.log(`Status HTTP: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ Backend está ATIVO!');
      } else {
        console.log('⚠️ Backend respondeu, mas com status diferente de 200');
      }
    } catch (e) {
      console.log('❌ Erro ao parsear resposta:', e.message);
      console.log('Resposta recebida:', data);
    }
  });
}).on('error', (err) => {
  console.error('❌ Erro ao fazer requisição:', err.message);
  console.log('---');
  console.log('💡 Possíveis causas:');
  console.log('   1. Backend está "dormindo" (aguarde 30-60s e tente novamente)');
  console.log('   2. URL incorreta');
  console.log('   3. Problema de rede');
});

