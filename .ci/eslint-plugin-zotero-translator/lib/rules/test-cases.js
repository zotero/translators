'use strict';

const translators = require('../translators').cache;
const astUtils = require("eslint/lib/util/ast-utils");

module.exports = {
	meta: {
		type: 'problem',

		docs: {
			description: 'disallow invalid test input',
			category: 'Possible Errors',
		},
	},

	create: function (context) {
		return {
			Program: function (node) {
				const translator = translators.get(context.getFilename());

				const declaration = node.body.find(node => node.type === 'VariableDeclaration' && node.declarations.length === 1 && node.declarations[0].id.name === 'testCases');
				const testCases = declaration
					&& declaration.declarations[0].init
					&& declaration.declarations[0].init.type === 'ArrayExpression'
						? declaration.declarations[0].init.elements
						: [];

				if (declaration) {
					const sourceCode = context.getSourceCode();
					if (astUtils.isSemicolonToken(sourceCode.getLastToken(node))) {
						context.report({
							message: 'testcases should not have trailing semicolon',
							loc: declaration.loc.end,
						});
					}
				}

				if (!translator.testCases || translator.testCases.error) return; // regular js or no test cases

				let caseNo = -1;
				for (const testCase of translator.testCases.parsed) {
					caseNo += 1;
					const prefix = `test case${testCases[caseNo] ? '' : ' ' + (caseNo + 1)}`;
					const loc = testCases[caseNo] ? testCases[caseNo].loc.start : { start: { line: translator.testCases.start, column: 1 } };

					if (!['web', 'import', 'search'].includes(testCase.type)) {
						context.report({
							message: `${prefix} has invalid type "${testCase.type}"`,
							loc,
						});
						continue;
					}

					if (!(Array.isArray(testCase.items) || (testCase.type === 'web' && testCase.items === 'multiple'))) {
						context.report({
							message: `${prefix} of type "${testCase.type}" needs items`,
							loc,
						});
					}

					if (testCase.type === 'web' && typeof testCase.url !== 'string') {
						context.report({
							message: `${prefix} of type "${testCase.type}" test needs url`,
							loc,
						});
					}

					if (['import', 'search'].includes(testCase.type) && !testCase.input) {
						context.report({
							message: `${prefix} of type "${testCase.type}" needs a string input`,
							loc,
						});
					}
					else if (testCase.type === 'import' && typeof testCase.input !== 'string') {
						context.report({
							message: `${prefix} of type "${testCase.type}" needs input`,
							loc,
						});
					}
					else if (testCase.type === 'search') {
						// console.log(JSON.stringify(testCase.input))
						const term = Object.keys(testCase.input).join('/');
						const expected = ['DOI', 'ISBN', 'PMID', 'identifiers', 'contextObject'];
						if (!expected.includes(term)) {
							context.report({
								message: `${prefix} of type "${testCase.type}" has search term '${term}', expected one of ${expected.join(', ')}`,
								loc,
							});
						}
					}
				}
			}
		};
	},
};
