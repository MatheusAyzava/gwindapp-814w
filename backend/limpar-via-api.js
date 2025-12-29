/**
 * Script para limpar dados via API (não precisa de DATABASE_URL local)
 * 
 * Uso: node limpar-via-api.js
 * 
 * ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
 */

const https = require('https');

// URL do backend no Render
const API_URL = process.env.API_URL || 'https://gwindapp-portal-web.onrender.com';

function limparViaAPI() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/materiais/limpar-tudo`);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };

    console.log(`🚀 Enviando requisição para: ${url.toString()}`);
    
    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const resultado = JSON.parse(data);
            console.log('\n✅ Limpeza concluída com sucesso!');
            console.log(`   - ${resultado.medicoesDeletadas || 0} medição(ões) removida(s)`);
            console.log(`   - ${resultado.materiaisDeletados || 0} material(is) removido(s)`);
            resolve(resultado);
          } catch (e) {
            console.log('\n✅ Resposta do servidor:', data);
            resolve(data);
          }
        } else {
          console.error(`❌ Erro: Status ${res.statusCode}`);
          console.error('Resposta:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout: O servidor demorou muito para responder'));
    });

    req.end();
  });
}

// Executar
console.log('⚠️  ATENÇÃO: Esta ação vai apagar TODOS os materiais e medições!');
console.log('⚠️  Esta ação é IRREVERSÍVEL!\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Tem certeza que deseja continuar? (digite "SIM" para confirmar): ', (answer) => {
  if (answer === 'SIM') {
    rl.question('\n⚠️  ÚLTIMA CONFIRMAÇÃO: Digite "CONFIRMAR" para apagar tudo: ', (confirmacao) => {
      if (confirmacao === 'CONFIRMAR') {
        limparViaAPI()
          .then(() => {
            console.log('\n🎉 Pronto!');
            process.exit(0);
          })
          .catch((error) => {
            console.error('\n❌ Falha:', error.message);
            process.exit(1);
          });
      } else {
        console.log('❌ Operação cancelada.');
        process.exit(0);
      }
      rl.close();
    });
  } else {
    console.log('❌ Operação cancelada.');
    rl.close();
    process.exit(0);
  }
});

