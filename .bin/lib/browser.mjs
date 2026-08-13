import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { REPO_ROOT } from './common.mjs';

// Shared browser setup for the .bin tools
const PROFILE_DIR = path.join(REPO_ROOT, '.tmp', 'browser-profile');

const CHALLENGE_TIMEOUT = 5 * 60 * 1000;

// Titles that only ever appear on an anti-bot interstitial
const CHALLENGE_TITLE_RE = /just a moment|attention required|verify you are|checking your browser|validate user|access check/i;
// Wording that offers the visitor something to solve. Only sufficient on a page
// that's otherwise low on text.
const CHALLENGE_TEXT_RE = /\bcaptcha\b|(?:verify|prove) (?:that )?(?:you are|you're|you) (?:a )?human|checking (?:if )?(?:your|the) (?:browser|connection|site connection)|enable javascript and cookies|complete the security check|(?:enter|type) the (?:characters|letters|code)|(?:i am|i'm) not a robot|are you a robot|security of your connection/i;
// Statuses the anti-bot vendors serve their interstitials and blocks with
const BLOCKED_STATUSES = new Set([403, 418, 429, 503]);

// Captcha widgets - we check iframe/script URLs and container elements
const VENDORS = [
	{ name: 'Cloudflare Turnstile', url: 'challenges\\.cloudflare\\.com', sel: '.cf-turnstile' },
	{ name: 'reCAPTCHA', url: '(?:google\\.com|recaptcha\\.net)/recaptcha', sel: '.g-recaptcha, #g-recaptcha' },
	{ name: 'hCaptcha', url: '\\bhcaptcha\\.com', sel: '.h-captcha' },
	{ name: 'Arkose FunCaptcha', url: 'arkoselabs\\.com|funcaptcha', sel: '#arkose, #funcaptcha' },
	{ name: 'DataDome', url: 'captcha-delivery\\.com', sel: '' },
	{ name: 'PerimeterX', url: 'px-cdn\\.net|px-cloud\\.net|perimeterx', sel: '#px-captcha' },
	{ name: 'Imperva', url: '_Incapsula_Resource', sel: '' },
	{ name: 'AWS WAF', url: 'awswaf\\.com', sel: '#captcha-container' },
	{ name: 'Kasada', url: 'kasada|kpsdk', sel: '' },
];
// Last main-frame navigation response per page, kept fresh across reloads so the
// wait loop can still see the status after the initial goto() has returned.
const lastResponses = new WeakMap();

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
 *   - goto(page, url, { settle, quiet }): navigate, waiting out any captcha
 *     (headed only), and return whatever anti-bot wall hasn't cleared
 *     afterwards (see detectChallenge()) or null if the page came through.
 *     `quiet` leaves reporting the wall to the caller.
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

async function navigate(page, url, { headless, settle = 1000, quiet = false }) {
	trackResponses(page);
	await page.goto(url, { waitUntil: 'domcontentloaded' }).catch((e) => {
		// A challenge page can keep the network busy so navigation never settles.
		if (e.name !== 'TimeoutError') throw e;
	});
	let detected = await detectChallenge(page);
	if (detected?.kind === 'block') {
		if (!quiet) {
			console.error(`\n⚠  ${url}\n   ${detected.description}: the site is refusing`
				+ ' automated requests. Waiting a while, or a different network, may help.\n');
		}
	}
	else if (detected && headless) {
		if (!quiet) {
			console.error(`\n⚠  ${url}\n   ${detected.description} — headless Chrome can't get`
				+ ' past this. Re-run with --headed to solve it by hand.\n');
		}
	}
	else if (detected) {
		await page.bringToFront().catch(() => {});
		console.error(`\n⚠  ${detected.description} — solve it in the browser window. Waiting up to 5 min…\n`);
		const start = Date.now();
		// Two clear checks in a row: one evaluate can fail mid-reload as the
		// challenge hands off to the real page
		let clear = 0;
		while (clear < 2) {
			await sleep(1500);
			clear = (await detectChallenge(page))?.kind === 'challenge' ? 0 : clear + 1;
			if (Date.now() - start > CHALLENGE_TIMEOUT) {
				throw new Error('Timed out waiting for the challenge to be solved');
			}
		}
		console.error('✓  Challenge cleared! Continuing.\n');
		detected = null;
	}
	if (settle) await sleep(settle);
	return detected;
}

/** Record the main-frame navigation response so detectChallenge() can see its status. */
function trackResponses(page) {
	if (lastResponses.has(page)) return;
	lastResponses.set(page, {});
	page.on('response', (res) => {
		if (res.frame() !== page.mainFrame() || !res.request().isNavigationRequest()) return;
		lastResponses.set(page, { status: res.status(), headers: res.headers() });
	});
}

/**
 * Is the page an anti-bot wall rather than the content we asked for? Returns
 * `{ kind, description }` - kind 'challenge' when a human could clear it,
 * 'block' when the site is simply refusing us - or null for an ordinary page.
 *
 * The tell isn't the captcha by itself, since plenty of ordinary pages
 * might have one embedded alongside a login or comment form, but rather
 * a captcha that is clearly the main element on the page: a visible,
 * centered widget with almost nothing around it. So a widget only counts
 * alongside a bare page, and a bare page counts alongside an interstitial's
 * wording or its HTTP status. That keeps nonessential captchas (which
 * accompany fields to fill and a page full of content) from being treated
 * as challenges.
 */
export async function detectChallenge(page) {
	const challenge = description => ({ kind: 'challenge', description });
	if (CHALLENGE_TITLE_RE.test(await page.title().catch(() => ''))) return challenge('Anti-bot challenge');
	const { status, headers = {} } = lastResponses.get(page) ?? {};
	if (headers['cf-mitigated'] === 'challenge') return challenge('Cloudflare challenge');

	const probe = await probePage(page);
	if (!probe) return null;
	const blocked = BLOCKED_STATUSES.has(status);
	if (probe.widget && (probe.bare || blocked)) return challenge(`${probe.widget.vendor} captcha`);
	if (!probe.bare) return null;
	if (probe.challengeText) {
		// A vendor may be running in a frame whose wrapper we can't identify
		const vendor = VENDORS.find(v => page.frames().some(f => new RegExp(v.url, 'i').test(f.url())));
		return challenge(`${vendor?.name ?? 'Anti-bot'} challenge`);
	}
	if (blocked) return { kind: 'block', description: `Bot block (HTTP ${status})` };
	return null;
}

function probePage(page) {
	return page.evaluate(({ vendors, textSource }) => {
		const vw = innerWidth || 1280;
		const vh = innerHeight || 720;
		const rects = new Map();
		const visible = (el) => {
			if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
			const rect = el.getBoundingClientRect();
			rects.set(el, rect);
			return rect.width > 0 && rect.height > 0;
		};

		// A widget that's really the page's subject: big enough to interact with,
		// horizontally centered, and on screen without scrolling. Skips the
		// reCAPTCHA v3 corner badge and the 0×0 iframes of invisible captchas.
		let widget = null;
		for (const vendor of vendors) {
			const urlRe = new RegExp(vendor.url, 'i');
			const els = [
				...[...document.querySelectorAll('iframe')].filter(el => urlRe.test(el.src)),
				...(vendor.sel ? document.querySelectorAll(vendor.sel) : []),
			];
			const hit = els.filter(visible).find((el) => {
				const rect = rects.get(el);
				return rect.width >= 100 && rect.height >= 30
					&& Math.abs((rect.left + rect.right) / 2 - vw / 2) < vw * 0.25
					&& rect.top < vh && rect.bottom > 0;
			});
			if (hit) {
				widget = { vendor: vendor.name };
				break;
			}
		}

		// Bare: no significant content around the captcha
		const fields = [...document.querySelectorAll('input, textarea, select, [contenteditable="true"]')]
			.filter(el => el.type !== 'hidden' && visible(el));
		const authField = fields.some(el => /password|email/.test(el.type)
			|| /username|password|email/.test(el.autocomplete || ''));
		const freeText = fields.some(el => el.matches('textarea, [contenteditable="true"]'));
		const inputs = fields.filter(el => !/button|submit|reset|image/.test(el.type)).length;
		const text = (document.body?.innerText ?? '').trim();
		return {
			widget,
			challengeText: new RegExp(textSource, 'i').test(text),
			bare: text.length < 1200 && document.links.length <= 5
				&& !authField && !freeText && inputs <= 1,
		};
	}, { vendors: VENDORS, textSource: CHALLENGE_TEXT_RE.source }).catch(() => null);
}
