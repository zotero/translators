#!/usr/bin/env node

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
	.parse(process.argv);

const Linter = require("eslint").Linter;
const linter = new Linter();

const repo = path.resolve(findRoot(__dirname, dir => fs.existsSync(path.resolve(dir, '.git'))));

const decorator = new decorate.Cache(repo);

/* PATCHES */
// patches the notice rule to include translator variables
function patch(object, method, patcher) {
	object[method] = patcher(object[method]);
}
const eslint_plugin_notice_utils = require('eslint-plugin-notice/utils');
patch(eslint_plugin_notice_utils, 'resolveOptions', original => function(options, fileName) {
	if (!options.templateVars) options.templateVars = {};
	const header = decorator.get(fileName).header;
	if (header && header.parsed) {
		let copyright = [];
		if (header.parsed.lastUpdated) copyright.push(header.parsed.lastUpdated.split('-')[0]);
		const year = '' + ((new Date).getFullYear());
		if (!copyright.includes(year)) copyright.push(year);
		copyright = copyright.join('-');
		options.templateVars = {...options.templateVars, ...header.parsed, copyright};
	}
	return original.call(this, options, fileName);
});

// disable the processor so that fixing works
const eslint_plugin_zotero_translator = require('eslint-plugin-zotero-translator');
delete eslint_plugin_zotero_translator.processors;

/* MAIN */
// split sources to lint into regular javascript (handled by executeOnFiles) and translators (handled by executeOnText)
let javascripts = [];
let translators = [];
for (const js of argv.args) {
	if (!fs.existsSync(js)) continue;
	const sources = (fs.lstatSync(js).isDirectory())
		? find(js, [(file, stats) => stats.isDirectory() ? (path.basename(file) == "node_modules") : !file.endsWith('.js')])
		: [ js ];
	for (const source of sources) {
		if (path.dirname(path.resolve(source)) === repo) {
			const decorated = decorator.get(source);
			if (decorated.header) {
				decorated.filename = source;
				translators.push(decorated);
			} else {
				javascripts.push(source);
			}
		} else {
			javascripts.push(source);
		}
	}
}

function maybeQuiet(results) {
	if (argv.quiet) {
		for (const result of results) {
			result.messages = result.messages.filter(msg => msg.severity === 2);
		}
		results = results.filter(res => res.messages.length);
	}
	return results;
}

const cli = new CLIEngine({
	cwd: repo,
	fix: argv.fix,
	ignore: argv.ignore, // otherwise you can't lint stuff in hidden dirs
});
const formatter = cli.getFormatter();

if (javascripts.length) {
	const report = cli.executeOnFiles(javascripts);
	if (argv.fix) {
		for (const result of report.results) {
			const config = cli.getConfigForFile(result.filePath);
			if (config.rules && config.rules['notice/notice']) {
				console.log(`Not safe to fix ${result.filePath} when 'notice/notice' is in place`);
				process.exit(1);
			}
		}
		CLIEngine.outputFixes(report);
	}
	console.log(formatter(maybeQuiet(report.results)));
}

for (const translator of translators) {
	const report = cli.executeOnText(translator.source, translator.filename);
	if (argv.fix) {
		for (const result of report.results) {
			if (result.output) fs.writeFileSync(result.filePath, decorate.strip(result.output), 'utf-8');
		}
	}
	console.log(formatter(maybeQuiet(report.results)));
}
