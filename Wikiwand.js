{
	"translatorID": "ce093a19-cc6b-4106-b17c-b810dba56daa",
	"label": "Wikiwand",
	"creator": "Abe Jellinek",
	"target": "^https?://www\\.wikiwand\\.com/[^/?]+/[^/?]+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-13 22:38:44"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2021 Abe Jellinek
	
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

function detectWeb(doc, _url) {
	if (doc.querySelector('.wikipedia_list a')) {
		return "encyclopediaArticle";
	}
	return false;
}

function doWeb(doc, _url) {
	let wikipediaURL = attr(doc, '.wikipedia_list a', 'href');
	ZU.processDocuments(wikipediaURL, scrape);
}

function scrape(doc, url) {
	let translator = Zotero.loadTranslator('web');
	// Wikipedia
	translator.setTranslator('e5dc9733-f8fc-4c00-8c40-e53e0bb14664');
	translator.setDocument(doc);
	
	translator.getTranslatorObject(function (trans) {
		trans.doWeb(doc, url);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.wikiwand.com/en/Albert_Einstein",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Albert Einstein",
				"creators": [],
				"date": "2021-07-10T10:34:58Z",
				"abstractNote": "Albert Einstein ( EYEN-styne; German: [ˈalbɛʁt ˈʔaɪnʃtaɪn] (listen); 14 March 1879 – 18 April 1955) was a German-born theoretical physicist, widely acknowledged to be one of the greatest physicists of all time. Einstein is known for developing the theory of relativity, but he also made important contributions to the development of the theory of quantum mechanics. Relativity and quantum mechanics are together the two pillars of modern physics. His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been dubbed \"the world's most famous equation\". His work is also known for its influence on the philosophy of science. He received the 1921 Nobel Prize in Physics \"for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect\", a pivotal step in the development of quantum theory. His intellectual achievements and originality resulted in \"Einstein\" becoming synonymous with \"genius\".In 1905, a year sometimes described as his annus mirabilis ('miracle year'), Einstein published four groundbreaking papers. These outlined the theory of the photoelectric effect, explained Brownian motion, introduced special relativity, and demonstrated mass-energy equivalence. Einstein thought that the laws of classical mechanics could no longer be reconciled with those of the electromagnetic field, which led him to develop his special theory of relativity. He then extended the theory to gravitational fields; he published a paper on general relativity in 1916, introducing his theory of gravitation. In 1917, he applied the general theory of relativity to model the structure of the universe. He continued to deal with problems of statistical mechanics and quantum theory, which led to his explanations of particle theory and the motion of molecules. He also investigated the thermal properties of light and the quantum theory of radiation, which laid the foundation of the photon theory of light. However, for much of the later part of his career, he worked on two ultimately unsuccessful endeavors. First, despite his great contributions to quantum mechanics, he opposed what it evolved into, objecting that nature \"does not play dice\". Second, he attempted to devise a unified field theory by generalizing his geometric theory of gravitation to include electromagnetism. As a result, he became increasingly isolated from the mainstream of modern physics.\nEinstein was born in the German Empire, but moved to Switzerland in 1895, forsaking his German citizenship (as a subject of the Kingdom of Württemberg) the following year. In 1897, at the age of 17, he enrolled in the mathematics and physics teaching diploma program at the Swiss Federal polytechnic school in Zürich, graduating in 1900. In 1901 he acquired Swiss citizenship, which he kept for the rest of his life, and in 1903 he secured a permanent position at the Swiss Patent Office in Bern. In 1905, he was awarded a PhD by the University of Zurich. In 1914, Einstein moved to Berlin in order to join the Prussian Academy of Sciences and the Humboldt University of Berlin. In 1917, Einstein became director of the Kaiser Wilhelm Institute for Physics; he also became a German citizen again – Prussian this time. \nIn 1933, while Einstein was visiting the United States, Adolf Hitler came to power. Einstein did not return to Germany because he objected to the policies of the newly elected Nazi-led government. He settled in the United States and became an American citizen in 1940. On the eve of World War II, he endorsed a letter to President Franklin D. Roosevelt alerting him to the potential German nuclear weapons program and recommending that the US begin similar research. Einstein supported the Allies, but generally denounced the idea of nuclear weapons.",
				"encyclopediaTitle": "Wikipedia",
				"extra": "Page Version ID: 1032903854",
				"language": "en",
				"libraryCatalog": "Wikiwand",
				"rights": "Creative Commons Attribution-ShareAlike License",
				"url": "https://en.wikipedia.org/w/index.php?title=Albert_Einstein&oldid=1032903854",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://www.wikiwand.com/bat-smg/Metu_laik%C4%81",
		"items": [
			{
				"itemType": "encyclopediaArticle",
				"title": "Metu laikā",
				"creators": [],
				"date": "2018-06-16T17:50:46Z",
				"abstractNote": "Metū laikā - planetas judiejims aplink Saulė, ka dėl ašėis pasvėrėma nevėinuoda saulės spinduliū gauna eš pradiuos daugiau vėins pusrutulis, vo paskiau - kėts. Labiau šėldomame pusrutulie īr vasara, mažiau šėldomamė - žėima. Pri pusiaujė Saulė apšvėita vėsā laika vėinuoda i čė metū laikū nier. Trumpiausi metā īr Merkurijou - 88 Žemės paras, vo Plutuona metā trunka 248 Žemės metus. \n\nTas taps vaizdielis skirtingās metu laikās:",
				"encyclopediaTitle": "Wikipedia",
				"extra": "Page Version ID: 344358",
				"language": "sgs",
				"libraryCatalog": "Wikiwand",
				"rights": "Creative Commons Attribution-ShareAlike License",
				"url": "https://bat-smg.wikipedia.org/w/index.php?title=Metu_laik%C4%81&oldid=344358",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html",
						"snapshot": true
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
