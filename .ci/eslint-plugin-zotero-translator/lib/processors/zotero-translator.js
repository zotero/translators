const fs = require('fs');
const path = require('path');
const headers = require('../translators').headers;

const header_var_name = '__eslint_zotero_translator_header';

module.exports = {
	preprocess: function(text, filename) {
		filename = path.resolve(filename);

		headers[filename] = {
			// capture header
			raw: text.replace(/\n}\n[\S\s]*/, '\n}'),
		};

		try {
			headers[filename].parsed = JSON.parse(headers[filename].raw);

		} catch (err) {
			headers[filename].error = err.message; // leave for rules to pick up
		}

		text = `var ${header_var_name} = ` // assign header to variable to make valid JS
			+ text
				.replace('\n', ' // eslint-disable-line no-unused-vars \n') // prevent eslint warnings about this variable being unused
				.replace('\n}\n', '\n};\n'); // add a semicolon after the header to pacify eslint

		// fs.writeFileSync(header_var_name + '.js', text, 'utf-8')

		return [text];
	},

	// takes a Message[][] and filename
	postprocess: function(messages, filename) {
		return messages[0].sort((a, b) => {
			const la = a.line || 0;
			const lb = b.line || 0;

			return (la !== lb) ? la - lb : a.ruleId.localeCompare(b.ruleId);
		});
	},
};
