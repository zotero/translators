/**
 * @fileoverview Checks Zotero translators for errors and recommended style
 * @author Emiliano Heyns
 */
"use strict";

const fs = require('fs');
const path = require('path');

const header_var_name = '__eslint_zotero_translator_header';

const headers = {};
const deleted = new Set(
	fs.readFileSync('deleted.txt', 'utf-8')
		.split('\n')
		.map(line => line.split(' ')[0])
		.filter(id => id && id.indexOf('-') > 0)
);

module.exports.processors = {
	'.js': {
		preprocess: function(text, filename) {
			filename = path.resolve(filename);
	
			headers[filename] = {
				// capture header
				raw: text.replace(/\n}\n[\S\s]*/, '\n}'),
			};
	
			try {
				headers[filename].parsed = JSON.parse(headers[filename].raw);
	
			} catch (err) {
				headers[filename].error = err.message; // leave for rules to pick up
			}
	
			text = `var ${header_var_name} = ` // assign header to variable to make valid JS
				+ text
					.replace('\n', ' // eslint-disable-line no-unused-vars \n') // prevent eslint warnings about this variable being unused
					.replace('\n}\n', '\n};\n'); // add a semicolon after the header to pacify eslint
	
			// fs.writeFileSync(header_var_name + '.js', text, 'utf-8')
	
			return [text];
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
				const filename = path.resolve(context.getFilename());
				const header = headers[filename];
			
				if (!header) {
					context.report(node, 'Header not parsed');

				} else if (header.error) {
					context.report(node, `Could not parse header: ${header.error}`);

				}
			}
		};
	},

	'last-updated': function(context) {
		return {
			Program: function(node) {
				const filename = path.resolve(context.getFilename());
				const header = headers[filename];
			
				if (!header || header.error) return; // picked up by valid-json
			
				if (!header.parsed.lastUpdated) {
					context.report(node, 'Header needs lastUpdated field');

				} /* else {
					// disabled until I figure out something smart -- git doesn't retain file modification dates, and it's too involved to hit the github API all the time
					const stats = fs.statSync(filename)
					if (stats.mtime > (new Date(header.parsed.lastUpdated))) {
						context.report(node, 'lastUpdated field is older than file modification time');
					}
				}
				*/
			}
		};
	},

	// this is a very simplistic rule to find 'for each' until I find a better eslint plugin that does this
	'no-for-each': function(context) {
		return {
			Program: function(node) {
				const filename = path.resolve(context.getFilename());

				let lineno = 0;
				let m
				for (const line of fs.readFileSync(filename, 'utf-8').split('\n')) {
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

	// this is a very simplistic rule to find 'unnecesary use of indexOf' until I find a better eslint plugin that does this
	'prefer-index-of': function(context) {
		return {
			Program: function(node) {
				const filename = path.resolve(context.getFilename());

				let lineno = 0;
				let m
				for (const line of fs.readFileSync(filename, 'utf-8').split('\n')) {
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

	'translator-id': function(context) {
		return {
			Program: function(node) {
				const filename = path.resolve(context.getFilename());
				const header = headers[filename];
			
				if (!header || header.error) return; // picked up by valid-json
			
				if (!header.parsed.translatorID) {
					context.report(node, 'Header has no translator ID');

				} else if (deleted.has(header.parsed.translatorID)) {
					context.report(node, 'Header re-uses translator ID of deleted translator');

				} else {
					for (const [other_filename, other_header] of Object.entries(headers)) {
						if (other_filename !== filename && other_header.translatorID === header.parsed.translatorID) {
							context.report(node, `Header re-uses translator ID of ${other_header.label}`);
							break;
						}
					}
				}
			}
		};
	},
};
