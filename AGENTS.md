# AGENTS.md

## Checks

Run these before considering a change done. CI runs all of them on every pull
request and on every push to `main`.

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `bun run fix`     | Formats with oxfmt. `bun run format:check` is the CI check.    |
| `bun run lint`    | oxlint over the whole repository.                              |
| `bun run codegen` | Generates `generated/` from the schema and ABIs.               |
| `bun run test`    | matchstick tests (`graph test`; add `-- -d` to run in Docker). |

- The mappings are AssemblyScript compiled by graph-cli. `tsc` cannot type-check
  graph-ts, so there is no separate type check: the AssemblyScript compiler run by
  `graph test` and `graph build` is the type check.
- `abis/`, `generated/` and `tests/.latest.json` are generated or pinned and excluded
  from formatting.

## Complexity Policy

- The only lint rule is `complexity` (in `.oxlintrc.json`), capped at 10 per function.
  The repo is clean at that threshold today.
- Prefer splitting a function over adding `// eslint-disable-next-line complexity`.
  If a disable really is the right call (a table-driven or numeric routine where the
  branches are the point), put the reason on the line above it. An unused disable
  directive is itself an error.
