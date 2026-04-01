#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { promises as fs } from 'node:fs';
import { chromium } from 'playwright';
import { parseArgs, resolveTranslator, REPO_ROOT } from './lib/common.mjs';
import { ensureConnectorBuild, CONNECTOR_BUILD_DIR, EXTENSION_ID } from './lib/connector.mjs';
import { readTranslator } from './lib/translator-io.mjs';

const CI_DIR = path.join(REPO_ROOT, '.ci', 'pull-request-check');
const BEGIN_TEST_CASES = '/** BEGIN TEST CASES **/';
const END_TEST_CASES = '/** END TEST CASES **/';

const { values, positionals } = parseArgs({
	usage: 'node .bin/create-test.mjs <translator> --url <url> | --input <data> | --search <json>',
	options: {
		url: { type: 'string', short: 'u' },
		input: { type: 'string' },
		search: { type: 'string' },
		'keep-open': { type: 'boolean' },
		'no-write': { type: 'boolean' },
		json: { type: 'boolean' },
		help: { type: 'boolean', short: 'h' },
	},
});

const filename = positionals[0];
if (!filename) {
	console.error('Error: translator filename required');
	process.exit(2);
}
if (!values.url && !values.input && !values.search) {
	console.error('Error: one of --url, --input, or --search is required');
	process.exit(2);
}

const filePath = resolveTranslator(filename);
const translator = await readTranslator(filePath);
if (!translator.header) {
	console.error(`Error: could not parse header of ${filePath}`);
	process.exit(1);
}
const translatorID = translator.header.translatorID;

// Build hash params for createTest mode
const hashParams = new URLSearchParams();
hashParams.set('create', translatorID);
if (values.url) {
	hashParams.set('url', values.url);
}
else if (values.search) {
	hashParams.set('input', values.search);
	hashParams.set('type', 'search');
}
else {
	hashParams.set('input', values.input);
	hashParams.set('type', 'import');
}

// Ensure connector is built
await ensureConnectorBuild();

// Start translator server
const translatorServer = await import(path.join(CI_DIR, 'translator-server.mjs'));
await translatorServer.serve();

let context;
try {
	context = await chromium.launchPersistentContext('', {
		channel: 'chromium',
		headless: !values['keep-open'],
		args: [
			`--disable-extensions-except=${CONNECTOR_BUILD_DIR}`,
			`--load-extension=${CONNECTOR_BUILD_DIR}`,
		],
	});

	const page = await context.newPage();

	page.on('console', msg => {
		if (msg.type() === 'error') {
			console.error(`[browser error] ${msg.text()}`);
		}
	});
	page.on('pageerror', err => {
		console.error(`[page exception] ${err.message}`);
	});

	await new Promise(resolve => setTimeout(resolve, 500));

	const testUrl = `chrome-extension://${EXTENSION_ID}/tools/testTranslators/testTranslators.html#${hashParams.toString()}`;
	await page.goto(testUrl);

	// Wait for page to load
	for (let i = 0; i <= 5; i++) {
		const title = (await page.title()).trim();
		if (title === 'Zotero Translator Tester') break;
		if (i === 5) throw new Error('Failed to load Translator Tester');
		await new Promise(resolve => setTimeout(resolve, 200));
	}

	// Wait for create-test to complete (2 min timeout)
	await page.locator('#create-test-complete')
		.waitFor({ state: 'attached', timeout: 2 * 60 * 1000 });

	const output = await page.evaluate(() => window.createTestOutput);

	if (!output) {
		console.error('Error: no output from createTest');
		process.exit(1);
	}

	if (output.error) {
		console.error(`Error: ${output.error}`);
		process.exit(1);
	}

	// Output the test case
	if (values.json) {
		console.log(JSON.stringify(output, null, '\t'));
	}
	else {
		console.log('Captured test case:');
		console.log(JSON.stringify(output, null, '\t'));
	}

	// Write to translator file
	if (!values['no-write']) {
		const raw = await fs.readFile(filePath, 'utf-8');
		const beginIdx = raw.indexOf(BEGIN_TEST_CASES);
		const endIdx = raw.indexOf(END_TEST_CASES);

		if (beginIdx === -1 || endIdx === -1) {
			console.error('Warning: no test cases block found in translator. Add one first.');
		}
		else {
			// Parse existing test cases
			const tcSection = raw.substring(beginIdx + BEGIN_TEST_CASES.length, endIdx);
			const arrayMatch = tcSection.match(/var\s+testCases\s*=\s*(\[[\s\S]*\])/);
			let testCases = [];
			if (arrayMatch) {
				try { testCases = JSON.parse(arrayMatch[1]); } catch {}
			}

			// Append new test case
			testCases.push(output);

			// Rebuild file
			const before = raw.substring(0, beginIdx);
			const after = raw.substring(endIdx + END_TEST_CASES.length);
			const newTestBlock = `${BEGIN_TEST_CASES}\nvar testCases = ${JSON.stringify(testCases, null, '\t')}\n${END_TEST_CASES}`;
			await fs.writeFile(filePath, before + newTestBlock + after, 'utf-8');

			console.error(`\nTest case appended to ${path.relative(REPO_ROOT, filePath)}`);
		}
	}
}
catch (err) {
	console.error(err.message || err);
	process.exit(1);
}
finally {
	if (!values['keep-open'] && context) await context.close();
	translatorServer.stopServing();
}
