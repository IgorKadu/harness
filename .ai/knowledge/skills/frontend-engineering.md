---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~600
load: frontend, ui
triggers: ui, ux, component, react, vue, svelte, form, css, a11y
---

# Skill: Frontend Engineering

## Princípios

- **Componentes pequenos, com responsabilidade única.**
- **Estado o mais próximo possível de onde é usado.** Subir apenas quando compartilhado.
- **Acessibilidade não é opcional.** Roles, labels, contraste, navegação por teclado.
- **Performance percebida > performance bruta.** Skeleton, optimistic UI, lazy load.

## Estrutura

- Separar **UI puro** (apresentação) de **container** (estado/fetch).
- Hooks customizados para lógica reutilizável.
- Tipos em todo lugar (TS estrito; `any` é code smell).

## Estado

| Tipo | Onde mora |
|---|---|
| UI local (input, toggle) | `useState` no componente |
| Compartilhado entre poucos | Context ou prop drilling raso |
| Global cliente | Zustand, Jotai, Redux (escolher um) |
| Servidor / cache | React Query, SWR, Apollo |
| URL | Query params, route state |

## Renderização

- Evitar re-render desnecessário: memoização SÓ depois de medir, não preventivamente.
- Lista grande → virtualização (react-window, tanstack-virtual).
- Imagens → `srcset`, formatos modernos (WebP/AVIF), lazy loading.

## Forms

- Validação client-side imediata + server-side autoritativa.
- Estado controlado para forms complexos; uncontrolled para forms triviais.
- Disable do submit enquanto pending. Loading state visível.

## Estilo

- Token-based (cores, espaçamentos, tipografia) — nunca valor cru.
- Mobile-first.
- Dark mode considerado desde o design, não retrofit.

## Erros e Loading

- Toda chamada async tem 3 estados visuais: idle, loading, error.
- Mensagens de erro acionáveis ("Conexão falhou. Tentar novamente"), não genéricas ("Algo deu errado").

## Anti-padrões

- `useEffect` para sincronizar com estado externo quando `useMemo`/derivação resolveria.
- Re-fetch a cada navegação quando cache resolveria.
- DOM imperativo dentro de React (`document.querySelector`).
- CSS global que vaza em tudo.
