'use strict';

// const fs = require('fs');
const path = require('path');
const headers = require('../translators').headers;

module.exports = function(context) {
	return {
		Program: function(node) {
			const filename = path.resolve(context.getFilename());
			const header = headers[filename];
			
			if (!header || header.error) return; // picked up by valid-json
			
			if (!header.parsed.lastUpdated) {
				context.report(node, 'Header needs lastUpdated field');

			} /* else {
				// disabled until I figure out something smart -- git doesn't retain file modification dates, and it's too involved to hit the github API all the time
				const stats = fs.statSync(filename)
				if (stats.mtime > (new Date(header.parsed.lastUpdated))) {
					context.report(node, 'lastUpdated field is older than file modification time');
				}
			}
			*/
		}
	};
};
