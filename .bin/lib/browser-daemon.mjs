// The persistent browser's process, started detached by persistent.mjs.
// Holds the browser open until stopped, closed, or idle.

import fs from 'node:fs/promises';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { launchBrowser, debuggingPort } from './browser.mjs';
import { STATE_FILE } from './persistent.mjs';

const { values } = parseArgs({
	options: {
		headed: { type: 'boolean' },
		idle: { type: 'string' },
	},
});
const headless = !values.headed;
const idleMinutes = Number(values.idle) || 30;

const session = await launchBrowser({ headless, daemon: true });
const port = await debuggingPort();
await fs.writeFile(STATE_FILE, JSON.stringify({ pid: process.pid, port, headless, idleMinutes }));
console.log(`Persistent ${headless ? 'headless' : 'headed'} browser on port ${port}`);

let stopping = false;
async function shutdown(reason) {
	if (stopping) return;
	stopping = true;
	console.log(`Shutting down: ${reason}`);
	// Only remove the state file if it's still ours
	const state = await fs.readFile(STATE_FILE, 'utf8').then(JSON.parse, () => null);
	if (state?.pid === process.pid) await fs.rm(STATE_FILE, { force: true });
	await session.close().catch(() => {});
	process.exit(0);
}

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
	process.on(signal, () => shutdown(signal));
}
session.context.on('close', () => shutdown('browser closed'));

// Clients touch the state file whenever they attach or detach
setInterval(async () => {
	const stat = await fs.stat(STATE_FILE).catch(() => null);
	if (!stat) return shutdown('state file removed');
	if (Date.now() - stat.mtimeMs > idleMinutes * 60 * 1000) shutdown('idle');
}, 30 * 1000);
