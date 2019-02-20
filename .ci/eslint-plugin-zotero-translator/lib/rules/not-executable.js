'use strict';

const fs = require('fs');
const path = require('path');
const headers = require('../translators').headers;

function isExecutable(filename) {
	try {
		fs.accessSync(filename, fs.constants.X_OK);
		return true;
	} catch (err) {
		return false;
	}
}

module.exports = function(context) {
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
};
