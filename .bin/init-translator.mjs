#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { parseArgs, resolveTranslator, formatZoteroDate, output, REPO_ROOT } from './lib/common.mjs';

const TYPE_BITS = { import: 1, export: 2, web: 4, search: 8 };

const { values, positionals } = parseArgs({
	usage: 'node .bin/init-translator.mjs --label <name> --creator <name> --target <regex> --type <type>',
	options: {
		label: { type: 'string', short: 'l' },
		creator: { type: 'string', short: 'c' },
		target: { type: 'string', short: 't' },
		type: { type: 'string' },
		priority: { type: 'string', short: 'p' },
		'min-version': { type: 'string' },
		json: { type: 'boolean' },
		help: { type: 'boolean', short: 'h' },
	},
});

const label = values.label;
const creator = values.creator;
const target = values.target ?? '';
const typeStr = values.type;
const priority = parseInt(values.priority ?? '100', 10);
const minVersion = values['min-version'] ?? '5.0';

if (!label || !creator || !typeStr) {
	console.error('Error: --label, --creator, and --type are required');
	process.exit(2);
}

// Parse type string into bitmask
const types = typeStr.split(',').map(t => t.trim().toLowerCase());
for (const t of types) {
	if (!(t in TYPE_BITS)) {
		console.error(`Error: unknown type "${t}". Valid types: ${Object.keys(TYPE_BITS).join(', ')}`);
		process.exit(2);
	}
}
const translatorType = types.reduce((mask, t) => mask | TYPE_BITS[t], 0);
const isWeb = types.includes('web');

if (isWeb && !target) {
	console.error('Error: --target is required for web translators');
	process.exit(2);
}

// Generate UUID
const translatorID = crypto.randomUUID();

// Build header
const header = {
	translatorID,
	label,
	creator,
	target,
	minVersion,
	maxVersion: '',
	priority,
	inRepository: true,
	translatorType,
	...(isWeb ? { browserSupport: 'gcsibv' } : {}),
	lastUpdated: formatZoteroDate(),
};

// Build file content
const filePath = resolveTranslator(label);

// Check for collision
try {
	await fs.access(filePath);
	console.error(`Error: file already exists: ${filePath}`);
	process.exit(1);
}
catch {
	// File doesn't exist - good
}

const year = new Date().getUTCFullYear();
const licenseBlock = `
/*
\t***** BEGIN LICENSE BLOCK *****

\tCopyright © ${year} ${creator}

\tThis file is part of Zotero.

\tZotero is free software: you can redistribute it and/or modify
\tit under the terms of the GNU Affero General Public License as published by
\tthe Free Software Foundation, either version 3 of the License, or
\t(at your option) any later version.

\tZotero is distributed in the hope that it will be useful,
\tbut WITHOUT ANY WARRANTY; without even the implied warranty of
\tMERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
\tGNU Affero General Public License for more details.

\tYou should have received a copy of the GNU Affero General Public License
\talong with Zotero. If not, see <http://www.gnu.org/licenses/>.

\t***** END LICENSE BLOCK *****
*/
`;

// Template code based on type
function webTemplate() {
	return `
function detectWeb(doc, url) {
\t// TODO: adjust the logic here
\tif (url.includes('/article/')) {
\t\treturn 'journalArticle';
\t}
\telse if (getSearchResults(doc, true)) {
\t\treturn 'multiple';
\t}
\treturn false;
}

function getSearchResults(doc, checkOnly) {
\tvar items = {};
\tvar found = false;
\t// TODO: adjust the CSS selector
\tvar rows = doc.querySelectorAll('h2 > a[href*="/article/"]');
\tfor (let row of rows) {
\t\tlet href = row.href;
\t\tlet title = ZU.trimInternal(row.textContent);
\t\tif (!href || !title) continue;
\t\tif (checkOnly) return true;
\t\tfound = true;
\t\titems[href] = title;
\t}
\treturn found ? items : false;
}

async function doWeb(doc, url) {
\tif (detectWeb(doc, url) == 'multiple') {
\t\tlet items = await Zotero.selectItems(getSearchResults(doc, false));
\t\tif (!items) return;
\t\tfor (let url of Object.keys(items)) {
\t\t\tawait scrape(await requestDocument(url));
\t\t}
\t}
\telse {
\t\tawait scrape(doc, url);
\t}
}

async function scrape(doc, url = doc.location.href) { // eslint-disable-line no-unused-vars
\t// TODO: implement - use EM, DOI search, API, or DOM scraping
\t// See develop-translator skill for approach guidance
}
`;
}

function importTemplate() {
	return `
function detectImport() {
\t// TODO: read first few lines with Zotero.read() and return true if format matches
\treturn false;
}

async function doImport() {
\t// TODO: read full input with Zotero.read(), parse, create items
\tlet item = new Zotero.Item('journalArticle');
\t// TODO: populate item fields from parsed input
\titem.complete();
}
`;
}

function searchTemplate() {
	return `
function detectSearch(items) { // eslint-disable-line no-unused-vars
\t// TODO: check items for valid search input (e.g. DOI, ISBN)
\treturn false;
}

async function doSearch(item) { // eslint-disable-line no-unused-vars
\t// TODO: perform search and create result items
\tlet newItem = new Zotero.Item('journalArticle');
\t// TODO: populate item fields
\tnewItem.complete();
}
`;
}

function exportTemplate() {
	return `
function doExport() {
\tvar item;
\twhile ((item = Zotero.nextItem())) {
\t\t// TODO: write item in export format
\t\tZotero.write('');
\t}
}
`;
}

// Assemble template code
let code = '';
for (const t of types) {
	switch (t) {
		case 'web': code += webTemplate(); break;
		case 'import': code += importTemplate(); break;
		case 'search': code += searchTemplate(); break;
		case 'export': code += exportTemplate(); break;
	}
}

// Assemble full file
const testCasesBlock = '\n/** BEGIN TEST CASES **/\nvar testCases = [\n]\n/** END TEST CASES **/\n';
const content = JSON.stringify(header, null, '\t') + '\n'
	+ licenseBlock + '\n'
	+ code.trimEnd() + '\n'
	+ testCasesBlock;

await fs.writeFile(filePath, content, 'utf-8');

output({
	file: path.relative(REPO_ROOT, filePath),
	translatorID,
	label,
	type: typeStr,
	translatorType,
}, values.json);
