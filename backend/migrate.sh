#!/bin/bash
echo "========================================"
echo "Executando migration do Prisma..."
echo "========================================"
cd "$(dirname "$0")"
npm run migrate
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Migration executada com sucesso!"
    echo "========================================"
else
    echo ""
    echo "========================================"
    echo "Erro ao executar migration!"
    echo "========================================"
fi

