# PowerShell: run from the project root or double-click (requires Conda initialized for PowerShell)
conda activate flola-dev
Set-Location -Path (Join-Path $PSScriptRoot 'web')
npm install
npm run dev
