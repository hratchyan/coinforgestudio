@echo off
:: ============================================================
:: CoinForge Studio - one-time GitHub connection
:: Installs the GitHub CLI if needed, signs you in (browser),
:: creates the PRIVATE repo, and pushes the local commits.
:: Run this from anywhere; it operates on its own repo folder.
:: ============================================================
setlocal
cd /d "%~dp0.."

where gh >nul 2>nul
if errorlevel 1 (
    echo GitHub CLI not found - installing via winget...
    winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
    if errorlevel 1 (
        echo.
        echo Could not install automatically. Install from https://cli.github.com then re-run.
        pause
        exit /b 1
    )
    echo Restart this script in a NEW terminal so gh is on PATH.
    pause
    exit /b 0
)

gh auth status >nul 2>nul
if errorlevel 1 (
    echo Signing in to GitHub (browser window will open)...
    gh auth login --hostname github.com --git-protocol https --web
    if errorlevel 1 exit /b 1
)

echo Creating private repo "coinforge-studio" and pushing...
gh repo create coinforge-studio --private --source . --remote origin --push
if errorlevel 1 (
    echo.
    echo If the repo already exists, pushing directly...
    git push -u origin master
)

echo.
echo Done! Repo:
gh repo view coinforge-studio --json url -q .url
pause