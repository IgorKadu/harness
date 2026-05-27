---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~700
load: security
triggers: segurança, security, auth, senha, token, xss, csrf, sql injection, vulnerab, lgpd, gdpr
---

# Skill: Security

## Princípios

- **Defense in depth.** Múltiplas camadas; nunca confiar em uma só.
- **Least privilege.** Token/role mínimo necessário, expirando o mais cedo possível.
- **Validate at boundaries.** Input do usuário, retorno de APIs externas, leituras de DB.
- **Secrets never in code.** Sempre via cofre (Vault, KMS, env injection em runtime).

## OWASP Top 10 — Checklist

- [ ] **Injection** (SQL, NoSQL, command, LDAP): parametrize sempre.
- [ ] **Broken auth**: hashes fortes (argon2/bcrypt), MFA, rate limit em login.
- [ ] **Sensitive data exposure**: HTTPS, criptografia em repouso, mascaramento em logs.
- [ ] **XXE**: desabilitar entidades externas em parsers XML.
- [ ] **Broken access control**: checagem por recurso, não só por role.
- [ ] **Security misconfig**: defaults seguros, headers (CSP, HSTS, X-Frame-Options).
- [ ] **XSS**: escape por contexto (HTML, JS, attr, URL).
- [ ] **Deserialization**: nunca desserializar input não confiável sem validação.
- [ ] **Vulnerable deps**: auditoria contínua (`npm audit`, Dependabot, Snyk).
- [ ] **Logging & monitoring**: log de eventos de segurança, alerta em anomalias.

## Autenticação

- Senhas: argon2id ou bcrypt (cost >= 12).
- Tokens: JWT só com expiração curta + refresh; ou session opaca server-side.
- MFA via TOTP > SMS.
- Reset de senha: token de uso único, expiração < 1h.

## Autorização

- RBAC > ACL ad-hoc.
- Verificar permissão em CADA endpoint, não confiar em UI esconder botão.
- Avoid IDOR: verificar ownership do recurso, não só ID.

## Segredos

- Nunca em código, nunca em commit, nunca em log.
- Rotação automática quando possível.
- Diferentes por ambiente (dev/staging/prod).
- `.env` no `.gitignore`; `.env.example` versionado sem valores.

## Headers HTTP

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

## Logs e PII

- Não logar: senhas, tokens, PII completa, cartões.
- Mascarar ao logar (`user_***@domain`).
- LGPD/GDPR: minimização, propósito, prazo, direito ao apagamento.

## Registro

Vulnerabilidade encontrada → `memory/decisions.md` com severidade + correção + data.
Se virou padrão → `evolution/patterns-discovered.md`.
