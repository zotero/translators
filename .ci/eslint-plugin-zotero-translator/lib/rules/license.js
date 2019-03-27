'use strict';

const translators = require('../translators');
const findRoot = require("find-root");
const fs = require('fs');
const path = require('path');

module.exports = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: {
			description: 'checks for AGPL license',
			category: 'Possible Errors',
		},
	},

	create: function (context) {
		return {
			Program: function (node) {
				const header = translators.getHeaderFromAST(node);
				if (!header.body) return; // if there's no file header, assume it's not a translator
				if (!header.followingStatement) return; // if there's no following statement, there's more significant problems than just the license missing

				const sourceCode = context.getSourceCode();
				let licenseComment;
				for (const comment of sourceCode.getAllComments()) {
					if (comment.loc.start.line <= header.body.loc.end.line) continue; // decorator comment

					if (comment.type !== 'Block') {
						// licence comment must be block-comment
					}
					else if (comment.loc.start.line >= header.followingStatement.loc.start.line) {
						// license comment must start before first statement
					}
					else if (comment.loc.end.line >= header.followingStatement.loc.start.line) {
						// license comment must end before first statement
					}
					else {
						licenseComment = comment;
					}

					break;
				}

				const options = context.options[0];
				if (!options.mustMatch) throw new Error('mustMatch not set');

				if (licenseComment && licenseComment.value.includes(options.mustMatch)) return; // license found

				if (!options.templateFile) throw new Error('templateFile not set');
				const templateFile = fs.existsSync(options.templateFile)
					? options.templateFile
					: path.resolve(path.join(findRoot(context.getFilename()), options.templateFile));
				if (!fs.existsSync(templateFile)) throw new Error(`cannot find ${templateFile}`);
				const template = fs.readFileSync(templateFile, 'utf-8');

				const copyright = {
					holder: header.properties.creator ? header.properties.creator.value : null,
					period: `${(new Date).getFullYear()}`,
				};
				if (header.properties.lastUpdated) {
					const year = header.properties.lastUpdated.value.split('-')[0] || '';
					if (year && year !== copyright.period) copyright.period = `${year}-${copyright.period}`;
				}
				const licenseText = '\n\n' + template.trim().replace(/\${(.*?)\}/g, (_, id) => {
					id = id.trim();
					return copyright[id] || `<undefined '${id}'>`;
				}) + '\n\n';

				if (!licenseComment) {
					context.report({
						node: header.followingStatement,
						message: "Missing license block",
						fix: function (fixer) {
							return fixer.insertTextBefore(header.followingStatement, licenseText);
						}
					});
				}
				else {
					context.report({
						loc: licenseComment.loc,
						message: `Block comment does not contain "${options.mustMatch}"`,
						fix: function (fixer) {
							return fixer.replaceTextRange(licenseComment.range, licenseText);
						}
					});
				}
			}
		};
	},
};
