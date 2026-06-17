#!/usr/bin/env node

import path from 'node:path';
import { parseArgs, resolveTranslator, formatZoteroDate, output, REPO_ROOT } from './lib/common.mjs';
import { readTranslator, updateHeader } from './lib/translator-io.mjs';

const { values, positionals } = parseArgs({
	usage: 'node .bin/update-metadata.mjs <translator> [--set key=value] [--no-timestamp]',
	options: {
		set: { type: 'string', multiple: true, short: 's' },
		'no-timestamp': { type: 'boolean' },
		json: { type: 'boolean' },
		help: { type: 'boolean', short: 'h' },
	},
});

const filename = positionals[0];
if (!filename) {
	console.error('Error: translator filename required');
	process.exit(2);
}

const filePath = resolveTranslator(filename);

// Build updates
const updates = {};

// Default: update lastUpdated unless --no-timestamp
if (!values['no-timestamp']) {
	updates.lastUpdated = formatZoteroDate();
}

// Parse --set key=value pairs
if (values.set) {
	for (const pair of values.set) {
		const eqIdx = pair.indexOf('=');
		if (eqIdx === -1) {
			console.error(`Error: --set requires key=value format, got "${pair}"`);
			process.exit(2);
		}
		const key = pair.substring(0, eqIdx);
		let value = pair.substring(eqIdx + 1);

		// Auto-parse numbers and booleans
		if (value === 'true') value = true;
		else if (value === 'false') value = false;
		else if (/^\d+$/.test(value)) value = parseInt(value, 10);

		updates[key] = value;
	}
}

if (Object.keys(updates).length === 0) {
	console.error('Nothing to update (did you pass --no-timestamp with no --set?)');
	process.exit(2);
}

const updatedHeader = await updateHeader(filePath, updates);

output({
	file: path.relative(REPO_ROOT, filePath),
	...updates,
}, values.json);
