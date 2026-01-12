@echo off
REM Activate Conda environment (requires Conda initialized in your shell)
call conda activate flola-dev
cd /d "%~dp0web"
npm install
npm run dev
