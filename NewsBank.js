{
	"translatorID": "7fc76bfc-3a1a-47e7-93cc-4deed69bee5f",
	"label": "NewsBank",
	"creator": "Reuben Peterkin",
	"target": "https?://infoweb.newsbank.com/apps/news/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-07 04:32:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	NewsBank translator Copyright © 2021 Reuben Peterkin

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

function detectWeb(doc, url) {
	if (getRISElement(doc)) return "newspaperArticle";
	if (url.includes("/results")) return "multiple";
	return false;
}

function getSearchResults(doc) {
	var items = {}, found = false;
	var rows = doc.getElementsByTagName('article');
	if (!rows) return false;
	//	Zotero.debug(rows);

	for (var i = 0; i < rows.length; i++) {
		var title = rows[i].querySelector('.search-hits__hit__title');
		var link = rows[i].querySelector('a');
		var prefix = link.querySelector('.element-invisible').textContent;
		if (!title || !link) continue;
		found = true;

		if (!prefix) prefix = '';

		items[link.href] = ZU.trimInternal(title.textContent.replace(prefix, ''));
	}

	return found ? items : false;
}

function getRISElement(doc) {
	return doc.getElementById('nbplatform-noodletools-export-risdatabyformpost');
}

function getItem(doc) {
	var text = getRISElement(doc).textContent.trim();
	//	Z.debug(text);
	var trans = Zotero.loadTranslator('import');
	// RIS
	trans.setTranslator('32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7');
	trans.setString(text);
	trans.setHandler('itemDone', function (obj, item) {
		item.url = ZU.xpathText(doc, '//div[@class="actions-bar__urltext"]');

		var docBody = doc.getElementsByClassName('document-view__body');
		for (var i = 0; i < docBody.length; i++) {
			item.notes.push({ note: docBody[i].innerHTML.trim() });
		}

		item.complete();
	});
	trans.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var items = getSearchResults(doc);
		//	Zotero.debug(items);

		Zotero.selectItems(items, function (items) {
			if (!items) return;
			ZU.processDocuments(Object.keys(items), getItem);
		});
	}
	else {
		getItem(doc);
	}
}

// Test cast modified from "The Times and Sunday Times.js"
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://infoweb.newsbank.com/apps/news/openurl?ctx_ver=z39.88-2004&rft_id=info%3Asid/infoweb.newsbank.com&svc_dat=AWNB&req_dat=3AD092142963457FA426C327101D0723&rft_val_format=info%3Aofi/fmt%3Akev%3Amtx%3Actx&rft_dat=document_id%3Anews%252F16579C8CD2790100",
		"items": [
			{
				"itemType": "newspaperArticle",
				"title": "Rare animals among body count at Scottish zoos",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Macaskill",
						"creatorType": "author"
					}
				],
				"date": "July 2, 2017",
				"pages": "3",
				"libraryCatalog": "NewsBank",
				"archive": "Access World News",
				"publicationTitle": "Sunday Times, The (London, England)",
				"url": "https://infoweb.newsbank.com/apps/news/openurl?ctx_ver=z39.88-2004&rft_id=info%3Asid/infoweb.newsbank.com&svc_dat=AWNB&req_dat=3AD092142963457FA426C327101D0723&rft_val_format=info%3Aofi/fmt%3Akev%3Amtx%3Actx&rft_dat=document_id%3Anews%252F16579C8CD2790100",
				"attachments": [],
				"tags": [],
				"notes": [
					{
						"note": "<p>SQN: 127147919</p>"
					},
					{
						"note": "<p>More than 900 creatures in the care of the Royal Zoological Society of Scotland (RZSS) died in captivity last year, including several hundred rare snails bred for conservation.<br><br>Figures released by the charity, which runs the 82-acre Edinburgh Zoo and a wildlife park in the Scottish Highlands, show that about 25 animals were put down on health grounds.<br><br>Dozens more perished within weeks of birth, among them several animals designated as under threat by the International Union for Conservation of Nature and Natural Resources Red List.<br><br>They included a female socorro dove, which is extinct in the wild; four cottontop tamarins and three visayan warty pigs (both critically endangered species); a barbary macaque and two painted hunting dogs (both endangered species); and a crowned lemur, which is categorised as vulnerable.<br><br>According to the RZSS, a total of 856 animals aged 30 days and more died in 2016. A further 71 failed to survive beyond 30 days of birth. In 2015, about 700 animals died.<br><br>The partula snail, an endangered gastropod which originates on the steep volcanic forested islands of French Polynesia, accounted for the bulk of casualties. The RZSS is part of an international conservation effort to protect the snail and reintroduced more than 600 to Tahiti last year amid fanfare. A less wellknown fact is that a further 749 died in captivity.<br><br>RZSS officials pointed out that it cares for more than 8,000 creatures and insisted that the \"vast majority\" of animals died from natural causes . However, Elisa Allen, director of the UK charity, People for the Ethical Treatment of Animals, said captive animals often died far short of their natural life expectancy.<br><br>\"Even the best zoos can never meet all the unique environmental, nutritional, and social needs of the various species they imprison. The obscene amount of money zoos spend on buying, breeding, and housing exotic animals could benefit so many more animals in the wild and go a long way towards addressing the root causes of animal extinction and endangerment: habitat destruction and poaching. Anyone who cares about helping animals should donate to programmes that protect them in their natural habitats and shun these glorified animal prisons.\"<br><br>Last year's casualties included Edinburgh Zoo's first forest reindeer calf, which was euthanised following \"mobility problems brought on by a spinal infection ... an extensive programme of treatment failed to improve his situation\", said officials.<br><br>Three-year-old Yooranah, the first koala ever to be born in the UK, died at Edinburgh Zoo last June after a \"prolonged period of illness\".<br><br>The plight of partula snails has inspired a huge conservation effort after the tiny gastropod, which is so small it can fit on the edge of a 50p piece, became fodder for the non-native rosy wolf snail, which was introduced to French Polynesia in the 1970s. The partula, which grows to about an inch long, is said to live for up to 10 years and was documented by Captain Cook during his travels in 1769.<br><br>The snails have provided valuable insights into the mechanisms of evolution since different species have developed shell colouring suited to the environments they inhabit.<br><br>The RZSS, which has been involved in the conservation of partula snails since 1984, did not provide full details of how or why so many snails died last year but indicated that many had reached the end of their life span.<br><br>\"It is difficult to establish exact life expectancies, and different subspecies tend to live for very different periods of time. The best estimates we have in captivity is about three to four years for the species we hold,\" said a spokesman.<br><br>Zoo officials added that partula snail mortality is at its highest when young - the snails are thin shelled and delicate and more sensitive to minor changes in their environment. \"The team at RZSS Edinburgh Zoo have been hugely successful in breeding and reintroducing this critically endangered species in the wild,\" added the spokesman.</p>"
					},
					{
						"note": "Caption: Four 'critically endangered' cotton-top tamarins, above, died in captivity, while hundreds of partula snails, left, an endangered gastropod that originated in French Polynesia, accounted for the majority of the lost creatures, which have been successfully bred at Edinburgh Zoo, below"
					}
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
