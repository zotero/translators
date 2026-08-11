import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { REPO_ROOT } from './common.mjs';

// Shared browser setup for the .bin tools
const PROFILE_DIR = path.join(REPO_ROOT, '.tmp', 'browser-profile');

const CHALLENGE_TITLE_RE = /just a moment|attention required|verify you are|checking your browser|validate user/i;
const CHALLENGE_TIMEOUT = 5 * 60 * 1000;

const STEALTH_ARGS = ['--disable-blink-features=AutomationControlled'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Headless by default; headed when the user asks (--headed/--interact/--keep-open). Always headless in CI. */
export function resolveHeadless(values = {}) {
	if (process.env.CI) return true;
	return !(values.headed || values.interact || values['keep-open']);
}

/**
 * Launch the browser and return a session handle:
 *   - context: the Playwright BrowserContext
 *   - goto(page, url, { settle }): navigate, waiting out any captcha (headed only)
 *   - close(): shut down
 *
 * Pass `extensionDir` to load an unpacked extension, `recordHar` to capture a HAR.
 */
export async function launchBrowser({ headless = true, extensionDir, recordHar } = {}) {
	const args = [...STEALTH_ARGS];
	const ignoreDefaultArgs = ['--enable-automation'];
	if (extensionDir) {
		// Chrome 137 dropped --load-extension in favour of the CDP call in
		// installExtension(), which needs these two switches. Playwright also
		// adds --disable-extensions unless it sees --load-extension, and that
		// alone makes chrome-extension:// URLs fail ERR_BLOCKED_BY_CLIENT.
		args.push('--enable-unsafe-extension-debugging', '--remote-debugging-port=0');
		ignoreDefaultArgs.push('--disable-extensions');
		await clearExtensionState();
	}
	const context = await launch({
		headless,
		locale: 'en-US',
		args,
		ignoreDefaultArgs,
		...(recordHar ? { recordHar } : {}),
	});
	// Suppressing the flags above doesn't clear navigator.webdriver.
	await context.addInitScript(() => {
		Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => undefined, configurable: true });
	});
	if (extensionDir) await installExtension(extensionDir);
	return {
		context,
		goto: (page, url, opts) => navigate(page, url, { headless, ...opts }),
		close: () => context.close(),
	};
}

/** Real Chrome where it's installed, Playwright's Chromium otherwise (e.g. CI). */
async function launch(options) {
	// Prefer Google Chrome rather than Playwright's bundled Chromium, because
	// Cloudflare challenges Chromium with a captcha that loops and can never
	// be cleared by hand; Chrome loads the same pages immediately
	try {
		return await chromium.launchPersistentContext(PROFILE_DIR, { ...options, channel: 'chrome' });
	}
	catch (e) {
		console.error(`⚠  Couldn't launch Chrome (${e.message.split('\n')[0]}); falling back to Chromium…`);
		return chromium.launchPersistentContext(PROFILE_DIR, { ...options, channel: 'chromium' });
	}
}

/**
 * Install the unpacked extension the way Chrome 137+ requires: connect to the
 * browser's own debugging endpoint and call Extensions.loadUnpacked.
 */
async function installExtension(extensionDir) {
	const portFile = path.join(PROFILE_DIR, 'DevToolsActivePort');
	let port = null;
	for (let i = 0; i < 100 && !port; i++) {
		port = await fs.readFile(portFile, 'utf8').then(text => text.split('\n')[0], () => null);
		if (!port) await sleep(100);
	}
	if (!port) throw new Error('Browser never wrote DevToolsActivePort; cannot load the extension');
	const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
	const session = await browser.newBrowserCDPSession();
	await session.send('Extensions.loadUnpacked', { path: extensionDir });
	await session.detach();
}

/**
 * Remove the extension's cached storage.local and its service worker, which
 * prevent translator changes (without bumping lastUpdated) and Connector
 * service worker changes from taking effect.
 */
async function clearExtensionState() {
	await Promise.all(['Local Extension Settings', 'Service Worker'].map(
		dir => fs.rm(path.join(PROFILE_DIR, 'Default', dir), { recursive: true, force: true })
	));
}

async function navigate(page, url, { headless, settle = 1000 }) {
	await page.goto(url, { waitUntil: 'domcontentloaded' }).catch((e) => {
		// A challenge page can keep the network busy so navigation never settles.
		if (e.name !== 'TimeoutError') throw e;
	});
	// Headed only: pause for the user to clear an anti-bot challenge by hand.
	if (!headless && await isChallenge(page)) {
		await page.bringToFront().catch(() => {});
		console.error('\n⚠  Solve the captcha in the browser window — waiting (up to 5 min)…\n');
		const start = Date.now();
		while (await isChallenge(page)) {
			if (Date.now() - start > CHALLENGE_TIMEOUT) {
				throw new Error('Timed out waiting for the challenge to be solved');
			}
			await sleep(1500);
		}
		console.error('✓  Challenge cleared — continuing.\n');
	}
	if (settle) await sleep(settle);
	return page;
}

async function isChallenge(page) {
	return CHALLENGE_TITLE_RE.test(await page.title().catch(() => ''));
}
