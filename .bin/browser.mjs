#!/usr/bin/env node

import process from 'node:process';
import { parseArgs } from './lib/common.mjs';
import { daemonState, startDaemon, stopDaemon, DEFAULT_IDLE_MINUTES, LOG_FILE } from './lib/persistent.mjs';

// Manage the persistent browser that the other .bin tools attach to whenever
// it's running (or start with --persist). Pages stay loaded between runs, and
// translator tests reuse the tabs they left open instead of reloading them.

const { values, positionals } = parseArgs({
	usage: 'node .bin/browser.mjs start [--headed] [--idle <minutes>] | stop | status',
	options: {
		headed: { type: 'boolean' },
		idle: { type: 'string' },
		help: { type: 'boolean', short: 'h' },
	},
});

const command = positionals[0] ?? 'status';
const state = await daemonState();

switch (command) {
	case 'start': {
		const headless = !values.headed;
		if (state && state.headless === headless) {
			console.log(`Already running (${describe(state)})`);
			break;
		}
		if (state) await stopDaemon();
		const started = await startDaemon({ headless, idleMinutes: Number(values.idle) || DEFAULT_IDLE_MINUTES });
		console.log(`Started (${describe(started)}). Log: ${LOG_FILE}`);
		break;
	}
	case 'stop':
		console.log(await stopDaemon() ? 'Stopped' : 'Not running');
		break;
	case 'status':
		console.log(state ? `Running (${describe(state)})` : 'Not running');
		break;
	default:
		console.error(`Unknown command: ${command}`);
		process.exit(2);
}

function describe(state) {
	return `${state.headless ? 'headless' : 'headed'}, pid ${state.pid}, stops after ${state.idleMinutes} min idle`;
}
