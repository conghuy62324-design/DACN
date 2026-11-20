@echo off
node "%~dp0..\..\..\..\backend\scripts\open-staging-owner-login.cjs"
if errorlevel 1 pause
