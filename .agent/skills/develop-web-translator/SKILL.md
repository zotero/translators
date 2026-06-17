---
name: develop-web-translator
description: Develop a web translator that scrapes bibliographic data from a website. This is the most common translator type.
---

## Prerequisites

Fetch and read the Zotero translator documentation:
- https://www.zotero.org/support/_export/raw/dev/translators
- https://www.zotero.org/support/_export/raw/dev/translators/coding

Also read `index.d.ts` in the repo root for type definitions. Give more weight to **recently created** translators when looking for examples.

## Step 1: Gather information

Collect from the user:

1. **Label**: The translator name (usually the site name)
2. **Creator**: The author's name
3. **Target URL(s)**: One or more example URLs from the target site

From the URLs, derive the **target regex**.

## Step 2: Analyze the site

**DO NOT** fetch site pages with WebFetch, curl, or any HTTP tool. Use the tools instead:

```
node .bin/capture-har.mjs "<example url>"
```

**Read the generated YAML file.** It contains full API schemas. This is your source of truth.

```
node .bin/inspect-page.mjs "<example url>"
```

This gives you meta tags, accessibility tree, and screenshot.

### Difficult sites (anti-bot walls)

The browser tools (`capture-har`, `inspect-page`, `create-test`, `run-tests`) run **headless** by default. If a site is behind Cloudflare, a captcha, or another anti-bot wall, add `--headed` to open a visible window where you can solve the challenge by hand; the tool waits until it clears, then continues. (`--interact` and `--keep-open` also run headed.)

A solved challenge is cached in a reused browser profile at `.tmp/browser-profile`, so the next run carries it over. If that cached state goes stale (the site starts failing again) or a run hangs on a profile lock, clear it:

```
rm -rf .tmp/browser-profile
```

## Step 3: Choose an approach

Check the `inspect-page` meta tags first:

1. **Embedded Metadata (EM)** — if the page has Highwire Press tags (`citation_title`, `citation_author`, `citation_doi`, etc.), Dublin Core (`DC.title`, etc.), or good JSON-LD with bibliographic data, use EM. This is the most common approach (~180 translators use it):

   ```js
   async function scrape(doc, url = doc.location.href) {
       let translator = Zotero.loadTranslator('web');
       translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48'); // EM
       translator.setDocument(doc);
       translator.setHandler('itemDone', (_obj, item) => {
           // fix up fields EM gets wrong
           item.complete();
       });
       await translator.translate();
   }
   ```

   Call `await translator.getTranslatorObject()` only if you need to customize EM before translation (e.g. setting `itemType`).

2. **DOI search** — if the page doesn't have rich metadata but you can extract a DOI, use a search translator to look it up via DOI Content Negotiation:

   ```js
   async function scrape(doc, url = doc.location.href) {
       let doi = doc.querySelector('a[href*="/doi/"]')?.href.match(/10\.\d{4,}\/[^\s]+/)?.[0];
       if (!doi) return;
       let translate = Zotero.loadTranslator('search');
       translate.setSearch({ DOI: doi });
       translate.setHandler('error', () => {});
       translate.setHandler('itemDone', (_obj, item) => {
           item.complete();
       });
       await translate.translate();
   }
   ```

3. **API-based** — the site has a clean JSON API visible in the YAML. Call it with `requestJSON()`.

4. **HTML scraping** — no useful APIs or metadata. Parse the DOM directly. Last resort.

5. **Hybrid** — combine any of the above.

## Step 4: Initialize and write code

```
node .bin/init-translator.mjs --label "<Label>" --creator "<Creator>" --target "<regex>" --type web
```

This scaffolds the file from the web translator template at `.bin/templates/web.js`. That file is the canonical structure a web translator should follow — read it when you need to know the expected shape of `detectWeb`/`getSearchResults`/`doWeb`/`scrape`, or when a task asks you to make an existing translator better conform to the template.

Implement `detectWeb(doc, url)`, `getSearchResults(doc, checkOnly)`, `doWeb(doc, url)`, and `scrape(doc, url)`.

## Step 5: Create tests

```
node .bin/create-test.mjs "<Label>.js" --url "<example url>"
```

Include at least one single-item test and one multiple-item test (if supported).

## Step 6: Verify and submit

**Update `lastUpdated` every time you modify translator code.** Zotero uses it to determine when to push updates to users.

```
node .bin/update-metadata.mjs "<Label>.js"
npm run lint -- "<Label>.js"
node .bin/run-tests.mjs "<Label>.js"
```

All tests must pass. Then create a branch and PR.
