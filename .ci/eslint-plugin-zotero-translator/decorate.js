'use strict';

const fs = require('fs');
const path = require('path');

const headerVar = '/* eslint-disable */ const __eslint_zotero_translator_header = ';
const eslintEnable = '; /* eslint-enable */';

function escapeRE(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const decoratedHeader = new RegExp(`${escapeRE(headerVar)}([\\s\\S]+?\\n\\})${escapeRE(eslintEnable)}(\\n)`);

function decorate(source) {
	const decorated = {};

	if (!source.startsWith('{')) return decorated;

	decorated.source = source.replace(/^\{[\s\S]+?\n\}\n/, function (header) {
		decorated.header = {
			raw: header
		};
		return headerVar + header.replace('\n}\n', `\n}${eslintEnable}\n`); // pacify eslint
	});

	if (decorated.header) {
		try {
			decorated.header.parsed = JSON.parse(decorated.header.raw);
		}
		catch (err) {
			decorated.header.error = err.message;
		}
	}
	else {
		decorated.header = {
			error: 'no header found',
		};
	}

	return decorated;
}

function strip(source) {
	let header = null;
	source = source.replace(decoratedHeader, (match, body, nl) => {
		header = body + nl;
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
			}
			else if (typeof source !== 'string') {
				source = source.getSourceCode().getText();
			}
			this.decorated[basename] = decorate(source);
		}
		return this.decorated[basename];
	}

	conflicts(filename, translatorID) {
		filename = path.basename(filename);
		for (const [otherFilename, otherHeader] of Object.entries(this.decorated)) {
			if (otherFilename !== filename && otherHeader.translatorID === translatorID) {
				return otherHeader.parsed;
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
