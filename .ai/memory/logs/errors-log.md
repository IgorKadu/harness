# Errors & Solutions Log (append-only)

> NUNCA carregado inteiro — só grep quando um bug parecer recorrente. Append apenas.
> Formato: `data | sintoma | causa-raiz | solução | arquivo:linha`

2026-05-30 | bug corrigido: install/setup usavam engine.ROOT (configs iam pro cache do npx); agora process.cwd(). +vsix pre-buildado em extension/