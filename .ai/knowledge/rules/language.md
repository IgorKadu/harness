---
version: 1.0.0
updated: 2026-06-03
tier: conditional
tokens: ~250
load: language
triggers: idioma, language, traducao, translate, lingua, locale
---

# Rule: Language Policy

> Decided in ADR-0036. English is the substrate of the system; Portuguese is the
> human channel. Keep the two separated and consistent.

## The split

| Surface | Language | Why |
|---|---|---|
| Code, identifiers, comments | English | LLMs reason and pattern-match best in English; it is the base of most libraries, docs and Stack Overflow signal. |
| Knowledge docs, skills, ADRs, specs | English | They are the model's "thinking" reference — keep them in the language the model performs best in. |
| Commit messages, file/dir names | English | Portable across contributors and tooling. |
| Dialogue with the user | Portuguese | The user's channel, until they ask to switch. |
| User-facing descriptions / explanations | Portuguese | What the human reads should match how they speak. |

## Rules of thumb

- **Think in English, talk in Portuguese.** Internal artifacts (the system) are English;
  the conversation is Portuguese.
- **One language per artifact.** Do not mix EN/PT inside the same file or message.
- **Switch on request only.** If the user asks for another dialogue language, follow it for
  the conversation — the system layer stays English regardless.
- **Migration is gradual, not a stop-the-world rewrite.** Existing Portuguese knowledge docs
  are converted to English when they are next touched, to avoid needless rework (anti-redundancy).

## Anti-patterns

- Writing new skills/ADRs in Portuguese "to match the repo history" — the policy changed; new
  system artifacts are English.
- Answering the user in English because the code is in English — the human channel stays PT.
