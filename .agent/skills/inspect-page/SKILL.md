---
name: inspect-page
description: Inspect a live web page using headless Chrome. Gets screenshots, meta tags, accessibility tree, and runs CSS selectors or JS expressions against the rendered DOM.
---

## When to use

Use this instead of fetching pages with WebFetch or curl. This tool opens the page in a real browser, executes JavaScript, and gives you the rendered result.

Useful for:
- Seeing what metadata tags a site embeds (to decide if EM-based approach works)
- Understanding page structure via the accessibility tree
- Testing CSS selectors against the live DOM
- Evaluating JS expressions to extract data

## Basic usage (screenshot + meta + accessibility tree)

```
node .bin/inspect-page.mjs "<url>"
```

With no flags, this outputs:
1. **Screenshot** (saved as PNG - read it to see the page visually)
2. **Meta tags** (all `<meta>`, JSON-LD, COinS)
3. **Accessibility tree** (structured representation of the rendered page)

## Query the DOM

Test CSS selectors:

```
node .bin/inspect-page.mjs "<url>" --selector "h1" --selector "article .author"
```

Returns tag, text content, href, and attributes for up to 20 matching elements.

## Evaluate JS

Run arbitrary expressions against the rendered page:

```
node .bin/inspect-page.mjs "<url>" --eval "document.querySelector('h1').textContent"
```

## Interactive mode

Open a headed browser you can interact with:

```
node .bin/inspect-page.mjs "<url>" --interact
```
