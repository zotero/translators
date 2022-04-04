{
	"translatorID": "26ecfee6-535d-4044-89a8-fbda31883642",
	"label": "Stack Exchange",
	"creator": "Abe Jellinek",
	"target": "^https://([^/]+\\.)?(((stack(overflow|exchange)|serverfault|askubuntu|superuser|stackapps)\\.com)|mathoverflow\\.net)/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-04-03 13:21:00"
}

/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2022 Abe Jellinek

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero. If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/


async function detectWeb(doc, _url) {
	if (doc.querySelector('div[itemprop="mainEntity"][itemtype="https://schema.org/Question"]')
			|| doc.querySelector('#content > [itemscope]')) {
		return 'multiple';
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = doc.querySelectorAll('#question, .answer');
	for (let row of rows) {
		let id = row.id;
		let summary = ZU.trimInternal(text(row, '[itemprop="text"] p'));
		if (!id || !summary) continue;
		if (checkOnly) return true;
		if (id == 'question') {
			summary = 'Q: ' + summary;
		}
		else {
			summary = 'A: ' + summary;
		}
		found = true;
		items[id] = summary;
	}
	return found ? items : false;
}

async function doWeb(doc, _url) {
	Zotero.selectItems(getSearchResults(doc, false), function (items) {
		if (items) {
			Object.keys(items).forEach(id => scrape(doc, id));
		}
	});
}

function scrape(doc, id) {
	let el = doc.getElementById(id);
	let item = new Zotero.Item('forumPost');
	item.forumTitle = attr(doc, 'meta[property="og:site_name"]', 'content');
	item.date = ZU.strToISO(attr(el, 'time[itemprop="dateCreated"]', 'datetime')
		|| attr(el, '.relativetime', 'title'));
	// .href converts the URL to absolute
	item.url = el.querySelector('a[itemprop="url"]').href;
	item.creators.push(ZU.cleanAuthor(text(el, '[itemprop="author"] a'), 'author'));
	item.attachments.push({
		title: 'Snapshot',
		document: doc
	});

	if (id == 'question') {
		item.title = attr(doc, 'meta[itemprop="name"]', 'content');
		item.postType = 'Forum post';
	}
	else {
		item.title = `Answer to "${attr(doc, 'meta[itemprop="name"]', 'content')}"`;
	}

	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://mathoverflow.net/questions/318890/steepest-descent-integration-in-several-dimensions/418958",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://stats.stackexchange.com/questions/210352/do-cohens-d-and-hedges-g-apply-to-the-welch-t-test",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://es.stackoverflow.com/questions/524520/eliminar-espacio-de-fields-vac%c3%ados-en-reporte-con-jasperreport",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://stackoverflow.com/questions/178325/how-do-i-check-if-an-element-is-hidden-in-jquery",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://stackapps.com/questions/9281/whats-the-next-the-script-app-library-of-the-month",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://superuser.com/questions/1714304/ram-no-longer-working-after-adding-a-second-stick",
		"items": "multiple"
	}
]
/** END TEST CASES **/
