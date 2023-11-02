'use strict';

const { parsed } = require('../processor').support;

module.exports = {
	meta: {
		type: 'problem',
		fixable: 'code',
		docs: {
			description: 'checks use of deprecated Translator Framework',
			category: 'Possible Errors',
		},
	},

	create: function (context) {
		return {
			Program: function (node) {
        const translator = parsed(context.getFilename());
        if (!translator) return; // regular js source

        if (translator.FWLine) {
          context.report({
            loc: { start: { line: translator.FWLine, column: 1 } },
            message: 'uses deprecated Translator Framework'
          });
        }
			}
		};
	},
};
