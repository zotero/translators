---
name: create-test
description: Create or update test cases for a Zotero translator by running it against live URLs and capturing the output.
---

## How test cases work

Test cases are embedded at the end of each translator file between `/** BEGIN TEST CASES **/` and `/** END TEST CASES **/`. They look like JS but **the content is strict JSON** — double-quoted keys, no trailing commas, no comments, no single quotes. The linter enforces this.

```js
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://example.com/article/123",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Example Article",
				...
			}
		]
	}
]
/** END TEST CASES **/
```

## Creating test cases

The tool runs the translator, captures its output, and writes the test case JSON directly into the file. Do NOT hand-write test case item objects.

### Web

```
node .bin/create-test.mjs "<translator filename>" --url "<url>"
```

### Search

```
node .bin/create-test.mjs "<translator filename>" --search '{"DOI":"10.1234/example"}'
```

### Import

```
node .bin/create-test.mjs "<translator filename>" --input "<import data>"
```

### Export

Export tests are not supported by the automated test runner. Test export translators manually.

## Updating test cases

To update an existing test after changing translator code (or after the site changes), add `--update`:

```
node .bin/create-test.mjs "<translator filename>" --url "<url>" --update
```

This replaces the existing test with the same URL (or the same `--input`/`--search`) in place, instead of appending a new one. Other tests in the file are left exactly as they are. If no test matches, or several do, the tool stops before running anything; pick the test with `--index <n>` (1-based, as numbered in `run-tests.mjs` output).

## Options

- `--update`: Replace the matching existing test case instead of appending.
- `--index <n>`: With `--update`, replace test case `n` (1-based).
- `--no-write`: Preview the captured test case without modifying the file.
- `--json`: Output structured JSON.
- `--headed`: Open a visible browser. Required for sites behind Cloudflare or a similar anti-bot wall, which refuse headless Chrome outright.

## Guidelines

- Include at least one single-item test and one `"multiple"` test (if supported).
- Use stable URLs unlikely to change (DOI-based, permalinks, archived content).
- Always use this tool to generate test cases. Never write test case items by hand — the tool ensures the JSON matches what the translator actually produces.
- If you need to update a test case after changing translator code, re-run the tool for that URL with `--update`. Don't append a new test and delete the old one: appending re-serializes the whole block, which reorders fields in other hand-edited tests.
