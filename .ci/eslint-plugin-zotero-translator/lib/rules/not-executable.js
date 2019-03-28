'use strict';

const fs = require('fs');
const path = require('path');

const translators = require('../translators').cache;

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'disallow executable status on translators',
			category: 'Best Practices',
		},
	},

	create: function (context) {
		return {
			Program: function (node) {
				const translator = translators.get(context.getFilename());

				if (!translator.source) return; // only check translators

				const filename = context.getFilename();

				try {
					fs.accessSync(filename, fs.constants.X_OK);
					context.report(node, `Translator '${path.basename(filename)}' should not be executable.`);
				}
				catch (err) {
				}
			}
		};
	},
};
