#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { promises as fs } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { parseArgs, resolveTranslator, REPO_ROOT } from './lib/common.mjs';
import { ensureConnectorBuild, CONNECTOR_BUILD_DIR, EXTENSION_ID } from './lib/connector.mjs';
import { launchBrowser, resolveHeadless } from './lib/browser.mjs';
import { readTranslator, serializeTestCases, normalizeTestCases, replaceTestCase } from './lib/translator-io.mjs';

const CI_DIR = path.join(REPO_ROOT, '.ci', 'pull-request-check');
const BEGIN_TEST_CASES = '/** BEGIN TEST CASES **/';
const END_TEST_CASES = '/** END TEST CASES **/';

const { values, positionals } = parseArgs({
	usage: 'node .bin/create-test.mjs <translator> --url <url> | --input <data> | --search <json> [--update [--index <n>]]',
	options: {
		url: { type: 'string', short: 'u' },
		input: { type: 'string' },
		search: { type: 'string' },
		'keep-open': { type: 'boolean' },
		'no-write': { type: 'boolean' },
		update: { type: 'boolean' },
		index: { type: 'string' },
		json: { type: 'boolean' },
		headed: { type: 'boolean' },
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

// With --update, find the existing test to replace before doing any work
let updateIndex = null;
if (values.update) {
	updateIndex = findTestToUpdate(translator.testCases);
}
else if (values.index) {
	console.error('Error: --index requires --update');
	process.exit(2);
}

function findTestToUpdate(testCases) {
	if (values.index) {
		const index = parseInt(values.index, 10) - 1;
		if (!testCases[index]) {
			console.error(`Error: no test case ${values.index} (translator has ${testCases.length})`);
			process.exit(2);
		}
		return index;
	}
	const search = values.search ? JSON.parse(values.search) : null;
	const matches = testCases
		.map((testCase, index) => ({ testCase, index }))
		.filter(({ testCase }) => {
			if (values.url) return testCase.type === 'web' && testCase.url === values.url;
			if (search) return testCase.type === 'search' && isDeepStrictEqual(testCase.input, search);
			return testCase.type === 'import' && testCase.input === values.input;
		});
	if (matches.length === 1) return matches[0].index;
	if (!matches.length) {
		console.error('Error: no existing test case matches; pass --index <n> or drop --update to append');
	}
	else {
		console.error(`Error: test cases ${matches.map(m => m.index + 1).join(', ')} all match; pick one with --index <n>`);
	}
	process.exit(2);
}

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

let session;
try {
	const headless = resolveHeadless(values);
	session = await launchBrowser({ headless, extensionDir: CONNECTOR_BUILD_DIR });
	const context = session.context;

	// Open the tester's tab first, so the warmup below isn't the browser's only tab
	const page = await session.newPage();

	// When headed (--headed/--keep-open), pre-warm the target site in a real tab
	// first: this lets the user clear any anti-bot challenge by hand, and seeds
	// cookies so the connector's own background fetches get through.
	if (!headless && values.url) {
		const warmup = await session.newPage();
		await session.goto(warmup, values.url);
		await warmup.close();
	}

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

	const testCase = normalizeTestCases([output])[0];

	// Output the test case
	if (values.json) {
		console.log(JSON.stringify(testCase, null, '\t'));
	}
	else {
		console.log('Captured test case:');
		console.log(JSON.stringify(testCase, null, '\t'));
	}

	// Write to translator file
	if (!values['no-write']) {
		const raw = await fs.readFile(filePath, 'utf-8');
		const beginIdx = raw.indexOf(BEGIN_TEST_CASES);
		const endIdx = raw.indexOf(END_TEST_CASES);

		if (beginIdx === -1 || endIdx === -1) {
			console.error('Warning: no test cases block found in translator. Add one first.');
		}
		else if (updateIndex !== null) {
			// Keep top-level keys the tester doesn't produce (e.g. "defer")
			const updated = { ...translator.testCases[updateIndex], ...testCase };
			await fs.writeFile(filePath, replaceTestCase(raw, updateIndex, updated), 'utf-8');
			console.error(`\nTest case ${updateIndex + 1} replaced in ${path.relative(REPO_ROOT, filePath)}`);
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
			testCases.push(testCase);

			// Rebuild file
			const before = raw.substring(0, beginIdx);
			const after = raw.substring(endIdx + END_TEST_CASES.length);
			const newTestBlock = serializeTestCases(testCases);
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
	if (!values['keep-open'] && session) await session.close();
	translatorServer.stopServing();
}
