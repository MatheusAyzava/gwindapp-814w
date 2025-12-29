/**
 * Script para limpar todos os materiais e medições do banco de dados
 * 
 * Uso:
 *   node limpar-dados.js
 * 
 * ATENÇÃO: Esta ação é IRREVERSÍVEL!
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function limparDados() {
  try {
    console.log('🚀 Iniciando limpeza de dados...');
    
    // Deletar primeiro as medições (têm foreign key para materiais)
    console.log('📊 Deletando medições...');
    const medicoesDeletadas = await prisma.medicao.deleteMany({});
    console.log(`✅ ${medicoesDeletadas.count} medição(ões) deletada(s)`);
    
    // Depois deletar os materiais
    console.log('📦 Deletando materiais...');
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

// Confirmar antes de executar
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  ATENÇÃO: Esta ação vai apagar TODOS os materiais e medições!');
console.log('⚠️  Esta ação é IRREVERSÍVEL!\n');

rl.question('Tem certeza que deseja continuar? (digite "SIM" para confirmar): ', (answer) => {
  if (answer === 'SIM') {
    rl.question('\n⚠️  ÚLTIMA CONFIRMAÇÃO: Digite "CONFIRMAR" para apagar tudo: ', (confirmacao) => {
      if (confirmacao === 'CONFIRMAR') {
        limparDados();
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

