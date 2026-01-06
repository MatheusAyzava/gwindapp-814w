// Script para listar todas as colunas do Smartsheet com seus IDs
// Execute: node listar-colunas-smartsheet.js

require('dotenv/config');
const axios = require('axios');

const SMARTSHEET_TOKEN = process.env.SMARTSHEET_TOKEN;
const SHEET_MEDICOES = process.env.SMARTSHEET_SHEET_MEDICOES;

if (!SMARTSHEET_TOKEN || !SHEET_MEDICOES) {
  console.error('❌ Erro: Configure as variáveis de ambiente:');
  console.error('   SMARTSHEET_TOKEN');
  console.error('   SMARTSHEET_SHEET_MEDICOES');
  process.exit(1);
}

async function listarColunas() {
  try {
    console.log('🔍 Buscando colunas da planilha...\n');
    
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

    console.log(`✅ Encontradas ${columns.length} colunas:\n`);
    console.log('═'.repeat(80));
    console.log('ID da Coluna'.padEnd(20) + ' | ' + 'Nome da Coluna'.padEnd(40) + ' | Tipo');
    console.log('═'.repeat(80));

    columns.forEach((col, index) => {
      const id = String(col.id).padEnd(18);
      const title = (col.title || '').substring(0, 38).padEnd(40);
      const type = col.type || 'TEXT';
      
      // Destacar a coluna problemática
      if (String(col.id) === '277482268479364') {
        console.log(`❌ ${id} | ${title} | ${type} ⬅️ COLUNA COM ERRO!`);
      } else {
        console.log(`   ${id} | ${title} | ${type}`);
      }
    });

    console.log('═'.repeat(80));
    
    // Mostrar detalhes da coluna problemática
    const colunaProblema = columns.find(c => String(c.id) === '277482268479364');
    if (colunaProblema) {
      console.log('\n🔍 Detalhes da coluna com erro:');
      console.log(JSON.stringify(colunaProblema, null, 2));
      console.log('\n💡 Verifique:');
      console.log('   - Tipo de dados esperado:', colunaProblema.type);
      console.log('   - Se há validações configuradas na coluna');
      console.log('   - Se o valor enviado corresponde ao tipo esperado');
    } else {
      console.log('\n⚠️ Coluna 277482268479364 não encontrada na lista.');
      console.log('   Pode ser que a planilha tenha sido modificada.');
    }

  } catch (error) {
    console.error('❌ Erro ao buscar colunas:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

listarColunas();


