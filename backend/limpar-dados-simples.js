/**
 * Script SIMPLES para limpar todos os materiais e medições
 * 
 * Uso: node limpar-dados-simples.js
 * 
 * ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limparDados() {
  try {
    console.log('🚀 Iniciando limpeza de dados...');
    
    // Deletar primeiro as medições
    const medicoesDeletadas = await prisma.medicao.deleteMany({});
    console.log(`✅ ${medicoesDeletadas.count} medição(ões) deletada(s)`);
    
    // Depois deletar os materiais
    const materiaisDeletados = await prisma.material.deleteMany({});
    console.log(`✅ ${materiaisDeletados.count} material(is) deletado(s)`);
    
    console.log('\n🎉 Limpeza concluída com sucesso!');
    console.log(`   - ${medicoesDeletadas.count} medição(ões) removida(s)`);
    console.log(`   - ${materiaisDeletados.count} material(is) removido(s)`);
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar diretamente (sem confirmação - CUIDADO!)
limparDados();

