#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { parseArgs, REPO_ROOT } from './lib/common.mjs';

const { values, positionals } = parseArgs({
	usage: 'node .bin/capture-har.mjs <url> [--output <file>] [--no-openapi] [--interact] [--filter <pattern>]',
	options: {
		output: { type: 'string', short: 'o' },
		'no-openapi': { type: 'boolean' },
		interact: { type: 'boolean' },
		filter: { type: 'string', short: 'f' },
		wait: { type: 'string', short: 'w' },
		help: { type: 'boolean', short: 'h' },
	},
});

const url = positionals[0];
if (!url) {
	console.error('Error: URL required');
	process.exit(2);
}

// Check for mitmproxy2swagger upfront unless --no-openapi
let hasMitmproxy2swagger = false;
let mitmproxy2swaggerCmd = 'mitmproxy2swagger';
if (!values['no-openapi']) {
	// Try uvx first (preferred), then direct command, then offer install
	for (const cmd of ['uvx mitmproxy2swagger', 'mitmproxy2swagger']) {
		try {
			execSync(`${cmd} --help`, { stdio: 'ignore' });
			hasMitmproxy2swagger = true;
			mitmproxy2swaggerCmd = cmd;
			break;
		}
		catch {}
	}
	if (!hasMitmproxy2swagger) {
		console.error('mitmproxy2swagger is not installed. Install it for API analysis:');
		console.error('  uv tool install mitmproxy2swagger');
		console.error('  # or: pip3 install mitmproxy2swagger');
		console.error('');
		console.error('Without it, you only get a raw HAR file. With it, you get a structured');
		console.error('OpenAPI spec that makes it easy to identify and use the site\'s API.');
		console.error('');
		console.error('Pass --no-openapi to skip this check and capture HAR only.\n');
		process.exit(1);
	}
}

const harDir = path.join(REPO_ROOT, '.tmp', 'har');
await fs.mkdir(harDir, { recursive: true });

const domain = new URL(url).hostname;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const harPath = values.output || path.join(harDir, `${domain}-${timestamp}.har`);
const waitMs = parseInt(values.wait ?? '2000', 10);

console.error(`Capturing HAR for ${url}...`);

let browser;
try {
	browser = await chromium.launch({
		channel: 'chromium',
		headless: !values.interact,
	});

	const context = await browser.newContext({
		recordHar: { path: harPath, mode: 'full' },
	});
	const page = await context.newPage();

	await page.goto(url, { waitUntil: 'networkidle' });
	await new Promise(r => setTimeout(r, waitMs));

	if (values.interact) {
		console.error('Browser is open. Navigate the site to capture more requests.');
		console.error('Close the browser window or press Ctrl+C when done.');
		await new Promise((resolve) => {
			page.on('close', resolve);
			process.on('SIGINT', resolve);
		});
	}

	await context.close(); // finalizes HAR

	console.error(`HAR saved to ${harPath}`);

	// Generate OpenAPI spec with mitmproxy2swagger (default behavior)
	// This is a two-pass process:
	//   Pass 1: mitmproxy2swagger discovers all paths and marks them as ignored
	//   We then un-ignore API-like paths (anything with /api/, .json, .php, etc.)
	//   Pass 2: re-run to generate full schemas for the un-ignored paths
	if (hasMitmproxy2swagger) {
		const openapiPath = harPath.replace(/\.har$/, '.yaml');
		const m2sCmd = `${mitmproxy2swaggerCmd} -i "${harPath}" -o "${openapiPath}" -p "${new URL(url).origin}"`;

		// Pass 1: discover paths
		console.error('Generating OpenAPI spec (pass 1: discovering paths)...');
		execSync(m2sCmd, { stdio: 'pipe' });

		// Un-ignore API-like paths
		let yaml = await fs.readFile(openapiPath, 'utf-8');
		const apiPatterns = /\/(api|graphql|v[0-9]|rest|search|query|data|metadata|json|rpc)\b/i;
		const staticPatterns = /\.(css|js|woff2?|ttf|png|jpg|jpeg|gif|svg|ico|map)(\?|$)/i;
		let unignoredCount = 0;
		yaml = yaml.replace(/^(\s*- )ignore:(\/.*)/gm, (match, prefix, urlPath) => {
			if (staticPatterns.test(urlPath)) return match; // keep static assets ignored
			if (apiPatterns.test(urlPath) || urlPath.includes('.php') || urlPath.includes('.json')) {
				unignoredCount++;
				return `${prefix}${urlPath}`;
			}
			return match;
		});
		await fs.writeFile(openapiPath, yaml, 'utf-8');

		if (unignoredCount > 0) {
			// Pass 2: generate full schemas for un-ignored paths
			console.error(`Generating OpenAPI spec (pass 2: ${unignoredCount} API paths found)...`);
			execSync(m2sCmd, { stdio: 'pipe' });
		}
		else {
			console.error('No obvious API paths found. You may need to manually edit the YAML');
			console.error(`to remove "ignore:" from paths of interest, then re-run:`);
			console.error(`  ${m2sCmd}`);
		}

		console.error(`OpenAPI spec saved to ${openapiPath}`);
		console.log(openapiPath);
	}
	else {
		console.log(harPath);
	}
}
finally {
	if (browser && !values.interact) await browser.close();
}
