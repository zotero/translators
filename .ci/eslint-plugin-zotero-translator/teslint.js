#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const decorate = require('eslint-plugin-zotero-translator/decorate');
const find = require('recursive-readdir-synchronous');
const findRoot = require('find-root');
const CLIEngine = require("eslint").CLIEngine;
const argv = require('commander');

argv
	.version(CLIEngine.version)
	.option('-f, --fix', 'Automatically fix problems')
	.option('--no-ignore', 'Disable use of ignore files and patterns')
	.option('--quiet', 'Report errors only - default: false')
	.option('--dump-decorated [file]', 'Dump decorated translator to file for inspection')
	.parse(process.argv);

const repo = path.resolve(findRoot(__dirname, dir => fs.existsSync(path.resolve(dir, '.git'))));

const decorator = new decorate.Cache(repo);

/* PATCHES */
// patches the notice rule to include translator variables
function patch(object, method, patcher) {
	object[method] = patcher(object[method]);
}
const eslintPluginNoticeUtils = require('eslint-plugin-notice/utils');
patch(eslintPluginNoticeUtils, 'resolveOptions', original => function (options, fileName) {
	if (!options.templateVars) options.templateVars = {};
	const header = decorator.get(fileName).header;
	if (header && header.parsed) {
		let copyright = [];
		if (header.parsed.lastUpdated) copyright.push(header.parsed.lastUpdated.split('-')[0]);
		const year = '' + ((new Date).getFullYear());
		if (!copyright.includes(year)) copyright.push(year);
		copyright = copyright.join('-');
		options.templateVars = { ...options.templateVars, ...header.parsed, copyright };
	}
	return original.call(this, options, fileName);
});

// disable the processor so that fixing works
const eslintPluginZoteroTranslator = require('eslint-plugin-zotero-translator');
delete eslintPluginZoteroTranslator.processors;

/* MAIN */
// split sources to lint into regular javascript (handled by executeOnFiles) and translators (handled by executeOnText)
let javascripts = [];
let translators = [];
function findIgnore(file, stats) {
	if (stats.isDirectory()) return (path.basename(file) == "node_modules");
	return !file.endsWith('.js');
}
for (const js of argv.args) {
	if (!fs.existsSync(js)) continue;
	const sources = fs.lstatSync(js).isDirectory() ? find(js, [findIgnore]) : [js];
	for (const source of sources) {
		if (path.dirname(path.resolve(source)) === repo) {
			const decorated = decorator.get(source);
			if (decorated.header) {
				decorated.filename = source;
				translators.push(decorated);
			}
			else {
				javascripts.push(source);
			}
		}
		else {
			javascripts.push(source);
		}
	}
}

const cli = new CLIEngine({
	cwd: repo,
	fix: argv.fix,
	ignore: argv.ignore, // otherwise you can't lint stuff in hidden dirs
});
const formatter = cli.getFormatter();
function showResults(sources, results) {
	if (argv.quiet) results = CLIEngine.getErrorResults(results);

	if (results.length) {
		console.log(formatter(results));
	}
	else {
		if (Array.isArray(sources)) sources = sources.join(', ');
		console.log(sources, 'OK');
	}
}

if (javascripts.length) {
	const report = cli.executeOnFiles(javascripts);
	if (argv.fix) {
		for (const result of report.results) {
			if (result.messages.find(msg => msg.ruleId === 'notice/notice' && msg.fix)) {
				console.log(`Not safe to apply 'notice/notice' to ${result.filePath}`);
				process.exit(1); // eslint-disable-line no-process-exit
			}
		}
		CLIEngine.outputFixes(report);
	}
	showResults(javascripts, report.results);
}

for (const translator of translators) {
	if (argv.dumpDecorated) fs.writeFileSync(argv.dumpDecorated, translator.source, 'utf-8');
	const report = cli.executeOnText(translator.source, translator.filename);
	if (argv.fix) {
		for (const result of report.results) {
			if (result.output) fs.writeFileSync(result.filePath, decorate.strip(result.output), 'utf-8');
		}
	}
	showResults(translator.filename, report.results);
}
