# Contributing and GitHub workflow

How we use branches, pull requests, code review, and issues in this repository.

## Issues

Use GitHub **Issues** with the templates under `.github/ISSUE_TEMPLATE/`:

| Template | When to use |
|----------|-------------|
| **Bug report** | Clear defect with reproducible steps |
| **Feature request** | Enhancements; align with Phase 1 scope in the root [README.md](../README.md) |
| **Problem or risk** | Blocking friction, tech debt, or future risk—include **workaround** and **proposed solution** |

**Issue-first vs small fixes:** Open an issue for non-trivial work, debate on scope, or anything that needs a paper trail. Trivial fixes (typos, one-line obvious corrections) can go straight to a PR with a short description.

### Label glossary (suggested)

Create these labels in the GitHub repo settings as needed:

| Label | Meaning |
|-------|---------|
| `bug` | Incorrect behavior |
| `enhancement` | New capability or improvement |
| `tech-debt` | Maintainability, perf limits, known limitations |
| `area:map` | Map / MapLibre / camera |
| `area:telemetry` | Pipeline, stores, watchdog |
| `area:sim` | Simulation / missions |
| `area:ui` | Screens, navigation, HUD |

## Branches

Branch from `main` using a short prefix:

- `feat/` — feature work  
- `fix/` — bug fixes  
- `docs/` — documentation only  
- `chore/` — tooling, CI, repo hygiene  

Example: `feat/telemetry-export`.

## Pull requests

1. Push your branch and open a PR **into `main`**.
2. Use the PR template (summary, **related issue**, **test plan**).
3. Link issues with `Fixes #123` or `Ref #456` in the description so GitHub connects history.
4. Use **draft PR** for early feedback; mark **ready for review** when `npm run validate` is green and you have filled the checklist.

### Author checklist

- Run `npm run validate` before requesting review (see [development-workflow.md](development-workflow.md)).
- For UI or map changes, note simulator vs physical device if behavior differs.
- Keep PRs focused; avoid unrelated refactors in the same PR.

### Review (including self-review)

- Fit with [architecture.md](architecture.md) layers and boundaries.
- Telemetry, map, and simulation paths: consider stale/offline/pause edge cases where relevant.
- Update or add tests when behavior changes.

If you work solo, still walk through the PR template and reviewer checklist before merge.

## CI

Pull requests to `main` run GitHub Actions (`validate`: lint, typecheck, tests). Fix failures before merging.

## Repository settings (maintainers)

Optional hardening on GitHub:

- **Branch protection** on `main`: require pull request, optionally require the `validate` status check.
- **CODEOWNERS**: add later if multiple owners per area.
