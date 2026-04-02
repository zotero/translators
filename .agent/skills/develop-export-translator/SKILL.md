---
name: develop-export-translator
description: Develop an export translator that converts Zotero items into a file format (JSON, XML, CSV, etc.).
---

## Prerequisites

Fetch and read the Zotero translator documentation:
- https://www.zotero.org/support/_export/raw/dev/translators
- https://www.zotero.org/support/_export/raw/dev/translators/coding

Also read `index.d.ts` for type definitions.

## Step 1: Gather information

1. **Label**: The format name (e.g. "My Custom JSON Export")
2. **Creator**: The author's name
3. **Expected output**: A sample of what the exported format should look like

Look for existing export translators for patterns:
```
grep -l "doExport" *.js
```

## Step 2: Initialize

```
node .bin/init-translator.mjs --label "<Label>" --creator "<Creator>" --type export
```

If the translator should also import the same format, use `--type import,export` and implement `detectImport()` and `doImport()` as described in the `develop-import-translator` skill.

Export translators have no `target` regex.

## Step 3: Write the code

### `doExport()`

Loop through items with `Zotero.nextItem()` and write output with `Zotero.write()`.

```js
function doExport() {
    let first = true;
    Zotero.write('[\n');
    let item;
    while ((item = Zotero.nextItem())) {
        if (!first) Zotero.write(',\n');
        first = false;
        Zotero.write(JSON.stringify({
            title: item.title,
            authors: item.creators.filter(c => c.creatorType === 'author')
                .map(c => `${c.firstName} ${c.lastName}`),
            date: item.date,
            doi: item.DOI,
            // ... map other fields ...
        }, null, '\t'));
    }
    Zotero.write('\n]\n');
}
```

Key APIs:
- `Zotero.nextItem()` — returns the next item object, or `false` when done.
- `Zotero.write(string)` — write to output.
- `Zotero.getOption(name)` — read export options (configured via `displayOptions` in the header metadata).
- `Zotero.nextCollection()` — iterate collections (requires `configOptions: { getCollections: true }` in header).

### Header options for export translators

The metadata header can include:

```json
"configOptions": {
    "async": true,
    "getCollections": true
},
"displayOptions": {
    "exportNotes": true,
    "exportFileData": false
}
```

## Step 4: Create tests

Export tests are not yet supported by the automated test runner. Test manually by exporting items from Zotero and verifying the output format.

## Step 5: Verify and submit

```
npm run lint -- "<Label>.js"
```
