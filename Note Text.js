{
	"translatorID": "a45eca67-1ee8-45e5-b4c6-23fb8a852873",
	"label": "Note Text",
	"creator": "Martynas Bagdonas",
	"target": "txt",
	"minVersion": "5.0.97",
	"maxVersion": "",
	"priority": 50,
	"configOptions": {
		"noteTranslator": true
	},
	"inRepository": true,
	"translatorType": 2,
	"lastUpdated": "2021-11-18 16:41:00"
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
	let doc =  new DOMParser().parseFromString('<div class="zotero-notes"/>', 'text/html');
	let container = doc.body.firstChild;
	while (item = Zotero.nextItem()) {
		if (item.itemType === 'note' || item.itemType === 'attachment') {
			let div = doc.createElement('div');
			div.className = 'zotero-note';
			div.innerHTML = item.note;
			// Skip empty notes
			if (!div.textContent.trim()) {
				continue;
			}
			container.append(div);
		}
	}
	
	// textContent doesn't add new lines after <br>
	doc.querySelectorAll('br').forEach(function (br) {
		br.parentNode.insertBefore(doc.createTextNode('\n'), br.nextSibling);
	});

	// Add horizontal rules between notes
	Array.from(container.children).slice(1).forEach((element) => {
		let p = doc.createElement('p');
		p.append('\n---\n\n');
		container.insertBefore(p, element);
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

	// Add spaces for indents
	let paragraphs = doc.getElementsByTagName('p');
	for (let p of paragraphs) {
		let paddingLeft = p.style.paddingLeft;
		if (paddingLeft && paddingLeft.substr(paddingLeft.length - 2) === 'px') {
			let paddingPx = parseInt(paddingLeft, 10);
			let ztabs = '';
			for (let j = 30; j <= paddingPx; j += 30) {
				ztabs += '%%ZOTEROTAB%%';
			}
			p.insertBefore(doc.createTextNode(ztabs), p.firstChild);
		}
	}

	let text = container.textContent.replace(/%%ZOTEROTAB%%/g, '    ', 'g').trim();
	Zotero.write(text);
}
