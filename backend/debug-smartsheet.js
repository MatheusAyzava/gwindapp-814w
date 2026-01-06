// Script para debugar qual coluna está causando o erro
// Execute: node debug-smartsheet.js

require('dotenv/config');
const axios = require('axios');

const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
const SHEET_MEDICOES = process.env.SMARTSHEET_SHEET_MEDICOES;

if (!SMARTSHEET_TOKEN || !SHEET_MEDICOES) {
  console.error('❌ Configure SMARTSHEET_TOKEN e SMARTSHEET_SHEET_MEDICOES');
  process.exit(1);
}

async function debugarColunas() {
  try {
    const response = await axios.get(
      `https://api.smartsheet.com/2.0/sheets/${SHEET_MEDICOES}`,
      {
        headers: {
          Authorization: `Bearer ${SMARTSHEET_TOKEN}`
        }
      }
    );

    const sheet = response.data;
    const columns = sheet.columns || [];

    console.log('🔍 Buscando coluna com ID: 277482268479364\n');

    const colunaProblema = columns.find(c => String(c.id) === '277482268479364');
    
    if (colunaProblema) {
      console.log('✅ COLUNA ENCONTRADA:');
      console.log('═'.repeat(80));
      console.log('Nome:', colunaProblema.title);
      console.log('ID:', colunaProblema.id);
      console.log('Tipo:', colunaProblema.type);
      console.log('Índice:', colunaProblema.index);
      console.log('═'.repeat(80));
      console.log('\n📋 Detalhes completos:');
      console.log(JSON.stringify(colunaProblema, null, 2));
      
      console.log('\n💡 Verifique no Smartsheet:');
      console.log('   1. Abra a planilha no Smartsheet');
      console.log('   2. Encontre a coluna:', colunaProblema.title);
      console.log('   3. Veja se há validações configuradas');
      console.log('   4. Veja qual tipo de dados ela aceita');
      console.log('   5. Compare com o valor que está sendo enviado');
    } else {
      console.log('❌ Coluna 277482268479364 NÃO encontrada!');
      console.log('\n📋 Todas as colunas disponíveis:');
      columns.forEach((col, i) => {
        console.log(`${i + 1}. ${col.title} (ID: ${col.id}, Tipo: ${col.type})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugarColunas();


