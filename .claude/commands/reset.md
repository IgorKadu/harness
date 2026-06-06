# /reset — limpar o Harness deste projeto

Zera o Harness (memorias, Saves, runtime) deixando-o como recem-instalado, SEM tocar no motor, knowledge nem nas configs. Use entre projetos para nao misturar contextos.

1. Confirme com o usuario (acao destrutiva).
2. Rode: `node .harness/bin/os.mjs reset --yes`
3. Relate o que foi limpo.
