'use strict';

const translators = require('../translators').cache;
const astring = require('astring');

function verifyWeb(context, astNode, tc, prefix) {
	if (tc.items !== 'multiple' && !Array.isArray(tc.items)) {
		context.report(astNode, `${prefix} needs items`);
	}

	if (typeof tc.url !== 'string') {
		context.report(astNode, `${prefix} test needs url`);
	}
}

function verifyImport(context, astNode, tc, prefix) {
	if (!Array.isArray(tc.items)) {
		context.report(astNode, `${prefix} needs items`);
	}

	if (typeof tc.input !== 'string') {
		context.report(astNode, `${prefix} needs a string input`);
	}

	const items = astNode.properties.find(prop => prop.key.value === 'items').value.elements;
	for (const itemNode of items) {
		if (itemNode.type !== 'ObjectExpression') {
			context.report(itemNode, `${prefix} item must be an object`);
			continue;
		}

		const item = JSON.parse(astring.generate(itemNode));
		const messages = [];
		for (const prop of ['tags', 'notes', 'attachments', 'seeAlso']) {
			if (item[prop] && !item[prop].length) {
				messages.push(`${prefix} remove empty ${prop}`);
				delete item[prop];
			}
		}

		for (const note of (item.notes || [])) {
			if (note.itemType !== 'note') {
				messages.push(`${prefix} note must have itemType "note"`);
				note.itemType = 'note';
			}
		}

		for (const creator of (item.creators || [])) {
			if (creator.fieldMode === 1) {
				messages.push(`${prefix} fieldMode is obsolete, use "name" to indicate single-field names`);
				creator.name = creator.lastName;
				delete creator.lastName;
				delete creator.fieldMode;
			}
		}

		if (item.tags) {
			item.tags = item.tags.map(function (tag) {
				if (typeof tag === 'string') {
					messages.push(`${prefix} tag must be an object, not a string`);
					return { tag, type: 1 };
				}
				else if (typeof tag.type !== 'number') {
					messages.push(`${prefix} missing "type" on tag`);
					return { ...tag, type: 1 };
				}
				return tag;
			});
		}

		// this is a bit cheaty, but I don't feel like walking the entire AST on this, so fix all reported issues in one go
		let fix = function (fixer) {
			return fixer.replaceText(itemNode, JSON.stringify(item, null, '\t'));
		};
		for (const message of messages) {
			context.report({ node: itemNode, message, fix });
			fix = undefined; // the first fixer will take care of all of them at once
		}
	}
}

function verifySearch(context, astNode, tc, prefix) {
	if (!Array.isArray(tc.items)) {
		context.report(astNode, `${prefix} needs items`);
	}

	const term = Object.keys(tc.input || {}).join('/');
	const expected = ['DOI', 'ISBN', 'PMID', 'identifiers', 'contextObject'];
	if (!expected.includes(term)) {
		context.report(astNode, `${prefix} has search term '${term}', expected one of ${expected.join(', ')}`);
	}
}

module.exports = {
	meta: {
		type: 'problem',

		docs: {
			description: 'disallow invalid test input',
			category: 'Possible Errors',
		},
		fixable:	'code',
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

				if (!translator.testCases || translator.testCases.error) return; // regular js or no test cases

				for (const astNode of testCases) {
					if (astNode.type !== 'ObjectExpression') {
						context.report(astNode, `test case is not a test case object`);
						continue;
					}

					const testCase = JSON.parse(astring.generate(astNode));
					const prefix = `${testCase.type || 'unspecified'} test case`;

					switch (testCase.type) {
					case 'web':
						verifyWeb(context, astNode, testCase, prefix);
						break;
					case 'import':
						verifyImport(context, astNode, testCase, prefix);
						break;
					case 'search':
						verifySearch(context, astNode, testCase, prefix);
						break;
					default:
						context.report(astNode, `${prefix} has invalid type "${testCase.type}"`);
						break;
					}
				}
			}
		};
	},
};
