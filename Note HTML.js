{
	"translatorID": "897a81c2-9f60-4bec-ae6b-85a5030b8be5",
	"label": "Note HTML",
	"creator": "Martynas Bagdonas",
	"target": "html",
	"minVersion": "5.0.97",
	"maxVersion": "",
	"priority": 50,
	"configOptions": {
		"noteTranslator": true
	},
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2022-03-16 12:00:00"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2021 Corporation for Digital Scholarship
                     Vienna, Virginia, USA
                     http://digitalscholar.org/

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

// Based on https://github.com/zotero/zotero/blob/32a5826a1fdcb8095e0ff6789d06dcb190212de9/chrome/content/zotero/xpcom/quickCopy.js#L266-L419
function doExport() {
	Zotero.setCharacterSet('utf-8');
	let item;
	let doc = new DOMParser().parseFromString('<div class="zotero-notes"/>', 'text/html');
	let container = doc.body.firstChild;
	while ((item = Zotero.nextItem())) {
		if (item.itemType === 'note' || item.itemType === 'attachment') {
			let div = doc.createElement('div');
			div.className = 'zotero-note';
			div.innerHTML = item.note || '';
			// Skip empty notes
			if (!div.textContent.trim()) {
				continue;
			}
			// Unwrap ProseMirror note metadata container
			let inner = div.firstElementChild;
			if (inner && inner.getAttribute('data-schema-version')) {
				inner.replaceWith(...inner.childNodes);
			}
			container.append(div);
		}
	}

	// Remove annotation and citation data
	ZU.xpath(doc, '//span[@data-citation]').forEach(span => span.removeAttribute('data-citation'));
	ZU.xpath(doc, '//span[@data-annotation]').forEach(span => span.removeAttribute('data-annotation'));
	ZU.xpath(doc, '//img[@data-annotation]').forEach(img => img.removeAttribute('data-annotation'));

	// Add horizontal rules between notes
	Array.from(container.children).slice(1).forEach((element) => {
		container.insertBefore(doc.createElement('hr'), element);
	});

	// Add quotes around blockquote paragraphs
	// Open quote
	ZU.xpath(doc, '//blockquote/p[1]').forEach((element) => {
		element.insertBefore(doc.createTextNode('\u201c'), element.firstChild);
	});
	// End quote
	ZU.xpath(doc, '//blockquote/p[last()]').forEach((element) => {
		element.appendChild(doc.createTextNode('\u201d'));
	});

	// Everything seems to like margin-left better than padding-left
	Zotero.Utilities.xpath(doc, 'p').forEach((p) => {
		if (p.style.paddingLeft) {
			p.style.marginLeft = p.style.paddingLeft;
			p.style.paddingLeft = '';
		}
	});

	// Word and TextEdit don't indent blockquotes on their own and need this
	// OO gets it right, so this results in an extra indent
	ZU.xpath(doc, '//blockquote/p').forEach(p => p.style.marginLeft = '30px');

	let charsetMeta = doc.createElement('meta');
	charsetMeta.setAttribute('charset', 'utf-8');
	doc.head.append(charsetMeta);

	Zotero.write('<!DOCTYPE html>' + doc.documentElement.outerHTML);
}
