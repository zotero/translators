#!/usr/bin/env node

// Run with: node .bin/check-rdf-creator-fields.mjs
// The normal tester discards unknown fields. Compare raw import results so
// creator containers leaking into item fields are observable before sanitizing.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { parseArgs, REPO_ROOT } from './lib/common.mjs';
import { ensureConnectorBuild, EXTENSION_ID } from './lib/connector.mjs';
import { readTranslator } from './lib/translator-io.mjs';

parseArgs({
	usage: 'node .bin/check-rdf-creator-fields.mjs',
	options: { help: { type: 'boolean', short: 'h' } },
});

const rdf = await readTranslator(path.join(REPO_ROOT, 'RDF.js'));
const ids = ['https://example.com/rdf/bill-3664', 'https://example.com/rdf/program-3664'];
const fixtures = rdf.testCases.filter(test => Array.isArray(test.items)
	&& test.items.some(item => ids.includes(item.itemID)));
assert.equal(fixtures.length, ids.length, 'Missing RDF creator-field fixtures');
assert.deepEqual(fixtures.map(test => test.items[0].itemID).sort(), [...ids].sort());
const extensionDir = await ensureConnectorBuild();
const server = await import('../.ci/pull-request-check/translator-server.mjs');
let context;
let profile;

try {
	await server.serve();
	const served = await fetch(`http://localhost:8085/code/${rdf.header.translatorID}`);
	assert(served.ok && await served.text() === rdf.raw, 'Translator server is serving different RDF.js source');
	profile = await mkdtemp(path.join(tmpdir(), 'zotero-rdf-fields-'));
	// Bundled Chromium supports unpacked extensions in headless mode.
	context = await chromium.launchPersistentContext(profile, {
		channel: 'chromium',
		headless: true,
		args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
	});
	const page = await context.newPage();
	await page.goto(`chrome-extension://${EXTENSION_ID}/tools/testTranslators/testTranslators.html`);
	// Imports run from this page; the background worker's global initialization
	// flag can remain unset even while its translation handlers work.
	await page.waitForFunction(() => !!globalThis.Zotero?.initialized, null, { timeout: 20000 });
	const results = await page.evaluate(async ({ translatorID, fixtures }) => {
		const { TranslatorTester } = await import('./translatorTester.mjs');
		const { ConnectorNonWebTranslationEnvironment } = await import('./translatorTester_environment.mjs');
		const translator = await Zotero.Translators.get(translatorID);
		const environment = new ConnectorNonWebTranslationEnvironment();
		const tester = new TranslatorTester(translator, { nonWebTranslationEnvironment: environment });
		const results = [];
		for (const fixture of fixtures) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(new Error('RDF import timed out')), 15000);
			try {
				const { items, reason } = await environment.runTranslation(fixture, { tester, signal: controller.signal });
				if (!items) throw new Error(reason || 'RDF import returned no items');
				results.push({ expected: fixture.items, actual: items });
			}
			finally {
				clearTimeout(timeout);
			}
		}
		return results;
	}, { translatorID: rdf.header.translatorID, fixtures });
	for (const { expected, actual } of results) {
		try {
			assert.deepEqual(actual, expected);
			console.log(`ok - raw RDF import: ${expected[0].itemType}`);
		}
		catch (error) {
			console.error(error.message);
			process.exitCode = 1;
		}
	}
}
finally {
	if (context) await context.close();
	server.stopServing();
	if (profile) await rm(profile, { recursive: true, force: true });
}
