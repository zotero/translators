#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { parseArgs, REPO_ROOT } from './lib/common.mjs';

const { values, positionals } = parseArgs({
	usage: 'node .bin/inspect-page.mjs <url> [--selector <css>] [--meta] [--screenshot] [--accessibility] [--eval <js>]',
	options: {
		selector: { type: 'string', short: 's', multiple: true },
		meta: { type: 'boolean', short: 'm' },
		screenshot: { type: 'boolean' },
		accessibility: { type: 'boolean', short: 'a' },
		eval: { type: 'string', short: 'e', multiple: true },
		wait: { type: 'string', short: 'w' },
		interact: { type: 'boolean' },
		help: { type: 'boolean', short: 'h' },
	},
});

const url = positionals[0];
if (!url) {
	console.error('Error: URL required');
	process.exit(2);
}

// Default: screenshot + meta + accessibility if nothing specified
const hasExplicitMode = values.selector || values.meta || values.screenshot
	|| values.accessibility || values.eval;
const doScreenshot = values.screenshot || !hasExplicitMode;
const doMeta = values.meta || !hasExplicitMode;
const doAccessibility = values.accessibility || !hasExplicitMode;

const waitMs = parseInt(values.wait ?? '2000', 10);

let browser;
try {
	browser = await chromium.launch({
		channel: 'chromium',
		headless: !values.interact,
	});

	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	await page.goto(url, { waitUntil: 'networkidle' });
	await new Promise(r => setTimeout(r, waitMs));

	if (values.interact) {
		console.error('Browser is open. Press Ctrl+C when done inspecting.');
		await new Promise((resolve) => {
			page.on('close', resolve);
			process.on('SIGINT', resolve);
		});
		await browser.close();
		process.exit(0);
	}

	// Screenshot
	if (doScreenshot) {
		const outDir = path.join(REPO_ROOT, '.tmp');
		await fs.mkdir(outDir, { recursive: true });
		const domain = new URL(url).hostname;
		const screenshotPath = path.join(outDir, `${domain}-screenshot.png`);
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`Screenshot: ${screenshotPath}`);
	}

	// Meta tags
	if (doMeta) {
		const metas = await page.evaluate(() => {
			const results = {};
			// Standard meta tags
			for (const el of document.querySelectorAll('meta[name], meta[property]')) {
				const key = el.getAttribute('name') || el.getAttribute('property');
				const val = el.getAttribute('content');
				if (key && val) {
					if (results[key]) {
						if (!Array.isArray(results[key])) results[key] = [results[key]];
						results[key].push(val);
					}
					else results[key] = val;
				}
			}
			// JSON-LD
			const jsonld = [];
			for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
				try { jsonld.push(JSON.parse(el.textContent)); } catch {}
			}
			if (jsonld.length) results['__jsonld'] = jsonld;
			// Title
			results['__title'] = document.title;
			// COinS
			const coins = [];
			for (const el of document.querySelectorAll('span.Z3988')) {
				coins.push(el.getAttribute('title'));
			}
			if (coins.length) results['__coins'] = coins;
			return results;
		});
		console.log('\n=== Meta Tags ===');
		console.log(JSON.stringify(metas, null, 2));
	}

	// Accessibility tree
	if (doAccessibility) {
		const snapshot = await page.accessibility.snapshot();
		console.log('\n=== Accessibility Tree ===');
		printAccessibilityTree(snapshot, 0);
	}

	// CSS selectors
	if (values.selector) {
		for (const sel of values.selector) {
			console.log(`\n=== querySelector: ${sel} ===`);
			const results = await page.evaluate((sel) => {
				const els = document.querySelectorAll(sel);
				return Array.from(els).slice(0, 20).map(el => ({
					tag: el.tagName.toLowerCase(),
					text: el.textContent?.trim().slice(0, 200),
					href: el.href || undefined,
					src: el.src || undefined,
					attrs: Object.fromEntries(
						Array.from(el.attributes)
							.filter(a => !['class', 'style'].includes(a.name))
							.map(a => [a.name, a.value.slice(0, 100)])
					),
				}));
			}, sel);
			console.log(JSON.stringify(results, null, 2));
		}
	}

	// Eval
	if (values.eval) {
		for (const expr of values.eval) {
			console.log(`\n=== eval: ${expr} ===`);
			const result = await page.evaluate(expr);
			console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
		}
	}
}
finally {
	if (browser && !values.interact) await browser.close();
}

function printAccessibilityTree(node, depth) {
	if (!node) return;
	const indent = '  '.repeat(depth);
	const parts = [node.role];
	if (node.name) parts.push(`"${node.name.slice(0, 120)}"`);
	if (node.value) parts.push(`value="${node.value.slice(0, 80)}"`);
	// Skip generic/none nodes with no useful info
	if (node.role !== 'none' && node.role !== 'generic' || node.name) {
		console.log(`${indent}${parts.join(' ')}`);
	}
	if (node.children) {
		for (const child of node.children) {
			printAccessibilityTree(child, depth + (node.role !== 'none' && node.role !== 'generic' ? 1 : 0));
		}
	}
}
