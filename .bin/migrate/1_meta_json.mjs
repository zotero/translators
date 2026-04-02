#!/usr/bin/env node

/**
 * Separate translator metadata from translator code/tests.
 * Code stays in {Name}.js, and metadata is written to {Name}.meta.json.
 * Also removes lastUpdated from the output metadata.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs, REPO_ROOT } from '../lib/common.mjs';
import { readTranslator } from '../lib/translator-io.mjs';

const { values, positionals } = parseArgs({
	usage: 'node .bin/migrate/1_meta_json.mjs [translator ...] [--dry-run]',
	options: {
		'dry-run': { type: 'boolean', short: 'n' },
		help: { type: 'boolean', short: 'h' },
	},
});

const dryRun = values['dry-run'];

let files;
if (positionals.length > 0) {
	files = positionals.map((f) => {
		if (!f.endsWith('.js')) f += '.js';
		return path.isAbsolute(f) ? f : path.join(REPO_ROOT, f);
	});
}
else {
	// All .js files in repo root that don't already have a .meta.json
	const entries = await fs.readdir(REPO_ROOT);
	files = [];
	for (const entry of entries) {
		if (!entry.endsWith('.js')) continue;
		const metaPath = entry.replace(/\.js$/, '.meta.json');
		if (entries.includes(metaPath)) continue;
		files.push(path.join(REPO_ROOT, entry));
	}
}

let migrated = 0;
let skipped = 0;
let errors = 0;

for (const filePath of files) {
	const rel = path.relative(REPO_ROOT, filePath);
	let translator;
	try {
		translator = await readTranslator(filePath);
	}
	catch (err) {
		console.error(`ERROR ${rel}: ${err.message}`);
		errors++;
		continue;
	}

	if (!translator.header) {
		console.error(`SKIP  ${rel}: no valid JSON header`);
		skipped++;
		continue;
	}

	const metaPath = filePath.replace(/\.js$/, '.meta.json');
	// lastUpdated has been removed
	delete translator.header.lastUpdated;
	const metaJSON = JSON.stringify(translator.header, null, '\t') + '\n';
	const stripped = translator.raw.substring(translator.headerRaw.length).replace(/^\n/, '');

	if (dryRun) {
		console.log(`WOULD ${rel}`);
	}
	else {
		await fs.writeFile(metaPath, metaJSON, 'utf-8');
		await fs.writeFile(filePath, stripped, 'utf-8');
		console.log(`OK    ${rel}`);
	}
	migrated++;
}

console.log(`\n${dryRun ? 'Would migrate' : 'Migrated'}: ${migrated}  Skipped: ${skipped}  Errors: ${errors}`);
