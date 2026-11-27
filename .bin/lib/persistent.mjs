import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { openSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { REPO_ROOT } from './common.mjs';
import { EXTENSION_ID } from './connector.mjs';
import { installExtension, navigate, sleep } from './browser.mjs';

// A persistent browser lives in a detached process (browser-daemon.mjs) that
// .bin tools attach to over CDP, so reruns skip the launch and translator
// tests reuse the tabs a previous run left open instead of reloading them.

const TMP_DIR = path.join(REPO_ROOT, '.tmp');
export const STATE_FILE = path.join(TMP_DIR, 'browser-daemon.json');
export const LOG_FILE = path.join(TMP_DIR, 'browser-daemon.log');
const DAEMON_SCRIPT = path.join(import.meta.dirname, 'browser-daemon.mjs');
export const DEFAULT_IDLE_MINUTES = 30;

// Tabs kept open for translator tests, as [url, tabId] pairs, oldest first,
// in the extension's session storage
const KEPT_TABS_KEY = 'zoteroKeptTestTabs';
const MAX_KEPT_TABS = 50;

/** The running persistent browser's state ({ pid, port, headless, ... }), or null */
export async function daemonState() {
	let state;
	try {
		state = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
		process.kill(state.pid, 0);
	}
	catch {
		return null;
	}
	return state;
}

export async function startDaemon({ headless = true, idleMinutes = DEFAULT_IDLE_MINUTES } = {}) {
	await fs.mkdir(TMP_DIR, { recursive: true });
	await fs.rm(STATE_FILE, { force: true });
	const log = openSync(LOG_FILE, 'w');
	const child = spawn(process.execPath,
		[DAEMON_SCRIPT, '--idle', String(idleMinutes), ...(headless ? [] : ['--headed'])],
		{ detached: true, stdio: ['ignore', log, log] });
	child.unref();
	let exited = false;
	child.on('exit', () => exited = true);
	for (let i = 0; i < 600 && !exited; i++) {
		const state = await daemonState();
		if (state) return state;
		await sleep(100);
	}
	throw new Error(`The persistent browser failed to start; see ${LOG_FILE}`);
}

export async function stopDaemon() {
	const state = await daemonState();
	if (!state) return false;
	process.kill(state.pid, 'SIGTERM');
	for (let i = 0; i < 100; i++) {
		try {
			process.kill(state.pid, 0);
		}
		catch {
			break;
		}
		await sleep(100);
	}
	await fs.rm(STATE_FILE, { force: true });
	return true;
}

/** Postpone the idle shutdown */
async function touch() {
	const now = new Date();
	await fs.utimes(STATE_FILE, now, now).catch(() => {});
}

/**
 * Start the persistent browser if it isn't running (or restart it headed if
 * it's headless and we need headed) and attach to it. Returns a session like
 * launchBrowser()'s; close() closes only the tabs this session opened.
 */
export async function attach({ headless, extensionDir, fresh }) {
	let state = await daemonState();
	if (state && !headless && state.headless) {
		console.error('Restarting the persistent browser headed…');
		await stopDaemon();
		state = null;
	}
	if (!state) {
		console.error(`Starting a persistent ${headless ? 'headless' : 'headed'} browser`
			+ ` (stops after ${DEFAULT_IDLE_MINUTES} min idle, or run: node .bin/browser.mjs stop)`);
		state = await startDaemon({ headless });
	}
	await touch();

	const browser = await chromium.connectOverCDP(`http://127.0.0.1:${state.port}`);
	const context = browser.contexts()[0];
	const opened = new Set();
	const session = {
		context,
		persistent: true,
		newPage: async () => {
			const page = await newBackgroundPage(browser, context);
			opened.add(page);
			return page;
		},
		// A headed browser can wait out a challenge even if headless was asked for
		goto: (page, url, opts) => navigate(page, url, { headless: state.headless, ...opts }),
		close: async () => {
			await Promise.all([...opened].map(page => page.close().catch(() => {})));
			await touch();
			// Only disconnects: the default context of a CDP connection stays open
			await browser.close();
		},
		/** Make the Translator Tester in `page` reuse tabs across runs (call before navigating it) */
		keepTestTabs: page => page.addInitScript(keepTestTabs, { key: KEPT_TABS_KEY, max: MAX_KEPT_TABS }),
	};
	if (extensionDir) await prepareExtension(session, browser, state, extensionDir, fresh);
	return session;
}

/** Open a tab in the background, so a headed browser doesn't take focus */
async function newBackgroundPage(browser, context) {
	const url = `about:blank#${Math.random().toString(36).slice(2)}`;
	const cdp = await browser.newBrowserCDPSession();
	try {
		const [page] = await Promise.all([
			context.waitForEvent('page', { predicate: p => p.url() === url }),
			cdp.send('Target.createTarget', { url, background: true }),
		]);
		return page;
	}
	finally {
		await cdp.detach().catch(() => {});
	}
}

/**
 * Load the Connector if this browser doesn't have this build of it, then
 * reset its translator cache, which would otherwise keep serving the code
 * from the last run even after the translator file changes.
 */
async function prepareExtension(session, browser, state, extensionDir, fresh) {
	const built = (await fs.stat(path.join(extensionDir, 'manifest.json'))).mtimeMs;
	if (state.extensionDir !== extensionDir || state.extensionBuilt !== built) {
		await installExtension(extensionDir, browser);
		const latest = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
		await fs.writeFile(STATE_FILE, JSON.stringify({ ...latest, extensionDir, extensionBuilt: built }));
		// A reloaded extension can't talk to the content scripts in old tabs
		fresh = true;
	}

	const isOurs = w => w.url().startsWith(`chrome-extension://${EXTENSION_ID}/`);
	let worker = session.context.serviceWorkers().find(isOurs);
	if (!worker) {
		// Any extension page that messages the background wakes it
		const page = await session.newPage();
		[worker] = await Promise.all([
			session.context.waitForEvent('serviceworker', { predicate: isOurs, timeout: 15000 }),
			page.goto(`chrome-extension://${EXTENSION_ID}/tools/testTranslators/testTranslators.html`),
		]);
		await page.close();
	}
	await worker.evaluate(async ({ key, fresh }) => {
		/* global Zotero */
		await Zotero.initDeferred.promise;
		await Zotero.Translators.init();
		const prefix = Zotero.Translators.PREFS_TRANSLATOR_CODE_PREFIX;
		await Zotero.Prefs.clear(Object.keys(Zotero.Prefs.syncStorage).filter(k => k.startsWith(prefix)));
		const metadata = await Zotero.Repo.getTranslatorMetadataFromServer(true);
		Zotero.Translators._load(metadata.filter(Boolean));
		await Zotero.Translators._storeTranslatorMetadata();
		Zotero.Translators._translatorsHash = Zotero.Translators._sortedTranslatorHash = null;

		if (fresh) {
			const kept = (await chrome.storage.session.get(key))[key] ?? [];
			await Promise.all(kept.map(([, id]) => chrome.tabs.remove(id).catch(() => {})));
			await chrome.storage.session.remove(key);
		}
	}, { key: KEPT_TABS_KEY, fresh: !!fresh });
}

/**
 * Runs in the Translator Tester page before its scripts. The tester opens a
 * tab per web test and closes it afterwards; instead, hand back a tab already
 * open at the same URL (from this run or an earlier one), and leave tabs open.
 */
function keepTestTabs({ key, max }) {
	const { tabs, storage } = chrome;
	const create = tabs.create.bind(tabs);
	const remove = tabs.remove.bind(tabs);
	const kept = new Set();

	async function reuseOrCreate(props) {
		if (!/^https?:/.test(props?.url) || props.url.startsWith('http://localhost:8085/')) {
			return create(props);
		}
		let list = (await storage.session.get(key))[key] ?? [];
		const entry = list.find(([url]) => url === props.url);
		list = list.filter(e => e !== entry);
		let tab = entry && await tabs.get(entry[1]).catch(() => null);
		if (!tab) tab = await create(props);
		list.push([props.url, tab.id]);
		while (list.length > max) {
			remove(list.shift()[1]).catch(() => {});
		}
		await storage.session.set({ [key]: list });
		kept.add(tab.id);
		return tab;
	}

	// Accept callbacks too, which browser-polyfill passes
	tabs.create = (props, callback) => {
		const promise = reuseOrCreate(props);
		if (!callback) return promise;
		promise.then(callback, () => callback());
		return undefined;
	};
	tabs.remove = (ids, callback) => {
		const rest = [].concat(ids).filter(id => !kept.has(id));
		const promise = rest.length ? remove(rest) : Promise.resolve();
		if (!callback) return promise;
		promise.then(() => callback(), () => callback());
		return undefined;
	};
}
