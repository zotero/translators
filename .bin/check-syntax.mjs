#!/usr/bin/env node

import vm from 'node:vm';
import { promises as fs } from 'node:fs';
import { parseArgs, resolveTranslator, REPO_ROOT } from './lib/common.mjs';
import { readTranslator } from './lib/translator-io.mjs';

const { values, positionals } = parseArgs({
	usage: 'node .bin/check-syntax.mjs <translator...> [--all-changed]',
	options: {
		'all-changed': { type: 'boolean' },
		json: { type: 'boolean' },
		help: { type: 'boolean', short: 'h' },
	},
});

let files = positionals.map(resolveTranslator);

if (values['all-changed']) {
	const { execSync } = await import('node:child_process');
	try {
		const forkPoint = execSync(
			'git merge-base --fork-point upstream/master HEAD 2>/dev/null || echo HEAD~',
			{ cwd: REPO_ROOT, encoding: 'utf-8' }
		).trim();
		const changed = execSync(
			`git diff --name-only --diff-filter=d ${forkPoint} -- "*.js"`,
			{ cwd: REPO_ROOT, encoding: 'utf-8' }
		).trim();
		if (changed) {
			files = changed.split('\n').map(f => resolveTranslator(f));
		}
	}
	catch {
		console.error('Warning: could not determine changed files, checking positionals only');
	}
}

if (files.length === 0) {
	console.error('No files to check');
	process.exit(2);
}

let hasErrors = false;
const results = [];

for (const filePath of files) {
	const translator = await readTranslator(filePath);
	// Validate everything after the JSON header (code + test cases)
	const code = translator.raw.substring(translator.headerRaw.length);
	const lineOffset = translator.headerLineCount;

	try {
		// Compile the code without executing it.
		// Wrap in a function body to allow top-level return-like patterns
		// and to avoid "use strict" issues with translator globals.
		new vm.Script(code, { filename: filePath });
		results.push({ file: filePath, ok: true });
	}
	catch (err) {
		hasErrors = true;
		// Adjust line number to account for the stripped header
		const match = err.message.match(/^(.*):(\d+)/);
		let message = err.message;
		if (err.lineNumber) {
			const adjustedLine = err.lineNumber + lineOffset;
			message = `Line ${adjustedLine}: ${err.message}`;
		}
		else if (match) {
			message = err.message;
		}
		results.push({ file: filePath, ok: false, error: message });
		if (!values.json) {
			console.error(`FAIL ${filePath}`);
			console.error(`  ${message}`);
		}
	}
}

if (values.json) {
	console.log(JSON.stringify(results, null, 2));
}
else if (!hasErrors) {
	console.log(`OK: ${files.length} file(s) checked`);
}

process.exit(hasErrors ? 1 : 0);
