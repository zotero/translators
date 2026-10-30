{
	"translatorID": "a5cb4b58-9a7a-478d-92a9-bf51d6ea4772",
	"label": "Bible Gateway",
	"creator": "Dandelion Good",
	"target": "^https?://www\\.biblegateway\\.com/passage/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 200,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-10-30 06:39:28"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Dandelion Good and the righteous Anti Toil Theologians at Iliff
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

/*
***** BEGIN ATTRIBUTION BLOCK *****
This translator was developed by Dandelion Good.

If you do any work on this translator, please add yourself here <3.
*/

function isPassageUrl(url) {
	// ToDo already covered in regex
	return url.includes('/passage/');
}


function detectWeb(doc, url) {
	Zotero.debug("!!! DETECTWEB TRACE TRIGGERED FOR: " + url);
	
	if (!url.includes('biblegateway.com')) {
		Zotero.debug(`BibleGateway detectWeb quick return ${url}`);
		return false;
	}
	Zotero.debug(`in BibleGateway detectWeb for ${url}`);
	if (isPassageUrl(url)) {
		return "bookSection";
	}
	return false;
}

async function doWeb(doc, url) {
	let detected = detectWeb(doc, url);
	Zotero.debug(`in doWeb for ${url}, detected ${detected}`);
	if (detected == 'multiple') {
		// ToDo
		Zotero.debug("found multiple, not yet supported!");
	}
	else {
		await scrape(doc, url);
	}
}
async function scrape(doc, url = doc.location.href) {
	let translator = Zotero.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);
	
	translator.setHandler('itemDone', (_obj, item) => {
		// TODO adjust if needed:
		item.section = 'News';
		item.complete();
	});

	let em = await translator.getTranslatorObject();
	em.itemType = 'newspaperArticle';
	// TODO map additional meta tags here, or delete completely
	em.addCustomFields({
		'twitter:description': 'abstractNote'
	});
	await em.doWeb(doc, url);
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.biblegateway.com/passage/?search=Joshua%203&version=NRSVUE",
		"items": [
			{
				"itemType": "bookSection",
				"title": "Joshua 3 - New Revised Standard Version Updated Edition",
				"creators": [],
				"abstractNote": "Israel Crosses the Jordan - Early in the morning Joshua rose and set out from Shittim with all the Israelites, and they came to the Jordan. They camped there before crossing over. At the end of three days, the officers went through the camp and commanded the people, “When you see the ark of the covenant of the LORD your God being carried by the Levitical priests, then you shall set out from your place. Follow it, so that you may know the way you should go, for you have not passed this way before. Yet there shall be a space between you and it, a distance of about two thousand cubits; do not come any nearer to it.” Then Joshua said to the people, “Sanctify yourselves, for tomorrow the LORD will do wonders among you.”",
				"language": "en",
				"libraryCatalog": "Bible Gateway",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
