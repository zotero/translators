---
name: develop-import-translator
description: Develop an import translator that parses a file format (JSON, XML, RIS, BibTeX, CSV, etc.) into Zotero items.
---

## Prerequisites

Fetch and read the Zotero translator documentation:
- https://www.zotero.org/support/_export/raw/dev/translators
- https://www.zotero.org/support/_export/raw/dev/translators/coding

Also read `index.d.ts` for type definitions.

## Step 1: Gather information

1. **Label**: The format name (e.g. "My Custom JSON")
2. **Creator**: The author's name
3. **Example data**: A sample of the format to import

Look for existing import translators that handle similar formats:
```
grep -l "detectImport\|doImport" *.js
```

## Step 2: Initialize

```
node .bin/init-translator.mjs --label "<Label>" --creator "<Creator>" --type import
```

If the translator should also export the same format, use `--type import,export` and implement `doExport()` as described in the `develop-export-translator` skill.

Import translators have no `target` regex — they match on content via `detectImport()`.

## Step 3: Write the code

### `detectImport()`

Read the first few lines with `Zotero.read()` and return `true` if the format matches. Be specific to avoid false positives with other formats.

```js
function detectImport() {
    let start = '';
    for (let i = 0; i < 10; i++) {
        let line = Zotero.read();
        if (line === false) break;
        start += line;
    }
    // Check for a distinctive marker in the format
    return start.includes('"my_format_version"');
}
```

### `doImport()`

Read the full input, parse it, and create items.

```js
async function doImport() {
    // Read all input
    let text = '';
    let line;
    while ((line = Zotero.read()) !== false) {
        text += line;
    }

    let data = JSON.parse(text);
    for (let record of data.records) {
        let item = new Zotero.Item('journalArticle');
        item.title = record.title;
        item.date = record.date;
        for (let author of record.authors) {
            item.creators.push({
                firstName: author.first,
                lastName: author.last,
                creatorType: 'author',
            });
        }
        // ... map other fields ...
        item.complete();
    }
}
```

Key APIs:
- `Zotero.read(length)` — read characters from input. Returns `false` at EOF. With no argument, reads one line.
- `new Zotero.Item(itemType)` — create an item. Set fields as properties, then call `.complete()`.
- For XML: `(new DOMParser()).parseFromString(text, 'text/xml')`
- For line-based formats (RIS, BibTeX): read and parse line by line.

## Step 4: Create tests

```
node .bin/create-test.mjs "<Label>.js" --input '<paste example data here>'
```

## Step 5: Verify and submit

```
npm run lint -- "<Label>.js"
node .bin/run-tests.mjs "<Label>.js"
```
