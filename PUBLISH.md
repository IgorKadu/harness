# Publicar o Harness (GitHub + NPM)

Pre-requisitos: Node >= 18, conta no GitHub e no npm. O pacote e `@igorkadu/harness`
(scope publico). Rode tudo na raiz do repo.

## 0. Conferir antes
```bash
node bin/os.mjs doctor                 # 0 problemas
node bin/os.mjs next "teste" --json    # orquestrador responde JSON
npm pack --dry-run                     # ve exatamente o que vai pro npm (files[])
```

## 1. GitHub
> PowerShell nao aceita `&&` — rode **um comando por linha** (como abaixo).
> Se aparecer `Unable to create '.git/index.lock'`, feche o editor com o repo aberto e rode `Remove-Item .git\index.lock -Force` antes.

```powershell
git remote -v                       # confirme; se faltar o origin, adicione a linha abaixo
git remote add origin https://github.com/IgorKadu/harness.git   # pule se ja existir
git add -A
git commit -m "feat: orquestrador v0.4.0 + MCP 23 tools + extensao + painel web + upgrade-safe (preserva memoria)"
git branch -M main
git push -u origin main
git tag v0.4.0
git push origin v0.4.0
```
Confirme: `git log --oneline -1` deve mostrar o commit acima e `git status` "working tree clean".

## 2. NPM
```bash
npm login                              # uma vez por maquina
npm publish --access public            # publishConfig.access ja esta "public"
```
Verifique: https://www.npmjs.com/package/@igorkadu/harness

Depois de publicado, a instalacao em qualquer projeto e:
```bash
npx @igorkadu/harness scaffold .         # projeto novo (memoria zerada)
npx @igorkadu/harness upgrade .          # projeto que JA usa Harness: atualiza e PRESERVA a memoria (backup em .ai/backup-*)
```

## 3. Extensao VSCode (opcional, canal separado)
```bash
npm i -g @vscode/vsce
cd extension && vsce package           # gera harness-lean-ai-os-0.4.0.vsix
# publicar no Marketplace exige um publisher e PAT:
# vsce login igorkadu && vsce publish
```

## Versionar dali em diante
```bash
npm version patch   # ou minor/major — atualiza package.json e cria tag git
git push && git push --tags && npm publish
```
