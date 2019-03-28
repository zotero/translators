'use strict';

const getHeaderFromAST = require('../translators').getHeaderFromAST;

function getFunction(programNode, name) {
	return programNode.body.find((node) => {
		if (node.type === 'FunctionDeclaration' && node.id && node.id.name === name) return true;
		if (node.type === 'VariableDeclaration'
				&& node.declarations.length === 1
				&& node.declarations[0].id.name === name
				&& node.declarations[0].init
				&& node.declarations[0].init.type === 'FunctionExpression'
		) return true;

		return false;
	});
}

module.exports = {
	meta: {
		type: 'problem',
		docs: {
			description: 'enforce translatorType against handler functions',
			category: 'Possible Errors',
		},
	},

	create: function (context) {
		return {
			Program: function (node) {
				const header = getHeaderFromAST(node);
				if (!header.declaration) return;

				const type = {
					import: 1,
					export: 2,
					web: 4,
					search: 8
				};

				let translatorTypeNode = header.declaration;
				let translatorType = 0;
				let browserSupportNode = null;
				for (const [p, v] of Object.entries(header.properties)) {
					switch (p) {
					case 'translatorType':
						translatorTypeNode = v;
						translatorType = v.value;
						break;
					case 'browserSupport':
						browserSupportNode = v;
						break;
					}
				}

				const handlers = {
					detectWeb: getFunction(node, 'doWeb'),
					doWeb: getFunction(node, 'doWeb'),
					detectImport: getFunction(node, 'detectImport'),
					doImport: getFunction(node, 'doImport'),
					doExport: getFunction(node, 'doExport'),
				};

				if (browserSupportNode && !(translatorType & type.web)) context.report(browserSupportNode, `browserSupport set, but translatorType (${translatorType}) does not include web (${type.web})`);

				for (const [name, func] of Object.entries(handlers)) {
					const mode = name.replace(/^(detect|do)/, '').toLowerCase();
					const bit = type[mode];
					if (func && !(translatorType & bit)) {
						context.report(func, `${name} present, but translatorType (${translatorType}) does not specify ${mode} (${bit})`);
					}
					if (!func && (translatorType & bit)) {
						context.report(translatorTypeNode, `translatorType specifies ${mode} (${bit}), but no ${name} present`);
					}
				}
			}
		};
	},
};
