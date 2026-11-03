## Project knowledge

Thie repository contains a **Grafana plugin**. You must Read @./.config/AGENTS/instructions.md before doing changes.

## Updating create-plugin tooling

Apply create-plugin updates manually when requested; do not restore the automated
cp-update workflow or add a personal access token for updates.

- Inspect `.config/.cprc.json` and choose an explicit create-plugin version that
  respects the package manager's release-age policy.
- Run `npx @grafana/create-plugin@<version> update` on a clean working tree. Preserve
  existing changes before running it; do not use `--force` without accounting for
  those changes.
- Let the official updater manage `.config`; do not edit generated files by hand.
- Review every migration against this project's customizations: Biome handles
  linting and formatting, and the root webpack and Jest configurations customize
  the JSX runtime. Do not assume scaffold defaults fit this repository.
- Check workflow permissions, action references, dependency changes, and any
  actions lockfile affected by the update. Run type checking, unit tests, linting,
  and the production build before recommending the changes.
