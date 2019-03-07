'use strict';

const fs = require('fs');
const path = require('path');
const uuid = require('uuid/v4');

const translators = require('../translators').cache;

const deleted = new Set(
	fs.readFileSync(path.join(translators.repo, 'deleted.txt'), 'utf-8')
		.split('\n')
		.map(line => line.split(' ')[0])
		.filter(id => id && id.indexOf('-') > 0)
);

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'disallows translatorID re-use',
			category: 'Potential Problems',
		},
		fixable: 'code',
	},

	create: function (context) {
		return {
			Program: function (node) {
				const filename = context.getFilename();
				const header = translators.getHeaderFromAST(node);
				if (!header.declaration) return;

				if (!header.properties.translatorID) {
					context.report({
						node: header.declaration,
						message: 'Header has no translator ID',
						fix: function (fixer) {
							const comma = (Object.keys(header.properties).length) ? ',' : '';
							const sourceCode = context.getSourceCode();
							return fixer.insertTextAfter(sourceCode.getFirstToken(header.body, t => t.value === '{'), `\n\t"translatorID": "${uuid()}"${comma}`);
						}
					});
				}
				else if (deleted.has(header.properties.translatorID.value)) {
					context.report({
						node: header.properties.translatorID,
						message: 'Header re-uses translator ID of deleted translator',
						fix: function (fixer) {
							return fixer.replaceText(header.properties.translatorID, `"${uuid()}"`);
						}
					});
				}
				else if (!header.properties.translatorID.value) {
					context.report({
						node: header.properties.translatorID,
						message: 'Header has empty translator ID',
						fix: function (fixer) {
							return fixer.replaceText(header.properties.translatorID, `"${uuid()}"`);
						}
					});
				}
				else {
					const conflict = translators.conflicts(filename, header.properties.translatorID.value);
					if (conflict) {
						const translator = translators.get(filename);
						context.report({
							node: header.properties.translatorID,
							message: `Header re-uses translator ID of ${conflict.label}`,
							fix: !translator.modified ? undefined : (fixer => fixer.replaceText(header.properties.translatorID, `"${uuid()}"`)),
						});
					}
				}
			}
		};
	},
};
