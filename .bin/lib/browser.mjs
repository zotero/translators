import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { REPO_ROOT } from './common.mjs';

// Shared Chromium setup for the .bin tools.
//
// We run headless by default. Pass `headless: false` (the tools expose this via
// --headed, and the interactive --interact/--keep-open flags) to get a visible
// window — the backup for sites behind an anti-bot wall, where you can solve the
// captcha by hand. The profile is reused across runs so a solved challenge carries
// over to the next run.
const PROFILE_DIR = path.join(REPO_ROOT, '.tmp', 'browser-profile');

const CHALLENGE_TITLE_RE = /just a moment|attention required|verify you are|checking your browser/i;
const CHALLENGE_TIMEOUT = 5 * 60 * 1000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Headless by default; headed when the user asks (--headed/--interact/--keep-open). Always headless in CI. */
export function resolveHeadless(values = {}) {
	if (process.env.CI) return true;
	return !(values.headed || values.interact || values['keep-open']);
}

/**
 * Launch Chromium and return a session handle:
 *   - context: the Playwright BrowserContext
 *   - goto(page, url, { settle }): navigate, waiting out any captcha (headed only)
 *   - close(): shut down
 *
 * Pass `extensionDir` to load an unpacked extension, `recordHar` to capture a HAR.
 */
export async function launchBrowser({ headless = true, extensionDir, recordHar } = {}) {
	const args = extensionDir
		? [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`]
		: [];
	const context = await chromium.launchPersistentContext(PROFILE_DIR, {
		channel: 'chromium',
		headless,
		args,
		...(recordHar ? { recordHar } : {}),
	});
	return {
		context,
		goto: (page, url, opts) => navigate(page, url, { headless, ...opts }),
		close: () => context.close(),
	};
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
