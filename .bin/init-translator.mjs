#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, resolveTranslator, formatZoteroDate, output, REPO_ROOT } from './lib/common.mjs';

const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates');

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

// Load the template code for a given type. Each type's template lives in its
// own file under templates/ so the develop-*-translator skills can reference
// them directly (e.g. to conform a translator to the template).
async function loadTemplate(type) {
	const body = await fs.readFile(path.join(TEMPLATES_DIR, `${type}.js`), 'utf-8');
	return '\n' + body.trimEnd() + '\n';
}

// Assemble template code
let code = '';
for (const t of types) {
	code += await loadTemplate(t);
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
