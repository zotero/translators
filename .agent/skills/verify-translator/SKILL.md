---
name: verify-translator
description: Verify a Zotero translator after every addition or modification, and before submitting a PR. Runs linting and tests.
---

## Fetch documentation

Fetch and read:
- https://www.zotero.org/support/_export/raw/dev/translators
- https://www.zotero.org/support/_export/raw/dev/translators/coding

## Lint

```
npm run lint -- "<translator filename>"
```

Use `--fix` for auto-fixable errors. Fix any remaining errors manually.

## Run tests

```
node .bin/run-tests.mjs "<translator filename>"
```

This launches headless Chromium with the Zotero Connector extension and runs the translator's test cases against live sites.

All tests must pass. If a test fails:
1. Read the failure output carefully.
2. Check whether the target site has changed.
3. Fix the translator code or update the test case (using `create-test` skill).
4. Re-run tests until all pass.

## Ensure user is working in a Git branch

```
git branch --show-current
```

If on `master`, create a new branch.

## Create a PR

Guide the user through creating a PR on https://github.com/zotero/translators. Keep the description concise. Encourage the user to write/review the description.
