{
	"translatorID": "c0d7d260-d795-4782-9446-f6c403a7922c",
	"label": "Science Links Japan",
	"creator": "Michael Berkowitz",
	"target": "^https?://sciencelinks\\.jp/",
	"minVersion": "1.0.0b4.r5",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "g",
	"lastUpdated": "2011-11-14 17:35:12"
}

function detectWeb(doc, url) {
	if (url.match(/result/) || url.match(/journal/)) {
		return "multiple";
	} else if (url.match(/article/)) {
		return "journalArticle";
	}
	else if (url.match(/display\.php/)){
		return "journalArticle"
	}
	
}

function doWeb(doc, url) {
	var ns = doc.documentElement.namespaceURI;
	nsR = ns ? function(prefix) {
		if (prefix == 'x') return ns; else return null;
	} : null;
	
	var arts = new Array();
	if (detectWeb(doc, url) == "multiple") {
		var items = Zotero.Utilities.getItemArray(doc, doc, "(article|display\.php)");
		items = Zotero.selectItems(items);
		for (var i in items) {
			arts.push(i);
		}
	} else {
		arts = [url];
	}
	Zotero.Utilities.processDocuments(arts, function(doc) {
		var data = new Array();
		var bits = doc.evaluate('//div[@id="result_detail"]/table/tbody/tr/td', doc, nsR, XPathResult.ANY_TYPE, null);
		var bit;
		while (bit = bits.iterateNext()) {
			data.push(Zotero.Utilities.trimInternal(bit.textContent));
		}
		var item = new Zotero.Item("journalArticle");
		for each (var datum in data) {
			if (datum.match(/^Title;/)) {
				item.title = Zotero.Utilities.capitalizeTitle(datum.match(/Title;(.*)$/)[1]);
			} else if (datum.match(/^Author;/)) {
				var auts = datum.match(/\b[A-Z'\-]+\s+[A-Z'\-]+/g);
				for each (var aut in auts) {
					item.creators.push(Zotero.Utilities.cleanAuthor(Zotero.Utilities.capitalizeTitle(aut, true), "author"));
				}
			} else if (datum.match(/^Journal Title;/)) {
				item.publicationTitle = datum.match(/;(.*)$/)[1];
			} else if (datum.match(/^ISSN/)) {
				item.ISSN = datum.match(/[\d\-]+/)[0];
			} else if (datum.match(/^VOL/)) {
				var voliss = datum.match(/^VOL\.([^;]*);NO\.([^;]*);PAGE\.([^(]*)\((\d+)\)/);
				item.volume = voliss[1];
				item.issue = voliss[2];
				item.pages = voliss[3];
				item.date = voliss[4];
			} else if (datum.match(/^Abstract/)) {
				item.abstractNote = datum.match(/;(.*)/)[1];
			}
		}
		item.url = doc.location.href;
		item.attachments = [{url:item.url, title:"Science Links Japan Snapshot", mimeType:"text/html"}];
		item.complete();
	}, function() {Zotero.done();});
	Zotero.wait();
}/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://sciencelinks.jp/j-east/result.php?combine=and&field1=keyword&keyword1=mechanics&combine2=and&field2=keyword&keyword2=&combine3=and&field3=keyword&keyword3=&submit.x=0&submit.y=0&language=All&from=&to=&fulltext=&view=20&sort=desc",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://sciencelinks.jp/j-east/display.php?id=000020070407A0083452",
		"items": [
			{
				"itemType": "journalArticle",
				"creators": [
					{
						"firstName": "Takami",
						"lastName": "Toshiya",
						"creatorType": "author"
					},
					{
						"firstName": "Maki",
						"lastName": "Jun",
						"creatorType": "author"
					},
					{
						"firstName": "Ooba",
						"lastName": "Jun-Ichi",
						"creatorType": "author"
					},
					{
						"firstName": "Kobayashi",
						"lastName": "Taizo",
						"creatorType": "author"
					},
					{
						"firstName": "Nogita",
						"lastName": "Rie",
						"creatorType": "author"
					},
					{
						"firstName": "Aoyagi",
						"lastName": "Mutsumi",
						"creatorType": "author"
					}
				],
				"notes": [],
				"tags": [],
				"seeAlso": [],
				"attachments": [
					{
						"url": "http://sciencelinks.jp/j-east/display.php?id=000020070407A0083452",
						"title": "Science Links Japan Snapshot",
						"mimeType": "text/html"
					}
				],
				"title": "Interaction and Localization of One-Electron Orbitals in an Organic Molecule: Fictitious Parameter Analysis for Multiphysics Simulations",
				"publicationTitle": "J Phys Soc Jpn",
				"ISSN": "0031-9015",
				"volume": "76",
				"issue": "1",
				"pages": "013001.1-013001.4",
				"date": "2007",
				"abstractNote": "We present a new methodology for analyzing complicated multiphysics simulations by introducing a fictitious parameter. Using the method, we study the quantum mechanical aspects of an organic molecule in water. The simulation is variationally constructed from the ab initio molecular orbital method and classical statistical mechanics, with the fictitious parameter representing the coupling strength between solute and solvent. We obtain a number of one-electron orbital energies of the solute molecule derived from the Hartree-Fock approximation, and eigenvalue statistical analysis developed in the study of nonintegrable systems is applied to them. On the basis of the results, we analyze the localization properties of the electronic wavefunctions under the influence of the solvent. (author abst.)",
				"url": "http://sciencelinks.jp/j-east/display.php?id=000020070407A0083452",
				"libraryCatalog": "Science Links Japan",
				"accessDate": "CURRENT_TIMESTAMP",
				"shortTitle": "Interaction and Localization of One-Electron Orbitals in an Organic Molecule"
			}
		]
	}
]
/** END TEST CASES **/