const fs = require('fs');
const path = require('path');

const header_var = 'const __eslint_zotero_translator_header = ';
const eslint_disable = ' // eslint-disable-line no-unused-vars';

function escapeRE(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const decorated_header = new RegExp(`${escapeRE(header_var)}(.*?)${escapeRE(eslint_disable)}([\\s\\S]+?)(\\n\\};\\n)`);

function decorate(source) {
	const decorated = {};

	if (!source.startsWith('{')) return decorated;

	decorated.source = source.replace(/^\{[\s\S]+?\n\}\n/, header => {
		decorated.header = {
			raw: header
		};
		return header_var // assign header to variable to make valid JS
			+ header
				.replace('\n', ' // eslint-disable-line no-unused-vars\n') // prevent eslint warnings about this variable being unused
				.replace('\n}\n', '\n};\n'); // add a semicolon after the header to pacify eslint

	});

	if (decorated.header) {
		try {
			decorated.header.parsed = JSON.parse(decorated.header.raw);
		} catch (err) {
			decorated.header.error = err.message;
		}
	} else {
		decorated.header = {
			error: 'no header found',
		};
	}

	return decorated;
}

function strip(source) {
	let header = null;
	source = source.replace(decorated_header, (match, first_line, rest, close_brace) => {
		header = first_line + rest + close_brace.replace(';', '');
		return '';
	});

	if (!header) throw new Error('not a decorated source');
	return header + source;
}

class Cache {
	constructor(repo) {
		this.decorated = {};

		this.repo = path.resolve(repo);
		for (const translator of fs.readdirSync(this.repo)) {
			if (!translator.endsWith('.js')) continue;
			this.get(translator, fs.readFileSync(path.join(repo, translator), 'utf-8'));
		}
	}

	get(filename, source) {
		const basename = path.basename(filename);

		// don't load stuff outside the root dir
		if (!this.decorated[basename] && path.dirname(path.resolve(filename)) !== this.repo) this.decorated[basename] = {};

		if (!this.decorated[basename]) {
			if (!source) {
				source = fs.readFileSync(filename, 'utf-8');
			} else if (typeof source !== 'string') {
				source = source.getSourceCode().getText();
			}
			this.decorated[basename] = decorate(source);
		}
		return this.decorated[basename];
	}

	conflicts(filename, translatorID) {
		filename = path.basename(filename);
		for (const [other_filename, other_header] of Object.entries(this.decorated)) {
			if (other_filename !== filename && other_header.translatorID === translatorID) {
				return other_header.parsed;
			}
		}
		return false;
	}
}

module.exports = {
	decorate,
	strip,
	Cache,
};
