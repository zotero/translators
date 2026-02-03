---
name: verify-translator
description: Steps that MUST be performed to verify a Zotero translator after every addition or modification, and before submitting a PR.
---

## Get documentation

Fetch and ingest https://www.zotero.org/support/_export/raw/dev/translators and https://www.zotero.org/support/_export/raw/dev/translators/coding.

## `lastUpdated`

Update the translator's `lastUpdated` to the current time (shell: `date -u +"%Y-%m-%d %H:%M:%S"`).

## Lint

Verify that `npm run lint -- <translator filename>` succeeds without returning any lint errors. Use `--fix` to correct auto-fixable errors, and fix the rest manually.

## Run tests

For web, import, and search translators (check for matching `do` methods, e.g., `function doWeb(...)`), verify that tests succeed. Prompt the user to open Zotero and use Tools → Translator Editor ("Scaffold") to run tests. If they refuse or are unsure of how to use Scaffold, you can run tests using the same tool as we use on GitHub CI. `cd .ci/pull-request-check && ./check-pull-request.sh <translator filename>`.

Warn that Zotero maintainers are known to reject translator PRs that appear not to have been tested.

## Ensure user is working in a Git branch

If the user is working on `master` or a stale PR branch, prompt them to create a new branch for their translator before pushing. This will make future PRs easier.

## Create a PR

Guide the user through the process of creating a PR on https://github.com/zotero/translators. Avoid generating excessively long AI descriptions. Encourage the user to write the description themselves.
