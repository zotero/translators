#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { parseArgs, resolveTranslator, REPO_ROOT } from './lib/common.mjs';
import { ensureConnectorBuild, CONNECTOR_BUILD_DIR, EXTENSION_ID } from './lib/connector.mjs';
import { launchBrowser, resolveHeadless } from './lib/browser.mjs';

const CI_DIR = path.join(REPO_ROOT, '.ci', 'pull-request-check');

const { values, positionals } = parseArgs({
	usage: 'node .bin/run-tests.mjs <translator...> [--json] [--keep-open] [--headed] [--no-dependents]',
	options: {
		json: { type: 'boolean' },
		'keep-open': { type: 'boolean' },
		'no-dependents': { type: 'boolean' },
		'rebuild-connector': { type: 'boolean' },
		headed: { type: 'boolean' },
		help: { type: 'boolean', short: 'h' },
	},
});

if (positionals.length === 0) {
	console.error('Error: at least one translator filename required');
	process.exit(2);
}

// Ensure connector is built with correct config (localhost:8085 repo URL)
const extensionDir = await ensureConnectorBuild({ rebuild: values['rebuild-connector'] });

// Start translator server (serves translator metadata + code on localhost:8085)
const translatorServer = await import(path.join(CI_DIR, 'translator-server.mjs'));
await translatorServer.serve();

// Resolve filenames to translator IDs
let toTestIDs = new Set();
let toTestNames = new Set();
let changedIDs = [];

for (const filename of positionals) {
	const basename = path.basename(filename.endsWith('.js') ? filename : filename + '.js');
	const translator = translatorServer.filenameToTranslator[basename];
	if (!translator) {
		console.error(`Warning: translator '${basename}' not found`);
		continue;
	}
	if (translator.metadata === null) {
		console.error(`Error: translator '${basename}' has invalid metadata`);
		continue;
	}
	changedIDs.push(translator.metadata.translatorID);
	toTestIDs.add(translator.metadata.translatorID);
	toTestNames.add(translator.metadata.label);
}

// Find dependent translators (unless --no-dependents)
if (!values['no-dependents'] && changedIDs.length > 0) {
	const changedRe = new RegExp(changedIDs.join('|'));
	for (const translator of translatorServer.translators) {
		if (!translator.metadata) continue;
		if (!changedRe.test(translator.content)) continue;
		toTestIDs.add(translator.metadata.translatorID);
		toTestNames.add(translator.metadata.label);
		if (toTestIDs.size >= 10) break;
	}
}

if (toTestIDs.size === 0) {
	console.error('No translators to test');
	translatorServer.stopServing();
	process.exit(2);
}

console.error(`Testing: ${Array.from(toTestNames).join(', ')}`);

// Launch browser with extension
const headless = resolveHeadless(values);
let session;
let allPassed = false;

try {
	session = await launchBrowser({ headless, extensionDir });
	const context = session.context;

	const page = await context.newPage();

	// Surface browser-side errors
	page.on('console', msg => {
		if (msg.type() === 'error') {
			console.error(`[browser error] ${msg.text()}`);
		}
	});
	page.on('pageerror', err => {
		console.error(`[page exception] ${err.message}`);
	});

	// Headed only: pre-warm each site in a real tab so a human can solve any
	// anti-bot challenge. Cookies set here are shared with the connector's own
	// background requests. (Pointless headless, where nobody can solve a captcha.)
	if (!headless) {
		const warmup = await context.newPage();
		for (const warmupUrl of collectWarmupUrls(positionals, translatorServer)) {
			try {
				await session.goto(warmup, warmupUrl);
			}
			catch (e) {
				console.error(`[warmup] ${warmupUrl}: ${e.message}`);
			}
		}
		await warmup.close();
	}

	const translatorsToTest = Array.from(toTestIDs);
	await new Promise(resolve => setTimeout(resolve, 500));

	const testUrl = `chrome-extension://${EXTENSION_ID}/tools/testTranslators/testTranslators.html#translators=${translatorsToTest.join(',')}`;
	await page.goto(testUrl);

	// Wait for page to load
	for (let i = 0; i <= 5; i++) {
		const title = (await page.title()).trim();
		if (title === 'Zotero Translator Tester') break;
		if (i === 5) {
			throw new Error('Failed to load Translator Tester extension page');
		}
		await new Promise(resolve => setTimeout(resolve, 200));
	}

	// Wait for tests to complete (5 min timeout)
	await page.locator('#translator-tests-complete')
		.waitFor({ state: 'attached', timeout: 5 * 60 * 1000 });

	const testResults = await page.evaluate(() => window.seleniumOutput);

	if (values.json) {
		console.log(JSON.stringify(testResults, null, 2));
	}

	allPassed = report(testResults, translatorsToTest, values.json);
}
catch (err) {
	console.error(err.message || err);
}
finally {
	if (!values['keep-open']) {
		if (session) await session.close();
	}
	translatorServer.stopServing();
	if (!values.json) {
		console.log(allPassed ? '\nAll tests passed' : '\nSome tests failed');
	}
	process.exit(allPassed ? 0 : 1);
}

// Pull one representative test-case URL per origin out of the translators under
// test, for pre-warming. Capped so multi-site translators don't open dozens of tabs.
function collectWarmupUrls(filenames, server) {
	const byOrigin = new Map();
	for (const filename of filenames) {
		const basename = path.basename(filename.endsWith('.js') ? filename : filename + '.js');
		const translator = server.filenameToTranslator[basename];
		if (!translator) {
			continue;
		}
		for (const [, url] of translator.content.matchAll(/"url":\s*"(https?:\/\/[^"]+)"/g)) {
			try {
				const { origin } = new URL(url);
				if (!byOrigin.has(origin)) {
					byOrigin.set(origin, url);
				}
			}
			catch {
				// skip unparseable URLs
			}
		}
	}
	return [...byOrigin.values()].slice(0, 5);
}

function report(results, translatorsToTest, jsonMode) {
	if (jsonMode) {
		return Object.values(results).every(r =>
			!r.message.match(/^Test \d+: failed/m)
		);
	}

	if (Object.keys(results).length < translatorsToTest.length) {
		console.log('Warning: tests for some translators did not run');
	}

	let allPassed = true;
	for (const translatorID in results) {
		const translatorResults = results[translatorID];
		console.log(`\n=== ${translatorResults.label} (${translatorID}) ===`);
		const output = translatorResults.message.split('\n');
		for (const line of output) {
			if (/^Running \d+ tests? for/.test(line)) {
				console.log(`  ${line}`);
			}
			else if (line.match(/^-/)) {
				console.log(`  \x1b[31m${line}\x1b[0m`);
			}
			else if (line.match(/^\+/)) {
				console.log(`  \x1b[32m${line}\x1b[0m`);
			}
			else if (line.match(/^Test \d+: succeeded/)) {
				console.log(`  \x1b[32m${line}\x1b[0m`);
			}
			else if (line.match(/^Test \d+: failed/)) {
				console.log(`  \x1b[31m${line}\x1b[0m`);
				allPassed = false;
			}
			else if (line.trim()) {
				console.log(`  ${line}`);
			}
		}
	}

	return allPassed;
}
