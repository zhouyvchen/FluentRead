# FluentRead Agent Notes

## Toolchain and commands

- This is a single-package WXT/Vue 3 browser extension. Use the pinned `pnpm@9.12.1` through Corepack: `corepack pnpm <command>`.
- Run `corepack pnpm install --frozen-lockfile` before type-checking a fresh checkout. The `postinstall` hook runs `wxt prepare`, which generates `.wxt/tsconfig.json`; the root `tsconfig.json` extends that generated file.
- Type-check: `corepack pnpm compile`.
- Chromium: `corepack pnpm dev`, `corepack pnpm build`, or `corepack pnpm zip`.
- Firefox: `corepack pnpm dev:firefox`, `corepack pnpm build:firefox`, or `corepack pnpm zip:firefox`.
- Documentation: `corepack pnpm docs:dev` and `corepack pnpm docs:build`. The docs are a separate VitePress site under `docs/`.
- There is no configured test, lint, formatter, or CI workflow. Do not invent a verification command; run `compile`, then the relevant browser build. Run `docs:build` for docs or VitePress configuration changes.
- `compile` currently reports baseline errors: missing `chrome` globals/implicit callback types in the offscreen translation files, plus incompatible Vite plugin types in `wxt.config.ts` from resolved Vite 5.4.11/5.4.19 copies. The Chromium production build still succeeds; do not treat these errors as introduced by an unrelated change, but do report any new errors.

## Runtime boundaries

- WXT discovers runtime entrypoints under `entrypoints/`: `content.ts` declares `<all_urls>` matching and injects translation UI/page behavior where permitted; `background.ts` owns context menus and dispatches translation messages; `popup/` is the Vue/Element Plus settings UI; `offscreen/` hosts Chrome's built-in Translation API.
- The main translation path is `entrypoints/utils/translateApi.ts` (cache, queue, retry) -> extension message -> `entrypoints/background.ts` -> `entrypoints/service/_service.ts`. Some paths call `runtime.sendMessage` directly; search all such calls when changing message contracts, queueing, retry, or cancellation behavior.
- `components/` contains both popup components and Vue components mounted into host pages by the content script. Shared injected styles live in `entrypoints/style.css`; popup-only styles live under `entrypoints/popup/` and `styles/theme.css`.
- Root `userscripts.js` is a standalone userscript and is not referenced by the WXT build/import graph. Change it only when the task explicitly targets that distribution.

## Cross-file invariants

- Adding or renaming a translation provider is not a one-file change. Always synchronize its identifier/capabilities/UI in `entrypoints/utils/option.ts` and `components/Main.vue`, plus its implementation/import and dispatch entry in `entrypoints/service/_service.ts`. As needed, update endpoints in `constant.ts`, validation in `check.ts`, request formatting in `template.ts`, and provider-specific fields/defaults in `model.ts`.
- Settings are persisted as a JSON string at WXT storage key `local:config`. New settings need a declared field and constructor default in `Config`; stored values are merged onto `new Config()`, so the constructor supplies defaults for existing installations. The popup deep-watches and rewrites the full object, while other extension contexts watch the same key.
- Chrome built-in translation crosses background/offscreen message type `CHROME_TRANSLATE_OFFSCREEN` and depends on the `offscreen` manifest permission in `wxt.config.ts`. Update all three locations together if that flow changes.
- Build artifacts `.wxt/` and `.output/` are generated and ignored; never hand-edit them.
