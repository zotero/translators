---
name: capture-api
description: Analyze a website's API by capturing network traffic (HAR) and generating an OpenAPI spec via mitmproxy2swagger.
---

## When to use

Most modern sites load bibliographic data via JavaScript API calls, not in the static HTML. Since translators receive a static DOM copy, you need to identify and replicate those API calls using `requestJSON()`, `requestText()`, or `requestDocument()`.

## Capture and analyze

```
node .bin/capture-har.mjs "<url>"
```

This captures all network traffic via headless Chrome and generates an OpenAPI spec using mitmproxy2swagger. The tool requires mitmproxy2swagger and will prompt to install it if missing (`uv tool install mitmproxy2swagger`).

The tool automatically runs two passes: first to discover all paths, then to generate full request/response schemas for API-like paths.

**Read the output YAML file.** It contains everything you need: endpoint paths, HTTP methods, query parameters, and complete response schemas with field names and types. Do NOT go back to the raw HAR file - the YAML is the authoritative, structured output. Use it directly to understand the API and write your translator.

If the tool reports "No obvious API paths found", edit the YAML to remove the `ignore:` prefix from paths you're interested in, then re-run the command.

Options:
- `--interact`: Open a headed browser so you can click around the site before capturing.
- `--no-openapi`: Skip mitmproxy2swagger and just save the raw HAR file.

## Use the discovered API in your translator

Once you identify the relevant API endpoints:

1. Determine how to construct the API URL from the page URL (e.g. extracting an article ID).
2. Use `requestJSON()` to call the API directly in `scrape()`.
3. Map the API response fields to Zotero item fields.

```js
async function scrape(doc, url) {
    let articleId = url.match(/\/article\/(\d+)/)[1];
    let data = await requestJSON(`https://api.example.com/articles/${articleId}`);
    let item = new Zotero.Item('journalArticle');
    item.title = data.title;
    // ... map other fields ...
    item.complete();
}
```
