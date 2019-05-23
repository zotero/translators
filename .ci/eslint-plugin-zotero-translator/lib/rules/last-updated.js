'use strict';

const translators = require('../translators').cache;
const getHeaderFromAST = require('../translators').getHeaderFromAST;

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'enforce valid lastUpdated in header',
			category: 'Possible Errors',
		},
		fixable: 'code',
	},

	create: function (context) {
		return {
			Program: function (node) {
				const header = getHeaderFromAST(node);
				if (!header.declaration) return;

				const translator = translators.get(context.getFilename());

				const updated = (new Date)
					.toISOString()
					.replace('T', ' ')
					.replace(/\..*/, '');

				if (!header.properties.lastUpdated) {
					context.report({
						node: header.declaration,
						message: 'Header needs lastUpdated field'
					});
				}
				else if (translator.lastUpdated && translator.lastUpdated >= header.properties.lastUpdated.value) {
					context.report({
						node: header.properties.lastUpdated,
						message: `lastUpdated field must be updated to be > ${translator.lastUpdated} to push to clients`,
						fix: function (fixer) {
							return fixer.replaceText(header.properties.lastUpdated, `"${updated}"`);
						},
					});
				}
			}
		};
	},
};
