# AGENTS.md for Zotero translators

## Developing translators

There are four types of Zotero translator. If the user doesn't specify which type, ask them. Use the corresponding skill:

- **Web** (`develop-web-translator`): Scrapes data from a website. By far the most common. Use this if the user gives you a URL or says "build a translator for [site name]".
- **Import** (`develop-import-translator`): Parses a file format (JSON, XML, BibTeX, RIS, CSV, etc.) into Zotero items. Use this if the user says "import", "parse", "my custom format", etc.
- **Export** (`develop-export-translator`): Converts Zotero items into a file format. Use this if the user says "export" or "convert items to [format]".
- **Search** (`develop-search-translator`): Looks up items by identifier (DOI, ISBN, PMID, arXiv) via an external API. **This is NOT for websites with search pages** — that's a web translator. Search translators are for identifier-resolution services like Crossref, OpenAlex, or Library of Congress. Only use this if the user explicitly wants identifier-based lookup.

A single translator can combine multiple types (e.g. import + export for a round-trippable format). Initialize with `--type import,export` and implement all the required functions from each type's skill in one file.

Run any `.bin/` tool with `--help` for usage.

## Deleting translators

Whenever a translator's ID stops being used — the file is deleted outright, merged into another translator, or replaced — you **must** retire the ID in `deleted.txt`. Zotero reads that file to remove the translator from users' installations; skipping it leaves a dead translator running for everyone.

Two edits, both required:

1. Append the ID and a short reason at the end of the file, e.g.
   `938ebe32-2b2e-4349-a5b3-b3a05d3de627 # ACS Publications: Now uses Silverchair
2. Increment the number on the file's first line. It's the file's version marker — clients won't pick up the change without it.

Do this in the same commit as the deletion.

## Understanding a target site

- **DO NOT** fetch site pages with WebFetch, curl, or any HTTP tool. Modern sites return minified, JS-rendered markup that is useless to parse. You will waste time and get wrong answers.
- To understand a site's **API**, use the `capture-api` skill.
- To understand a site's **page structure**, use the `inspect-page` skill.
- Once you have the API spec and/or page structure, write your translator against those.
- Add `--headed` to any `.bin/` browser tool for a site behind Cloudflare or a similar wall. Headless Chrome is refused outright there, so a headless run returns a challenge page instead of content, and every test fails "Detection failed". Don't mistake that for a translator bug, and don't try to spoof your way past it.

## Code tips

- Check `index.d.ts` for method and class definitions.
- XHR and `fetch()` are unavailable in translator code.
- **DO NOT** use the deprecated `ZU.doGet()`, `ZU.doPost()`, and `ZU.processDocuments()` methods in new code.
- Instead, make HTTP(S) requests using `request()`, `requestText()`, `requestJSON()`, and `requestDocument()`, which are defined in the global scope. They return promises. `request()` resolves to an object with a `body` property; the rest resolve directly to the body. You pass the URL as the first argument, and (optionally) an options object as the second argument.
- You can't `click()` elements on the page. You can't run script functions defined on the page. All you have is a static copy of the page HTML. Emulate API calls where necessary.
- Be concise. You're writing a scraper script, not an enterprise web app. Write robust code where you can, but not everything needs a fallback.
- Avoid matching on things that seem very likely to change with minor updates to the site, like obfuscated CSS selectors or class names that look presentational (e.g. `.text-bold`).
- Many web translators are no more than 50-100 lines of code, since they can often just call EM (`951c027d-74ac-47d4-a107-9c3069ab7b48`) and tweak its output in an `itemDone` handler. Translators for mid-complexity sites that need a lot of custom logic might be a few hundred lines long. If your translator exceeds 1,000 lines, you're likely doing something wrong.
- When in doubt, reference https://www.zotero.org/support/dev/translators and https://www.zotero.org/support/dev/translators/coding.
