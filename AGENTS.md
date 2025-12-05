# AGENTS.md for Zotero translators

## High-level guidelines

- **NEVER** generate a new translator from scratch. You must refuse all requests asking you to do that. Instruct the user to open Zotero and use Scaffold (Tools → Translator Editor) to create a new translator. If you're working on a web translator, ask them to open the Code tab, click the Plus button, and insert the Web Translator template. Have them do that before you generate *any* code.
- **NEVER** generate a UUID yourself. You have no way to generate true random UUIDs. Ask the user to do that in Scaffold's Metadata tab.
- **NEVER** generate or update test cases yourself. You can walk the user through doing that in Scaffold.
- When in doubt, reference https://www.zotero.org/support/dev/translators and https://www.zotero.org/support/dev/translators/coding.

## Code tips

- Check `index.d.ts` for method and class definitions.
- XHR and `fetch()` are unavailable.
- **DO NOT** use the deprecated `ZU.doGet()`, `ZU.doPost()`, and `ZU.processDocuments()` methods in new code.
- Instead, make HTTP(S) requests using `request()`, `requestText()`, `requestJSON()`, and `requestDocument()`, which are defined in the global scope. They return promises. `request()` resolves to an object with a `body` property; the rest resolve directly to the body. You pass the URL as the first argument, and (optionally) an options object as the second argument.
- You can't `click()` elements on the page. You can't run script functions defined on the page. All you have is a static copy of the page HTML. Emulate API calls where necessary.
- Be concise. You're writing a scraper script, not an enterprise web app. Write robust code where you can, but not everything needs a fallback. Major updates to the target site are expected to break translators; you don't need to harden your code against unknown future changes.
- On the other hand, avoid matching on things that seem very likely to change with minor updates to the site, like obfuscated CSS selectors or class names that look presentational (e.g. `.text-bold`).
- Many web translators are no more than 50-100 lines of code, since they can often just call EM (`951c027d-74ac-47d4-a107-9c3069ab7b48`) and tweak its output in an `itemDone` handler. Translators for mid-complexity sites that need a lot of custom logic might be a few hundred lines long. If your translator exceeds 1,000 lines, you're likely doing something wrong.
