@REM https://github.com/Nadwey/URLX/commit/f07ae07f991fc0c774585dc19b8eeb5facc28c8d#comments
@echo off
set "Command="
for /f "tokens=2,*" %%A in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Clients\StartMenuInternet\Google Chrome\shell\open\command" /ve 2^>nul') do set "Command=%%~B"
if not defined Command for /f "tokens=2,*" %%A in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Clients\StartMenuInternet\Google Chrome\shell\open\command" /ve 2^>nul') do set "Command=%%~B"
if not defined Command echo Google Chrome was not found.
if defined Command start "Browser" "%Command%" --disable-ipc-flooding-protection file:///%cd%/urlx.html