#!/usr/bin/env node

const path = require('path');
const process = require('process');
const { exec } = require('child_process');
const fs = require('fs').promises;
const selenium = require('selenium-webdriver');
const until = require('selenium-webdriver/lib/until');
const chalk = require('chalk');

const translatorServer = require('./translator-server');

const chromeExtensionDir = path.join(__dirname, 'connectors', 'build', 'chrome');
const KEEP_BROWSER_OPEN = 'KEEP_BROWSER_OPEN' in process.env;

async function getTranslatorsToTest() {
	const translatorFilenames = await new Promise((resolve, reject) => {
		// A bit of a complicated bash script based on https://stackoverflow.com/a/12185115/3199106
		// retrieves the diff of translator files between the `master` commit at which the PR branch was started
		// and PR `HEAD`
		exec('git diff $(git rev-list "$(git rev-list --first-parent ^HEAD master | tail -n1)^^!") --name-only | grep -e "^[^/]*.js$"',
				(err, stdout) => {
			if (err) {
				console.log(chalk.red("Failed to get the list of translators to test"));
				reject(err);
			}
			resolve(stdout.split('\n').filter(str => str.length));
		})
	});
	let changedTranslatorIDs = [];
	let toTestTranslatorIDs = new Set();
	let toTestTranslatorNames = new Set();
	for (const translatorFilename of translatorFilenames) {
		let translatorInfo = translatorServer.filenameToTranslator[translatorFilename].metadata;
		changedTranslatorIDs.push(translatorInfo.translatorID);
		toTestTranslatorIDs.add(translatorInfo.translatorID);
		toTestTranslatorNames.add(translatorInfo.label);
	}
	// Find all translators that use the changed translators and add them to list/check them too
	let tooManyTranslators = false;
	for (let translator of translatorServer.translators) {
		for (let translatorID of changedTranslatorIDs) {
			if (!translator.content.includes(translatorID)) continue;

			toTestTranslatorIDs.add(translator.metadata.translatorID);
			toTestTranslatorNames.add(translator.metadata.label);
			if (toTestTranslatorIDs.size >= 10) {
				tooManyTranslators = true;
				break;
			}
		}
		if (tooManyTranslators) break;
	}
	if (tooManyTranslators) {
		console.log(
`Over 10 translators need to be tested, but this will take too long
and timeout the CI environment. Truncating to 10.

This is likely to happen when changing Embedded Metadata which is
loaded by pretty much every other translator or when a PR contains
a lot of changed translators.

You may want to consider adding '[ci skip]' in the commit message.`
		)
	}
	console.log(`Will run tests for translators ${JSON.stringify(Array.from(toTestTranslatorNames))}`);
	return Array.from(toTestTranslatorIDs);
}

function report(results) {
	var allPassed = true;
	for (let translatorID in results) {
		let translatorResults = results[translatorID];
		console.log(chalk.bold(chalk.bgWhite(chalk.black(`Beginning Tests for ${translatorID}: ${translatorResults.label}`))));
		let padding = 2;
		let output = translatorResults.message.split("\n");
		for (let line of output) {
			if (line.match(/^TranslatorTester: Running [^T]*Test [0-9]*$/) ||
				line.match(/^TranslatorTester: Running [0-9]* tests for .*$/)) {
				console.log("  ".repeat(padding-1) + chalk.bgCyan(chalk.black(line)));
			}
			else if (line.match(/^-/)) {
				console.log(chalk.red("-" + "  ".repeat(padding) + line.substr(1)));
			}
			else if (line.match(/^\+/)) {
				console.log(chalk.green("+" + "  ".repeat(padding) + line.substr(1)));
			}
			else if (line.match(/^TranslatorTester: [^T]*Test [0-9]*: succeeded/)) {
				console.log("  ".repeat(padding) + chalk.bgGreen(line));
			}
			else if (line.match(/^TranslatorTester: [^T]*Test [0-9]*: unknown/)) {
				console.log("  ".repeat(padding) + chalk.bgYellow(chalk.black(line)));
				allPassed = false;
			}
			else if (line.match(/^TranslatorTester: [^T]*Test [0-9]*: failed/)) {
				console.log("  ".repeat(padding) + chalk.bgRed(line));
				allPassed = false;
			}
			else {
				console.log("  ".repeat(padding) + line);
			}
		}
		console.log("\n");
	}

	return allPassed
}

var allPassed = false;

(async function() {
	let driver;
	try {
		translatorServer.serve();
		require('chromedriver');
		let chrome = require('selenium-webdriver/chrome');
		let options = new chrome.Options();
		options.addArguments(`load-extension=${chromeExtensionDir}`);
		if ('BROWSER_EXECUTABLE' in process.env) {
			options.setChromeBinaryPath(process.env['BROWSER_EXECUTABLE']);
		}

		driver = new selenium.Builder()
			.forBrowser('chrome')
			.setChromeOptions(options)
			.build();

		// No API to retrieve extension ID. Hacks, sigh.
		await driver.get("chrome://system/");
		await driver.wait(until.elementLocated({id: 'extensions-value-btn'}), 60*1000);
		let extBtn = await driver.findElement({css: '#extensions-value-btn'});
		await extBtn.click();
		let contentElem = await driver.findElement({css: '#content'});
		let text = await contentElem.getText();
		let extId = text.match(/([^\s]*) : Zotero Connector/)[1];

		// We got the extension ID and test URL, let's test
		const translatorsToTest = await getTranslatorsToTest();
		let testUrl = `chrome-extension://${extId}/tools/testTranslators/testTranslators.html#translators=${translatorsToTest.join(',')}`;
		await new Promise((resolve) => setTimeout(() => resolve(driver.get(testUrl)), 500));
		await driver.wait(until.elementLocated({id: 'translator-tests-complete'}), 30*60*1000);
		testResults = await driver.executeScript('return window.seleniumOutput');

		allPassed = report(testResults);
	}
	catch (e) {
		console.error(e);
	}
	finally {
		if (!KEEP_BROWSER_OPEN) {
			await driver.quit();
		}
		translatorServer.stopServing();
		process.exit(allPassed ? 0 : 1);
	}
})();
