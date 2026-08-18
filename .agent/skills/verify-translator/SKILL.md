---
name: verify-translator
description: Verify a Zotero translator after every addition or modification, and before submitting a PR. Runs linting, tests, and metadata updates.
---

## Fetch documentation

Fetch and read:
- https://www.zotero.org/support/_export/raw/dev/translators
- https://www.zotero.org/support/_export/raw/dev/translators/coding

## Update `lastUpdated`

**This must be done every time translator code is modified.** Zotero uses `lastUpdated` to determine when to push updates to users.

```
node .bin/update-metadata.mjs "<translator filename>"
```

## Lint

```
npm run lint -- "<translator filename>"
```

Use `--fix` for auto-fixable errors. Fix any remaining errors manually.

## Run tests

```
node .bin/run-tests.mjs "<translator filename>"
```

This launches Chrome with the Zotero Connector extension and runs the translator's test cases against live sites.

Add `--headed` for any site behind Cloudflare or a similar anti-bot wall — headless Chrome identifies itself as `HeadlessChrome` and those sites refuse it outright, so **every** test fails with "Detection failed" for reasons that have nothing to do with the translator. That symptom — all tests failing detection at once, including ones that used to pass — almost always means the wall, not your code. Headed usually loads the same pages with no challenge at all.

All tests must pass. If a test fails:
1. Read the failure output carefully.
2. Check whether the target site has changed.
3. Fix the translator code or update the test case (using `create-test` skill).
4. Re-run tests until all pass.

## Retire IDs of deleted translators

If this change deletes a translator, or stops using its ID because it was merged into or replaced by another translator, add the ID and a short reason to `deleted.txt` **and** increment the number on the file's first line. Both edits are required — clients don't pick up the change without the increment.

## Ensure user is working in a Git branch

```
git branch --show-current
```

If on `master`, create a new branch.

## Create a PR

Guide the user through creating a PR on https://github.com/zotero/translators. Keep the description concise. Encourage the user to write/review the description.
