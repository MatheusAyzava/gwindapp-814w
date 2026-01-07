// Script de inicialização que garante DATABASE_URL no formato correto para SQLite
require('dotenv/config');
const path = require('path');

// Normaliza DATABASE_URL para SQLite se necessário
if (process.env.DATABASE_URL) {
  let dbUrl = process.env.DATABASE_URL.trim();
  
  // Se não começar com file:, adiciona o prefixo
  if (!dbUrl.startsWith('file:')) {
    // Se for um caminho relativo ou absoluto, adiciona file:
    if (dbUrl.startsWith('./') || dbUrl.startsWith('/') || !dbUrl.includes('://')) {
      // Remove ./ se existir
      const cleanPath = dbUrl.replace(/^\.\//, '');
      // Se começar com /, é absoluto, senão é relativo
      if (cleanPath.startsWith('/')) {
        process.env.DATABASE_URL = `file:${cleanPath}`;
      } else {
        // Caminho relativo - resolve a partir do diretório atual
        const absolutePath = path.resolve(process.cwd(), cleanPath);
        process.env.DATABASE_URL = `file:${absolutePath}`;
      }
    } else {
      // Se já tiver um protocolo diferente, mantém como está (pode ser outro tipo de banco)
      console.warn('DATABASE_URL já tem um protocolo diferente de file:, mantendo como está');
    }
  }
} else {
  // Valor padrão se não estiver definido - usa caminho relativo que será resolvido
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

console.log('DATABASE_URL configurada:', process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Oculta credenciais no log

// Inicia a aplicação
require('./dist/index.js');

