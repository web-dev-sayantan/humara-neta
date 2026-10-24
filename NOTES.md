# Project Notes

## Alchemy dev launcher (temporary)

`packages/infra/scripts/alchemy.mjs` exists because alchemy `2.0.0-beta.84` crashes when its CLI is launched from Bun: it loads `src/*.ts` and the Node Vite child asks for the unpublished `bin/register-dev-mode.js` ([issue #1868](https://github.com/alchemy-run/alchemy/issues/1868)). Fixed upstream in [PR #2525](https://github.com/alchemy-run/alchemy/pull/2525), not yet released.

Once a release includes #2525: keep the launcher to enforce "Bun = package manager, Node = runtime", or delete it and restore plain `alchemy dev` / `deploy` / `destroy` scripts.
