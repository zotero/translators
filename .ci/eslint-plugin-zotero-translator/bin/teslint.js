#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const find = require('recursive-readdir-synchronous');
const CLIEngine = require("eslint").CLIEngine;
const argv = require('commander');

const translators = require('../lib/translators');

argv
	.version(CLIEngine.version)
	.option('-f, --fix', 'Automatically fix problems')
	.option('--no-ignore', 'Disable use of ignore files and patterns')
	.option('--quiet', 'Report errors only - default: false')
	.option('--dump-decorated [file]', 'Dump decorated translator to file for inspection')
	.parse(process.argv);

/* PATCHES */
// disable the processor so that fixing works
const eslintPluginZoteroTranslator = require('eslint-plugin-zotero-translator');
delete eslintPluginZoteroTranslator.processors;

/* MAIN */
// split sources to lint into regular javascript (handled by executeOnFiles) and translators (handled by executeOnText)
const sources = {
	javascripts: [],
	translators: [],
	errors: 0,
};
function findIgnore(file, stats) {
	if (stats.isDirectory()) return (path.basename(file) == "node_modules");
	return !file.endsWith('.js');
}
for (const target of argv.args) {
	if (!fs.existsSync(target)) continue;
	const files = fs.lstatSync(target).isDirectory() ? find(target, [findIgnore]) : [target];
	for (const file of files) {
		if (path.dirname(path.resolve(file)) === translators.cache.repo) {
			const translator = translators.cache.get(file);
			if (translator.header) {
				translator.filename = file;
				sources.translators.push(translator);
			}
			else {
				sources.javascripts.push(file);
			}
		}
		else {
			sources.javascripts.push(file);
		}
	}
}

const cli = new CLIEngine({
	cwd: translators.cache.repo,
	fix: argv.fix,
	ignore: argv.ignore, // otherwise you can't lint stuff in hidden dirs
});
const formatter = cli.getFormatter();
function showResults(files, results) {
	if (argv.quiet) results = CLIEngine.getErrorResults(results);
	for (const res of results) {
		sources.errors += res.errorCount;
	}

	if (results.length) {
		console.log(formatter(results)); // eslint-disable-line no-console
	}
	else {
		if (Array.isArray(files)) files = files.join(', ');
		if (!argv.quiet) console.log(files, 'OK'); // eslint-disable-line no-console
	}
}

if (sources.javascripts.length) {
	const report = cli.executeOnFiles(sources.javascripts);
	if (argv.fix) {
		for (const result of report.results) {
			if (result.messages.find(msg => msg.ruleId === 'notice/notice' && msg.fix)) {
				console.log(`Not safe to apply 'notice/notice' to ${result.filePath}`); // eslint-disable-line no-console
				process.exit(1); // eslint-disable-line no-process-exit
			}
		}
		CLIEngine.outputFixes(report);
	}
	showResults(sources.javascripts, report.results);
}

for (const translator of sources.translators) {
	if (argv.dumpDecorated) fs.writeFileSync(argv.dumpDecorated, translator.source, 'utf-8');
	const report = cli.executeOnText(translator.source, translator.filename);
	if (argv.fix) {
		for (const result of report.results) {
			if (result.output) {
				try {
					fs.writeFileSync(result.filePath, translators.strip(result.output), 'utf-8');
				}
				catch (err) {
					console.log(`Error writing fixed ${result.filePath}: ${err.message}`); // eslint-disable-line no-console
					process.exit(1); // eslint-disable-line no-process-exit
				}
			}
		}
	}
	showResults(translator.filename, report.results);
}

process.exit(sources.errors); // eslint-disable-line no-process-exit
