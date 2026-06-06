# Errors & Solutions Log (append-only)

> NUNCA carregado inteiro — só grep quando um bug parecer recorrente. Append apenas.
> Formato: `data | sintoma | causa-raiz | solução | arquivo:linha`

2026-05-30 | bug corrigido: install/setup usavam engine.ROOT (configs iam pro cache do npx); agora process.cwd(). +vsix pre-buildado em extension/
2026-06-03 | validate[test] FAIL (exit 1) via 'node -e "console.error('AssertionError: expected 1 to equal 2'); process.exit(1)"': AssertionError: expected 1 to equal 2