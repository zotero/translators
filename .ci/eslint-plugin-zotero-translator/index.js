/**
 * @fileoverview Checks Zotero translators for errors and recommended style
 * @author Emiliano Heyns
 */
"use strict";

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const findRoot = require('find-root');
const decorate = require('./decorate');

const repo = findRoot(__dirname, dir => fs.existsSync(path.resolve(dir, '.git')));

function exec(cmd, cwd=null) {
	return child_process.execSync(cmd, { cwd: cwd || repo, encoding: 'utf8' });
}

const deleted = new Set(
	fs.readFileSync(path.join(repo, 'deleted.txt'), 'utf-8')
		.split('\n')
		.map(line => line.split(' ')[0])
		.filter(id => id && id.indexOf('-') > 0)
);

const branch = exec('git rev-parse --abbrev-ref HEAD').trim();
// branch to compare lastUpdated against -- assume that if you're not in CI, you have upstream/master

const has_upstream = exec('git remote -v').split('\n').map(line => line.trim()).includes('upstream\thttps://github.com/zotero/translators.git');
const master = has_upstream ? 'upstream/master' : 'master';

/*
	`git diff --name-status ${master}` will fetch the names of the files
	that have changed against `${master}`, where `${master}` is `master`
	if you're in CI, `upstream/master` otherwise. This does assume that
	if you're doing local development you have a remote called `upstream`
	and that you've fetched it.

	It then does a `git grep '"lastUpdated"' ${master} *.js` to get the
	`lastUpdated` values from the `${master}` branch. For files that are
	deemed changed, the lastUpdated is remembered.

	Finally, in the 'last-updated' rule, the lastUpdated value of a translator
	is checked against this value. This extra check will thus effectively
	only be ran for files deemed changed.

	It does not run this extra test if you're actually on `${master}`
	because that would always fail.
*/
const lastUpdated = {};
if (branch !== master) {
	const updated = exec(`git diff --name-status ${master}`)
		.split('\n')
		.map(changed => changed.match(/^M\t([^\/]+\.js)$/))
		.filter(changed => changed)
		.map(changed => changed[1]);

	for (const lu of child_process.execSync(`git grep '"lastUpdated"' ${master} *.js`, { cwd: repo, encoding: 'utf8' }).split('\n')) {
		const m = lu.match(/^[a-z\/]+:([^:]+):\s*"lastUpdated"\s*:\s*"([-0-9: ]+)"/);
		if (m && updated.includes(m[1])) lastUpdated[m[1]] = m[2];
	}
}

const decorator = new decorate.Cache(repo);

module.exports.processors = {
	'.js': {
		preprocess: function(text, filename) {
			const decorated = decorator.get(filename, text);

			return [ (typeof decorated.source === 'string') ? decorated.source : text ];
		},

		// takes a Message[][] and filename
		postprocess: function(messages, filename) {
			return messages[0].sort((a, b) => {
				const la = a.line || 0;
				const lb = b.line || 0;

				return (la !== lb) ? la - lb : a.ruleId.localeCompare(b.ruleId);
			});
		},
	},
};

module.exports.rules = {
	'header-valid-json': function(context) {
		return {
			Program: function(node) {
				const decorated = decorator.get(context.getFilename(), context);

				if (!decorated.source) return; // regular js source

				if (decorated.header.error) context.report(node, `Could not parse header: ${decorated.header.error}`);
			}
		};
	},

	'last-updated': function(context) {
		return {
			Program: function(node) {
				const decorated = decorator.get(context.getFilename(), context);
				const header = decorated.header;
				const basename = path.basename(context.getFilename());

				if (!decorated.source || header.error) return; // picked up by valid-json

				if (!header.parsed.lastUpdated) {
					context.report(node, 'Header needs lastUpdated field');

				} else if (lastUpdated[basename] && lastUpdated[basename] >= header.parsed.lastUpdated) {
					context.report(node, `lastUpdated field must be updated to be > ${lastUpdated[basename]} to push to clients`);
				}
			}
		};
	},

	'translator-id': function(context) {
		return {
			Program: function(node) {
				const filename = path.resolve(context.getFilename());
				const decorated = decorator.get(context.getFilename(), context);
				const header = decorated.header;

				if (!decorated.source || header.error) return; // picked up by valid-json

				if (!header.parsed.translatorID) {
					context.report(node, 'Header has no translator ID');

				} else if (deleted.has(header.parsed.translatorID)) {
					context.report(node, 'Header re-uses translator ID of deleted translator');

				} else {
					const conflict = decorator.conflicts(filename, header.parsed.translatorID);
					if (conflict) context.report(node, `Header re-uses translator ID of ${conflict.label}`);
				}
			}
		};
	},

	// this is a very simplistic rule to find 'unnecesary use of indexOf' until I find a better eslint plugin that does this
	'prefer-index-of': function(context) {
		return {
			Program: function(node) {
				let lineno = 0;
				let m;
				for (const line of context.getSourceCode().getText().split('\n')) {
					lineno += 1;

					if (m = line.match(/\.indexOf(.*) *(=+ *-1|!=+ *-1|> *-1|>= *0|< *0)/)) {
						context.report({
							node,
							message: "Unnecessary '.indexOf()', use '.includes()' instead",
							loc: { start: { line: lineno, column: line.indexOf(m[0]) + 1 } },
						});
					}
				}
			}
		};
	},

	// this is a very simplistic rule to find 'for each' until I find a better eslint plugin that does this
	'no-for-each': function(context) {
		return {
			Program: function(node) {
				let lineno = 0;
				let m;
				for (const line of context.getSourceCode().getText().split('\n')) {
					lineno += 1;

					if (m = line.match(/for each *\(/)) {
						context.report({
							node,
							message: "Deprecated JavaScript 'for each' statement",
							loc: { start: { line: lineno, column: line.indexOf(m[0]) + 1 } },
						});
					}
				}
			}
		};
	},

	'not-executable': function(context) {
		return {
			Program: function(node) {
				const decorated = decorator.get(context.getFilename(), context);

				if (!decorated.source) return; // only check translators

				const filename = path.resolve(context.getFilename());

				try {
					fs.accessSync(filename, fs.constants.X_OK);
					context.report(node, `Translator '${path.basename(filename)}' should not be executable.`);

				} catch(err) {
					return;

				}
			}
		};
	},
};
