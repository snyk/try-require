# AGENTS.md

Single source of truth for AI coding agents working on this project. Read this before making any changes.

`CLAUDE.md` intentionally delegates here — update this file, not the pointer.

`snyk-try-require` tries to load and parse a `package.json` and returns a promise. It does **not**
load the package into memory the way `require` does — it reads and augments the manifest, detecting
Snyk policy files and npm-shrinkwrap. Consumed by Snyk tooling that inspects manifests without
executing them.

## Scope

These rules cover `lib/try-require.js` — the entire implementation — and the tap suite under
`test/`.

## Architecture

A single CommonJS module. `module.exports = tryRequire` is line 1, before the requires; extra
exports (`module.exports.cache`) are attached afterwards, and helpers sit at the bottom. State is a
module-level `lru-cache` singleton, and the only test seam is the exported `cache` handle. All I/O
is promisified `fs.readFile` / `fs.stat`.

### Hard rules

Every item is a blocking gate — a PR that violates any of these must not merge.

- **Never commit `test.only`.** `npm test` runs `check-tests`
  (`! grep 'test.only' test/*.test.js -n`) first and fails the build if one is present.
- **`tryRequire` must never throw when the `package.json` cannot be found** — the returned promise
  fulfills with `null`. This is the module's headline contract and is asserted by the
  "try failure require" test.
- **It must parse the manifest only, never load or execute the package** the way `require` does.
- **The returned object must always carry `dependencies` and `devDependencies`** (added when
  missing) **and `__filename`** holding the full original path to the package.
- **The original file's leading and trailing whitespace must be preserved** as the `leading` and
  `trailing` properties — callers rewrite `package.json` from these.
- **When a Snyk policy file is present, its path goes on the `snyk` property; when the package uses
  `npm-shrinkwrap.json`, a boolean `shrinkwrap` property is included.**
- **Caching is lru-cache, 100 objects, 1 hour, and must return a clone.** `cloneDeep` runs on both
  cache hit and cache set so callers can never mutate cached state.
  Reference: [`lib/try-require.js`](lib/try-require.js)
- **Debug logging uses the `debug` module under the `snyk:resolve:try-require` key.**
- **Never add a lockfile.** `.npmrc` sets `package-lock=false`, and CI runs `npm install`, not
  `npm ci`.
- **ESLint pins `ecmaVersion: 2017`**, so newer syntax will not parse. `lib/` uses promise chains
  (`.then`/`.catch`), not `async`/`await`.
- **All changes require review from `@snyk/platform-experience_guardrails`** — note this repo's code
  owner differs from the rest of the inventory fleet.

### Conventions

- Silent failure is deliberate: the readFile/JSON.parse chain has a single `.catch` that logs via
  `debug` and returns `null`, and the `fs.stat` probes use a shared no-op `pass` stub so a missing
  file is not an error.
- Internal properties added to the parsed package use a dunder prefix (`__filename`, `__cached`);
  public additions are plain lowercase (`leading`, `trailing`, `snyk`, `shrinkwrap`).
- Files are kebab-case; tests are `<name>.test.js` in `test/`, with manifest fixtures under
  `test/fixtures/`.
- Comments are `//` lines explaining *why* — there is no JSDoc anywhere.

### Danger zone

The first test in `test/try-require.test.js` shells out to `npm --prefix test/fixtures/… install`,
so **the suite needs network and npm access** and runs with `--timeout=60`. `.nvmrc` pins Node 8
while `package.json` `engines` requires `>=18` and the release workflow uses Node 22 — the `.nvmrc`
is stale, so do not trust it. The GitHub Actions test matrix still runs Node 12/14/16, all below the
declared `engines` floor.

Treat these areas as high-risk: prefer the smallest possible change,
add tests before modifying, and ask a human reviewer before landing.

## Code conventions

### Style and formatting

ESLint 5 extending `eslint:recommended`, with `no-var` and `prefer-const` as warnings. There is no
formatter.
Formatting and linting are enforced by tooling — run `npm run lint`
instead of reasoning about style; it is authoritative.

### Best practices for new code

Apply these principles when writing **new** code. Do not refactor existing code to comply unless explicitly asked.

When you touch a file that has existing violations:
1. Write your new code correctly.
2. Leave the surrounding violation untouched.
3. Emit: "⚠️ Legacy debt: [file:line] — [which principle], left alone to avoid scope creep."

- **Single Responsibility Principle (SRP)**
- **Avoid Hasty Abstractions (AHA)**

## Testing

> **Note:** No automated coverage enforcement found in CI or config. `npm test` collects coverage
> with `tap --cov`, but no threshold gates the build.

| Command | What it runs |
|---------|--------------|
| `npm test` | `check-tests`, then `npm run lint`, then `tap test/*.test.js --cov --timeout=60` |
| `npm run lint` | `eslint lib test` |
| `npm run cover` | The suite with an lcov coverage report |

### AI agent testing protocol

**1. Test-first: fail before pass.**

Before writing implementation, write a test that exercises the new behavior. Run it — it **must
fail** first. A test that passes before the change is testing the wrong thing; discard it and write
another. Implement, then run again. This cycle counts as one attempt; you have **3 attempts** total.
If fail-then-pass cannot be achieved, stop and warn: "Warning: could not achieve
fail-before/pass-after for [test name] — [reason]."

If writing a test before implementation is genuinely not feasible (e.g., the change is in test
scaffolding itself), document the reason explicitly.

**2. Do not add tests for pre-existing untested code you touch.**

When modifying existing code that has no tests, report it: "Warning: [file/function] has no
existing test coverage. This change is unverified." Do **not** add tests for it — that is out of
scope and may introduce incorrect assumptions about existing behavior. Do write tests for any
**new** behavior you add, even if it lives in an existing file.

## Commits and PRs

No commitlint configuration exists, but releases are automated with semantic-release on every push
to `master`, which parses Conventional Commits to decide the version bump. Conventional messages are
therefore effectively required for correct versioning even though nothing enforces them at commit
time.
Branch naming: `<type>/<kebab-case-description>`, e.g. `chore/add-prodsec-orb-runtime-context`.
`master` is the release branch; the test workflow runs on every other branch.

## Before you finish

Before presenting any change, verify each item below. Do not report work as complete until every applicable item passes.

- [ ] `npm test` passes (guard, lint, and the tap suite)
- [ ] No `test.only` committed
- [ ] No lockfile added
- [ ] New syntax stays within ES2017
- [ ] The never-throw contract still holds — a missing `package.json` resolves to `null`
- [ ] Commit message is a Conventional Commit, since it drives the released version

---

## Human review checklist

This file was generated by `/create-agents-md:create-agents-md` as a starting point. Complete these items to finish it:

- [ ] Add a "When in doubt" note with the team contact.
- [ ] Reconcile the Node versions: `.nvmrc` pins 8, `engines` requires >=18, the test matrix runs
      12/14/16, and release runs 22.
- [ ] Decide whether coverage should be enforced with a threshold.
- [ ] Consider removing the network dependency from the test suite, which currently runs
      `npm install` against fixtures.
- [ ] Confirm the code owner: this repo is owned by `@snyk/platform-experience_guardrails`, unlike
      its neighbours.
- [ ] Git-history and PR-review mining were skipped when generating this file. Add any rule your
      reviewers repeatedly enforce that is not captured above.
- [ ] Remove this section once all items above are resolved.
