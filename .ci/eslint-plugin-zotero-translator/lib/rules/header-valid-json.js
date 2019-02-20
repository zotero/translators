'use strict';

const fs = require('fs');
const path = require('path');
const headers = require('../translators').headers;

module.exports = function(context) {
	return {
		Program: function(node) {
			const filename = path.resolve(context.getFilename());
			const header = headers[filename];
			
			if (!header) {
				context.report(node, 'Header not parsed');

			} else if (header.error) {
				context.report(node, `Could not parse header: ${header.error}`);

			}
		}
	};
};
