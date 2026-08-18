import { parseArgs as nodeParseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Resolve a translator name/filename to its full path in the repo root.
 * Adds .js extension if not present.
 */
export function resolveTranslator(name) {
	if (!name.endsWith('.js')) name += '.js';
	if (path.isAbsolute(name)) return name;
	return path.join(REPO_ROOT, name);
}

/**
 * Parse CLI args using node:util parseArgs.
 * Wraps with help text generation and error handling.
 */
export function parseArgs(config) {
	const { usage, options, allowPositionals = true } = config;
	try {
		const result = nodeParseArgs({
			options,
			allowPositionals,
			strict: true,
		});
		if (result.values.help) {
			printUsage(usage, options);
			process.exit(0);
		}
		return result;
	}
	catch (err) {
		console.error(`Error: ${err.message}`);
		printUsage(usage, options);
		process.exit(2);
	}
}

function printUsage(usage, options) {
	if (usage) console.error(`\nUsage: ${usage}\n`);
	if (options) {
		console.error('Options:');
		for (const [name, opt] of Object.entries(options)) {
			const flag = opt.short ? `-${opt.short}, --${name}` : `    --${name}`;
			const type = opt.type === 'boolean' ? '' : ` <${opt.type || 'value'}>`;
			console.error(`  ${flag}${type}`);
		}
	}
}

/**
 * Output data as JSON or human-readable depending on --json flag.
 */
export function output(data, jsonMode = false) {
	if (jsonMode) {
		console.log(JSON.stringify(data, null, 2));
	}
	else {
		for (const [key, value] of Object.entries(data)) {
			console.log(`${key}: ${value}`);
		}
	}
}

/**
 * Format a Date as "YYYY-MM-DD HH:MM:SS" in UTC (Zotero lastUpdated format).
 */
export function formatZoteroDate(date = new Date()) {
	const pad = n => String(n).padStart(2, '0');
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} `
		+ `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
