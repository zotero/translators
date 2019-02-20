'use strict';

const fs = require('fs');
const path = require('path');
const translators = require('../translators');

module.exports = function(context) {
	return {
		Program: function(node) {
			const filename = path.resolve(context.getFilename());
			const header = translators.headers[filename];
			
			if (!header || header.error) return; // picked up by valid-json
			
			if (!header.parsed.translatorID) {
				context.report(node, 'Header has no translator ID');

			} else if (translators.deleted.has(header.parsed.translatorID)) {
				context.report(node, 'Header re-uses translator ID of deleted translator');

			} else {
				for (const [other_filename, other_header] of Object.entries(translators.headers)) {
					if (other_filename !== filename && other_header.translatorID === header.parsed.translatorID) {
						context.report(node, `Header re-uses translator ID of ${other_header.label}`);
						break;
					}
				}

			}
		}
	};
};
