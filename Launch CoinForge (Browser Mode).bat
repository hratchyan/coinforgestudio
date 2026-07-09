@echo off
:: ============================================================
:: CoinForge Studio - zero-install browser-mode launcher
:: Opens the app in Microsoft Edge (or Chrome) app mode.
:: The full desktop experience is CoinForgeStudio-Portable.exe;
:: this launcher needs nothing installed at all.
:: Author: Hratch Simonyan
:: ============================================================
setlocal
set "APPDIR=%~dp0app"
set "URL=file:///%APPDIR:\=/%/index.html"
set "PROFILE=%LOCALAPPDATA%\CoinForgeStudio\BrowserProfile"

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
    start "" "%EDGE%" --app="%URL%" --user-data-dir="%PROFILE%" --no-first-run
    goto :eof
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
    start "" "%CHROME%" --app="%URL%" --user-data-dir="%PROFILE%" --no-first-run
    goto :eof
)

echo Could not find Edge or Chrome - opening in the default browser instead.
start "" "%APPDIR%\index.html"