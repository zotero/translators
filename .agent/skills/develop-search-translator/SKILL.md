---
name: develop-search-translator
description: Develop a search translator that looks up items by identifier (DOI, ISBN, PMID, arXiv ID, etc.) via an external API. NOT for websites with search pages — use develop-web-translator for those.
---

## What is a search translator?

A search translator takes a **structured identifier** (DOI, ISBN, PMID, arXiv ID, etc.) and looks up metadata from an **external API**. It does NOT receive a web page or document.

**Common confusion**: if the user wants to translate items from a website that has a search page, that's a **web translator**, not a search translator. Use `develop-web-translator` for that. Search translators are for identifier-based lookup services (like Crossref, OpenAlex, Library of Congress, etc.).

## Prerequisites

Fetch and read the Zotero translator documentation:
- https://www.zotero.org/support/_export/raw/dev/translators
- https://www.zotero.org/support/_export/raw/dev/translators/coding

Also read `index.d.ts` for type definitions.

## Step 1: Gather information

1. **Label**: The service name (e.g. "OpenAlex")
2. **Creator**: The author's name
3. **Identifier types**: What identifiers does this service accept? (DOI, ISBN, PMID, arXiv, etc.)
4. **API documentation**: URL of the service's API docs

Look for existing search translators for patterns:
```
grep -l "detectSearch\|doSearch" *.js
```

## Step 2: Initialize

```
node .bin/init-translator.mjs --label "<Label>" --creator "<Creator>" --type search
```

Search translators have no `target` regex. They're triggered by identifier lookups in Zotero.

## Step 3: Write the code

### `detectSearch(items)`

Return `true` if the input contains identifiers this translator handles. The `items` parameter is an object (or array of objects) with identifier fields.

```js
function detectSearch(items) {
    if (Array.isArray(items)) {
        return items.some(item => item.DOI || item.ISBN);
    }
    return !!(items.DOI || items.ISBN);
}
```

Valid search fields: `DOI`, `ISBN`, `PMID`, `arXiv`, `identifiers`, `contextObject`, `adsBibcode`, `ericNumber`, `openAlex`.

### `doSearch(item)`

Look up the identifier via the service's API and create Zotero items.

```js
async function doSearch(item) {
    let doi = item.DOI;
    if (!doi) return;

    let url = `https://api.example.com/works/${encodeURIComponent(doi)}`;
    let data = await requestJSON(url);

    let newItem = new Zotero.Item('journalArticle');
    newItem.title = data.title;
    newItem.date = data.published_date;
    newItem.DOI = doi;
    for (let author of data.authors) {
        newItem.creators.push({
            firstName: author.given,
            lastName: author.family,
            creatorType: 'author',
        });
    }
    // ... map other fields ...
    newItem.complete();
}
```

Key APIs:
- `requestJSON(url)`, `requestText(url)`, `request(url)` — make HTTP requests to the external API.
- `new Zotero.Item(itemType)` — create an item, set fields, call `.complete()`.
- `ZU.cleanDOI()`, `ZU.cleanISBN()`, `ZU.cleanISSN()` — normalize identifiers.
- `ZU.cleanAuthor(name, creatorType)` — parse author name strings.

## Step 4: Create tests

```
node .bin/create-test.mjs "<Label>.js" --search '{"DOI":"10.1234/example"}'
```

Test with multiple identifier types if supported.

## Step 5: Verify and submit

**Update `lastUpdated` every time you modify translator code.**

```
node .bin/update-metadata.mjs "<Label>.js"
npm run lint -- "<Label>.js"
node .bin/run-tests.mjs "<Label>.js"
```
