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

				const detectWeb = getFunction(node, 'doWeb');
				const doWeb = getFunction(node, 'doWeb');
				const detectImport = getFunction(node, 'detectImport');
				const doImport = getFunction(node, 'doImport');
				const doExport = getFunction(node, 'doExport');

				if (browserSupportNode && !(translatorType & type.web)) context.report(browserSupportNode, `browserSupport set, but translatorType (${translatorType}) does not include web (${type.web})`);

				for (const [f, mode] of [[detectWeb, 'Web'], [doWeb, 'Web'], [detectImport, 'Import'], [doImport, 'Import'], [doExport, 'Export']]) {
					const bit = type[mode.toLowerCase()];
					if (f && !(translatorType & bit)) {
						context.report(f, `do${mode} present, but translatorType (${translatorType}) does not specify ${mode.toLowerCase()} (${bit})`);
					}
					if (!f && (translatorType & bit)) {
						context.report(translatorTypeNode, `translatorType specifies ${mode.toLowerCase()} (${bit}), but no do${mode} present`);
					}
				}
			}
		};
	},
};
