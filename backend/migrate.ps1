Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Executando migration do Prisma..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Set-Location $PSScriptRoot
npm run migrate
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Migration executada com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Erro ao executar migration!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}
Read-Host "Pressione Enter para sair"

